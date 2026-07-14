export const CASH_DENOMINATIONS = [500, 100, 50, 20, 10, 5, 2, 1] as const;
export type CashDenomination = typeof CASH_DENOMINATIONS[number];
export type CashCounts = Partial<Record<CashDenomination, number>>;

export interface CashSession {
  businessDate: string;
  openingFloat: number;
  openedAt: string;
  closedAt?: string;
  closingCounts?: CashCounts;
  closingDrawerTotal?: number;
  nextOpeningFloat?: number;
}

export interface DayCloseInput {
  totalSales: number;
  platformSales: number;
  openingFloat: number;
  drawerTotal: number;
  cashExpenses: number;
  cashRefunds: number;
  drawerTopUps: number;
}

export function businessDate(date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });
}

export function calculateDrawerTotal(counts: CashCounts): number {
  return CASH_DENOMINATIONS.reduce((sum, denomination) => sum + denomination * Math.max(0, Math.floor(Number(counts[denomination] || 0))), 0);
}

export function calculateDayClose(input: DayCloseInput) {
  const estimatedCashSales = Math.max(0, input.drawerTotal - input.openingFloat + input.cashExpenses + input.cashRefunds - input.drawerTopUps);
  const estimatedUnclassifiedNonCash = Math.max(0, input.totalSales - input.platformSales - estimatedCashSales);
  return { estimatedCashSales, estimatedUnclassifiedNonCash };
}

const SESSION_KEY = 'morefun.smt.cash-session.v1';
const LAST_CLOSE_KEY = 'morefun.smt.last-close.v1';

export function loadCashSession(): CashSession | null {
  try {
    const value = localStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) as CashSession : null;
  } catch { return null; }
}

export function loadSuggestedOpeningFloat(): number {
  try {
    const value = localStorage.getItem(LAST_CLOSE_KEY);
    if (!value) return 0;
    return Number((JSON.parse(value) as CashSession).nextOpeningFloat || 0);
  } catch { return 0; }
}

export function openCashSession(openingFloat: number): CashSession {
  const session: CashSession = { businessDate: businessDate(), openingFloat: Math.max(0, openingFloat), openedAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function closeCashSession(session: CashSession, counts: CashCounts, nextOpeningFloat: number): CashSession {
  const closed: CashSession = {
    ...session,
    closedAt: new Date().toISOString(),
    closingCounts: counts,
    closingDrawerTotal: calculateDrawerTotal(counts),
    nextOpeningFloat: Math.max(0, nextOpeningFloat),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(closed));
  localStorage.setItem(LAST_CLOSE_KEY, JSON.stringify(closed));
  return closed;
}

export function isCashSessionOpenToday(session: CashSession | null): session is CashSession {
  return Boolean(session && session.businessDate === businessDate() && !session.closedAt);
}
