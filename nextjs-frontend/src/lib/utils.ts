import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const CURRENCY_SYMBOL = '₹';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
