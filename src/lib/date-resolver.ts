/**
 * Date Resolution Utility
 * Parses raw date strings from bank statements into Date objects
 *
 * Configure date format in .env:
 *   DATE_FORMAT="MDY"  → US format (Month/Day/Year) - default
 *   DATE_FORMAT="DMY"  → EU/CA format (Day/Month/Year)
 */

/**
 * Get default date format preference from environment
 * Returns true if DD/MM/YYYY should be preferred (DMY format)
 */
export function getDefaultDateFormat(): boolean {
  const format = process.env.DATE_FORMAT?.toUpperCase();
  return format === 'DMY';
}

/**
 * Parse a raw date string into a Date object
 * Handles common bank statement date formats
 *
 * Supported formats:
 * - MM/DD/YYYY, MM-DD-YYYY
 * - DD/MM/YYYY, DD-MM-YYYY (when day > 12)
 * - YYYY-MM-DD, YYYY/MM/DD (ISO format)
 * - MMM DD, YYYY (e.g., "Jan 15, 2024")
 * - DD MMM YYYY (e.g., "15 Jan 2024")
 * - DD-MMM-YY (e.g., "15-Jan-24")
 *
 * @param rawDate - Raw date string from bank statement
 * @param preferDayFirst - If true, prefer DD/MM/YYYY over MM/DD/YYYY for ambiguous dates.
 *                         Defaults to DATE_FORMAT env var (DMY=true, MDY=false)
 * @returns Parsed Date or null if unparseable
 */
export function resolveDate(rawDate: string, preferDayFirst?: boolean): Date | null {
  // Use env default if not specified
  const dayFirst = preferDayFirst ?? getDefaultDateFormat();
  if (!rawDate || typeof rawDate !== 'string') return null;

  const cleaned = rawDate.trim();
  if (!cleaned) return null;

  // Try ISO format first: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValidDate(date)) return date;
  }

  // Try numeric formats: MM/DD/YYYY, DD/MM/YYYY, MM-DD-YYYY, DD-MM-YYYY
  const numericMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (numericMatch) {
    const [, first, second, yearStr] = numericMatch;
    let year = parseInt(yearStr);

    // Handle 2-digit year
    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }

    const firstNum = parseInt(first);
    const secondNum = parseInt(second);

    // Determine if MM/DD or DD/MM based on values
    let month: number, day: number;

    if (firstNum > 12) {
      // First must be day (DD/MM/YYYY)
      day = firstNum;
      month = secondNum;
    } else if (secondNum > 12) {
      // Second must be day (MM/DD/YYYY)
      month = firstNum;
      day = secondNum;
    } else {
      // Ambiguous - use preference
      if (dayFirst) {
        day = firstNum;
        month = secondNum;
      } else {
        month = firstNum;
        day = secondNum;
      }
    }

    const date = new Date(year, month - 1, day);
    if (isValidDate(date)) return date;
  }

  // Try text formats: "Jan 15, 2024" or "January 15, 2024"
  const textMatch1 = cleaned.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (textMatch1) {
    const [, monthStr, day, year] = textMatch1;
    const month = parseMonthName(monthStr);
    if (month !== null) {
      const date = new Date(parseInt(year), month, parseInt(day));
      if (isValidDate(date)) return date;
    }
  }

  // Try text formats: "15 Jan 2024" or "15 January 2024"
  const textMatch2 = cleaned.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (textMatch2) {
    const [, day, monthStr, year] = textMatch2;
    const month = parseMonthName(monthStr);
    if (month !== null) {
      const date = new Date(parseInt(year), month, parseInt(day));
      if (isValidDate(date)) return date;
    }
  }

  // Try text formats: "15-Jan-24" or "15-Jan-2024"
  const textMatch3 = cleaned.match(/^(\d{1,2})[-]([A-Za-z]{3,9})[-](\d{2,4})$/);
  if (textMatch3) {
    const [, day, monthStr, yearStr] = textMatch3;
    let year = parseInt(yearStr);
    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }
    const month = parseMonthName(monthStr);
    if (month !== null) {
      const date = new Date(year, month, parseInt(day));
      if (isValidDate(date)) return date;
    }
  }

  return null;
}

/**
 * Parse month name to 0-indexed month number
 */
function parseMonthName(monthStr: string): number | null {
  const months: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };
  return months[monthStr.toLowerCase()] ?? null;
}

/**
 * Check if a Date object is valid
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Format a Date to ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date for display using configured format
 * Uses DATE_FORMAT env var: DMY (DD/MM/YYYY) or MDY (MM/DD/YYYY)
 */
export function formatDateDisplay(date: Date | null): string {
  if (!date) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  if (getDefaultDateFormat()) {
    return `${day}/${month}/${year}`; // DMY
  }
  return `${month}/${day}/${year}`; // MDY
}
