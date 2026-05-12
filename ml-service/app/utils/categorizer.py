"""
categorizer.py
──────────────
Production-grade NLP keyword classifier for transactions.

Features
─────────
- Income detection: salary, payroll, bonus, credit, stipend, interest, refund, freelance
- Smart income sign-correction: salary rows with negative amounts are auto-corrected
- Expanded category rules with 200+ merchant/keyword patterns
- Recurring transaction hint (is_likely_recurring flag)
- O(1) per-row via pre-compiled regexes
"""

import re
import logging
import pandas as pd

logger = logging.getLogger(__name__)

# ─── Income keyword patterns ──────────────────────────────────────────────────
# These keywords in the description STRONGLY indicate an income transaction.
# If the amount is negative for any of these, we auto-correct the sign.

INCOME_KEYWORDS = [
    "salary", "payroll", "pay roll", "pay credit", "paycredit",
    "bonus", "incentive", "increment", "arrears",
    "interest credit", "int cr", "int. cr", "interest income",
    "stipend", "fellowship", "scholarship",
    "freelance", "freelancing", "consulting fee", "consultant fee",
    "refund", "cashback", "cash back", "reversal", "reversed",
    "dividend", "mutual fund", "mf redemption", "fd maturity",
    "income", "earnings", "commission", "royalty",
    "reimbursement", "reimb", "expense claim", "travel claim",
]

# Compiled pattern for income detection
_INCOME_PATTERN = re.compile(
    "|".join(map(re.escape, INCOME_KEYWORDS)),
    re.IGNORECASE
)

# ─── Subscription / recurring hints ──────────────────────────────────────────
SUBSCRIPTION_HINTS = [
    "netflix", "spotify", "hotstar", "prime video", "amazon prime",
    "youtube premium", "zee5", "sonyliv", "apple tv",
    "gym", "cult.fit", "curefit",
    "insurance", "lic", "policy",
    "electricity", "broadband", "internet", "mobile recharge",
    "rent", "emi", "loan emi",
    "adobe", "figma", "notion", "slack", "zoom",
]
_SUBSCRIPTION_PATTERN = re.compile(
    "|".join(map(re.escape, SUBSCRIPTION_HINTS)),
    re.IGNORECASE
)

