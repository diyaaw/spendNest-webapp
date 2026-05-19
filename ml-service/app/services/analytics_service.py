"""
analytics_service.py
─────────────────────
Production-grade analytics engine for SpendNest.

All calculations follow these invariants:
  - income          = SUM(amount) WHERE amount > 0 AND type == 'income'
  - expenses        = SUM(ABS(amount)) WHERE amount < 0 AND type == 'expense'
  - latest_balance  = total_income - total_expenses  (Opening Balance + Income - Expenses)
  - csv_balance     = last non-zero value in the balance column (reference only)
  - Monthly metrics are always filtered by exact month/year - never cumulative

Anomaly detection uses per-category z-score with a 2.5-sigma threshold.
"""

import logging
import numpy as np
import pandas as pd

logger = logging.getLogger("spendnest.ml.analytics")


# ─── Summary ─────────────────────────────────────────────────────────────────

def get_summary(df: pd.DataFrame) -> dict:
    """
    Calculates overall financial metrics from the full transaction history.

    Rules:
      - income         = SUM of positive amounts where type == 'income'
      - expenses       = SUM of ABS(negative amounts) where type == 'expense'
      - latest_balance = total_income - total_expenses  (formula-based, not CSV column)
      - csv_balance    = last non-zero balance column value (reference only)
    """
    empty = {
        "total_income": 0.0,
        "total_expenses": 0.0,
        "total_savings": 0.0,
        "latest_balance": 0.0,
        "csv_balance": None,
        "total_transactions": 0,
        "income_transactions": 0,
        "expense_transactions": 0,
    }

    if df is None or df.empty:
        return empty



    # Type-based, sign-agnostic: abs() works for both positive-expense and negative-expense CSVs
    income_rows  = df[df["type"] == "income"]
    expense_rows = df[df["type"] == "expense"]
    total_income   = float(income_rows["amount"].abs().sum())
    total_expenses = float(expense_rows["amount"].abs().sum())

    total_savings = total_income - total_expenses

    # Available Balance = Opening Balance (0) + Income - Expenses
    available_balance = total_savings

    # CSV running balance - preserved for overdraft detection / debugging only
    csv_balance = None
    if "balance" in df.columns:
        valid_balances = df[df["balance"] != 0.0]["balance"].dropna()
        if not valid_balances.empty:
            # Sort by date if available, then take the last balance
            if "date" in df.columns:
                df_sorted = df.sort_values("date")
                bal_col = df_sorted[df_sorted["balance"] != 0.0]["balance"].dropna()
                csv_balance = float(bal_col.iloc[-1]) if not bal_col.empty else float(valid_balances.iloc[-1])
            else:
                csv_balance = float(valid_balances.iloc[-1])

    # Sanity guard: warn if CSV balance deviates > 150% from formula
    if csv_balance is not None and total_income > 0:
        deviation = abs(csv_balance - available_balance) / total_income
        if deviation > 1.5:
            logger.warning(
                "⚠️  Balance discrepancy — CSV: %.2f, Formula: %.2f, deviation %.0f%% > 150%%. "
                "Using formula value as latest_balance.",
                csv_balance, available_balance, deviation * 100
            )

    logger.info(
        "📊 Summary → income: %.2f | expenses: %.2f | available_balance: %.2f | csv_balance: %s | rows: %d",
        total_income, total_expenses, available_balance,
        f"{csv_balance:.2f}" if csv_balance is not None else "N/A", len(df)
    )

    # 🚩 Suspicious balance guard
    # Flag when formula balance > 1.5× total income — possible imported opening
    # balance, retained earnings from prior periods, or a sign/classification error.
    balance_suspicious = bool(total_income > 0 and available_balance > total_income * 1.5)
    if balance_suspicious:
        logger.warning(
            "\u26a0\ufe0f  Suspicious balance: %.2f > 1.5 \u00d7 total_income (%.2f). "
            "Possible: imported opening balance, retained earnings, or sign error.",
            available_balance, total_income * 1.5
        )

    return {
        "total_income":         round(total_income, 2),
        "total_expenses":       round(total_expenses, 2),
        "total_savings":        round(total_savings, 2),
        "latest_balance":       round(available_balance, 2),  # formula-based
        "csv_balance":          round(csv_balance, 2) if csv_balance is not None else None,
        "balance_suspicious":   balance_suspicious,
        "total_transactions":   int(len(df)),
        "income_transactions":  int(len(income_rows)),
        "expense_transactions": int(len(expense_rows)),
    }


