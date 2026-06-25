// ─── SpendNest API Client ──────────────────────────────────────────────────────
//
// Token strategy:
//   • Access token (15 min)  → stored in Zustand memory, sent as Authorization: Bearer
//   • Refresh token (7 days) → stored in HttpOnly cookie, sent automatically by browser
//
// On any 401 with code === 'TOKEN_EXPIRED', this client silently calls /refresh-token,
// stores the new access token, and retries the original request exactly once.
// A mutex (refreshingPromise) ensures only one refresh runs even if many requests fail at once.

const EXPRESS = process.env.NEXT_PUBLIC_API_URL!;          // http://localhost:5000
const FASTAPI  = process.env.NEXT_PUBLIC_FASTAPI_URL ?? ''; // http://localhost:8000

// ─── Refresh mutex ────────────────────────────────────────────────────────────
// Prevents stampede: if 5 requests 401 simultaneously, only one refresh call is made.
let refreshingPromise: Promise<string | null> | null = null;

const silentRefresh = (): Promise<string | null> => {
  if (refreshingPromise) return refreshingPromise;

  refreshingPromise = fetch(`${EXPRESS}/api/auth/refresh-token`, {
    method: 'POST',
    credentials: 'include', // sends the HttpOnly refreshToken cookie
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      const newToken: string | null = data.accessToken ?? null;

      if (newToken) {
        // Dynamically import store to avoid module init order issues
        const { useAuthStore } = await import('@/store/useAuthStore');
        useAuthStore.getState().setAccessToken(newToken);
      }

      return newToken;
    })
    .catch(() => null)
    .finally(() => {
      refreshingPromise = null;
    });

  return refreshingPromise;
};

// ─── Core fetch helper ────────────────────────────────────────────────────────

