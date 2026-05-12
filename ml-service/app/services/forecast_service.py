"""
forecast_service.py
────────────────────
Production-grade Multi-Stage Forecasting Engine for SpendNest.

Stages
──────
  Stage 1 — Simple Moving Average (SMA)   : 1–2 months of income history
  Stage 2 — Weighted Moving Average (WMA) : 3–5 months, weights [0.5, 0.3, 0.2]
  Stage 3 — ARIMA-style trend model       : 6+ months, with seasonality & trend decomposition

Key Rules
─────────
  • ONLY uses income transactions: salary, payroll, bonus, interest, stipend, freelance, refund
  • NEVER uses expense or balance data as the forecasting source
  • Income forecasts are NEVER allowed to be negative
  • If the only data produces a negative forecast, it is reclassified as "net cash flow" forecast
  • Volatility, stability score, and buffer recommendations are always computed
"""

import logging
import math
import numpy as np
import pandas as pd

logger = logging.getLogger("spendnest.ml.forecast")

# ── Income source categories (only these are used for forecasting) ────────────
INCOME_CATEGORIES = frozenset([
    "salary", "freelance", "interest", "refund", "bonus", "stipend",
])

# ── Income keyword patterns (description-based fallback) ─────────────────────
INCOME_KEYWORDS = [
    "salary", "payroll", "pay roll", "paycredit", "pay credit",
    "bonus", "incentive", "stipend", "fellowship",
    "interest credit", "int cr", "dividend",
    "freelance", "consulting fee", "refund", "cashback", "reversal",
    "income", "earnings", "commission", "reimbursement",
]


def _is_income_row(row) -> bool:
    """
    Returns True if this transaction row represents a true income source.
    Uses category-first, then falls back to keyword-matching on description.
    """
    cat = str(row.get("category", "")).lower().strip()
    if cat in INCOME_CATEGORIES:
        return True

    typ = str(row.get("type", "")).lower()
    desc = str(row.get("description", "")).lower()

    if typ == "income":
        # Exclude generic UPI/transfer-type entries from forecasting
        # unless they have an income keyword in the description
        transfer_markers = ["upi", "neft", "imps", "rtgs", "transfer", "atm"]
        has_transfer = any(m in desc for m in transfer_markers)
        has_income_kw = any(kw in desc for kw in INCOME_KEYWORDS)
        if has_transfer and not has_income_kw:
            return False
        return True

    return False


def _get_monthly_income(df: pd.DataFrame) -> pd.DataFrame:
    """
    Builds a monthly income time series from the DataFrame.
    Returns a DataFrame with columns: month_period (Period), month_label (str), income (float).

    Falls back in tiers:
      T1 — strict income rows (category or keyword)
      T2 — all positive amount rows (if T1 is empty)
      T3 — None (caller handles empty case)
    """
    temp = df.copy()
    temp["date"] = pd.to_datetime(temp["date"], errors="coerce")
    temp = temp.dropna(subset=["date"])

    if temp.empty:
        return pd.DataFrame(columns=["month_period", "month_label", "income"])

    temp["month_period"] = temp["date"].dt.to_period("M")

    # Tier 1: strict income rows
    income_mask = temp.apply(_is_income_row, axis=1)
    income_df = temp[income_mask & (temp["amount"] > 0)]

    fallback_tier = None
    if income_df.empty:
        # Tier 2: all positive rows
        income_df = temp[temp["amount"] > 0]
        fallback_tier = "positive_only"
        if not income_df.empty:
            logger.info("📊 Tier 2 fallback: using all positive-amount rows for forecast")

    if income_df.empty:
        return pd.DataFrame(columns=["month_period", "month_label", "income"])

    monthly = (
        income_df
        .groupby("month_period")["amount"]
        .sum()
        .reset_index()
        .sort_values("month_period")
    )
    monthly["month_label"] = monthly["month_period"].dt.strftime("%b %Y")
    monthly.rename(columns={"amount": "income"}, inplace=True)

    logger.info(
        "📅 Monthly income series: %d data points | Tier: %s",
        len(monthly),
        "income_strict" if fallback_tier is None else fallback_tier
    )
    return monthly[["month_period", "month_label", "income"]]