# ─── Monthly Analytics ────────────────────────────────────────────────────────

def get_monthly_analytics(df: pd.DataFrame) -> list:
    """
    Aggregates income and expenses grouped by calendar month.

    Each month is filtered in isolation — never cumulative.
    """
    if df is None or df.empty or "date" not in df.columns:
        return []

    cols = [c for c in ["date", "type", "amount"] if c in df.columns]
    temp = df[cols].copy()
    temp["date"] = pd.to_datetime(temp["date"], errors="coerce")
    temp = temp.dropna(subset=["date"])

    if temp.empty:
        return []
    temp["month_period"] = temp["date"].dt.to_period("M")
    temp["month_display"] = temp["date"].dt.strftime("%b %Y")

    monthly_data = []

    # Group by sortable period to maintain chronological order
    for period, group in temp.groupby("month_period"):
        month_name = period.strftime("%b %Y")

        # Type-based, sign-agnostic (abs handles positive-expense datasets)
        income   = float(group[group["type"] == "income" ]["amount"].abs().sum())
        expenses = float(group[group["type"] == "expense"]["amount"].abs().sum())

        savings = income - expenses

        monthly_data.append({
            "month":    month_name,
            "income":   round(income, 2),
            "expenses": round(expenses, 2),
            "savings":  round(savings, 2),
        })

    return monthly_data


# ─── This Month Metrics ───────────────────────────────────────────────────────

def get_current_month_metrics(df: pd.DataFrame) -> dict:
    """
    Returns income, expenses, and net savings for the ACTIVE month.

    Active month priority:
      1. Current calendar month (if data exists for it)
      2. Latest month present in the dataset (CSV may be historical)

    Income fallback (two-tier):
      1. SUM(amount) WHERE type == 'income' AND amount > 0
      2. If result is 0: SUM(amount) WHERE amount > 0  (all positive rows)
         This handles cases where the categorizer misses salary/credit rows.
    """
    empty = {"income": 0.0, "expenses": 0.0, "savings": 0.0, "label": ""}

    if df is None or df.empty or "date" not in df.columns:
        return empty

    cols = [c for c in ["date", "type", "amount"] if c in df.columns]
    temp = df[cols].copy()
    temp["date"] = pd.to_datetime(temp["date"], errors="coerce")
    temp = temp.dropna(subset=["date"])

    if temp.empty:
        return empty

    # RULE: ALWAYS use the latest month present in the dataset for the label.
    # NEVER use datetime.now() — the server clock does not reflect the CSV data.
    latest_period = temp["date"].dt.to_period("M").max()
    dataset_latest_label = latest_period.strftime("%B %Y")

    current_month_mask = (
        (temp["date"].dt.year  == latest_period.year) &
        (temp["date"].dt.month == latest_period.month)
    )
    current_month_df = temp[current_month_mask]
    label = dataset_latest_label  # always dataset-driven, never datetime.now()

    logger.info(
        "Dataset label resolved: '%s' (latest period in data, server clock ignored)",
        label,
    )

    if current_month_df.empty:
        return empty

    # ── Income: type-based, sign-agnostic (Tier 1 = typed rows, Tier 2 = all non-expense) ──
    income_rows_cm = current_month_df[current_month_df["type"] == "income"]
    income = float(income_rows_cm["amount"].abs().sum())

    # Tier 2 fallback: if no typed income, use all non-expense rows with abs(amount) > 0
    if income == 0.0:
        income = float(
            current_month_df[current_month_df["type"] != "expense"]["amount"].abs().sum()
        )

    # ── Expenses: type-based, sign-agnostic ───────────────────────────────────
    expense_rows_cm = current_month_df[current_month_df["type"] == "expense"]
    expenses = float(expense_rows_cm["amount"].abs().sum())

    # Validation guard: warn if both are 0 but rows exist
    if income == 0.0 and expenses == 0.0 and not current_month_df.empty:
        logger.warning(
            "Both income and expenses are 0 for %s despite %d rows existing. "
            "Type distribution: %s",
            label, len(current_month_df),
            current_month_df["type"].value_counts().to_dict()
        )

    logger.info(
        "\U0001f4c5 Current-month [%s] \u2192 income: %.2f | expenses: %.2f | savings: %.2f",
        label, income, expenses, income - expenses
    )

    return {
        "income":   round(income,   2),
        "expenses": round(expenses, 2),
        "savings":  round(income - expenses, 2),
        "label":    label,
    }