# ─── Category rules ──────────────────────────────────────────────────────────
CATEGORY_RULES = {
    # ── Income ───────────────────────────────────────────────────────────────
    "salary": [
        "salary", "payroll", "pay roll", "pay credit", "paycredit",
        "stipend", "fellowship", "wages", "bonus", "incentive",
        "arrears", "income credit", "salary credit",
    ],
    "freelance": [
        "freelance", "freelancing", "consulting fee", "consultant",
        "project payment", "upwork", "fiverr", "toptal",
    ],
    "interest": [
        "interest credit", "int cr", "int. cr", "interest income",
        "fd maturity", "rd maturity", "dividend", "mutual fund",
        "mf redemption", "bond interest",
    ],
    "refund": [
        "refund", "cashback", "cash back", "reversal", "reversed",
        "returned", "reimbursement", "reimb", "expense claim",
        "travel claim", "credit note",
    ],

    # ── Food & Dining ─────────────────────────────────────────────────────
    "food": [
        "swiggy", "zomato", "dominos", "domino", "pizza hut",
        "mcdonalds", "mcdonald", "kfc", "burger king", "subway",
        "starbucks", "cafe coffee day", "ccd", "barista",
        "restaurant", "cafe", "coffee", "food court", "canteen",
        "dhabha", "dhaba", "biryani", "hotel", "chai",
        "instamart", "blinkit", "zepto", "dunzo", "groceries",
        "supermarket", "bigbasket", "dmart", "more retail",
        "reliance fresh", "nature basket", "spencers", "food",
    ],

    # ── Travel & Transport ────────────────────────────────────────────────
    "travel": [
        "uber", "ola", "rapido", "meru", "jugnoo",
        "irctc", "indian railways", "makemytrip", "cleartrip",
        "goibibo", "yatra", "flight", "indigo", "air india",
        "spicejet", "vistara", "akasa", "train ticket",
        "bus ticket", "redbus", "metro", "city bus",
        "petrol", "diesel", "fuel", "hpcl", "bpcl", "ioc",
        "reliance petroleum", "hp petrol", "shell", "essar",
        "toll", "fastag",
    ],

    # ── Shopping ──────────────────────────────────────────────────────────
    "shopping": [
        "amazon", "flipkart", "myntra", "ajio", "nykaa",
        "meesho", "snapdeal", "shopclues", "tatacliq",
        "zara", "h&m", "uniqlo", "westside", "pantaloons",
        "reliance trends", "max fashion", "lifestyle",
        "mall", "mart", "bazaar", "shopping",
    ],

    # ── Bills & Utilities ─────────────────────────────────────────────────
    "bills": [
        "airtel", "jio", "vi ", "vodafone", "idea",
        "bsnl", "mtnl", "tata sky", "dish tv", "sun direct",
        "electricity", "bescom", "msedcl", "tata power",
        "adani electricity", "bses", "torrent power",
        "water bill", "water tax", "piped gas", "indane gas",
        "mahanagar gas", "cng", "bill payment", "recharge",
        "broadband", "act fibernet", "hathway", "spectranet",
        "utility", "municipal", "property tax",
    ],

    # ── Entertainment ────────────────────────────────────────────────────
    "entertainment": [
        "netflix", "spotify", "hotstar", "disney", "prime video",
        "amazon prime", "youtube premium", "zee5", "sonyliv",
        "apple tv", "jiocinema", "alt balaji", "mxplayer",
        "bookmyshow", "pvr", "inox", "cinepolis", "carnival cinema",
        "movie", "cinema", "game", "steam", "epic games",
        "playstation", "xbox", "nintendo", "pubg", "valorant",
    ],

    # ── Healthcare ────────────────────────────────────────────────────────
    "healthcare": [
        "pharmacy", "medplus", "apollo pharmacy", "netmeds",
        "pharmeasy", "1mg", "practo", "tata health",
        "hospital", "clinic", "doctor", "medical",
        "apollo hospital", "fortis", "max hospital",
        "manipal hospital", "narayana health",
        "diagnostic", "lab test", "pathology",
        "health insurance", "star health", "niva bupa",
    ],

    # ── Education ─────────────────────────────────────────────────────────
    "education": [
        "school", "college", "university", "institute",
        "tuition", "coaching", "course fee", "admission fee",
        "udemy", "coursera", "byjus", "byju", "unacademy",
        "vedantu", "toppr", "edureka", "great learning",
        "skillshare", "pluralsight", "linkedin learning",
        "books", "stationery",
    ],

    # ── Transfers ─────────────────────────────────────────────────────────
    "transfer": [
        "upi transfer", "neft", "imps", "rtgs",
        "fund transfer", "money transfer", "bank transfer",
        "sent to", "received from",
        "cash withdrawal", "atm withdrawal", "atm cash",
        "cheque", "check payment",
        "self transfer", "own account",
    ],

    # ── Finance & Investment ──────────────────────────────────────────────
    "investment": [
        "mutual fund", "mf sip", "sip", "lumpsum",
        "stocks", "equity", "zerodha", "groww", "upstox",
        "icicidirect", "hdfc securities", "angel broking",
        "ppf", "nps", "epf", "provident fund",
        "gold", "sovereign gold bond", "sgb", "etf",
        "fd", "fixed deposit", "rd", "recurring deposit",
    ],

    # ── Insurance ────────────────────────────────────────────────────────
    "insurance": [
        "insurance premium", "lic premium", "lic payment",
        "life insurance", "term insurance", "health insurance premium",
        "vehicle insurance", "two wheeler insurance",
        "car insurance", "bike insurance",
        "bajaj allianz", "icici prudential", "hdfc life",
        "max life", "sbi life", "tata aia",
    ],

    # ── EMI & Loans ───────────────────────────────────────────────────────
    "emi": [
        "emi", "loan emi", "home loan emi", "car loan emi",
        "personal loan", "credit card emi",
        "loan repayment", "loan installment",
    ],
}

