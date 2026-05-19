// Central TypeScript interfaces for SpendNest
// Matches the actual backend response shape from the Express/Flask pipeline

// ─── Transaction ──────────────────────────────────────────────────────────────
export interface Transaction {
  date:             string;
  description:      string;
  category:         string;
  amount:           number;
  balance:          number;
  type:             'income' | 'expense' | 'transfer' | 'refund' | 'unknown';
  isAnomaly?:       boolean;
  isRecurring?:     boolean;
  is_likely_recurring?: boolean;
  bank?:            string;
  uploadBatch?:     string;
}

// ─── Monthly Stats ────────────────────────────────────────────────────────────
export interface MonthlyStat {
  month:    string;
  income:   number;
  expenses: number;
  savings?: number;
}

// ─── Category Breakdown ───────────────────────────────────────────────────────
export interface CategoryBreakdown {
  name:  string;
  value: number;
}

// ─── Forecast ─────────────────────────────────────────────────────────────────
export interface HistoricalIncome {
  month:  string;
  income: number;
}

export interface Forecast {
  historical_income:    HistoricalIncome[];
  smoothed_income?:     { month: string; value: number }[];
  predicted_month:      string;
  predicted_income:     number;
  model_used:           string;
  stages_available?:    number;
  stagesAvailable?:     number;
  is_expense_forecast?: boolean;
  isExpenseForecast?:   boolean;
  volatility?: {
    score:          number;
    fluctuationPct: number;
    fluctuation_pct?: number;
    stabilityScore: number;
    stability_score?: number;
    variance:       number;
  };
  bufferRecommendation?: {
    emergencySavingsPct: number;
    taxReservePct:       number;
  };
  buffer_recommendation?: {
    emergency_savings_pct: number;
    tax_reserve_pct:       number;
  };
  insights?: string[];
}

// ─── Recommendation / Ledger ──────────────────────────────────────────────────
export interface Recommendation {
  current_balance:          number;
  predicted_income:         number;
  recommended_reserve_rate: number;
  reserved_funds:           number;
  emergency_buffer:         number;
  monthly_burn?:            number;
  safe_to_spend:            number;
  message:                  string;
  volatility_score?:        number;
  stability_score?:         number;
  /** 'ok' | 'low_balance' | 'overdraft' */
  status?:                  string;
  is_negative_balance?:     boolean;
  overdraft_amount?:        number;
}

// ─── Financial Summary ────────────────────────────────────────────────────────
export interface Summary {
  total_income:          number;
  total_expenses:        number;
  total_savings:         number;
  latest_balance:        number;
  total_transactions:    number;
  income_transactions?:  number;
  expense_transactions?: number;
  /**
   * Current-month (or latest-available-month) breakdown.
   * KPI cards for "Income This Month", "Expenses This Month",
   * and "Net Savings" MUST read from here — never from total_income / total_expenses.
   */
  current_month?: {
    income:   number;
    expenses: number;
    savings:  number;
    label:    string; // e.g. "May 2026"
  };
}

// ─── Subscription ─────────────────────────────────────────────────────────────
export interface Subscription {
  _id?:             string;
  merchantName?:    string;
  description?:     string;
  amount:           number;
  monthly_cost?:    number;
  yearly_cost?:     number;
  yearlyCost?:      number;
  frequency:        'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'annual' | 'irregular';
  category?:        string;
  occurrences?:     number;
  occurrenceCount?: number;
  isConfirmed?:     boolean;
  confidenceScore?: number;
  nextBillingDate?: string;
  lastDetectedDate?: string;
  priceIncreased?:  boolean;
  previousAmount?:  number | null;
}

// ─── Emergency Fund ───────────────────────────────────────────────────────────
export interface EmergencyFund {
  monthly_burn:                number;
  current_savings:             number;
  runway_months:               number;
  target_savings:              number;
  readiness_score:             number;
  risk_level:                  'excellent' | 'healthy' | 'moderate' | 'low' | 'critical';
  gap_to_target:               number;
  monthly_contribution_needed: number;
  months_of_expense_data:      number;
  // DB model fields (when MongoDB is connected)
  currentSavings?:     number;
  avgMonthlyExpenses?: number;
  runwayMonths?:       number;
  targetSavings?:      number;
  riskLevel?:          string;
  readinessScore?:     number;
  riskColor?:          string;
  progressPct?:        number;
}

// ─── AI Insight ───────────────────────────────────────────────────────────────
export interface AIInsight {
  icon:       string;
  message:    string;
  type:       'positive' | 'warning' | 'info';
  confidence: number;
}

// ─── Cashflow ─────────────────────────────────────────────────────────────────
export interface CashflowMonth {
  month:      string;
  income:     number;
  expenses:   number;
  net:        number;
  cumulative: number;
}

// ─── Dashboard Data ───────────────────────────────────────────────────────────
export interface DashboardData {
  filename?:     string;
  summary:       Summary;
  monthly:       MonthlyStat[];
  category:      CategoryBreakdown[];
  forecast:      Forecast | null;
  recommendation: Recommendation | null;
  cashflow?:     CashflowMonth[];
  cashflowTrend?: 'improving' | 'declining' | 'stable';
  insights?:     AIInsight[];
  // Legacy adapter keys
  monthly_analytics?:   MonthlyStat[];
  category_breakdown?:  CategoryBreakdown[];
  transactions?:        Transaction[];
}