def _compute_volatility(series: np.ndarray) -> dict:
    """Computes volatility, variance, fluctuation %, and stability score."""
    if len(series) < 2:
        return {
            "score": 0.0,
            "fluctuation_pct": 0.0,
            "variance": 0.0,
            "stability_score": 100.0,
        }

    mean_val = np.mean(series)
    variance = float(np.var(series))
    std_dev = float(np.std(series))

    if mean_val > 0:
        fluctuation_pct = round((std_dev / mean_val) * 100, 1)
        # Stability: 100 - scaled fluctuation (capped at 0-100)
        stability_score = round(max(0.0, min(100.0, 100.0 - (fluctuation_pct * 1.5))), 1)
        volatility_score = round(fluctuation_pct / 100, 3)
    else:
        fluctuation_pct = 0.0
        stability_score = 100.0
        volatility_score = 0.0

    return {
        "score": volatility_score,
        "fluctuation_pct": fluctuation_pct,
        "variance": round(variance, 2),
        "stability_score": stability_score,
    }


def _sma_forecast(series: np.ndarray) -> tuple[float, str]:
    """Stage 1 — Simple Moving Average for 1–2 months."""
    if len(series) == 1:
        return float(series[0]), "Simple Carryover (1 month)"
    avg = float(np.mean(series[-2:]))
    return avg, "Simple Moving Average (SMA)"


def _wma_forecast(series: np.ndarray) -> tuple[float, str, list[float]]:
    """
    Stage 2 — Weighted Moving Average for 3–5 months.
    Weights: [0.5, 0.3, 0.2] for most-recent, one-prior, two-prior.
    """
    weights = [0.5, 0.3, 0.2]
    n = len(series)

    if n == 3:
        predicted = (0.5 * series[-1]) + (0.3 * series[-2]) + (0.2 * series[-3])
        model = "Weighted Moving Average (0.5/0.3/0.2)"
    elif n == 4:
        # Use last 3 of 4 points
        predicted = (0.5 * series[-1]) + (0.3 * series[-2]) + (0.2 * series[-3])
        model = "Weighted Moving Average (0.5/0.3/0.2)"
    else:
        # n == 5: use all three weights
        predicted = (0.5 * series[-1]) + (0.3 * series[-2]) + (0.2 * series[-3])
        model = "Weighted Moving Average (0.5/0.3/0.2)"

    # Compute smoothed history
    smoothed = []
    for i in range(len(series)):
        if i >= 2:
            sv = (0.5 * series[i]) + (0.3 * series[i - 1]) + (0.2 * series[i - 2])
        else:
            sv = float(series[i])
        smoothed.append(round(sv, 2))

    return float(predicted), model, smoothed


def _arima_style_forecast(series: np.ndarray) -> tuple[float, str, list[float]]:
    """
    Stage 3 — ARIMA-style trend + seasonality model for 6+ months.

    Implements:
      - Linear trend via least-squares regression
      - Monthly seasonality decomposition (if 12+ months available)
      - Exponential smoothing alpha=0.3 for residuals
      - Blends trend + seasonal index + smoothed WMA

    Returns (predicted_value, model_label, smoothed_series).
    """
    n = len(series)

    # ── Linear trend (OLS) ────────────────────────────────────────────────────
    x = np.arange(n, dtype=float)
    slope, intercept = np.polyfit(x, series, 1)
    trend_next = intercept + slope * n  # predict for position n (next month)

    # ── Seasonal index (if 12+ months) ────────────────────────────────────────
    seasonal_adjustment = 0.0
    if n >= 12:
        # Compute monthly averages relative to overall mean
        overall_mean = np.mean(series)
        seasonal_indices = {}
        for i, val in enumerate(series):
            month_idx = i % 12
            if month_idx not in seasonal_indices:
                seasonal_indices[month_idx] = []
            seasonal_indices[month_idx].append(val)

        next_month_idx = n % 12
        if next_month_idx in seasonal_indices:
            season_mean = np.mean(seasonal_indices[next_month_idx])
            seasonal_adjustment = season_mean - overall_mean

    # ── Exponential smoothing on the last 6 values ────────────────────────────
    alpha = 0.3
    smoothed_val = float(series[-6])
    for v in series[-5:]:
        smoothed_val = alpha * float(v) + (1 - alpha) * smoothed_val

    # ── WMA component ─────────────────────────────────────────────────────────
    wma = (0.5 * series[-1]) + (0.3 * series[-2]) + (0.2 * series[-3])

    # ── Blend: 40% trend, 35% WMA, 25% exponential smooth ────────────────────
    blended = (0.40 * trend_next) + (0.35 * wma) + (0.25 * smoothed_val) + seasonal_adjustment

    # Compute smoothed history
    smoothed_history = []
    es = float(series[0])
    for v in series:
        es = alpha * float(v) + (1 - alpha) * es
        smoothed_history.append(round(es, 2))

    model_label = f"ARIMA-style (Trend + WMA + ES, α={alpha})"
    if n >= 12:
        model_label += " + Seasonality"

    return float(blended), model_label, smoothed_history


