// ─── FlowShield API Client ────────────────────────────────────────────────────
//
// WHY ABSOLUTE URLS:
// All Express calls use the absolute backend URL (http://localhost:5000) directly.
// This is critical for cookie-based auth — if we used relative URLs (/api/...),
// the request would go through the Next.js server-side proxy, which does NOT
// forward the browser's cookie jar. The browser would never receive or send
// the httpOnly auth cookie. Absolute URLs let the browser handle cookies natively.
//
// FastAPI ML endpoints (analytics) also use absolute URLs for the same reason.

const EXPRESS = process.env.NEXT_PUBLIC_API_URL!;          // http://localhost:5000
const FASTAPI  = process.env.NEXT_PUBLIC_FASTAPI_URL ?? ''; // http://localhost:8000 (optional)

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

// ─── Upload ───────────────────────────────────────────────────────────────────
// POST /api/upload — Express receives CSV, calls FastAPI internally, saves to MongoDB.
// Returns: { uploadId, filename, rowCount, summary }

export const uploadCsvFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  // Do NOT set Content-Type header — browser sets it automatically with boundary
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

  // Fetch the full dashboard payload from Express analytics endpoints
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

export const fetchDashboardData = async (uploadId?: string) => {
  const qs = uploadId ? `?uploadId=${uploadId}` : '';

  // Use individual try/catch via tryFetchJson so a missing forecast or ledger
  // record (404) does NOT abort the entire dashboard load.
  const [summary, monthly, category, forecast, ledger, txResult] = await Promise.all([
    fetchJson(`${EXPRESS}/api/analytics/summary${qs}`),        // required — throws on fail
    tryFetchJson(`${EXPRESS}/api/analytics/monthly${qs}`),     // optional
    tryFetchJson(`${EXPRESS}/api/analytics/categories${qs}`),  // optional
    tryFetchJson(`${EXPRESS}/api/analytics/forecast${qs}`),    // optional (may be null)
    tryFetchJson(`${EXPRESS}/api/analytics/ledger${qs}`),      // optional (may be null)
    fetchJson(`${EXPRESS}/api/analytics/transactions${qs}`),   // required — throws on fail
  ]);

  return {
    summary,
    monthly:         monthly   ?? [],
    category:        category  ?? [],
    forecast:        forecast  ?? null,
    recommendation:  ledger    ?? null,
    allTransactions: txResult?.transactions ?? [],
  };
};

// ─── Health ───────────────────────────────────────────────────────────────────

export const checkHealth = () => fetchJson(`${EXPRESS}/api/health`);
