import pandas as pd

def get_summary(df: pd.DataFrame) -> dict:
    """Calculates overall high-level metrics."""
    if df is None or df.empty:
        return {"total_income": 0, "total_expenses": 0, "total_savings": 0, "latest_balance": 0, "total_transactions": 0}
        
    total_income = df[df['type'] == 'income']['amount'].sum()
    total_expenses = df[df['type'] == 'expense']['amount'].abs().sum()
    total_savings = total_income - total_expenses
    total_transactions = len(df)
    
    # For latest balance, if we have a balance column with non-zero values, take the last one
    # Assuming rows are chronological (top to bottom or sorted)
    latest_balance = 0.0
    if 'balance' in df.columns:
        valid_balances = df[df['balance'] != 0.0]['balance']
        if not valid_balances.empty:
            latest_balance = valid_balances.iloc[-1]
            
    return {
        "total_income": round(float(total_income), 2),
        "total_expenses": round(float(total_expenses), 2),
        "total_savings": round(float(total_savings), 2),
        "latest_balance": round(float(latest_balance), 2),
        "total_transactions": int(total_transactions)
    }

def get_monthly_analytics(df: pd.DataFrame) -> list:
    """Aggregates income and expenses grouped by month."""
    if df is None or df.empty or 'date' not in df.columns:
        return []
        
    # Work on a copy so we don't modify the global df
    temp_df = df.copy()
    
    # Convert date strings to actual datetime objects
    temp_df['date'] = pd.to_datetime(temp_df['date'], errors='coerce')
    
    # Drop rows where date couldn't be parsed
    temp_df = temp_df.dropna(subset=['date'])
    if temp_df.empty:
        return []
        
    # Create sortable period (YYYY-MM) and display string (Jan 2023)
    temp_df['month_sort'] = temp_df['date'].dt.to_period('M')
    temp_df['month_display'] = temp_df['date'].dt.strftime('%b %Y')
    
    monthly_data = []
    
    # Group by the sortable period to maintain chronological order
    grouped = temp_df.groupby(['month_sort', 'month_display'])
    
    for (period, month_name), group in grouped:
        income = group[group['type'] == 'income']['amount'].sum()
        expense = group[group['type'] == 'expense']['amount'].abs().sum()
        savings = income - expense
        
        monthly_data.append({
            "month": month_name,
            "income": round(float(income), 2),
            "expenses": round(float(expense), 2),
            "savings": round(float(savings), 2)
        })
        
    return monthly_data

def get_category_breakdown(df: pd.DataFrame) -> list:
    """Calculates total spending per category."""
    if df is None or df.empty or 'category' not in df.columns:
        return []
        
    # We only care about expenses for the breakdown
    expense_df = df[df['type'] == 'expense']
    if expense_df.empty:
        return []
        
    # Group by category, sum the absolute amounts
    grouped = expense_df.groupby('category')['amount'].apply(lambda x: x.abs().sum()).reset_index()
    
    # Sort from highest spending to lowest
    grouped = grouped.sort_values(by='amount', ascending=False)
    
    breakdown = []
    for _, row in grouped.iterrows():
        # Capitalize the category name for the frontend
        breakdown.append({
            "name": row['category'].title(),
            "value": round(float(row['amount']), 2)
        })
        
    return breakdown

def get_anomaly_flags(df: pd.DataFrame) -> pd.DataFrame:
    """Detects unusual transactions (anomalies) based on category averages."""
    if df is None or df.empty or 'amount' not in df.columns:
        return df
        
    df['is_anomaly'] = False
    
    # Process by category for expenses only
    expense_df = df[df['type'] == 'expense']
    if expense_df.empty:
        return df
        
    for category in expense_df['category'].unique():
        cat_subset = expense_df[expense_df['category'] == category]
        if len(cat_subset) < 5:  # Need enough data to define "unusual"
            continue
            
        mean = cat_subset['amount'].abs().mean()
        std = cat_subset['amount'].abs().std()
        
        # Flag transactions > 3 std devs from mean or at least 3x the mean for high values
        threshold = mean + (2.5 * std)
        
        # Update original df using index
        idx = cat_subset[cat_subset['amount'].abs() > threshold].index
        df.loc[idx, 'is_anomaly'] = True
        
    return df