# ─── Category Breakdown ───────────────────────────────────────────────────────

def get_category_breakdown(df: pd.DataFrame) -> list:
    """Calculates total spending per expense category (sorted highest → lowest)."""
    if df is None or df.empty or "category" not in df.columns:
        return []

    # Type-based, sign-agnostic — handles positive-expense datasets
    cols = [c for c in ["category", "type", "amount"] if c in df.columns]
    _df = df[cols].copy()
    expense_df = _df[_df["type"] == "expense"]
    if expense_df.empty:
        return []

    grouped = (
        expense_df
        .groupby("category")["amount"]
        .apply(lambda x: x.abs().sum())
        .reset_index()
        .sort_values("amount", ascending=False)
    )

    # Filter out zero-amount categories
    grouped = grouped[grouped["amount"] > 0]

    return [
        {"name": row["category"].title(), "value": round(float(row["amount"]), 2)}
        for _, row in grouped.iterrows()
    ]


# ─── Subscription Detection ───────────────────────────────────────────────────

def detect_subscriptions(df: pd.DataFrame) -> list:
    """
    Detects recurring subscription payments from transaction history.

    Criteria:
      - Same merchant / description (normalized)
      - Appears >= 2 times (flags at 2, marks as confirmed at 3+)
      - Recurrence interval ≈ 25–35 days (monthly cadence)

    Returns a list of detected subscriptions with monthly and yearly cost.
    """
    if df is None or df.empty or "description" not in df.columns:
        return []

    cols = [c for c in ["date", "type", "amount", "description"] if c in df.columns]
    temp = df[cols].copy()
    temp["date"] = pd.to_datetime(temp["date"], errors="coerce")
    temp = temp.dropna(subset=["date"])

    # Type-based, sign-agnostic — minimum abs(amount) >= 50 to filter micro-charges
    expense_df = temp[
        (temp["type"] == "expense") & (temp["amount"].abs() >= 50)
    ].copy()
    expense_df["amount"] = expense_df["amount"].abs()  # normalize to positive

    if expense_df.empty:
        return []

    # Normalize descriptions
    expense_df["desc_norm"] = (
        expense_df["description"]
        .str.lower()
        .str.replace(r"[^a-z0-9]", " ", regex=True)
        .str.split()
        .apply(lambda tokens: " ".join(tokens[:4]) if tokens else "")  # first 4 words
    )

    from collections import defaultdict
    prefix_groups = defaultdict(list)
    for _, row in expense_df.iterrows():
        key = row["desc_norm"]
        if not key or len(key) < 4:
            continue
        prefix_groups[key[:6]].append(row)

    groups = {}
    for prefix, rows in prefix_groups.items():
        for row in rows:
            key = row["desc_norm"]
            amount = abs(float(row["amount"]))
            date = row["date"]

            matched_key = None
            for gk, g in groups.items():
                if gk.startswith(prefix):
                    base = g["base_amount"]
                    if base > 0 and abs(base - amount) / base <= 0.10:
                        matched_key = gk
                        break

            if matched_key is None:
                matched_key = f"{key}_{round(amount)}"
                groups[matched_key] = {
                    "description": str(row["description"]),
                    "base_amount": amount,
                    "amounts": [],
                    "dates": [],
                }

            groups[matched_key]["amounts"].append(amount)
            groups[matched_key]["dates"].append(date)

    subscriptions = []
    for key, g in groups.items():
        dates = sorted(g["dates"])
        if len(dates) < 2:
            continue

        # Calculate average gap between occurrences
        gaps = [
            (dates[i] - dates[i - 1]).days
            for i in range(1, len(dates))
        ]
        avg_gap = sum(gaps) / len(gaps)

        # Is it approximately monthly? (25–40 days)
        is_monthly = 25 <= avg_gap <= 40

        # Flag even non-monthly if appears 3+ times
        if len(dates) < 3 and not is_monthly:
            continue

        avg_amount = sum(g["amounts"]) / len(g["amounts"])

        if is_monthly:
            frequency = "monthly"
            monthly_cost = avg_amount
            yearly_cost = avg_amount * 12
        elif avg_gap <= 9:
            frequency = "weekly"
            monthly_cost = avg_amount * 4.33
            yearly_cost = avg_amount * 52
        elif avg_gap <= 20:
            frequency = "biweekly"
            monthly_cost = avg_amount * 2.17
            yearly_cost = avg_amount * 26
        elif avg_gap <= 100:
            frequency = "quarterly"
            monthly_cost = avg_amount / 3
            yearly_cost = avg_amount * 4
        else:
            frequency = "annual"
            monthly_cost = avg_amount / 12
            yearly_cost = avg_amount

        subscriptions.append({
            "description":    g["description"],
            "amount":         round(avg_amount, 2),
            "frequency":      frequency,
            "monthly_cost":   round(monthly_cost, 2),
            "yearly_cost":    round(yearly_cost, 2),
            "occurrences":    len(dates),
            "first_seen":     dates[0].strftime("%Y-%m-%d"),
            "last_seen":      dates[-1].strftime("%Y-%m-%d"),
            "avg_gap_days":   round(avg_gap, 1),
            "is_confirmed":   len(dates) >= 3,
        })

    # Sort by monthly cost descending
    subscriptions.sort(key=lambda x: x["monthly_cost"], reverse=True)

    logger.info("🔁 Subscription detection: found %d recurring patterns", len(subscriptions))
    return subscriptions


