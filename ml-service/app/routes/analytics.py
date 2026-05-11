from fastapi import APIRouter, HTTPException
from app.services.store import current_data
from app.services.analytics_service import get_summary, get_monthly_analytics, get_category_breakdown
from app.services.forecast_service import get_income_forecast
from app.services.recommendation_service import get_recommendations

router = APIRouter(tags=["analytics"])

def get_df():
    """Helper to check if data exists in memory."""
    df = current_data.get("df")
    if df is None or df.empty:
        raise HTTPException(status_code=400, detail="No data uploaded yet. Please upload a CSV first.")
    return df

@router.get("/summary")
def summary():
    """Returns high-level totals and balances."""
    df = get_df()
    return get_summary(df)

@router.get("/monthly-analytics")
def monthly_analytics():
    """Returns income, expenses, and savings grouped by month."""
    df = get_df()
    return get_monthly_analytics(df)

@router.get("/category-breakdown")
def category_breakdown():
    """Returns total spending divided by category for pie charts."""
    df = get_df()
    return get_category_breakdown(df)

@router.get("/income-forecast")
def income_forecast():
    """Predicts next month's income based on 3-month simple moving average."""
    df = get_df()
    return get_income_forecast(df)

@router.get("/recommendation")
def recommendation():
    """Provides a safe-to-spend suggestion based on balances and forecasted income."""
    df = get_df()
    return get_recommendations(df)

@router.get("/transactions")
def all_transactions():
    """Returns the full normalized transaction list."""
    df = get_df()
    return df.to_dict(orient="records")
