import { describe, expect, it } from 'vitest';
import { calculateDrawerTotal, calculateDayClose } from './cashSession';

describe('cash day close', () => {
  it('totals Hong Kong denominations by quantity', () => {
    expect(calculateDrawerTotal({ 500: 1, 100: 20, 50: 2, 20: 3, 10: 4, 5: 2, 2: 5, 1: 7 })).toBe(2727);
  });

  it('reverse calculates cash and remaining non-cash revenue', () => {
    const result = calculateDayClose({ totalSales: 9237, platformSales: 2200, openingFloat: 500, drawerTotal: 4630, cashExpenses: 120, cashRefunds: 50, drawerTopUps: 0 });
    expect(result.estimatedCashSales).toBe(4300);
    expect(result.estimatedUnclassifiedNonCash).toBe(2737);
  });
});
