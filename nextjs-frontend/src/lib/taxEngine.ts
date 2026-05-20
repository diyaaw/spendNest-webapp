/**
 * Indian Freelancer Tax Engine (FY 2024-25)
 * ──────────────────────────────────────────
 * Pure TypeScript — no dependencies. Can run in browser or server.
 */

export type TaxRegime = 'old' | 'new';

export interface TaxSlabResult {
  slab: string;
  rate: number;
  taxableInRange: number;
  taxInSlab: number;
}

export interface TaxEstimate {
  annualIncome: number;
  taxableIncome: number;
  regime: TaxRegime;
  totalTax: number;
  effectiveRate: number;
  monthlyReserve: number;
  slabBreakdown: TaxSlabResult[];
  advanceTax: AdvanceTaxSchedule[];
  gstRequired: boolean;
  surcharge: number;
  cess: number;
  totalLiability: number;
  // Planning provision fields — used by the Advanced Estimator.
  // These are the pre-rebate figures so the card never shows ₹0
  // even when u/s 87A wipes the final legal liability.
  taxBeforeRebate: number;  // raw slab tax before any rebate
  rebate: number;           // u/s 87A rebate amount applied
  provisionTax: number;     // taxBeforeRebate + 4% cess — the recommended reserve
  provisionEffectiveRate: number; // provisionTax / grossAnnualIncome × 100
  provisionMonthly: number; // provisionTax / 12
}

export interface AdvanceTaxSchedule {
  dueDate: string;
  percentage: number;
  amountDue: number;
  cumulative: number;
  label: string;
}

// ── Old Regime Slabs (FY 2024-25) ────────────────────────────────────────────

const OLD_REGIME_SLABS = [
  { limit: 250_000, rate: 0,    label: 'Up to ₹2.5L' },
  { limit: 500_000, rate: 0.05, label: '₹2.5L–₹5L' },
  { limit: 1_000_000, rate: 0.20, label: '₹5L–₹10L' },
  { limit: Infinity,  rate: 0.30, label: 'Above ₹10L' },
];

// ── New Regime Slabs (FY 2024-25, post-Budget 2023) ──────────────────────────

