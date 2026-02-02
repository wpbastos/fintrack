/**
 * Centralized formatting utilities
 * Reads format preferences from environment variables
 */

import { format, parseISO } from "date-fns";

// Date format options (from .env or defaults)
// Common formats:
//   "MMM d, yyyy"     -> "Jan 15, 2024"
//   "yyyy-MM-dd"      -> "2024-01-15"
//   "dd/MM/yyyy"      -> "15/01/2024"
//   "MM/dd/yyyy"      -> "01/15/2024"
//   "d MMM yyyy"      -> "15 Jan 2024"
//   "MMMM d, yyyy"    -> "January 15, 2024"
const DATE_FORMAT = process.env.NEXT_PUBLIC_DATE_FORMAT || "MMM d, yyyy";
const DATE_FORMAT_SHORT = process.env.NEXT_PUBLIC_DATE_FORMAT_SHORT || "MMM d";
const DATETIME_FORMAT = process.env.NEXT_PUBLIC_DATETIME_FORMAT || "MMM d, yyyy HH:mm";

// Currency format options
const CURRENCY_CODE = process.env.NEXT_PUBLIC_CURRENCY_CODE || "CAD";
const CURRENCY_LOCALE = process.env.NEXT_PUBLIC_CURRENCY_LOCALE || "en-CA";

/**
 * Format a date for display
 * @param date - Date object, ISO string, or timestamp
 * @param formatStr - Optional override format string
 */
export function formatDate(date: Date | string | number, formatStr?: string): string {
  const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
  return format(dateObj, formatStr || DATE_FORMAT);
}

/**
 * Format a date without year (for current year context)
 */
export function formatDateShort(date: Date | string | number): string {
  const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
  return format(dateObj, DATE_FORMAT_SHORT);
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string | number): string {
  const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
  return format(dateObj, DATETIME_FORMAT);
}

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param options - Optional overrides for currency code and locale
 */
export function formatCurrency(
  amount: number,
  options?: { currency?: string; locale?: string }
): string {
  return amount.toLocaleString(options?.locale || CURRENCY_LOCALE, {
    style: "currency",
    currency: options?.currency || CURRENCY_CODE,
  });
}

/**
 * Format a number with commas (no currency symbol)
 */
export function formatNumber(
  amount: number,
  options?: { decimals?: number; locale?: string }
): string {
  return amount.toLocaleString(options?.locale || CURRENCY_LOCALE, {
    minimumFractionDigits: options?.decimals ?? 2,
    maximumFractionDigits: options?.decimals ?? 2,
  });
}

/**
 * Format a percentage
 */
export function formatPercent(
  value: number,
  options?: { decimals?: number; locale?: string }
): string {
  return (value / 100).toLocaleString(options?.locale || CURRENCY_LOCALE, {
    style: "percent",
    minimumFractionDigits: options?.decimals ?? 0,
    maximumFractionDigits: options?.decimals ?? 0,
  });
}

// Export format strings for components that need them
export const formats = {
  date: DATE_FORMAT,
  dateShort: DATE_FORMAT_SHORT,
  dateTime: DATETIME_FORMAT,
  currencyCode: CURRENCY_CODE,
  currencyLocale: CURRENCY_LOCALE,
};