# ─── Emergency Fund Analysis ──────────────────────────────────────────────────

def get_emergency_fund_analysis(df: pd.DataFrame, current_savings: float = 0.0) -> dict:
    """
    Computes emergency fund readiness metrics.

    Formula:
      monthlyBurn = average of last 3 months' expenses
      emergencyMonths = current_savings / monthlyBurn
      target = 6 × monthlyBurn (6 months recommended)
    """
    if df is None or df.empty:
        return _empty_emergency_fund()

    cols = [c for c in ["date", "type", "amount", "balance"] if c in df.columns]
    temp = df[cols].copy()
    temp["date"] = pd.to_datetime(temp["date"], errors="coerce")
    temp = temp.dropna(subset=["date"])

    # Get last 3 months of expense data
    temp["month_period"] = temp["date"].dt.to_period("M")
    periods = sorted(temp["month_period"].unique())

    monthly_expenses = []
    for p in periods[-3:]:  # last 3 months
        month_data = temp[temp["month_period"] == p]
        expense = float(
            month_data[(month_data["type"] == "expense") & (month_data["amount"] < 0)]["amount"].abs().sum()
        )
        monthly_expenses.append(expense)

    if not monthly_expenses or all(e == 0 for e in monthly_expenses):
        return _empty_emergency_fund()

    monthly_burn = sum(monthly_expenses) / len(monthly_expenses)
    target_savings = monthly_burn * 6  # 6-month target

    if current_savings <= 0:
        # Try to infer from the latest balance
        if "balance" in df.columns:
            valid = df[df["balance"] > 0]["balance"]
            if not valid.empty:
                current_savings = float(valid.iloc[-1])

    runway_months = (current_savings / monthly_burn) if monthly_burn > 0 else 0.0

    # Readiness score: 100 = 6+ months, scaled linearly below
    readiness_score = min(100.0, (runway_months / 6.0) * 100.0)

    # Risk level
    if runway_months >= 6:
        risk = "excellent"
    elif runway_months >= 3:
        risk = "healthy"
    elif runway_months >= 1:
        risk = "moderate"
    elif runway_months > 0:
        risk = "low"
    else:
        risk = "critical"

    gap = max(0.0, target_savings - current_savings)
    monthly_contribution_needed = gap / 12 if gap > 0 else 0.0

    return {
        "monthly_burn":               round(monthly_burn, 2),
        "current_savings":            round(current_savings, 2),
        "runway_months":              round(runway_months, 1),
        "target_savings":             round(target_savings, 2),
        "readiness_score":            round(readiness_score, 1),
        "risk_level":                 risk,
        "gap_to_target":              round(gap, 2),
        "monthly_contribution_needed": round(monthly_contribution_needed, 2),
        "months_of_expense_data":     len(monthly_expenses),
    }


