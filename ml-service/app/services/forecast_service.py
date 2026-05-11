import logging
import numpy as np
import pandas as pd

# ── Logger setup ────────────────────────────────────────────────────────────
logger = logging.getLogger("flowshield.ml.forecast")

def get_income_forecast(df: pd.DataFrame) -> dict:
    """
    Implements a specific Weighted Moving Average (WMA) forecasting engine
    with Volatility and Stability Analytics.

    Formula: Forecast = 0.5(current) + 0.3(prev) + 0.2(older)
    """
    # ── 1. Guard: empty or missing data ──────────────────────────────────
    if df is None or df.empty or 'date' not in df.columns:
        return _empty_forecast()

    temp_df = df.copy()
    temp_df['date'] = pd.to_datetime(temp_df['date'], errors='coerce')
    temp_df = temp_df.dropna(subset=['date'])

    if temp_df.empty:
        return _empty_forecast()

    # ── 2. Aggregate monthly income ──────────────────────────────────────
    temp_df['month_sort'] = temp_df['date'].dt.to_period('M')

    # TIER 1: Strict Income Detection (Salary or Income type, excluding transfers)
    income_df = temp_df[((temp_df['type'] == 'income') | (temp_df['category'] == 'salary')) & (temp_df['category'] != 'transfer')]
    
    is_expense_fallback = False
    
    if income_df.empty:
        # TIER 2: Fallback to all positive amounts (including transfers if that's all we have)
        positive_df = temp_df[temp_df['amount'] > 0]
        if not positive_df.empty:
            logger.info("✨ No strict income found. Falling back to all positive transactions.")
            income_df = positive_df
        else:
            # TIER 3: Fallback to expense forecasting if no positive amounts exist
            expense_df = temp_df[temp_df['type'] == 'expense'].copy()
            if not expense_df.empty:
                logger.warning("🚨 No income/positive amounts found. Switching to EXPENSE mode.")
                is_expense_fallback = True
                income_df = expense_df
                income_df['amount'] = income_df['amount'].abs()
            else:
                return _empty_forecast()

    monthly_income = (
        income_df
        .groupby('month_sort')['amount']
        .sum()
        .reset_index()
        .sort_values('month_sort')
    )

    historical_data = [
        {
            "month": row['month_sort'].strftime('%b %Y'),
            "income": round(float(row['amount']), 2),
        }
        for _, row in monthly_income.iterrows()
    ]

    # Labels
    last_overall_period = temp_df['month_sort'].max()
    predicted_month_label = (last_overall_period + 1).strftime('%b %Y')

    income_series = np.array([item['income'] for item in historical_data])
    
    # ── 3. Volatility Analytics ───────────────────────────────────────────
    # Volatility = Standard Deviation of monthly income / Mean
    volatility_score = 0.0
    variance = 0.0
    stability_score = 100.0
    fluctuation_pct = 0.0

    if len(income_series) >= 2:
        mean_income = np.mean(income_series)
        variance = np.var(income_series)
        std_dev = np.std(income_series)
        
        if mean_income > 0:
            fluctuation_pct = (std_dev / mean_income) * 100
            # Stability score: 100 - (fluctuation scaled to 0-100)
            stability_score = max(0, min(100, 100 - (fluctuation_pct * 1.5)))
            volatility_score = fluctuation_pct / 100

    # ── 4. Weighted Moving Average Forecast ────────────────────────────────
    # Forecast = 0.5(current) + 0.3(prev) + 0.2(older)
    predicted_income = 0.0
    model_used = "Weighted Moving Average (0.5/0.3/0.2)"
    smoothed_data = []

    if len(income_series) >= 3:
        # Full WMA
        current = income_series[-1]
        prev = income_series[-2]
        older = income_series[-3]
        predicted_income = (0.5 * current) + (0.3 * prev) + (0.2 * older)
        
        # Calculate smoothed history for chart
        for i in range(len(income_series)):
            if i >= 2:
                smooth = (0.5 * income_series[i]) + (0.3 * income_series[i-1]) + (0.2 * income_series[i-2])
                smoothed_data.append({"month": historical_data[i]["month"], "value": round(float(smooth), 2)})
            else:
                smoothed_data.append({"month": historical_data[i]["month"], "value": historical_data[i]["income"]})

    elif len(income_series) == 2:
        # Fallback for 2 months: 0.6 / 0.4 split
        predicted_income = (0.6 * income_series[-1]) + (0.4 * income_series[-2])
        model_used = "Weighted Average (0.6/0.4)"
    elif len(income_series) == 1:
        predicted_income = income_series[0]
        model_used = "Simple Carryover"

    # ── 5. Adaptive Buffer Recommendation ──────────────────────────────────
    # Base rates
    base_savings = 0.20 # 20%
    base_tax = 0.15 # 15%
    
    # Scale based on instability (volatility_score)
    # If volatility is high, we increase the emergency savings buffer
    instability_adjustment = volatility_score * 0.5 # Add up to 50% more if volatile
    
    final_savings_pct = min(0.50, base_savings + instability_adjustment)
    final_tax_pct = base_tax # Keep tax relatively flat unless income bracket changes
    
    # ── 6. AI Insight Generation ──────────────────────────────────────────
    insights = []
    if stability_score > 80:
        insights.append("Income stability is high. Consider investing surplus.")
    elif stability_score < 40:
        insights.append("High income volatility detected. Increasing safety buffer.")
    
    if predicted_income < (np.mean(income_series) * 0.8) if len(income_series) > 0 else False:
        insights.append(f"Predicted low-income month ahead in {predicted_month_label}.")
    
    insights.append(f"Recommended savings adjusted to {round(final_savings_pct * 100)}% based on volatility.")

    return {
        "historical_income": historical_data,
        "smoothed_income": smoothed_data,
        "predicted_month": predicted_month_label,
        "predicted_income": round(predicted_income, 2),
        "model_used": model_used,
        "volatility": {
            "score": round(float(volatility_score), 3),
            "fluctuation_pct": round(float(fluctuation_pct), 1),
            "variance": round(float(variance), 2),
            "stability_score": round(float(stability_score), 1)
        },
        "buffer_recommendation": {
            "emergency_savings_pct": round(final_savings_pct * 100, 1),
            "tax_reserve_pct": round(final_tax_pct * 100, 1)
        },
        "insights": insights,
        "is_expense_forecast": is_expense_fallback
    }

def _empty_forecast():
    return {
        "historical_income": [],
        "smoothed_income": [],
        "predicted_month": "Unknown",
        "predicted_income": 0.0,
        "model_used": "none",
        "volatility": {"score": 0, "fluctuation_pct": 0, "stability_score": 0},
        "buffer_recommendation": {"emergency_savings_pct": 20, "tax_reserve_pct": 15},
        "insights": ["Not enough data for insights."]
    }