def get_spending_trends(df: pd.DataFrame) -> dict:
    """Analyzes patterns like Weekend vs Weekday spending and category trajectories."""
    if df is None or df.empty or 'date' not in df.columns:
        return {}
        
    temp_df = df.copy()
    temp_df['date'] = pd.to_datetime(temp_df['date'], errors='coerce')
    temp_df = temp_df.dropna(subset=['date'])
    
    if temp_df.empty:
        return {}
        
    # 1. Weekend vs Weekday
    temp_df['is_weekend'] = temp_df['date'].dt.dayofweek.isin([5, 6])
    expenses = temp_df[temp_df['type'] == 'expense']
    
    weekend_avg = expenses[expenses['is_weekend']]['amount'].abs().sum() / max(1, expenses['is_weekend'].nunique())
    weekday_avg = expenses[~expenses['is_weekend']]['amount'].abs().sum() / max(1, (~expenses['is_weekend']).nunique())
    
    weekend_percentage = 0
    if weekday_avg > 0:
        weekend_percentage = round(((weekend_avg - weekday_avg) / weekday_avg) * 100, 1)
        
    # 2. Category Trends (comparing last month to month before)
    temp_df['month_period'] = temp_df['date'].dt.to_period('M')
    periods = sorted(temp_df['month_period'].unique())
    
    rising_categories = []
    if len(periods) >= 2:
        last_m = periods[-1]
        prev_m = periods[-2]
        
        last_m_exp = temp_df[(temp_df['month_period'] == last_m) & (temp_df['type'] == 'expense')]
        prev_m_exp = temp_df[(temp_df['month_period'] == prev_m) & (temp_df['type'] == 'expense')]
        
        last_m_cat = last_m_exp.groupby('category')['amount'].apply(lambda x: x.abs().sum())
        prev_m_cat = prev_m_exp.groupby('category')['amount'].apply(lambda x: x.abs().sum())
        
        for cat in last_m_cat.index:
            if cat in prev_m_cat.index:
                increase = last_m_cat[cat] - prev_m_cat[cat]
                if increase > (prev_m_cat[cat] * 0.15): # 15% increase
                    rising_categories.append(cat.title())
                    
    return {
        "weekend_vs_weekday_pct": weekend_percentage,
        "weekend_avg": round(float(weekend_avg), 2),
        "weekday_avg": round(float(weekday_avg), 2),
        "rising_categories": rising_categories[:3]
    }

def generate_insights(summary: dict, trends: dict, monthly: list) -> list:
    """Generates natural language insights based on analytics data."""
    insights = []
    
    # Savings insight
    if summary.get('total_income', 0) > 0:
        savings_rate = (summary['total_savings'] / summary['total_income']) * 100
        if savings_rate > 30:
            insights.append(f"Fantastic! You saved {round(savings_rate)}% of your income this period.")
        elif savings_rate > 10:
            insights.append(f"Good job. Your savings rate is {round(savings_rate)}%.")
        else:
            insights.append(f"Your savings rate is {round(savings_rate)}%. Try to aim for 20%.")
            
    # Trend insights
    weekend_pct = trends.get('weekend_vs_weekday_pct', 0)
    if weekend_pct > 20:
        insights.append(f"You spend {abs(weekend_pct)}% more on weekends compared to weekdays.")
    elif weekend_pct < -20:
        insights.append("Your spending is significantly lower on weekends. Great control!")
        
    rising = trends.get('rising_categories', [])
    if rising:
        insights.append(f"Spending in {', '.join(rising)} has increased significantly recently.")
        
    # Monthly comparison
    if len(monthly) >= 2:
        last = monthly[-1]['expenses']
        prev = monthly[-2]['expenses']
        diff = last - prev
        if diff > 0:
            insights.append(f"Your expenses rose by ₹{round(diff):,} this month compared to last.")
        else:
            insights.append(f"Great! You spent ₹{round(abs(diff)):,} less than last month.")
            
    return insights[:4]
