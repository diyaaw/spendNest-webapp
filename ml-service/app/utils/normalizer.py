"""
normalizer.py
─────────────
Robust CSV parsing pipeline for Indian bank statements.

Supports:
  - Multiple column name variants (Date / Txn Date / Value Date, etc.)
  - Separate Debit/Credit columns OR a single Amount column
  - Monetary values like: ₹25,000  |  3,450.00 CR  |  2,100 DR  |  (1,234)
  - Automatic type inference (income / expense / transfer)
  - Full debug logging at every stage
"""

import re
import logging
import pandas as pd
import numpy as np

# ── Logger setup ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


# ─── Column name mappings ────────────────────────────────────────────────────
# Every known bank CSV header variant → our canonical field name.
# Matching is always case-insensitive and whitespace-trimmed.
COLUMN_MAPPINGS = {
    "date": [
        "date", "transaction date", "txn date", "value date",
        "posting date", "trans date", "tran date", "booking date",
        "entry date", "settlement date", "trade date", "effective date",
        "processing date", "transaction_date", "value_date", "txndate",
        "transfer date",
    ],
    "description": [
        "description", "narration", "remarks", "details",
        "transaction details", "payee", "particulars",
        "transaction description", "transaction narration",
        "cheque details", "reference", "trans description",
        "memo", "note", "transaction", "merchant", "beneficiary",
        "name", "transaction remarks", "chq./ref.no.", "chq/ref no",
        "ref no", "ref number",
    ],
    "debit": [
        "debit", "withdrawal", "withdrawals", "paid out", "amount (-)",
        "dr", "debit amount", "withdrawal amount", "withdrawal amt",
        "withdrawal amt.", "debit amt", "debit amt.", "dr amount",
        "dr amt", "money out", "outflow", "payments", "charges",
        "debit(inr)", "withdrawal(inr)", "debit(rs)", "dr(rs)",
    ],
    "credit": [
        "credit", "deposit", "deposits", "paid in", "amount (+)",
        "cr", "credit amount", "deposit amount", "deposit amt",
        "deposit amt.", "credit amt", "credit amt.", "cr amount",
        "cr amt", "money in", "inflow", "receipts",
        "credit(inr)", "deposit(inr)", "credit(rs)", "cr(rs)",
    ],
    "balance": [
        "balance", "available balance", "running balance",
        "closing balance", "balance amount", "balance amt",
        "bal", "bal.", "current balance", "ledger balance",
        "book balance", "balance(inr)", "balance(rs)",
    ],
    "amount_single": [
        "amount", "transaction amount", "amt", "net amount",
        "tran amount", "trans amount", "txn amount", "value",
        "amount(inr)", "amount(rs)", "amount (inr)",
        "credit/debit", "debit/credit",
    ],
}


# ─── Column finder ───────────────────────────────────────────────────────────

def _find_column(df_cols: list, target_names: list, exact_only: bool = False) -> str | None:
    """
    Case-insensitive column search.
    1. Tries exact match first (always).
    2. Falls back to substring match UNLESS exact_only=True.
    Returns the ORIGINAL column name from df_cols, or None.

    Use exact_only=True for ambiguous fields (amount/debit/credit) to avoid
    a column named 'amount' accidentally matching 'debit amount', etc.
    """
    col_lower = {c.lower().strip(): c for c in df_cols}

    # 1 – exact match (always attempted)
    for target in target_names:
        if target.lower() in col_lower:
            return col_lower[target.lower()]

    if exact_only:
        return None

    # 2 – substring match  (e.g. "Withdrawal Amt." contains "withdrawal amt")
    for target in target_names:
        for col_key, col_orig in col_lower.items():
            if target.lower() in col_key or col_key in target.lower():
                return col_orig

    return None


# ─── Currency cleaner ────────────────────────────────────────────────────────