def _empty_emergency_fund() -> dict:
    return {
        "monthly_burn": 0.0,
        "current_savings": 0.0,
        "runway_months": 0.0,
        "target_savings": 0.0,
        "readiness_score": 0.0,
        "risk_level": "critical",
        "gap_to_target": 0.0,
        "monthly_contribution_needed": 0.0,
        "months_of_expense_data": 0,
    }


# ─── Anomaly Detection ────────────────────────────────────────────────────────

def get_anomaly_flags(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detects anomalous expense transactions using per-category z-score.
    Threshold: mean + 2.5σ (or 3× mean if std is too small).
    Requires at least 5 transactions per category.
    """
    if df is None or df.empty or "amount" not in df.columns:
        return df

    result = df.copy()
    result["is_anomaly"] = False

    expense_df = result[(result["type"] == "expense") & (result["amount"] < 0)]
    if expense_df.empty:
        return result

    for category in expense_df["category"].unique():
        cat_mask = (result["type"] == "expense") & (result["category"] == category)
        cat_subset = result[cat_mask]

        if len(cat_subset) < 5:
            continue

        abs_amounts = cat_subset["amount"].abs()
        mean = float(abs_amounts.mean())
        std = float(abs_amounts.std())

        # Use 2.5σ threshold with a floor of 3× the mean
        threshold = max(mean + (2.5 * std), mean * 3.0) if std > 0 else mean * 3.0

        anomaly_idx = cat_subset[abs_amounts > threshold].index
        if len(anomaly_idx) > 0:
            result.loc[anomaly_idx, "is_anomaly"] = True
            logger.info(
                "🚨 Anomaly: %d outliers in category '%s' (threshold: %.2f)",
                len(anomaly_idx), category, threshold
            )

    return result


# ─── Spending Trends ──────────────────────────────────────────────────────────

def get_spending_trends(df: pd.DataFrame) -> dict:
    """
    Analyzes spending patterns:
      - Weekend vs Weekday spending ratio
      - Rising categories (month-over-month)
      - Cash flow trend (improving / declining)
    """
    if df is None or df.empty or "date" not in df.columns:
        return {}

    cols = [c for c in ["date", "type", "amount", "category"] if c in df.columns]
    temp = df[cols].copy()
    temp["date"] = pd.to_datetime(temp["date"], errors="coerce")
    temp = temp.dropna(subset=["date"])

    if temp.empty:
        return {}

    # ── Weekend vs Weekday ────────────────────────────────────────────────────
    temp["is_weekend"] = temp["date"].dt.dayofweek.isin([5, 6])
    expenses = temp[(temp["type"] == "expense") & (temp["amount"] < 0)].copy()

    weekend_exp = expenses[expenses["is_weekend"]]["amount"].abs()
    weekday_exp = expenses[~expenses["is_weekend"]]["amount"].abs()

    # Average daily spend (not total — avoids day-count bias)
    weekend_days = max(1, expenses["is_weekend"].sum())
    weekday_days = max(1, (~expenses["is_weekend"]).sum())

    weekend_daily_avg = float(weekend_exp.sum()) / weekend_days
    weekday_daily_avg = float(weekday_exp.sum()) / weekday_days

    weekend_pct = 0.0
    if weekday_daily_avg > 0:
        weekend_pct = round(
            ((weekend_daily_avg - weekday_daily_avg) / weekday_daily_avg) * 100, 1
        )

    # ── Category trends (MoM) ────────────────────────────────────────────────
    temp["month_period"] = temp["date"].dt.to_period("M")
    periods = sorted(temp["month_period"].unique())

    rising_categories = []
    declining_categories = []

    if len(periods) >= 2:
        last_m = periods[-1]
        prev_m = periods[-2]

        last_exp = temp[(temp["month_period"] == last_m) & (temp["type"] == "expense")]
        prev_exp = temp[(temp["month_period"] == prev_m) & (temp["type"] == "expense")]

        last_cat = last_exp.groupby("category")["amount"].apply(lambda x: x.abs().sum())
        prev_cat = prev_exp.groupby("category")["amount"].apply(lambda x: x.abs().sum())

        for cat in last_cat.index:
            if cat in prev_cat.index and prev_cat[cat] > 0:
                change_pct = ((last_cat[cat] - prev_cat[cat]) / prev_cat[cat]) * 100
                if change_pct > 15:
                    rising_categories.append({
                        "category": cat.title(),
                        "change_pct": round(change_pct, 1),
                    })
                elif change_pct < -15:
                    declining_categories.append({
                        "category": cat.title(),
                        "change_pct": round(change_pct, 1),
                    })

        rising_categories.sort(key=lambda x: x["change_pct"], reverse=True)
        declining_categories.sort(key=lambda x: x["change_pct"])

    # ── Cash flow trend ───────────────────────────────────────────────────────
    cash_flow_trend = "stable"
    if len(periods) >= 3:
        recent_savings = []
        for p in periods[-3:]:
            g = temp[temp["month_period"] == p]
            inc = float(g[(g["type"] == "income") & (g["amount"] > 0)]["amount"].sum())
            exp = float(g[(g["type"] == "expense") & (g["amount"] < 0)]["amount"].abs().sum())
            recent_savings.append(inc - exp)

        if len(recent_savings) >= 2:
            if recent_savings[-1] > recent_savings[0] * 1.1:
                cash_flow_trend = "improving"
            elif recent_savings[-1] < recent_savings[0] * 0.9:
                cash_flow_trend = "declining"

    return {
        "weekend_vs_weekday_pct": weekend_pct,
        "weekend_daily_avg":      round(weekend_daily_avg, 2),
        "weekday_daily_avg":      round(weekday_daily_avg, 2),
        "rising_categories":      rising_categories[:5],
        "declining_categories":   declining_categories[:3],
        "cash_flow_trend":        cash_flow_trend,
    }


# ─── Safe-to-Spend Engine ─────────────────────────────────────────────────────

def get_safe_to_spend(
    balance: float,
    monthly_burn: float,
    volatility_score: float = 0.0,
    emergency_target_months: float = 1.0,
) -> dict:
    """
    Calculates how much is genuinely safe to spend.

    Formula:
      reserve = emergency_target_months × monthly_burn × (1 + volatility_factor)
      safeToSpend = balance - reserve
    """
    volatility_factor = min(0.5, volatility_score)  # cap at 50% extra
    reserve = monthly_burn * emergency_target_months * (1.0 + volatility_factor)

    safe_to_spend = max(0.0, balance - reserve)
    reserve_pct = (reserve / balance * 100) if balance > 0 else 0.0

    return {
        "balance":        round(balance, 2),
        "reserve":        round(reserve, 2),
        "safe_to_spend":  round(safe_to_spend, 2),
        "reserve_pct":    round(reserve_pct, 1),
        "monthly_burn":   round(monthly_burn, 2),
    }


# ─── AI Insights Engine ──────────────────────────────────────────────────────

def generate_insights(summary: dict, trends: dict, monthly: list) -> list:
    """
    Generates dynamic, data-driven, confidence-based AI insights.

    Each insight includes:
      - icon:       emoji prefix
      - message:    human-readable explanation
      - type:       'positive' | 'warning' | 'info'
      - confidence: 0.0–1.0 score
    """
    insights = []

    income = summary.get("total_income", 0)
    expenses = summary.get("total_expenses", 0)
    savings = summary.get("total_savings", 0)
    balance = summary.get("latest_balance", 0)

    # ── Savings rate ──────────────────────────────────────────────────────────
    if income > 0:
        savings_rate = (savings / income) * 100
        if savings_rate > 35:
            insights.append({
                "icon": "🏆",
                "message": f"Outstanding! You saved {savings_rate:.0f}% of income this period. You're on track for financial independence.",
                "type": "positive",
                "confidence": 0.95,
            })
        elif savings_rate > 20:
            insights.append({
                "icon": "✅",
                "message": f"Great savings discipline — {savings_rate:.0f}% saved. The 50-30-20 rule suggests 20% as the target.",
                "type": "positive",
                "confidence": 0.90,
            })
        elif savings_rate > 0:
            insights.append({
                "icon": "⚠️",
                "message": f"Your savings rate is {savings_rate:.0f}%. Try to reduce discretionary spending to reach 20%.",
                "type": "warning",
                "confidence": 0.85,
            })
        else:
            insights.append({
                "icon": "🔴",
                "message": "Spending exceeds income this period. Review your top expense categories immediately.",
                "type": "warning",
                "confidence": 0.98,
            })

    # ── Spending spike detection ──────────────────────────────────────────────
    rising = trends.get("rising_categories", [])
    if rising:
        top = rising[0]
        insights.append({
            "icon": "📈",
            "message": (
                f"Spending spike: {top['category']} expenses rose {top['change_pct']:.0f}% "
                "vs. last month. Review if this is a one-time or ongoing increase."
            ),
            "type": "warning",
            "confidence": 0.80,
        })

    # ── Weekend spending ──────────────────────────────────────────────────────
    weekend_pct = trends.get("weekend_vs_weekday_pct", 0)
    if weekend_pct > 30:
        insights.append({
            "icon": "🛍️",
            "message": f"You spend {weekend_pct:.0f}% more per day on weekends. Weekend shopping budgets can help.",
            "type": "info",
            "confidence": 0.75,
        })
    elif weekend_pct < -20:
        insights.append({
            "icon": "💪",
            "message": "Your weekend spending is well-controlled — spending less on weekends is a strong habit.",
            "type": "positive",
            "confidence": 0.75,
        })

    # ── Monthly expense comparison ────────────────────────────────────────────
    if len(monthly) >= 2:
        last = monthly[-1]["expenses"]
        prev = monthly[-2]["expenses"]
        if prev > 0:
            diff = last - prev
            diff_pct = (diff / prev) * 100
            if diff > 0 and diff_pct > 10:
                insights.append({
                    "icon": "📊",
                    "message": f"Expenses rose ₹{abs(diff):,.0f} (+{diff_pct:.0f}%) this month vs. last. Check for one-off charges.",
                    "type": "warning",
                    "confidence": 0.80,
                })
            elif diff < 0 and abs(diff_pct) > 10:
                insights.append({
                    "icon": "🎯",
                    "message": f"You spent ₹{abs(diff):,.0f} (-{abs(diff_pct):.0f}%) less than last month. Great cost control!",
                    "type": "positive",
                    "confidence": 0.80,
                })

    # ── Cash flow trend ───────────────────────────────────────────────────────
    trend = trends.get("cash_flow_trend", "stable")
    if trend == "improving":
        insights.append({
            "icon": "🚀",
            "message": "Your net cash flow has improved over the last 3 months. Keep this trajectory!",
            "type": "positive",
            "confidence": 0.85,
        })
    elif trend == "declining":
        insights.append({
            "icon": "📉",
            "message": "Net cash flow has been declining over 3 months. Review recurring expenses and income sources.",
            "type": "warning",
            "confidence": 0.85,
        })

    # Return top 5 insights sorted by confidence
    insights.sort(key=lambda x: x["confidence"], reverse=True)
    return insights[:5]