# Compile regex patterns once for performance
_PATTERNS: dict[str, re.Pattern] = {
    cat: re.compile("|".join(map(re.escape, keywords)), re.IGNORECASE)
    for cat, keywords in CATEGORY_RULES.items()
    if keywords
}

# ─── Category priority order ─────────────────────────────────────────────────
# Categories checked in this order — first match wins.
# Income-type categories are checked FIRST to avoid misclassification.
CATEGORY_PRIORITY = [
    "salary", "freelance", "interest", "refund",    # income categories first
    "emi", "insurance", "investment",               # financial commitments
    "bills", "healthcare", "education",             # essential expenses
    "food", "travel", "shopping", "entertainment",  # lifestyle
    "transfer",                                     # transfers last (often ambiguous)
]


def is_income_keyword(description: str) -> bool:
    """Returns True if the description contains any known income keyword."""
    if not description or not isinstance(description, str):
        return False
    return bool(_INCOME_PATTERN.search(description))


def is_subscription_keyword(description: str) -> bool:
    """Returns True if the description hints at a subscription payment."""
    if not description or not isinstance(description, str):
        return False
    return bool(_SUBSCRIPTION_PATTERN.search(description))


def categorize_transaction(description: str, amount: float = 0.0) -> str:
    """
    Given a transaction description and amount, returns the best-fit category.

    Priority order ensures income categories are checked before expense ones.
    Falls back to 'other'.
    """
    if not description or not isinstance(description, str):
        return "other"

    for category in CATEGORY_PRIORITY:
        pattern = _PATTERNS.get(category)
        if pattern and pattern.search(description):
            return category

    return "other"


def categorize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds a 'category' column and an 'is_likely_recurring' column to the DataFrame.

    Also performs income sign-correction:
      If description contains an income keyword AND amount < 0,
      the amount is corrected to positive and type is set to 'income'.
    """
    categorized_df = df.copy()

    if "description" not in categorized_df.columns:
        categorized_df["category"] = "other"
        categorized_df["is_likely_recurring"] = False
        return categorized_df

    # Apply categorization
    categorized_df["category"] = categorized_df.apply(
        lambda row: categorize_transaction(
            str(row.get("description", "")),
            float(row.get("amount", 0.0))
        ),
        axis=1
    )

    # ── Income sign-correction ────────────────────────────────────────────────
    # If a row's description contains income keywords but the amount is negative,
    # auto-correct: flip to positive and reclassify as income.
    if "amount" in categorized_df.columns and "type" in categorized_df.columns:
        income_desc_mask = categorized_df["description"].apply(is_income_keyword)
        negative_mask = categorized_df["amount"] < 0

        correction_mask = income_desc_mask & negative_mask
        if correction_mask.any():
            count = correction_mask.sum()
            logger.info(
                "🔧 Auto-correcting sign for %d income-keyword rows with negative amounts",
                count
            )
            categorized_df.loc[correction_mask, "amount"] = (
                categorized_df.loc[correction_mask, "amount"].abs()
            )
            categorized_df.loc[correction_mask, "type"] = "income"

            # Re-categorize corrected rows
            categorized_df.loc[correction_mask, "category"] = categorized_df.loc[
                correction_mask
            ].apply(
                lambda row: categorize_transaction(str(row.get("description", "")), row["amount"]),
                axis=1
            )

    # ── Subscription hint flag ────────────────────────────────────────────────
    categorized_df["is_likely_recurring"] = categorized_df["description"].apply(
        is_subscription_keyword
    )

    # ── Reorder columns for readability ───────────────────────────────────────
    cols = categorized_df.columns.tolist()
    for col in ["category", "is_likely_recurring"]:
        if col in cols and "description" in cols:
            cols.remove(col)
            desc_idx = cols.index("description")
            cols.insert(desc_idx + 1, col)
    categorized_df = categorized_df[cols]

    income_count = (categorized_df.get("type", pd.Series()) == "income").sum()
    expense_count = (categorized_df.get("type", pd.Series()) == "expense").sum()
    logger.info(
        "🏷️  Categorization complete → %d income rows | %d expense rows",
        income_count, expense_count
    )

    return categorized_df
