// ─── FlowShield API Client ────────────────────────────────────────────────────
//
// WHY ABSOLUTE URLS:
// All Express calls use the absolute backend URL (http://localhost:5000) directly.
// This is critical for cookie-based auth — relative URLs would go through the
// Next.js server-side proxy which doesn't forward the browser's cookie jar.
//
// FastAPI ML endpoints also use absolute URLs for the same reason.

const EXPRESS = process.env.NEXT_PUBLIC_API_URL!;          // http://localhost:5000
const FASTAPI  = process.env.NEXT_PUBLIC_FASTAPI_URL ?? ''; // http://localhost:8000

// ─── Internal helper ──────────────────────────────────────────────────────────

const fetchJson = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, {
    credentials: 'include', // always send/receive cookies
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || `Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const register = (name: string, email: string, password: string) =>
  fetchJson(`${EXPRESS}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

export const login = (email: string, password: string) =>
  fetchJson(`${EXPRESS}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

export const logout = () =>
  fetchJson(`${EXPRESS}/api/auth/logout`, { method: 'POST' });

export const getMe = () =>
  fetchJson(`${EXPRESS}/api/auth/me`);

// ─── Onboarding ───────────────────────────────────────────────────────────────

export const updateOnboardingProfile = (fields: Record<string, unknown>) =>
  fetchJson(`${EXPRESS}/api/auth/onboarding`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });

export const getOnboardingProfile = () =>
  fetchJson(`${EXPRESS}/api/auth/onboarding`);

// ─── Upload ───────────────────────────────────────────────────────────────────
// POST /api/upload — Express receives CSV, calls FastAPI, saves to MongoDB.

export const uploadCsvFile = async (file: File, bankName?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (bankName) formData.append('bankName', bankName);

  const res = await fetch(`${EXPRESS}/api/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || 'Upload failed');
  }

  const uploadResult = await res.json();
  // uploadResult = { uploadId, filename, rowCount, summary }

  // Fetch the full dashboard payload using this specific uploadId
  const dashboardData = await fetchDashboardData(uploadResult.uploadId);
  return { ...dashboardData, filename: uploadResult.filename };
};

// ─── Analytics (Express → MongoDB) ───────────────────────────────────────────

/**
 * Gracefully fetches a JSON endpoint — returns null instead of throwing if the
 * request fails (e.g. 404 when forecast / ledger not yet generated).
 */
const tryFetchJson = async (url: string): Promise<any | null> => {
  try {
    return await fetchJson(url);
  } catch {
    return null;
  }
};

/**
 * Normalize the backend forecast response to the flat shape the frontend expects.
 * Backend:  { model, generatedAt, predictions: [{ month, predictedIncome, recommendedSaveRate }] }
 * Frontend: { predicted_income, predicted_month, model_used }
 */
const normalizeForecast = (raw: any): any => {
  if (!raw) return null;
  // Already flat (from in-memory store) — return as-is
  if (raw.predicted_income !== undefined) return raw;
  // Normalize from DB shape
  const pred = Array.isArray(raw.predictions) ? raw.predictions[0] : null;
  if (!pred) return null;
  return {
    predicted_income: pred.predictedIncome ?? pred.predicted_income ?? 0,
    predicted_month: pred.month ?? pred.predicted_month ?? 'Next Month',
    model_used: raw.model ?? raw.model_used ?? 'SMA',
    historical_income: raw.historicalIncome ?? raw.historical_income ?? [],
    smoothed_income: raw.smoothed_income ?? [],
    volatility: raw.volatility ?? { score: 0, fluctuationPct: 0, stabilityScore: 0, variance: 0 },
    bufferRecommendation: raw.bufferRecommendation ?? { emergencySavingsPct: 20, taxReservePct: 15 },
    insights: raw.insights ?? [],
    recommendedSaveRate: pred.recommendedSaveRate ?? 0.10,
  };
};

/**
 * Normalize the backend ledger response to the recommendation shape the frontend expects.
 * Backend:  { month, totalIncome, totalExpenses, safe_to_spend, reserved_funds, emergency_buffer, recommended_reserve_rate }
 * Frontend: recommendation.safe_to_spend, recommendation.message, etc.
 */
const normalizeLedger = (raw: any, forecast: any): any => {
  if (!raw) return null;
  // Already has the message field (from in-memory) — return as-is
  if (raw.message !== undefined) return raw;
  const reserved = raw.reserved_funds ?? raw.quarantinedForTaxes ?? 0;
  return {
    safe_to_spend: raw.safe_to_spend ?? raw.availableToSpend ?? 0,
    reserved_funds: reserved,
    emergency_buffer: raw.emergency_buffer ?? raw.emergencyBuffer ?? 0,
    recommended_reserve_rate: raw.recommended_reserve_rate ?? raw.saveRate ?? 0.10,
    message: `Keep ₹${Math.round(reserved).toLocaleString('en-IN')} reserved for taxes & emergencies.`,
    current_balance: (raw.totalIncome ?? 0) - (raw.totalExpenses ?? 0),
    predicted_income: forecast?.predicted_income ?? 0,
  };
};

export const fetchDashboardData = async (uploadId?: string) => {
  const qs = uploadId ? `?uploadId=${uploadId}` : '';

  // summary and transactions are required; the rest gracefully degrade to null/[]
  const [summary, monthly, category, forecastRaw, ledgerRaw, txResult] = await Promise.all([
    fetchJson(`${EXPRESS}/api/analytics/summary${qs}`),
    tryFetchJson(`${EXPRESS}/api/analytics/monthly${qs}`),
    tryFetchJson(`${EXPRESS}/api/analytics/categories${qs}`),
    tryFetchJson(`${EXPRESS}/api/analytics/forecast${qs}`),
    tryFetchJson(`${EXPRESS}/api/analytics/ledger${qs}`),
    fetchJson(`${EXPRESS}/api/analytics/transactions${qs}`),
  ]);

  const forecast = normalizeForecast(forecastRaw);
  const recommendation = normalizeLedger(ledgerRaw, forecast);

  return {
    summary,
    monthly:         monthly   ?? [],
    category:        category  ?? [],
    forecast,
    recommendation,
    allTransactions: txResult?.transactions ?? [],
  };
};

// ─── Tax Estimator ────────────────────────────────────────────────────────────

export const fetchTaxEstimate = (params?: { regime?: 'old' | 'new'; annualIncome?: number }) => {
  const qs = new URLSearchParams();
  if (params?.regime) qs.set('regime', params.regime);
  if (params?.annualIncome) qs.set('annualIncome', String(params.annualIncome));
  return fetchJson(`${EXPRESS}/api/tax/estimate?${qs.toString()}`);
};

// ─── Financial Health Score ───────────────────────────────────────────────────

export const fetchHealthScore = () =>
  fetchJson(`${EXPRESS}/api/analytics/health-score`);

// ─── Health ───────────────────────────────────────────────────────────────────

export const checkHealth = () => fetchJson(`${EXPRESS}/api/health`);

// ─── AI Advisor ───────────────────────────────────────────────────────────────

export const chatWithAI = (message: string) =>
  fetchJson(`${EXPRESS}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

// ─── Budgets ──────────────────────────────────────────────────────────────────

export const fetchBudgets = (month?: string) =>
  fetchJson(`${EXPRESS}/api/budgets${month ? `?month=${month}` : ''}`);

export const setBudgetCategoryLimit = (category: string, budgetLimit: number, month?: string) =>
  fetchJson(`${EXPRESS}/api/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, budgetLimit, month }),
  });
