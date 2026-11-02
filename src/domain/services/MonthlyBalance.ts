/** Period key YYYY-MM from a Date or ISO/date string (YYYY-MM-DD). */
export function toPeriodKey(date: Date | string): string {
  if (typeof date === 'string') {
    return date.slice(0, 7);
  }
  return date.toISOString().slice(0, 7);
}

/** First calendar day of a YYYY-MM period as YYYY-MM-DD. */
export function periodStartDate(period: string): string {
  return `${period}-01`;
}

export function computeMonthFlow(totalIncome: number, totalExpense: number): number {
  return totalIncome - totalExpense;
}

export function computeFinalBalance(
  saldoInicial: number,
  totalIncome: number,
  totalExpense: number
): number {
  return saldoInicial + totalIncome - totalExpense;
}

export const CLOSED_PERIOD_ERROR =
  'El mes está cerrado y no se pueden modificar movimientos ni presupuestos.';