def _compute_buffer_recommendation(volatility_score: float, is_expense_forecast: bool) -> dict:
    """Computes adaptive savings and tax reserve percentages based on volatility."""
    base_savings = 0.20  # 20%
    base_tax = 0.15      # 15%

    if is_expense_forecast:
        # Conservative when in fallback mode
        return {
            "emergency_savings_pct": 25.0,
            "tax_reserve_pct": base_tax * 100,
        }

    # Scale emergency buffer with volatility (up to 50% extra)
    instability = volatility_score * 0.5
    final_savings = min(0.50, base_savings + instability)

    return {
        "emergency_savings_pct": round(final_savings * 100, 1),
        "tax_reserve_pct": round(base_tax * 100, 1),
    }


def _generate_insights(
    series: np.ndarray,
    predicted: float,
    volatility: dict,
    predicted_month: str,
    model: str,
    is_expense_forecast: bool,
) -> list[str]:
    """Generates explainable, data-driven AI insights from the forecast."""
    insights = []
    mean_income = float(np.mean(series)) if len(series) > 0 else 0.0
    stability = volatility["stability_score"]
    fluctuation = volatility["fluctuation_pct"]

    # Model explanation
    insights.append(
        f"Forecast generated using {model} on {len(series)} month(s) of data."
    )

    # Stability insights
    if stability >= 85:
        insights.append("✅ Income stability is high. Consider investing surplus funds.")
    elif stability >= 60:
        insights.append(
            f"📊 Moderate income stability ({stability:.0f}%). "
            "Build a 3-month emergency buffer."
        )
    else:
        insights.append(
            f"⚠️ High income volatility detected ({fluctuation:.1f}% fluctuation). "
            "Consider a 6-month emergency fund."
        )

    # Prediction vs. historical comparison
    if mean_income > 0 and predicted > 0:
        diff_pct = ((predicted - mean_income) / mean_income) * 100
        if diff_pct < -15:
            insights.append(
                f"📉 Predicted income for {predicted_month} is "
                f"{abs(diff_pct):.1f}% below your historical average."
            )
        elif diff_pct > 15:
            insights.append(
                f"📈 Predicted income for {predicted_month} is "
                f"{diff_pct:.1f}% above your historical average. "
                "Consider investing the surplus."
            )
        else:
            insights.append(
                f"📊 Predicted income for {predicted_month} is in line with your average."
            )

    # Expense fallback warning
    if is_expense_forecast:
        insights.append(
            "⚠️ No dedicated income sources detected. "
            "This is a net cash flow forecast, not an income forecast."
        )

    return insights


