import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const CURRENCY_SYMBOL = '₹';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, minimumFractionDigits = 0) {
  // Prevent astronomical numbers from breaking the UI
  const safeAmount = Math.abs(amount) > 1000000000 ? 0 : amount;
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  }).format(safeAmount);
}
