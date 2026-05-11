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
