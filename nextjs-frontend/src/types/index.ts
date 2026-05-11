// Central TypeScript interfaces for SpendNest
// Matches the actual backend response shape from the Express/FastAPI pipeline

export interface Transaction {
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  balance: number;
  isAnomaly?: boolean;
}

export interface MonthlyStat {
  month: string;
  income: number;
  expenses: number;
}

export interface CategoryBreakdown {
  name: string;
  value: number;
}

export interface HistoricalIncome {
  month: string;
  income: number;
}

export interface Forecast {
  historical_income: HistoricalIncome[];
  predicted_month: string;
  predicted_income: number;
  model_used: string;
}

export interface Recommendation {
  current_balance: number;
  predicted_income: number;
  recommended_reserve_rate: number;
  reserved_funds: number;
  safe_to_spend: number;
  message: string;
}

export interface Summary {
  total_income: number;
  total_expenses: number;
  total_savings: number;
  latest_balance: number;
  total_transactions: number;
}

// The shape returned by POST /api/upload (our Express gateway)
// which wraps the FastAPI parse-and-analyze response
export interface DashboardData {
  // The filename from the original upload
  filename?: string;
  // Core analytics
  summary: Summary;
  // monthly is the key used by the Python backend
  monthly: MonthlyStat[];
  // category is the key used by the Python backend
  category: CategoryBreakdown[];
  forecast: Forecast;
  recommendation: Recommendation;
  allTransactions: Transaction[];
  // Legacy Next.js adapter keys (may also be present)
  monthly_analytics?: MonthlyStat[];
  category_breakdown?: CategoryBreakdown[];
  transactions?: Transaction[];
}
