'use strict';

/**
 * ml.service.js
 * ─────────────
 * Sends an uploaded CSV buffer to the Flask ML microservice using native fetch.
 *
 * Why native fetch?
 * - Node 18+ ships fetch globally — no extra dependency needed.
 * - Avoids the axios + form-data packages (simpler, lighter, explicit).
 *
 * Multipart/form-data is built manually using a random boundary string,
 * which is the same approach browsers use internally.
 */

const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Sends the uploaded CSV buffer to the Flask ML service.
 *
 * @param {Buffer} fileBuffer - Raw CSV bytes from multer (memoryStorage)
 * @param {string} filename   - Original filename (e.g. "statement.csv")
 * @returns {Promise<Object>} - Parsed JSON response from Flask:
 *   { success, transactions[], summary, forecast, recommendation,
 *     monthly_analytics, category_breakdown, ... }
 */
const parseAndAnalyze = async (fileBuffer, filename) => {
  const endpoint = `${ML_BASE_URL}/api/parse-and-analyze`;
  console.log(`🤖 [ML] Forwarding '${filename}' (${fileBuffer.length} bytes) to ${endpoint}`);

  // ── Build multipart/form-data manually ──────────────────────────────────────
  // The boundary is a random string that separates form fields in the body.
  const boundary = `----FlowShieldBoundary${Date.now()}`;
  const CRLF = '\r\n';

  // Part header
  const partHeader = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    `Content-Type: text/csv`,
    '',
    '',
  ].join(CRLF);

  // Part footer
  const partFooter = `${CRLF}--${boundary}--${CRLF}`;

  const body = Buffer.concat([
    Buffer.from(partHeader, 'utf-8'),
    fileBuffer,
    Buffer.from(partFooter, 'utf-8'),
  ]);

  // ── Send request ─────────────────────────────────────────────────────────────
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
      body,
      signal: AbortSignal.timeout(60_000), // 60s — generous for large CSVs
    });
  } catch (err) {
    // Network-level errors (ECONNREFUSED, timeout, etc.)
    const isRefused = err.cause?.code === 'ECONNREFUSED' || err.code === 'ECONNREFUSED';
    const isTimeout = err.name === 'TimeoutError';
    if (isRefused) {
      const e = new Error('ML service is unreachable. Is Flask running on port 8000?');
      e.code = 'ECONNREFUSED';
      throw e;
    }
    if (isTimeout) {
      const e = new Error('ML service timed out after 60s. The CSV may be too large.');
      e.code = 'ETIMEDOUT';
      throw e;
    }
    throw err;
  }

  // ── Parse response ───────────────────────────────────────────────────────────
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('❌ [ML] Non-JSON response from Flask:', text.slice(0, 500));
    throw new Error(`ML service returned non-JSON (HTTP ${response.status}): ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    // Flask returned an HTTP error — propagate the message from the JSON body
    const detail = data?.error || data?.detail || data?.message || response.statusText;
    console.error(`❌ [ML] HTTP ${response.status}: ${detail}`);
    const e = new Error(`ML service error (${response.status}): ${detail}`);
    e.statusCode = response.status;
    e.mlDetail   = detail;
    throw e;
  }

  console.log(
    `✅ [ML] Response received — transactions: ${data.transactions?.length ?? 0} | ` +
    `income: ${data.summary?.total_income ?? data.totalIncome} | ` +
    `expenses: ${data.summary?.total_expenses ?? data.totalExpenses}`
  );

  return data;
};

module.exports = { parseAndAnalyze };
