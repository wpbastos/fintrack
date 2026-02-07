/**
 * Calculate the current billing period for an account with a billing cycle day.
 *
 * If billingCycleDay=19 and today is Feb 6 → period: Jan 19 – Feb 18
 * If billingCycleDay=19 and today is Feb 25 → period: Feb 19 – Mar 18
 */
export function calculateBillingPeriod(
  referenceDate: Date,
  billingCycleDay: number
): { periodStart: Date; periodEnd: Date } {
  const currentDay = referenceDate.getDate();
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  let periodStart: Date;
  let periodEnd: Date;

  if (currentDay >= billingCycleDay) {
    periodStart = new Date(year, month, billingCycleDay, 0, 0, 0, 0);
    periodEnd = new Date(year, month + 1, billingCycleDay - 1, 23, 59, 59, 999);
  } else {
    periodStart = new Date(year, month - 1, billingCycleDay, 0, 0, 0, 0);
    periodEnd = new Date(year, month, billingCycleDay - 1, 23, 59, 59, 999);
  }

  return { periodStart, periodEnd };
}
