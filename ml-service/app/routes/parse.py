from fastapi import APIRouter, UploadFile, File, HTTPException
import io
import pandas as pd

from app.utils.normalizer import normalize_dataframe
from app.utils.categorizer import categorize_dataframe
from app.services.analytics_service import get_summary, get_monthly_analytics, get_category_breakdown
from app.services.forecast_service import get_income_forecast
from app.services.recommendation_service import get_recommendations

router = APIRouter(tags=["parse"])


@router.post("/parse-and-analyze")
async def parse_and_analyze(file: UploadFile = File(...)):
    """
    Master endpoint called by the Express backend after a CSV upload.
    Accepts a raw CSV file, runs the full ML pipeline, and returns
    all results in a single response — no multiple round-trips needed.

    Returns:
        transactions      — every normalized + categorized row
        summary           — totals (income, expenses, savings, balance)
        monthly_analytics — month-by-month income/expense breakdown
        category_breakdown— spending totals per category
        forecast          — predicted next-month income (ARIMA or SMA fallback)
        recommendation    — dual-ledger split (available vs quarantined)
    """
    # ── 1. Validate file type ────────────────────────────────────────────
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only .csv files are accepted."
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty (0 bytes)."
        )

    # ── 2. Parse CSV → DataFrame ─────────────────────────────────────────
    try:
        raw_df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse CSV: {str(e)}"
        )

    if raw_df.empty:
        raise HTTPException(
            status_code=400,
            detail="The uploaded CSV has no data rows."
        )

    # ── 3. Normalize columns → standard schema ───────────────────────────
    try:
        df = normalize_dataframe(raw_df)
        df = categorize_dataframe(df)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Data normalization failed: {str(e)}"
        )

    # ── 4. Run full ML pipeline ──────────────────────────────────────────
    summary           = get_summary(df)
    monthly_analytics = get_monthly_analytics(df)
    category_breakdown = get_category_breakdown(df)
    forecast          = get_income_forecast(df)
    recommendation    = get_recommendations(df)

    # Serialize all DataFrame rows — NaN/NaT → None for JSON safety
    transactions = df.where(pd.notnull(df), None).to_dict(orient="records")

    return {
        "transactions":       transactions,
        "summary":            summary,
        "monthly_analytics":  monthly_analytics,
        "category_breakdown": category_breakdown,
        "forecast":           forecast,
        "recommendation":     recommendation,
    }