def clean_currency(series: pd.Series) -> pd.Series:
    """
    Converts messy monetary strings to float.

    Handles:
      ₹25,000        →  25000.0
      3,450.00 CR    →  3450.0   (positive — credit)
      2,100 DR       → -2100.0   (negative — debit)
      (1,234.00)     → -1234.0   (parenthetical negative)
      1,23,456       → 123456.0  (Indian lakh format)
      Empty / NaN    →  0.0
    """
    if series.dtype != object:
        # Already numeric — just coerce
        return pd.to_numeric(series, errors="coerce").fillna(0.0)

    s = series.astype(str).str.strip()

    # Remove BOM characters that sometimes appear in exported CSVs
    s = s.str.replace("\ufeff", "", regex=False)

    # ── Detect sign markers BEFORE stripping text ──────────────────────────
    is_dr = (
        s.str.upper().str.endswith("DR") |
        s.str.upper().str.endswith("(DR)")
    )
    is_cr = (
        s.str.upper().str.endswith("CR") |
        s.str.upper().str.endswith("(CR)")
    )
    is_paren_neg = s.str.match(r"^\(.*\)$")

    # ── Strip all noise ────────────────────────────────────────────────────
    s = s.str.replace(r"[$£€₹₨¥₩]", "", regex=True)           # currency symbols
    s = s.str.replace(                                           # word labels
        r"\b(DR|CR|INR|USD|GBP|EUR|RS|RS\.)\b", "",
        regex=True, flags=re.IGNORECASE
    )
    s = s.str.replace(r"[,\s]", "", regex=True)                 # commas / spaces
    s = s.str.replace(r"[()]", "", regex=True)                  # parentheses

    # Replace blank / sentinel strings with NaN
    s = s.replace(
        {"": np.nan, "nan": np.nan, "none": np.nan,
         "-": np.nan, "n/a": np.nan, "nil": np.nan}
    )

    numeric = pd.to_numeric(s, errors="coerce").fillna(0.0)

    # Apply sign rules
    numeric = numeric.where(~is_dr,         -numeric.abs())   # DR  → negative
    numeric = numeric.where(~is_paren_neg,  -numeric.abs())   # ()  → negative
    numeric = numeric.where(~is_cr,          numeric.abs())   # CR  → positive

    return numeric


# ─── Main normalizer ─────────────────────────────────────────────────────────

