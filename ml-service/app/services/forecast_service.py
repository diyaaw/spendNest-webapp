import warnings
import numpy as np
import pandas as pd


def get_income_forecast(df: pd.DataFrame) -> dict:
    """
    Predicts next month's income.

    Strategy (in priority order):
      1. ARIMA(1,1,1)  — when ≥ 3 months of income data are available
      2. SMA (3-month) — fallback when data is too sparse or ARIMA fails

    Returns a dict with:
      historical_income  : list of {month, income} dicts
      predicted_month    : label for the predicted month (e.g. "Jun 2025")
      predicted_income   : rounded float
      model_used         : string describing which model produced the number
    """
    # ── 1. Guard: empty or missing date column ───────────────────────────
    if df is None or df.empty or 'date' not in df.columns:
        return {
            "historical_income": [],
            "predicted_month": "Unknown",
            "predicted_income": 0.0,
            "model_used": "none",
        }

    temp_df = df.copy()
    temp_df['date'] = pd.to_datetime(temp_df['date'], errors='coerce')
    temp_df = temp_df.dropna(subset=['date'])

    if temp_df.empty:
        return {
            "historical_income": [],
            "predicted_month": "Unknown",
            "predicted_income": 0.0,
            "model_used": "none",
        }

    # ── 2. Aggregate monthly data ──────────────────────────────────────
    temp_df['month_sort'] = temp_df['date'].dt.to_period('M')

    # SMART INCOME DETECTION: Look for 'income' type OR transactions in the 'salary' category
    income_df = temp_df[(temp_df['type'] == 'income') | (temp_df['category'] == 'salary')]
    
    from app.app import logger
    is_expense_fallback = False
    
    if income_df.empty:
        # Fallback 2: Look for any positive amount that isn't explicitly a 'transfer'
        fallback_df = temp_df[(temp_df['amount'] > 0) & (temp_df['category'] != 'transfer')]
        if not fallback_df.empty:
            logger.info("✨ Using fallback positive-amount detection: Found %d rows", len(fallback_df))
            income_df = fallback_df
        else:
            # Fallback 3: Look for expenses
            expense_df = temp_df[temp_df['type'] == 'expense'].copy()
            if not expense_df.empty:
                logger.warning("🚨 No income found. Switching to EXPENSE mode.")
                is_expense_fallback = True
                income_df = expense_df
                income_df['amount'] = income_df['amount'].abs()
            else:
                # Fallback 4: SUPER FALLBACK - Just take everything that has an amount!
                logger.error("☢️ CRITICAL FALLBACK: Using all transactions for forecast.")
                is_expense_fallback = True
                income_df = temp_df.copy()
                income_df['amount'] = income_df['amount'].abs()

    logger.info("📊 Final Diagnostic: Processing %d rows | Mode: %s", 
                len(income_df), "Expense" if is_expense_fallback else "Income")

    monthly_income = (
        income_df
        .groupby('month_sort')['amount']
        .sum()
        .reset_index()
    )
    
    # Ensure it's sorted by period
    monthly_income = monthly_income.sort_values('month_sort')

    # Build the historical array used by the frontend charts
    historical_data = [
        {
            "month": row['month_sort'].strftime('%b %Y'),
            "income": round(float(row['amount']), 2),
        }
        for _, row in monthly_income.iterrows()
    ]

    # Determine the "next month" label from the latest transaction date
    last_overall_period = temp_df['month_sort'].max()
    predicted_month_label = (last_overall_period + 1).strftime('%b %Y')

    if not historical_data or len(historical_data) < 2:
        return {
            "historical_income": historical_data,
            "predicted_month": predicted_month_label,
            "predicted_income": 0.0,
            "model_used": "none",
            "error": "Insufficient data for forecast. Upload at least 2 months of transactions."
        }

    income_series = np.array([item['income'] for item in historical_data])

    # ── 3. Choose model ──────────────────────────────────────────────────
    predicted_income: float
    model_used: str

    # Cap income_series to last 24 months for better performance/relevance
    if len(income_series) > 24:
        income_series = income_series[-24:]

    if len(income_series) >= 3:
        # ── ARIMA(1,1,1) ─────────────────────────────────────────────────
        try:
            from statsmodels.tsa.arima.model import ARIMA  # lazy import

            # Scaling: ARIMA converges better when values aren't astronomical
            max_val = np.max(np.abs(income_series))
            scale = 1.0
            if max_val > 1000000:
                scale = 1000.0
            
            scaled_series = income_series / scale

            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                # Use a simpler model if ARIMA(1,1,1) is too heavy or fails
                model = ARIMA(scaled_series, order=(1, 1, 1))
                fitted = model.fit()
                forecast_val = fitted.forecast(steps=1)

            predicted_income = float(forecast_val[0]) * scale
            model_used = "ARIMA(1,1,1)"

            # Sanity check: if prediction is negative or absurdly large (> 5x max historical)
            if predicted_income < 0 or predicted_income > (max_val * 5):
                raise ValueError("Absurd prediction")

        except Exception:
            # ARIMA failed (convergence issue, etc.) → SMA
            predicted_income = float(np.mean(income_series[-3:]))
            model_used = "SMA-3 (ARIMA fallback)"
    else:
        # Too few months — SMA over whatever we have
        predicted_income = float(np.mean(income_series))
        model_used = f"SMA-{len(income_series)} (sparse data)"

    return {
        "historical_income": historical_data,
        "predicted_month": predicted_month_label,
        "predicted_income": round(predicted_income, 2),
        "model_used": model_used,
        "is_expense_forecast": is_expense_fallback
    }