def get_income_forecast(df: pd.DataFrame) -> dict:
    """
    Main forecasting entry point.

    Selects the appropriate model stage based on available data:
      Stage 1 (SMA):   1–2 months
      Stage 2 (WMA):   3–5 months
      Stage 3 (ARIMA): 6+ months

    Always returns a valid dict — never raises.
    """
    # ── Guard ─────────────────────────────────────────────────────────────────
    if df is None or df.empty or "date" not in df.columns:
        logger.warning("⚠️ forecast: empty DataFrame received")
        return _empty_forecast()

    # ── Build monthly income series ────────────────────────────────────────────
    monthly_df = _get_monthly_income(df)

    if monthly_df.empty:
        logger.warning("⚠️ forecast: no income rows found in DataFrame")
        return _empty_forecast()

    series = monthly_df["income"].values.astype(float)
    n = len(series)

    # ── Labels ────────────────────────────────────────────────────────────────
    last_period = monthly_df["month_period"].iloc[-1]
    predicted_month_label = (last_period + 1).strftime("%b %Y")

    historical_data = [
        {"month": row["month_label"], "income": round(float(row["income"]), 2)}
        for _, row in monthly_df.iterrows()
    ]

    # ── Check if this is an expense-only fallback ────────────────────────────
    is_expense_forecast = False
    income_mask = df.apply(_is_income_row, axis=1) & (df["amount"] > 0)
    if not income_mask.any():
        is_expense_forecast = True

    # ── Stage selection ────────────────────────────────────────────────────────
    smoothed_data = []

    if n >= 6:
        # Stage 3: ARIMA-style
        predicted_income, model_used, smoothed_vals = _arima_style_forecast(series)
        smoothed_data = [
            {"month": historical_data[i]["month"], "value": v}
            for i, v in enumerate(smoothed_vals)
        ]
        logger.info("🔬 Stage 3 (ARIMA-style) activated: %d months → %.2f", n, predicted_income)

    elif n >= 3:
        # Stage 2: WMA
        predicted_income, model_used, smoothed_vals = _wma_forecast(series)
        smoothed_data = [
            {"month": historical_data[i]["month"], "value": v}
            for i, v in enumerate(smoothed_vals)
        ]
        logger.info("⚖️ Stage 2 (WMA) activated: %d months → %.2f", n, predicted_income)

    else:
        # Stage 1: SMA
        predicted_income, model_used = _sma_forecast(series)
        smoothed_data = [
            {"month": d["month"], "value": d["income"]}
            for d in historical_data
        ]
        logger.info("📐 Stage 1 (SMA) activated: %d months → %.2f", n, predicted_income)

    # ── Enforce non-negative income forecast ──────────────────────────────────
    if predicted_income < 0:
        logger.warning(
            "⚠️ Predicted income %.2f is negative — reclassifying as net cash flow forecast",
            predicted_income
        )
        is_expense_forecast = True
        # Do NOT zero it out — keep the value but flag it
        model_used = f"Net Cash Flow {model_used}"

    predicted_income = round(predicted_income, 2)

    # ── Volatility ────────────────────────────────────────────────────────────
    volatility = _compute_volatility(series)

    # ── Buffer recommendation ─────────────────────────────────────────────────
    buffer_recommendation = _compute_buffer_recommendation(
        volatility["score"], is_expense_forecast
    )

    # ── Insights ──────────────────────────────────────────────────────────────
    insights = _generate_insights(
        series, predicted_income, volatility,
        predicted_month_label, model_used, is_expense_forecast
    )

    logger.info(
        "✅ Forecast complete | model=%s | predicted=%.2f | months=%s",
        model_used, predicted_income, predicted_month_label
    )

    return {
        "historical_income":    historical_data,
        "smoothed_income":      smoothed_data,
        "predicted_month":      predicted_month_label,
        "predicted_income":     predicted_income,
        "model_used":           model_used,
        "stages_available":     n,
        "is_expense_forecast":  is_expense_forecast,
        "volatility":           volatility,
        "buffer_recommendation": buffer_recommendation,
        "insights":             insights,
    }


def _empty_forecast() -> dict:
    """Returns a safe empty forecast response."""
    return {
        "historical_income":    [],
        "smoothed_income":      [],
        "predicted_month":      "Insufficient Data",
        "predicted_income":     0.0,
        "model_used":           "none",
        "stages_available":     0,
        "is_expense_forecast":  False,
        "volatility": {
            "score": 0.0,
            "fluctuation_pct": 0.0,
            "stability_score": 0.0,
            "variance": 0.0,
        },
        "buffer_recommendation": {
            "emergency_savings_pct": 20.0,
            "tax_reserve_pct": 15.0,
        },
        "insights": [
            "Upload at least 1 month of bank statement data to generate forecasts.",
        ],
    }
