"""
recommendation_service.py
──────────────────────────
Production-grade Safe-to-Spend and financial recommendations engine.

Uses the analytcs_service.get_safe_to_spend() logic:
  reserve = emergency_target × monthly_burn × (1 + volatility_factor)
  safe_to_spend = balance - reserve

Never uses manual income/expense sums as the "balance" proxy.
"""

import logging
import pandas as pd

from app.services.analytics_service import (
    get_summary,
    get_monthly_analytics,
    get_safe_to_spend,
)
from app.services.forecast_service import get_income_forecast

logger = logging.getLogger("spendnest.ml.recommendation")


def get_recommendations(df: pd.DataFrame) -> dict:
    """
    Generates Safe-to-Spend, reserve, and financial recommendations.

    Returns a dict with:
      - current_balance        : latest running balance (from balance column)
      - predicted_income       : next-month income forecast
      - recommended_reserve_rate
      - reserved_funds
      - emergency_buffer
      - safe_to_spend
      - message                : human-readable explanation
    """
    if df is None or df.empty:
        return _empty_recommendation()

    # ── 1. Get available balance using formula: income - expenses ────────────────
    # Uses the formula-based latest_balance (NOT the CSV running balance column),
    # to prevent inflated safe-to-spend values from pre-period bank history.
    summary = get_summary(df)
    current_balance = summary.get("latest_balance", 0.0)  # = income - expenses

    # ── 2. Compute average monthly burn (last 3 months of expenses) ───────────
    monthly = get_monthly_analytics(df)
    monthly_expenses = [m["expenses"] for m in monthly if m["expenses"] > 0]

    if monthly_expenses:
        # Weight recent months more (last 3)
        recent = monthly_expenses[-3:]
        if len(recent) >= 3:
            # WMA weights: 0.5 most recent, 0.3 prior, 0.2 oldest
            monthly_burn = (0.5 * recent[-1]) + (0.3 * recent[-2]) + (0.2 * recent[-3])
        else:
            monthly_burn = sum(recent) / len(recent)
    else:
        monthly_burn = 0.0

    # ── 3. Get forecast for volatility and predicted income ───────────────────
    try:
        forecast_data = get_income_forecast(df)
        predicted_income = forecast_data.get("predicted_income", 0.0)
        volatility_score = forecast_data.get("volatility", {}).get("score", 0.0)
        stability_score = forecast_data.get("volatility", {}).get("stability_score", 100.0)
    except Exception as e:
        logger.warning("⚠️ Could not get forecast for recommendations: %s", e)
        predicted_income = 0.0
        volatility_score = 0.0
        stability_score = 100.0

    # ── 4. Determine reserve rate based on income trend and volatility ─────────
    avg_income = summary.get("total_income", 0.0)
    historical_months = max(1, len(monthly))
    avg_monthly_income = avg_income / historical_months

    # Conservative if: forecasted income < historical avg, or high volatility
    if predicted_income > 0 and avg_monthly_income > 0:
        income_trend_ratio = predicted_income / avg_monthly_income
    else:
        income_trend_ratio = 1.0

    if income_trend_ratio < 0.85 or stability_score < 50:
        # Cautious: 25% reserve
        reserve_rate = 0.25
        message = (
            "Your forecasted income is lower than your historical average or income is volatile. "
            "A 25% reserve is recommended to stay financially secure."
        )
    elif stability_score < 75:
        # Moderate: 15% reserve
        reserve_rate = 0.15
        message = (
            "Your income shows moderate variability. "
            "Keeping a 15% reserve helps buffer against unexpected shortfalls."
        )
    else:
        # Stable: standard 10% reserve
        reserve_rate = 0.10
        message = (
            "Your income trend is stable. "
            "A standard 10% reserve is sufficient for your financial profile."
        )

    # ── 5. Compute safe-to-spend using the balance-based model ────────────────
    # RULE: Never floor negative balances with max(0, balance).
    # Negative balance = overdraft. Show it and disable spending.

    is_negative_balance = current_balance < 0
    overdraft_amount    = abs(current_balance) if is_negative_balance else 0.0

    if is_negative_balance:
        # Overdraft state: safe to spend = 0, show explicit warning
        reserved_funds = 0.0
        safe_to_spend  = 0.0
        status = "overdraft"
        message = (
            f"Your account is overdrawn by \u20b9{overdraft_amount:,.0f}. "
            "Immediate action is needed to bring your balance above zero before spending anything."
        )
    else:
        # Positive balance — compute reserve and safe-to-spend normally
        safe_spend_data = get_safe_to_spend(
            balance=current_balance,
            monthly_burn=monthly_burn,
            volatility_score=volatility_score,
            emergency_target_months=1.0,
        )

        reserved_funds = safe_spend_data["reserve"]
        safe_to_spend  = safe_spend_data["safe_to_spend"]   # already max(0, ...) in analytics_service
        status = "ok" if safe_to_spend > 0 else "low_balance"

        if safe_to_spend == 0.0:
            message = (
                f"Your balance (\u20b9{current_balance:,.0f}) is covering your essential month's reserve (\u20b9{reserved_funds:,.0f}). "
                f"Try to increase your balance to see a safe-to-spend surplus."
            )

    # Emergency buffer: 1 month of burn as a dedicated float
    emergency_buffer = round(monthly_burn * 1.0, 2)

    logger.info(
        "\ud83d\udca1 Recommendation \u2192 balance: %.2f | burn: %.2f | safe: %.2f | reserve: %.2f | rate: %.0f%% | status: %s",
        current_balance, monthly_burn, safe_to_spend, reserved_funds, reserve_rate * 100, status
    )

    return {
        "current_balance":          round(current_balance, 2),
        "predicted_income":         round(predicted_income, 2),
        "monthly_burn":             round(monthly_burn, 2),
        "recommended_reserve_rate": reserve_rate,
        "reserved_funds":           round(reserved_funds, 2),
        "emergency_buffer":         emergency_buffer,
        "safe_to_spend":            round(safe_to_spend, 2),
        "message":                  message,
        "volatility_score":         round(volatility_score, 3),
        "stability_score":          round(stability_score, 1),
        # Negative balance metadata — used by frontend for overdraft UI
        "is_negative_balance":      is_negative_balance,
        "overdraft_amount":         round(overdraft_amount, 2),
        "status":                   status,
    }


def _empty_recommendation() -> dict:
    return {
        "current_balance":          0.0,
        "predicted_income":         0.0,
        "monthly_burn":             0.0,
        "recommended_reserve_rate": 0.10,
        "reserved_funds":           0.0,
        "emergency_buffer":         0.0,
        "safe_to_spend":            0.0,
        "message":                  "Please upload a valid bank statement to see recommendations.",
        "volatility_score":         0.0,
        "stability_score":          100.0,
    }
