"""
app.py  ─  FlowShield ML Microservice (Flask + Pandas)
═══════════════════════════════════════════════════════

Endpoints
─────────
GET  /                        → health check
POST /api/parse-and-analyze   → full CSV pipeline (main endpoint)

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
logger = logging.getLogger("flowshield.ml")


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
    if obj != obj:          # NaN check for non-numpy scalars
        return None
    return obj


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    """Simple liveness probe."""
    return jsonify({"status": "ok", "service": "FlowShield ML Service 🚀"})


@app.post("/api/parse-and-analyze")
def parse_and_analyze():
    """
    POST /api/parse-and-analyze
    ───────────────────────────
    Accepts:  multipart/form-data  →  field "file"  →  .csv bank statement
    Returns:  JSON with full financial analytics

    Response shape
    ──────────────
    {
      "success": true,
      "transactionCount": <int>,
      "totalIncome":      <float>,
      "totalExpenses":    <float>,
      "availableBalance": <float>,
      "transactions":     [ { date, description, amount, type, balance, category } ],
      "monthly_analytics":[ { month, income, expenses, savings } ],
      "category_breakdown":[ { name, value } ]
    }
    """

    # ── 1. Validate file presence ────────────────────────────────────────────
    if "file" not in request.files:
        logger.warning("❌ No 'file' field in request")
        return jsonify({"success": False, "error": "No file uploaded. Send the CSV as 'file' in multipart/form-data."}), 400

    uploaded = request.files["file"]

    if not uploaded.filename:
        return jsonify({"success": False, "error": "Filename is empty."}), 400

    if not uploaded.filename.lower().endswith(".csv"):
        return jsonify({"success": False, "error": "Only .csv files are accepted."}), 400

    # ── 2. Read raw bytes ────────────────────────────────────────────────────
    content = uploaded.read()

    if not content:
        return jsonify({"success": False, "error": "The uploaded file is empty (0 bytes)."}), 400

    logger.info("📥 Received file: '%s' (%d bytes)", uploaded.filename, len(content))

    # ── 3. Parse CSV → raw DataFrame ────────────────────────────────────────
    def _try_read_csv(raw_bytes: bytes, encoding: str) -> pd.DataFrame:
        """
        Attempts to read CSV bytes with the given encoding.
        If only 1 column is detected (headers in one cell — wrong delimiter),
        retries with sep=None which lets Python's csv.Sniffer auto-detect the separator.
        """
        df = pd.read_csv(io.BytesIO(raw_bytes), encoding=encoding, skipinitialspace=True)
        if len(df.columns) <= 1:
            logger.warning(
                "⚠️  Only 1 column detected with default comma delimiter — "
                "retrying with auto-detection (sep=None)"
            )
            df = pd.read_csv(
                io.BytesIO(raw_bytes),
                encoding=encoding,
                sep=None,
                engine="python",
                skipinitialspace=True,
            )
        return df

    try:
        try:
            raw_df = _try_read_csv(content, "utf-8")
        except UnicodeDecodeError:
            logger.warning("⚠️  UTF-8 decode failed — retrying with latin-1")
            raw_df = _try_read_csv(content, "latin-1")

    except Exception as exc:
        logger.error("❌ CSV parse error: %s", exc)
        return jsonify({"success": False, "error": f"Could not read CSV: {exc}"}), 400

    logger.info("📄 Raw CSV shape: %d rows × %d cols", *raw_df.shape)
    logger.info("📋 Detected columns: %s", raw_df.columns.tolist())

    if raw_df.empty:
        return jsonify({"success": False, "error": "The uploaded CSV contains no data rows."}), 400

    # ── 4. Normalize → standard schema ──────────────────────────────────────
    try:
        df = normalize_dataframe(raw_df)
    except Exception as exc:
        logger.error("❌ Normalization error: %s", exc, exc_info=True)
        return jsonify({"success": False, "error": f"Data normalization failed: {exc}"}), 500

    logger.info("✅ Normalized rows: %d", len(df))

    if df.empty:
        return jsonify({
            "success": False,
            "error": (
                "The ML service parsed the file but found no transactions. "
                "Please ensure the CSV contains valid Date, Amount/Debit/Credit columns."
            ),
        }), 422

    # ── 5. Categorize ────────────────────────────────────────────────────────
    try:
        df = categorize_dataframe(df)
    except Exception as exc:
        logger.warning("⚠️  Categorization failed (non-fatal): %s", exc)
        df["category"] = "other"

    # ── 6. Analytics ─────────────────────────────────────────────────────────
    summary            = get_summary(df)
    monthly_analytics  = get_monthly_analytics(df)
    category_breakdown = get_category_breakdown(df)

    # ── 7. Forecast + Recommendation ─────────────────────────────────────────
    try:
        forecast = get_income_forecast(df)
    except Exception as exc:
        logger.error("💥 Forecast CRASHED: %s", exc, exc_info=True)
        forecast = {
            "historical_income": [],
            "predicted_month": "Error",
            "predicted_income": 0.0,
            "model_used": "none",
            "error": str(exc)
        }

    try:
        recommendation = get_recommendations(df)
    except Exception as exc:
        logger.warning("⚠️  Recommendation failed (non-fatal): %s", exc)
        recommendation = {
            "current_balance": 0.0,
            "predicted_income": 0.0,
            "recommended_reserve_rate": 0.10,
            "reserved_funds": 0.0,
            "emergency_buffer": 0.0,
            "safe_to_spend": 0.0,
            "message": "Could not compute recommendation.",
        }

    # Ensure emergency_buffer field always present (Express Ledger model reads it)
    if "emergency_buffer" not in recommendation:
        recommendation["emergency_buffer"] = 0.0

    # Debug logs
    sample = df.iloc[0].to_dict() if not df.empty else {}
    logger.info("🔎 Sample transaction: %s", sample)
    logger.info(
        "💹 Summary → income: %.2f | expenses: %.2f | balance: %.2f | count: %d",
        summary.get("total_income", 0),
        summary.get("total_expenses", 0),
        summary.get("latest_balance", 0),
        summary.get("total_transactions", 0),
    )
    logger.info(
        "🏦 Recommendation → safe_to_spend: %.2f | reserved: %.2f | rate: %.0f%%",
        recommendation.get("safe_to_spend", 0),
        recommendation.get("reserved_funds", 0),
        recommendation.get("recommended_reserve_rate", 0) * 100,
    )
    logger.info(
        "📈 Forecast → model: %s | predicted: %.2f for %s",
        forecast.get("model_used", "?"),
        forecast.get("predicted_income", 0),
        forecast.get("predicted_month", "?"),
    )

    # ── 8. Serialize ──────────────────────────────────────────────────────────
    transactions = _safe_json(
        df.where(pd.notnull(df), None).to_dict(orient="records")
    )

    response_payload = {
        "success":            True,
        "transactionCount":   int(len(df)),
        "totalIncome":        round(float(summary.get("total_income", 0)), 2),
        "totalExpenses":      round(float(summary.get("total_expenses", 0)), 2),
        "availableBalance":   round(float(summary.get("latest_balance", 0)), 2),
        # ─ Data arrays ─
        "transactions":       transactions,
        "monthly_analytics":  _safe_json(monthly_analytics),
        "category_breakdown": _safe_json(category_breakdown),
        # ─ Analytics objects (consumed by Express to write MongoDB) ─
        "summary":            _safe_json(summary),
        "forecast":           _safe_json(forecast),
        "recommendation":     _safe_json(recommendation),
    }

    return jsonify(response_payload), 200


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
    logger.info("🚀 Starting FlowShield ML Service on http://localhost:8000")
    app.run(host="0.0.0.0", port=8000, debug=True)