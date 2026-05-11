import pandas as pd
from app.services.analytics_service import get_summary
from app.services.forecast_service import get_income_forecast

def get_recommendations(df: pd.DataFrame) -> dict:
    """
    Generates beginner-friendly financial recommendations for safe spending
    and reserves based on current balance and forecasted income trends.
    """
    if df is None or df.empty:
        return {
            "current_balance": 0.0,
            "predicted_income": 0.0,
            "recommended_reserve_rate": 0.0,
            "reserved_funds": 0.0,
            "safe_to_spend": 0.0,
            "message": "Please upload a valid bank statement to see recommendations."
        }

    # 1. Get current balance and forecasted income using existing services
    summary = get_summary(df)
    current_balance = summary.get("latest_balance", 0.0)
    
    forecast_data = get_income_forecast(df)
    predicted_income = forecast_data.get("predicted_income", 0.0)
    historical_income = forecast_data.get("historical_income", [])
    
    # 2. Calculate the "recent average income" (e.g., across all recorded months)
    total_months = len(historical_income)
    if total_months > 0:
        overall_average_income = sum(month["income"] for month in historical_income) / total_months
    else:
        overall_average_income = 0.0

    # 3. Apply the simple transparent rules
    # If our 3-month forecast is lower than the overall average, we advise caution.
    if predicted_income < overall_average_income:
        reserve_rate = 0.25
        message = "Your forecasted income is trending lower than your historical average. We recommend a conservative 25% reserve to stay safe."
    else:
        reserve_rate = 0.10
        message = "Your income trend is stable or growing. We recommend a standard 10% reserve."

    # 4. Calculate final values
    # Ensure current balance is positive before calculating funds
    effective_balance = max(current_balance, 0.0)
    reserved_funds = effective_balance * reserve_rate
    safe_to_spend = effective_balance - reserved_funds

    return {
        "current_balance": round(current_balance, 2),
        "predicted_income": round(predicted_income, 2),
        "recommended_reserve_rate": reserve_rate,
        "reserved_funds": round(reserved_funds, 2),
        "safe_to_spend": round(safe_to_spend, 2),
        "message": message
    }
