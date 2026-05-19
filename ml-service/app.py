"""
app.py  ─  SpendNest ML Microservice (Flask + Pandas)
══════════════════════════════════════════════════════

Endpoints
─────────
GET  /                          → health check
POST /api/parse-and-analyze     → full CSV pipeline (main endpoint)
POST /api/subscriptions/detect  → detect recurring patterns from transactions
POST /api/emergency-fund        → compute emergency fund readiness
POST /api/cashflow-trends       → month-by-month cash flow

Run with:
    python app.py
"""

import io
import logging

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

# ── Our parsing pipeline ──────────────────────────────────────────────────────
from app.utils.normalizer import normalize_dataframe
from app.utils.categorizer import categorize_dataframe
from app.services.analytics_service import (
    get_category_breakdown,
    get_monthly_analytics,
    get_summary,
    get_anomaly_flags,
    get_spending_trends,
    generate_insights,
    detect_subscriptions,
    get_emergency_fund_analysis,
    get_current_month_metrics,
)
from app.services.forecast_service import get_income_forecast
from app.services.recommendation_service import get_recommendations

# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)

CORS(
    app,
    origins=[
        "http://localhost:3000",   # Next.js frontend
        "http://127.0.0.1:3000",
        "http://localhost:5000",   # Express API gateway
        "http://127.0.0.1:5000",
        "http://localhost:5173",   # Vite dev server (legacy)
        "http://127.0.0.1:5173",
    ],
    supports_credentials=True,
)

# ── Structured logging ────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("spendnest.ml")


# ─── Helper ───────────────────────────────────────────────────────────────────

def _safe_json(obj):
    """Recursively make any object JSON-serializable (handles NaN / NaT / numpy types / Timestamps)."""
    if isinstance(obj, dict):
        return {k: _safe_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_safe_json(i) for i in obj]
    if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
        return None
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (pd.Timestamp,)):
        return obj.strftime('%Y-%m-%d')
    if isinstance(obj, pd.Period):
        return str(obj)
    if obj != obj:  # NaN check for non-numpy scalars
        return None
    return obj


def _try_read_csv(raw_bytes: bytes, encoding: str) -> pd.DataFrame:
    """
    Attempts to read CSV bytes with the given encoding.
    If only 1 column is detected (wrong delimiter), retries with sep=None.
    """
    df = pd.read_csv(io.BytesIO(raw_bytes), encoding=encoding, skipinitialspace=True)
    if len(df.columns) <= 1:
        logger.warning(
            "⚠️  Only 1 column detected — retrying with auto-detection (sep=None)"
        )
        df = pd.read_csv(
            io.BytesIO(raw_bytes),
            encoding=encoding,
            sep=None,
            engine="python",
            skipinitialspace=True,
        )
    return df


def _parse_csv_bytes(content: bytes) -> pd.DataFrame:
    """Parse raw CSV bytes, trying UTF-8 then latin-1 encoding."""
    try:
        return _try_read_csv(content, "utf-8")
    except UnicodeDecodeError:
        logger.warning("⚠️  UTF-8 decode failed — retrying with latin-1")
        return _try_read_csv(content, "latin-1")


def _parse_pdf_bytes(content: bytes) -> pd.DataFrame:
    """
    Parse PDF bytes using pdfplumber.
    Tries to extract tables first. If that fails or results in empty data,
    it could potentially fall back to regex on text, but table extraction is preferred.
    """
    import pdfplumber
    all_data = []
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        # Convert table to DataFrame
                        # We assume the first row might be headers or just data
                        df_table = pd.DataFrame(table)
                        all_data.append(df_table)
        
        if not all_data:
            logger.warning("⚠️  No tables found in PDF")
            return pd.DataFrame()

        # Combine all tables
        combined_df = pd.concat(all_data, ignore_index=True)
        
        # Basic cleanup: remove rows that are mostly None/NaN
        combined_df = combined_df.dropna(how='all')
        
        # If the first row looks like headers (contains words like Date, Description, Amount), set it as header
        if not combined_df.empty:
            first_row = combined_df.iloc[0].astype(str).str.lower()
            if any(h in first_row.values for h in ['date', 'description', 'amount', 'balance']):
                combined_df.columns = combined_df.iloc[0]
                combined_df = combined_df[1:].reset_index(drop=True)
            else:
                # Assign generic names if no headers found
                combined_df.columns = [f"col_{i}" for i in range(len(combined_df.columns))]

        return combined_df
    except Exception as e:
        logger.error(f"❌ PDF parse error: {e}")
        return pd.DataFrame()


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    """Simple liveness probe."""
    return jsonify({"status": "ok", "service": "SpendNest ML Service 🚀", "version": "2.0.0"})