def normalize_dataframe(raw_df: pd.DataFrame) -> pd.DataFrame:
    """
    Takes a raw pandas DataFrame from any Indian bank CSV and normalizes it
    into a standard schema:

        date | description | debit | credit | amount | type | balance

    Returns the normalized DataFrame (never raises — bad rows are skipped).
    """
    df = raw_df.copy()

    # ── Step 1: Normalize column headers ────────────────────────────────────
    df.columns = df.columns.str.strip()
    cols = df.columns.tolist()
    logger.info("📋 Raw columns detected: %s", cols)

    # ── Detect amount_single FIRST (exact match only) ──────────────────────
    # This prevents a column named "amount" from leaking into debit/credit
    # lists via substring matching (e.g. "dr amount" contains "amount").
    amt_col    = _find_column(cols, COLUMN_MAPPINGS["amount_single"], exact_only=True)

    # For debit/credit, exclude the column already claimed as amount_single
    remaining_cols = [c for c in cols if c != amt_col] if amt_col else cols

    date_col   = _find_column(cols, COLUMN_MAPPINGS["date"])
    desc_col   = _find_column(cols, COLUMN_MAPPINGS["description"])
    bal_col    = _find_column(cols, COLUMN_MAPPINGS["balance"])

    # Build a restricted pool for debit/credit search:
    # exclude columns already claimed by date, description, balance, and amount_single.
    # Also use exact_only=True first to avoid short patterns like 'cr' / 'dr'
    # matching inside unrelated column names (e.g. 'description' contains 'cr').
    already_claimed = {c for c in [date_col, desc_col, bal_col, amt_col] if c}
    money_pool = [c for c in cols if c not in already_claimed]

    # Try exact-only first for debit/credit (safest)
    debit_col  = _find_column(money_pool, COLUMN_MAPPINGS["debit"], exact_only=True)
    credit_col = _find_column(money_pool, COLUMN_MAPPINGS["credit"], exact_only=True)

    # If exact failed, fall back to substring — but only for longer, unambiguous names
    # (skip single-word abbreviations 'dr'/'cr' which cause false positives)
    SAFE_DEBIT_SUBSTRINGS  = [n for n in COLUMN_MAPPINGS["debit"]  if len(n) > 4]
    SAFE_CREDIT_SUBSTRINGS = [n for n in COLUMN_MAPPINGS["credit"] if len(n) > 4]
    if debit_col is None:
        debit_col  = _find_column(money_pool, SAFE_DEBIT_SUBSTRINGS)
    if credit_col is None:
        credit_col = _find_column(money_pool, SAFE_CREDIT_SUBSTRINGS)

    # If the same column matched both debit AND credit, that's wrong — treat as amount_single
    if debit_col and credit_col and debit_col == credit_col:
        logger.warning(
            "⚠️  Same column '%s' matched both debit & credit — treating as amount_single",
            debit_col
        )
        amt_col    = debit_col
        debit_col  = None
        credit_col = None

    logger.info(
        "🔍 Column mapping → date:%s | desc:%s | debit:%s | credit:%s "
        "| amt:%s | balance:%s",
        date_col, desc_col, debit_col, credit_col, amt_col, bal_col
    )

    out = pd.DataFrame(index=df.index)

    # ── Step 2: DATE ─────────────────────────────────────────────────────────
    if date_col:
        # Try multiple formats if standard coercion fails
        dates = pd.to_datetime(df[date_col], errors="coerce", dayfirst=True)
        
        # If more than 50% failed to parse, try without dayfirst
        if dates.isna().sum() > (len(dates) / 2):
            dates = pd.to_datetime(df[date_col], errors="coerce", dayfirst=False)
            
        out["date"] = dates
    else:
        logger.warning("⚠️  No date column found — filling with current date")
        out["date"] = pd.Timestamp.now()

    # ── Step 3: DESCRIPTION ──────────────────────────────────────────────────
    if desc_col:
        out["description"] = df[desc_col].astype(str).str.strip()
    else:
        # Fallback: pick the first object column that isn't a known special column
        already_used = {date_col, bal_col, debit_col, credit_col, amt_col}
        str_cols = [
            c for c in cols
            if df[c].dtype == object and c not in already_used
        ]
        if str_cols:
            logger.warning(
                "⚠️  No description column found — using '%s' as fallback",
                str_cols[0]
            )
            out["description"] = df[str_cols[0]].astype(str).str.strip()
        else:
            out["description"] = "Unknown Transaction"

    # ── Step 4: BALANCE ───────────────────────────────────────────────────────
    if bal_col:
        out["balance"] = clean_currency(df[bal_col])
    else:
        logger.warning("⚠️  No balance column found — defaulting to 0.0")
        out["balance"] = 0.0

    # ── Step 5: AMOUNTS ───────────────────────────────────────────────────────
    if debit_col and credit_col:
        # Scenario A: separate Debit / Credit columns
        logger.info("💰 Mode: separate Debit (%s) / Credit (%s) columns", debit_col, credit_col)
        debit_vals  = clean_currency(df[debit_col]).abs()
        credit_vals = clean_currency(df[credit_col]).abs()
        out["debit"]  = debit_vals
        out["credit"] = credit_vals
        out["amount"] = credit_vals - debit_vals          # positive = income

    elif amt_col:
        # Scenario B: single Amount column (positive = credit, negative = debit)
        logger.info("💰 Mode: single Amount column (%s)", amt_col)
        amt_vals      = clean_currency(df[amt_col])
        out["amount"] = amt_vals
        out["credit"] = amt_vals.clip(lower=0)
        out["debit"]  = (-amt_vals).clip(lower=0)

    else:
        # Scenario C: no obvious money column — scan for the best candidate
        logger.warning("⚠️  No explicit money column found — scanning all columns")

        num_cols = [
            c for c in cols
            if pd.api.types.is_numeric_dtype(df[c]) and c not in {bal_col}
        ]

        if num_cols:
            best = max(num_cols, key=lambda c: df[c].abs().sum())
            logger.info("💰 Best numeric candidate: '%s'", best)
            amt_vals      = pd.to_numeric(df[best], errors="coerce").fillna(0.0)
            out["amount"] = amt_vals
            out["credit"] = amt_vals.clip(lower=0)
            out["debit"]  = (-amt_vals).clip(lower=0)
        else:
            # Try object columns that look like currency strings
            found = False
            for c in cols:
                if df[c].dtype == object:
                    trial = clean_currency(df[c])
                    if trial.abs().sum() > 0:
                        logger.info("💰 Currency string column found: '%s'", c)
                        out["amount"] = trial
                        out["credit"] = trial.clip(lower=0)
                        out["debit"]  = (-trial).clip(lower=0)
                        found = True
                        break
            if not found:
                logger.error("❌ Could not find any amount column — defaulting to 0")
                out["amount"] = 0.0
                out["credit"] = 0.0
                out["debit"]  = 0.0

    # ── Step 5.5: TYPE FLAG COLUMN ────────────────────────────────────────────
    # Handles CSVs like: Date, Description, Type, Amount (INR), Balance (INR)
    # where the "Type" column holds "Credit" or "Debit" text values.
    # When found, apply it to negate Debit amounts so expenses are negative.
    TYPE_FLAG_CANDIDATES = [
        "type", "transaction type", "txn type", "trans type",
        "dr/cr", "cr/dr", "dr_cr", "credit/debit", "debit/credit",
        "transaction_type", "txn_type",
    ]
    type_flag_col = None
    for candidate in TYPE_FLAG_CANDIDATES:
        for col in df.columns:
            if col.lower().strip() == candidate.lower():
                col_vals = df[col].astype(str).str.strip().str.lower()
                # Ignore empty rows when calculating hit rate
                valid_mask = col_vals != "nan"
                valid_mask = valid_mask & (col_vals != "")
                valid_count = max(valid_mask.sum(), 1)
                
                hit_rate = col_vals.isin(["credit", "debit", "cr", "dr"]).sum() / valid_count
                if hit_rate >= 0.3:
                    type_flag_col = col
                    logger.info("🏷️  Type-flag column detected: '%s' (hit rate: %.0f%%)", col, hit_rate * 100)
                    break
        if type_flag_col:
            break

    if type_flag_col is not None:
        type_vals = df[type_flag_col].astype(str).str.strip().str.lower()
        
        # Expanded keyword list for better detection
        DEBIT_KEYWORDS = ["debit", "dr", "withdrawal", "payment", "wdr", "dr amt", "out", "expense"]
        CREDIT_KEYWORDS = ["credit", "cr", "deposit", "receipt", "dep", "cr amt", "in", "income"]
        
        is_debit = type_vals.isin(DEBIT_KEYWORDS)
        is_credit = type_vals.isin(CREDIT_KEYWORDS)
        
        # Negate amounts for debit rows (make them negative = expenses)
        # and enforce positive for credit rows
        out["amount"] = out["amount"].where(~is_debit, -out["amount"].abs())
        out["amount"] = out["amount"].where(~is_credit, out["amount"].abs())
        
        # Also fix debit/credit columns if they were already set
        if "debit" in out.columns:
            out["debit"]  = out["amount"].abs().where(is_debit, out["debit"])
        if "credit" in out.columns:
            out["credit"] = out["amount"].abs().where(is_credit, out["credit"])
        
        logger.info("✅ Applied type-flag sign correction (debit rows: %d, credit rows: %d)", is_debit.sum(), is_credit.sum())

    # ── Step 6: TYPE ─────────────────────────────────────────────────────────
    out["type"] = out["amount"].apply(
        lambda x: "income" if x > 0 else ("expense" if x < 0 else "transfer")
    )


    # ── Step 7: Drop junk rows ───────────────────────────────────────────────
    # Drop rows where date is null (critical for time series)
    before = len(out)
    out = out.dropna(subset=['date'])
    
    # Rows where amount=0, balance=0 are likely header/footer bleed-through
    mask_junk = (out["amount"] == 0) & (out["balance"] == 0)
    out = out[~mask_junk]
    
    logger.info(
        "🧹 Dropped %d junk or invalid date rows → %d valid rows remain",
        before - len(out), len(out)
    )
    
    # Sort by date to ensure chronological order for forecasting
    out = out.sort_values('date')
    
    # Convert date back to string for JSON serialization
    out["date_str"] = out["date"].dt.strftime("%Y-%m-%d")
    # But keep the datetime objects for subsequent services to use

    # ── Step 8: Guarantee all expected columns exist ──────────────────────────
    ordered = ["date", "description", "debit", "credit", "amount", "type", "balance"]
    for col in ordered:
        if col not in out.columns:
            out[col] = 0.0 if col in ("debit", "credit", "amount", "balance") else None

    result = out[ordered].reset_index(drop=True)

    # ── Debug: log a sample row ───────────────────────────────────────────────
    if not result.empty:
        logger.info("✅ Sample parsed transaction:\n%s", result.iloc[0].to_dict())
    else:
        logger.warning("⚠️  normalize_dataframe produced 0 rows")

    logger.info("📊 Total rows parsed: %d", len(result))
    return result
