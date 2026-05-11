import re
import pandas as pd

# Keyword rules dictionary mapping category to lists of keywords
CATEGORY_RULES = {
    'food': ['swiggy', 'zomato', 'mcdonalds', 'kfc', 'dominos', 'starbucks', 'cafe', 'restaurant', 'food', 'grocery', 'supermarket', 'instamart', 'blinkit', 'zepto'],
    'travel': ['uber', 'ola', 'rapido', 'irctc', 'makemytrip', 'flight', 'indigo', 'spicejet', 'train', 'bus', 'metro', 'petrol', 'fuel', 'hpcl', 'bpcl', 'ioc'],
    'shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'zara', 'h&m', 'reliance', 'mall', 'mart', 'shopping'],
    'bills': ['airtel', 'jio', 'vi', 'vodafone', 'electricity', 'bescom', 'water', 'gas', 'bill', 'recharge', 'broadband', 'act', 'hathway'],
    'salary': ['salary', 'payroll', 'wages', 'stipend', 'bonus', 'salary inc'],
    'transfer': ['upi', 'neft', 'imps', 'rtgs', 'transfer', 'cash withdrawal', 'atm'],
    'entertainment': ['netflix', 'prime', 'spotify', 'hotstar', 'bookmyshow', 'pvr', 'inox', 'movie', 'cinema', 'game', 'steam'],
    'healthcare': ['pharmacy', 'hospital', 'clinic', 'apollo', 'medplus', 'netmeds', 'pharmeasy', 'doctor', 'health'],
    'education': ['school', 'college', 'university', 'fee', 'tuition', 'udemy', 'coursera', 'byjus', 'unacademy'],
}

# Compile regex patterns once for performance
_PATTERNS = {
    cat: re.compile('|'.join(map(re.escape, keywords)), re.IGNORECASE)
    for cat, keywords in CATEGORY_RULES.items()
    if keywords
}

def categorize_transaction(description: str) -> str:
    """
    Given a transaction description, returns the matching category.
    Uses pre-compiled regex for O(1) keyword scanning per category.
    """
    if not description or not isinstance(description, str):
        return 'other'
        
    for category, pattern in _PATTERNS.items():
        if pattern.search(description):
            return category
                
    return 'other'


def categorize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds a 'category' column to the normalized DataFrame based on the 'description' column.
    """
    # Create a copy to avoid SettingWithCopy warnings
    categorized_df = df.copy()
    
    if 'description' in categorized_df.columns:
        categorized_df['category'] = categorized_df['description'].apply(categorize_transaction)
    else:
        categorized_df['category'] = 'other'
        
    # Reorder columns to put category next to description for readability
    cols = categorized_df.columns.tolist()
    if 'category' in cols and 'description' in cols:
        cols.remove('category')
        desc_idx = cols.index('description')
        cols.insert(desc_idx + 1, 'category')
        categorized_df = categorized_df[cols]
        
    return categorized_df