@app.post("/api/parse-and-analyze")
def parse_and_analyze():
    """
    POST /api/parse-and-analyze
    ───────────────────────────
    Accepts:  multipart/form-data → field "file" → .csv bank statement
    Returns:  Complete financial analytics payload

    Response shape
    ──────────────
    {
      "success":              true,
      "transactionCount":     <int>,
      "transactions":         [...],
      "summary":              { total_income, total_expenses, total_savings, latest_balance },
      "current_month":        { income, expenses, savings },
      "monthly_analytics":    [{ month, income, expenses, savings }],
      "category_breakdown":   [{ name, value }],
      "subscriptions":        [{ description, amount, frequency, monthly_cost, yearly_cost }],
      "emergency_fund":       { monthly_burn, runway_months, target_savings, readiness_score },
      "forecast":             { predicted_income, predicted_month, model_used, ... },
      "recommendation":       { safe_to_spend, reserved_funds, emergency_buffer, ... },
      "trends":               { weekend_vs_weekday_pct, rising_categories, ... },
      "insights":             [{ icon, message, type, confidence }]
    }
    """

    # ── 1. Validate file presence ────────────────────────────────────────────
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded. Send the CSV as 'file' in multipart/form-data."}), 400

    uploaded = request.files["file"]

    if not uploaded.filename:
        return jsonify({"success": False, "error": "Filename is empty."}), 400

    if not uploaded.filename.lower().endswith((".csv", ".pdf")):
        return jsonify({"success": False, "error": "Only .csv and .pdf files are accepted."}), 400

    # ── 2. Read raw bytes ────────────────────────────────────────────────────
    content = uploaded.read()

    if not content:
        return jsonify({"success": False, "error": "The uploaded file is empty (0 bytes)."}), 400

    logger.info("📥 Received file: '%s' (%d bytes)", uploaded.filename, len(content))

    # ── 3. Parse → raw DataFrame ────────────────────────────────────────
    try:
        if uploaded.filename.lower().endswith(".pdf"):
            raw_df = _parse_pdf_bytes(content)
        else:
            raw_df = _parse_csv_bytes(content)
    except Exception as exc:
        logger.error("❌ File parse error: %s", exc)
        return jsonify({"success": False, "error": f"Could not read file: {exc}"}), 400

    logger.info("📄 Raw CSV shape: %d rows × %d cols", *raw_df.shape)

    if raw_df.empty:
        return jsonify({"success": False, "error": "The uploaded CSV contains no data rows."}), 400

    # ── 4. Normalize → standard schema ──────────────────────────────────────
    try:
        df = normalize_dataframe(raw_df)
    except Exception as exc:
        logger.error("❌ Normalization error: %s", exc, exc_info=True)
        return jsonify({"success": False, "error": f"Data normalization failed: {exc}"}), 500

    if df.empty:
        return jsonify({
            "success": False,
            "error": (
                "No valid transactions found after parsing. "
                "Ensure the CSV contains Date, Amount/Debit/Credit columns."
            ),
        }), 422

    # ── 5. Categorize + Income sign-correction ────────────────────────────────
    try:
        df = categorize_dataframe(df)
    except Exception as exc:
        logger.warning("⚠️  Categorization failed (non-fatal): %s", exc)
        df["category"] = "other"
        df["is_likely_recurring"] = False

    # ── 6. Core Analytics ─────────────────────────────────────────────────────
    summary             = get_summary(df)
    current_month       = get_current_month_metrics(df)
    monthly_analytics   = get_monthly_analytics(df)
    category_breakdown  = get_category_breakdown(df)

    # ── 7. Extended Intelligence ──────────────────────────────────────────────
    df = get_anomaly_flags(df)
    trends = get_spending_trends(df)

    # Subscription detection from transactions
    subscriptions = detect_subscriptions(df)

    # Emergency fund analysis
    latest_balance = summary.get("latest_balance", 0.0)
    emergency_fund = get_emergency_fund_analysis(df, current_savings=latest_balance)

    # AI insights
    insights = generate_insights(summary, trends, monthly_analytics)

    # ── 8. Forecast ────────────────────────────────────────────────────────────
    try:
        forecast = get_income_forecast(df)
    except Exception as exc:
        logger.error("💥 Forecast CRASHED: %s", exc, exc_info=True)
        forecast = {
            "historical_income":    [],
            "predicted_month":      "Error",
            "predicted_income":     0.0,
            "model_used":           "none",
            "error":                str(exc)
        }

    # ── 9. Recommendation ─────────────────────────────────────────────────────
    try:
        recommendation = get_recommendations(df)
    except Exception as exc:
        logger.warning("⚠️  Recommendation failed (non-fatal): %s", exc)
        recommendation = {
            "current_balance":          0.0,
            "predicted_income":         0.0,
            "recommended_reserve_rate": 0.10,
            "reserved_funds":           0.0,
            "emergency_buffer":         0.0,
            "safe_to_spend":            0.0,
            "message":                  "Could not compute recommendation.",
        }

    # Always ensure emergency_buffer field present
    if "emergency_buffer" not in recommendation:
        recommendation["emergency_buffer"] = 0.0

    # ── 10. Debug logging ──────────────────────────────────────────────────────
    logger.info(
        "💹 Summary → income: %.2f | expenses: %.2f | balance: %.2f | txns: %d",
        summary.get("total_income", 0),
        summary.get("total_expenses", 0),
        summary.get("latest_balance", 0),
        summary.get("total_transactions", 0),
    )
    logger.info(
        "📅 Current month → income: %.2f | expenses: %.2f | savings: %.2f",
        current_month.get("income", 0),
        current_month.get("expenses", 0),
        current_month.get("savings", 0),
    )
    logger.info(
        "📈 Forecast → model: %s | predicted: %.2f for %s",
        forecast.get("model_used", "?"),
        forecast.get("predicted_income", 0),
        forecast.get("predicted_month", "?"),
    )
    logger.info(
        "🔁 Subscriptions detected: %d | Emergency runway: %.1f months",
        len(subscriptions),
        emergency_fund.get("runway_months", 0),
    )

    # ── 11. Serialize ──────────────────────────────────────────────────────────
    import json
    transactions = json.loads(df.to_json(orient="records", date_format="iso"))

    response_payload = {
        "success":            True,
        "transactionCount":   int(len(df)),

        # Top-level convenience fields (backward compat)
        "totalIncome":        round(float(summary.get("total_income", 0)), 2),
        "totalExpenses":      round(float(summary.get("total_expenses", 0)), 2),
        "availableBalance":   round(float(summary.get("latest_balance", 0)), 2),

        # ─ Core data arrays ─
        "transactions":       transactions,
        "monthly_analytics":  _safe_json(monthly_analytics),
        "category_breakdown": _safe_json(category_breakdown),

        # ─ Rich analytics objects ─
        "summary":            _safe_json(summary),
        "current_month":      _safe_json(current_month),
        "subscriptions":      _safe_json(subscriptions),
        "emergency_fund":     _safe_json(emergency_fund),
        "forecast":           _safe_json(forecast),
        "recommendation":     _safe_json(recommendation),
        "trends":             _safe_json(trends),
        "insights":           _safe_json(insights),
    }

    return jsonify(response_payload), 200