const NEW_REGIME_SLABS = [
  { limit: 300_000,   rate: 0,    label: 'Up to ₹3L' },
  { limit: 700_000,   rate: 0.05, label: '₹3L–₹7L' },
  { limit: 1_000_000, rate: 0.10, label: '₹7L–₹10L' },
  { limit: 1_200_000, rate: 0.15, label: '₹10L–₹12L' },
  { limit: 1_500_000, rate: 0.20, label: '₹12L–₹15L' },
  { limit: Infinity,  rate: 0.30, label: 'Above ₹15L' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeSlabs(income: number, slabs: typeof OLD_REGIME_SLABS): TaxSlabResult[] {
  const results: TaxSlabResult[] = [];
  let remaining = income;
  let prevLimit = 0;

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const slabWidth = slab.limit === Infinity ? remaining : slab.limit - prevLimit;
    const taxableInRange = Math.min(remaining, slabWidth);
    results.push({
      slab: slab.label,
      rate: slab.rate * 100,
      taxableInRange,
      taxInSlab: Math.round(taxableInRange * slab.rate),
    });
    remaining -= slabWidth;
    prevLimit = slab.limit;
  }

  return results;
}

function rebateU87A(taxBeforeRebate: number, taxableIncome: number, regime: TaxRegime): number {
  // Old: rebate if taxable income ≤ ₹5L (max ₹12,500)
  // New: rebate if taxable income ≤ ₹7L (max ₹25,000)
  if (regime === 'old' && taxableIncome <= 500_000) {
    return Math.min(taxBeforeRebate, 12_500);
  }
  if (regime === 'new' && taxableIncome <= 700_000) {
    return Math.min(taxBeforeRebate, 25_000);
  }
  return 0;
}

// ── Main estimator ────────────────────────────────────────────────────────────

export function estimateTax(
  grossAnnualIncome: number,
  regime: TaxRegime = 'new',
  options: {
    businessExpenseDeduction?: number; // standard deduction or actual business expenses
    tdsAlreadyDeducted?: number;
  } = {}
): TaxEstimate {
  const { tdsAlreadyDeducted = 0 } = options;

  // Section 44ADA — Presumptive Taxation for Professionals
  // ─────────────────────────────────────────────────────────
  // 50% of gross receipts is the deemed profit AND serves as the sole allowed
  // deduction. No additional standard/salary deduction should be applied on top,
  // because the 50% deemed expense already subsumes it.
  //
  // Correct formula: taxableIncome = grossIncome × 0.50
  // (Slab rates then apply normally, including rebate u/s 87A.)
  const businessProfit = grossAnnualIncome * 0.5;

  // taxableIncome is the deemed profit — no further deduction under 44ADA.
  const taxableIncome = Math.max(0, businessProfit);
  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  const slabBreakdown = computeSlabs(taxableIncome, slabs);

  const taxBeforeRebate = slabBreakdown.reduce((s, r) => s + r.taxInSlab, 0);
  const rebate = rebateU87A(taxBeforeRebate, taxableIncome, regime);
  const taxAfterRebate = Math.max(0, taxBeforeRebate - rebate);

  // Surcharge (above ₹50L: 10%, above ₹1Cr: 15%, above ₹2Cr: 25%, above ₹5Cr: 37% old; new regime capped at 25%)
  let surchargeRate = 0;
  if (taxableIncome > 50_00_000) surchargeRate = 0.37;
  else if (taxableIncome > 20_00_000) surchargeRate = 0.25;
  else if (taxableIncome > 10_00_000) surchargeRate = 0.15;
  else if (taxableIncome > 50_00_000 / 10) surchargeRate = 0.10;
  if (regime === 'new') surchargeRate = Math.min(surchargeRate, 0.25);

  const surcharge = Math.round(taxAfterRebate * surchargeRate);
  const cess = Math.round((taxAfterRebate + surcharge) * 0.04); // 4% Health & Education Cess

  const totalTax = taxAfterRebate + surcharge + cess;
  const totalLiability = Math.max(0, totalTax - tdsAlreadyDeducted);

  const effectiveRate = grossAnnualIncome > 0
    ? parseFloat(((totalTax / grossAnnualIncome) * 100).toFixed(2))
    : 0;

  const monthlyReserve = Math.round(totalLiability / 12);

  // ── Planning provision (pre-rebate) ──────────────────────────────────────────
  // Under u/s 87A, low-income taxpayers get a full rebate making final liability ₹0.
  // But as a prudent reserve, we still recommend setting aside the pre-rebate amount
  // + cess. This is what the Advanced Estimator displays.
  const provisionCess = Math.round(taxBeforeRebate * 0.04);
  const provisionTax  = taxBeforeRebate + provisionCess;
  const provisionEffectiveRate = grossAnnualIncome > 0
    ? parseFloat(((provisionTax / grossAnnualIncome) * 100).toFixed(2))
    : 0;
  const provisionMonthly = Math.round(provisionTax / 12);

  // Advance tax schedule
  // Use provisionTax for the schedule so instalments are also non-zero
  // even when rebate makes the final legal liability ₹0.
  const scheduleBase = provisionTax > totalLiability ? provisionTax : totalLiability;
  const advanceTax: AdvanceTaxSchedule[] = [
    { dueDate: '15 Jun',  percentage: 15, label: '1st Instalment' },
    { dueDate: '15 Sep',  percentage: 45, label: '2nd Instalment' },
    { dueDate: '15 Dec',  percentage: 75, label: '3rd Instalment' },
    { dueDate: '15 Mar',  percentage: 100, label: 'Final Instalment' },
  ].map((q, i, arr) => {
    const prevPct = i > 0 ? arr[i - 1].percentage : 0;
    const amountDue = Math.round((scheduleBase * (q.percentage - prevPct)) / 100);
    return {
      ...q,
      amountDue,
      cumulative: Math.round(scheduleBase * q.percentage / 100),
    };
  });

  // GST: mandatory if annual turnover > ₹20L (₹10L for some North-East states)
  const gstRequired = grossAnnualIncome > 20_00_000;

  return {
    annualIncome: grossAnnualIncome,
    taxableIncome,
    regime,
    totalTax,
    effectiveRate,
    monthlyReserve,
    slabBreakdown,
    advanceTax,
    gstRequired,
    surcharge,
    cess,
    totalLiability,
    // Planning provision fields
    taxBeforeRebate,
    rebate,
    provisionTax,
    provisionEffectiveRate,
    provisionMonthly,
  };
}

/** Returns estimates for both regimes so UI can show comparison */
export function compareRegimes(grossAnnualIncome: number, options = {}) {
  return {
    old: estimateTax(grossAnnualIncome, 'old', options),
    new: estimateTax(grossAnnualIncome, 'new', options),
  };
}

/** Calculates the current quarter's advance tax due */
export function getCurrentAdvanceTaxDue(estimate: TaxEstimate): AdvanceTaxSchedule | null {
  const now = new Date();
  const year = now.getFullYear();
  const quarters = [
    new Date(`${year}-06-15`),
    new Date(`${year}-09-15`),
    new Date(`${year}-12-15`),
    new Date(`${year + 1}-03-15`),
  ];
  for (let i = 0; i < quarters.length; i++) {
    if (now <= quarters[i]) return estimate.advanceTax[i] ?? null;
  }
  return null;
}

export const fmt = (n: number) => {
  // Prevent astronomical numbers
  const safeVal = Math.abs(n) > 1000000000 ? 0 : n;
  return '₹' + Math.round(safeVal).toLocaleString('en-IN');
};