const fetchJson = async (url: string, options: RequestInit = {}, _retry = true): Promise<any> => {
  // Grab the current access token from the Zustand store
  let accessToken: string | null = null;
  try {
    const { useAuthStore } = await import('@/store/useAuthStore');
    accessToken = useAuthStore.getState().getAccessToken();
  } catch {
    // Store not yet initialized (e.g. server-side render) — proceed without token
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    credentials: 'include', // still send cookies (refreshToken cookie)
    ...options,
    headers,
  });

  // ── Silent token refresh on expiry ─────────────────────────────────────────
  if (res.status === 401 && _retry) {
    let body: any = {};
    try { body = await res.clone().json(); } catch { /* ignore */ }

    if (body?.code === 'TOKEN_EXPIRED') {
      const newToken = await silentRefresh();

      if (newToken) {
        // Retry the original request once with the new token
        return fetchJson(url, options, false);
      } else {
        // Refresh failed — session is dead, force logout
        try {
          const { useAuthStore } = await import('@/store/useAuthStore');
          useAuthStore.getState().clearUser();
        } catch { /* ignore */ }
        throw new Error('Session expired. Please log in again.');
      }
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || `Request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
};

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

// ─── Upload ───────────────────────────────────────────────────────────────────

export const uploadStatementFile = async (file: File, bankName?: string) => {
  // Get access token for the multipart request (fetchJson not used here as body is FormData)
  let accessToken: string | null = null;
  try {
    const { useAuthStore } = await import('@/store/useAuthStore');
    accessToken = useAuthStore.getState().getAccessToken();
  } catch { /* ignore */ }

  const formData = new FormData();
  formData.append('file', file);
  if (bankName) formData.append('bankName', bankName);

  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${EXPRESS}/api/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers,
  });

  // Handle token expiry for the upload endpoint too
  if (res.status === 401) {
    let body: any = {};
    try { body = await res.clone().json(); } catch { /* ignore */ }

    if (body?.code === 'TOKEN_EXPIRED') {
      const newToken = await silentRefresh();
      if (newToken) {
        // Retry once with refreshed token
        return uploadStatementFile(file, bankName);
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

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

// ─── Analytics Normalizers ────────────────────────────────────────────────────

/**
 * Normalize the backend forecast response to the flat shape the frontend expects.
 * Backend (DB):     { model, generatedAt, predictions: [{ month, predictedIncome }] }
 * Backend (memory): { model_used, predicted_income, predicted_month, ... }
 * Frontend:         { predicted_income, predicted_month, model_used, ... }
 */
const normalizeForecast = (raw: any): any => {
  if (!raw) return null;
  // Already flat (from in-memory store) — return as-is
  if (raw.predicted_income !== undefined) return raw;
  // Normalize from DB shape
  const pred = Array.isArray(raw.predictions) ? raw.predictions[0] : null;
  if (!pred) return null;
  return {
    predicted_income:      pred.predictedIncome ?? pred.predicted_income ?? 0,
    predicted_month:       pred.month ?? pred.predicted_month ?? 'Next Month',
    model_used:            raw.model ?? raw.model_used ?? 'SMA',
    historical_income:     raw.historicalIncome ?? raw.historical_income ?? [],
    smoothed_income:       raw.smoothed_income ?? [],
    volatility:            raw.volatility ?? { score: 0, fluctuationPct: 0, stabilityScore: 0, variance: 0 },
    bufferRecommendation:  raw.bufferRecommendation ?? { emergencySavingsPct: 20, taxReservePct: 15 },
    insights:              raw.insights ?? [],
    recommendedSaveRate:   pred.recommendedSaveRate ?? 0.10,
    isExpenseForecast:     raw.isExpenseForecast ?? false,
    stagesAvailable:       raw.stagesAvailable ?? 0,
  };
};

/**
 * Normalize the backend ledger response to the recommendation shape the frontend expects.
 * DB shape:     { totalIncome, totalExpenses, availableToSpend, saveRate, emergencyBuffer, monthlyBurn }
 * Memory shape: { safe_to_spend, reserved_funds, emergency_buffer, message, ... }
 *
 * FORMULA (Bug #2 fix):
 *   safeToSpend = totalIncome − totalExpenses − taxBuffer − savingsBuffer
 *
 * The ML service may return a safe_to_spend that hasn't had both buffers subtracted, so we
 * re-derive it from the net balance minus reserved + emergency to ensure it can never exceed
 * the net period balance (income − expenses).
 */
const normalizeLedger = (raw: any, forecast: any): any => {
  if (!raw) return null;

  const reserved       = raw.reserved_funds      ?? raw.quarantinedForTaxes ?? 0;
  const emergencyBuf   = raw.emergency_buffer     ?? raw.emergencyBuffer     ?? 0;
  const monthlyBurn    = raw.monthly_burn         ?? raw.monthlyBurn         ?? 0;
  const reserveRate    = raw.recommended_reserve_rate ?? raw.saveRate        ?? 0.10;
  const predictedInc   = forecast?.predicted_income ?? 0;

  const totalIncome   = raw.totalIncome   ?? 0;
  const totalExpenses = raw.totalExpenses ?? 0;
  const taxBuffer     = totalIncome * 0.30;
  const savingsBuffer = totalIncome * 0.20;
  const correctedSafe = Math.max(0, totalIncome - totalExpenses - taxBuffer - savingsBuffer);

  const message = raw.message
    ?? `Keep ₹${Math.round(reserved).toLocaleString('en-IN')} reserved for taxes & emergencies.`;

  return {
    safe_to_spend:            correctedSafe,
    reserved_funds:           reserved,
    emergency_buffer:         emergencyBuf,
    recommended_reserve_rate: reserveRate,
    monthly_burn:             monthlyBurn,
    message,
    current_balance:          totalIncome - totalExpenses,
    predicted_income:         predictedInc,
    ...(raw.status              !== undefined ? { status:             raw.status }              : {}),
    ...(raw.is_negative_balance !== undefined ? { is_negative_balance: raw.is_negative_balance } : {}),
    ...(raw.overdraft_amount    !== undefined ? { overdraft_amount:    raw.overdraft_amount }    : {}),
  };
};

// ─── Dashboard Data Fetcher ───────────────────────────────────────────────────

export const fetchDashboardData = async (uploadId?: string) => {
  const qs = uploadId ? `?uploadId=${uploadId}` : '';

  // Fetch all dashboard data in parallel for performance
  const [summary, monthly, category, forecastRaw, ledgerRaw, txResult, cashflowRaw, insightsRaw] =
    await Promise.all([
      fetchJson(`${EXPRESS}/api/analytics/summary${qs}`),
      tryFetchJson(`${EXPRESS}/api/analytics/monthly${qs}`),
      tryFetchJson(`${EXPRESS}/api/analytics/categories${qs}`),
      tryFetchJson(`${EXPRESS}/api/analytics/forecast${qs}`),
      tryFetchJson(`${EXPRESS}/api/analytics/ledger${qs}`),
      fetchJson(`${EXPRESS}/api/analytics/transactions${qs}${qs ? '&' : '?'}limit=50&page=1`),
      tryFetchJson(`${EXPRESS}/api/analytics/cashflow${qs}`),
      tryFetchJson(`${EXPRESS}/api/analytics/insights${qs}`),
    ]);

  const forecast       = normalizeForecast(forecastRaw);
  const recommendation = normalizeLedger(ledgerRaw, forecast);

  return {
    summary,
    monthly:         monthly   ?? [],
    category:        category  ?? [],
    forecast,
    recommendation,
    cashflow:        cashflowRaw?.cashflow   ?? [],
    cashflowTrend:   cashflowRaw?.net_trend  ?? 'stable',
    insights:        insightsRaw?.insights   ?? [],
    transactions:    txResult?.transactions  ?? [],
  };
};

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const fetchSubscriptions = () =>
  fetchJson(`${EXPRESS}/api/subscriptions`);

export const detectSubscriptions = () =>
  fetchJson(`${EXPRESS}/api/subscriptions/detect`, { method: 'POST' });

export const deleteSubscription = (id: string) =>
  fetchJson(`${EXPRESS}/api/subscriptions/${id}`, { method: 'DELETE' });

// ─── Emergency Fund ───────────────────────────────────────────────────────────

export const fetchEmergencyFund = () =>
  fetchJson(`${EXPRESS}/api/emergency-fund`);

export const updateEmergencyFund = (data: { currentSavings?: number; targetMonths?: number }) =>
  fetchJson(`${EXPRESS}/api/emergency-fund/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const fetchEmergencyFundAnalysis = () =>
  fetchJson(`${EXPRESS}/api/emergency-fund/analysis`);

// ─── Tax Estimator ────────────────────────────────────────────────────────────

export const fetchTaxEstimate = (params?: { regime?: 'old' | 'new'; annualIncome?: number }) => {
  const qs = new URLSearchParams();
  if (params?.regime)       qs.set('regime', params.regime);
  if (params?.annualIncome) qs.set('annualIncome', String(params.annualIncome));
  return fetchJson(`${EXPRESS}/api/tax/estimate?${qs.toString()}`);
};

// ─── Financial Health Score ───────────────────────────────────────────────────

export const fetchHealthScore = () =>
  fetchJson(`${EXPRESS}/api/analytics/health-score`);

// ─── Cashflow Trends ──────────────────────────────────────────────────────────

export const fetchCashflow = (months: number = 6, uploadId?: string) => {
  const qs = new URLSearchParams({ months: String(months) });
  if (uploadId) qs.set('uploadId', uploadId);
  return fetchJson(`${EXPRESS}/api/analytics/cashflow?${qs.toString()}`);
};

// ─── AI Insights ─────────────────────────────────────────────────────────────

export const fetchInsights = () =>
  fetchJson(`${EXPRESS}/api/analytics/insights`);

// ─── Health ───────────────────────────────────────────────────────────────────

export const checkHealth = () =>
  fetchJson(`${EXPRESS}/api/health`);

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