# ─── Standalone analytics endpoints ───────────────────────────────────────────

@app.post("/api/subscriptions/detect")
def detect_subs_endpoint():
    """
    POST /api/subscriptions/detect
    Accepts JSON: { "transactions": [...] }
    Returns detected subscription patterns.
    """
    data = request.get_json(force=True, silent=True) or {}
    tx_list = data.get("transactions", [])

    if not tx_list:
        return jsonify({"subscriptions": [], "total_monthly": 0.0, "total_yearly": 0.0})

    df = pd.DataFrame(tx_list)
    subscriptions = detect_subscriptions(df)

    total_monthly = sum(s["monthly_cost"] for s in subscriptions)
    total_yearly = sum(s["yearly_cost"] for s in subscriptions)

    return jsonify({
        "subscriptions": _safe_json(subscriptions),
        "total_monthly": round(total_monthly, 2),
        "total_yearly":  round(total_yearly, 2),
        "count":         len(subscriptions),
    })


@app.post("/api/emergency-fund")
def emergency_fund_endpoint():
    """
    POST /api/emergency-fund
    Accepts JSON: { "transactions": [...], "current_savings": <float> }
    Returns emergency fund analysis.
    """
    data = request.get_json(force=True, silent=True) or {}
    tx_list = data.get("transactions", [])
    current_savings = float(data.get("current_savings", 0.0))

    if not tx_list:
        return jsonify(get_emergency_fund_analysis(pd.DataFrame(), current_savings))

    df = pd.DataFrame(tx_list)
    analysis = get_emergency_fund_analysis(df, current_savings=current_savings)
    return jsonify(_safe_json(analysis))


# ─── Error handlers ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(_err):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404


@app.errorhandler(405)
def method_not_allowed(_err):
    return jsonify({"success": False, "error": "Method not allowed"}), 405


@app.errorhandler(500)
def internal_error(err):
    logger.exception("💥 Unhandled server error")
    return jsonify({"success": False, "error": "Internal server error"}), 500


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import os
    logger.info("🚀 Starting SpendNest ML Service on http://localhost:8000")
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=8000, debug=debug_mode, use_reloader=debug_mode, threaded=True)