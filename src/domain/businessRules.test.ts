import { describe, expect, it } from 'vitest';
import {
  buildCartItem,
  estimateUnitPrice,
  makeInitialSelections,
  normalizeCatalog,
  summarizeSelections,
  toApiItem,
  validateSelections,
} from './businessRules';
import type { Product } from './types';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    code: '12',
    name: '古早鹽酥雞肉燥飯',
    category: '肉燥便當',
    price: 52,
    tags: ['雞'],
    availability: 'available',
    ruleKind: 'bento',
    raw: {},
    ...overrides,
  };
}

describe('normalizeCatalog', () => {
  it('normalizes Firebase catalog and availability shapes', () => {
    const catalog = normalizeCatalog({
      products: { a: { product_id: 'a', code: 'F1', name: '招牌飯團餐', category_name: '紫米套餐', price: 51 } },
      availability: { a: { state: 'sold_out' } },
    });
    expect(catalog.products.a.code).toBe('F1');
    expect(catalog.products.a.availability).toBe('sold_out');
    expect(catalog.products.a.ruleKind).toBe('fixed_set');
  });
});

describe('More Fun selection rules', () => {
  it('defaults bento rice base from product code and hides curry egg removal', () => {
    const catalog = { p1: product({ code: 'C12', name: '古早鹽酥雞咖喱飯' }) };
    const selections = makeInitialSelections(catalog.p1, catalog);
    expect(selections.riceBase).toBe('curry');
    expect(validateSelections(catalog.p1, { ...selections, noEgg: true }, catalog)).toEqual([]);
    expect(summarizeSelections(catalog.p1, { ...selections, noEgg: true }, catalog)).not.toContain('走蛋');
  });

  it('requires a drink or no-drink choice for fixed sets', () => {
    const set = product({ id: 'set', code: 'F4', name: '韓式燒牛紫米飯團餐', category: '紫米套餐', price: 53, ruleKind: 'fixed_set' });
    const catalog = { set };
    const issues = validateSelections(set, {}, catalog);
    expect(issues.some((issue) => issue.kind === 'drink')).toBe(true);
    expect(validateSelections(set, { noDrink: true }, catalog)).toEqual([]);
    expect(estimateUnitPrice(set, { noDrink: true }, catalog)).toBe(52);
  });

  it('requires rice ball, snack and drink for custom sets', () => {
    const custom = product({ id: 'custom', code: 'ZC', name: '自選紫米套餐', category: '紫米套餐', price: 50, ruleKind: 'custom_set' });
    const issues = validateSelections(custom, {}, { custom });
    expect(issues.map((issue) => issue.kind)).toEqual(expect.arrayContaining(['rice_ball', 'snack', 'drink']));
  });

  it('adds second sauce and double rice-ball charges', () => {
    const salad = product({ id: 'salad', name: '紫米能量沙律', category: '輕食', price: 48, ruleKind: 'salad' });
    expect(estimateUnitPrice(salad, { saucePrimary: 'none', sauceSecondary: '柚子醬' }, { salad })).toBe(50);
    const riceBall = product({ id: 'rb', name: '照燒雞扒紫米飯團', category: '紫米飯團', price: 43, ruleKind: 'rice_ball', tier: 'B' });
    const other = product({ id: 'rb2', name: '吞拿魚紫米飯團', category: '紫米飯團', price: 43, ruleKind: 'rice_ball', tier: 'B' });
    expect(estimateUnitPrice(riceBall, { secondRiceBallId: 'rb2' }, { rb: riceBall, rb2: other })).toBe(49);
  });

  it('blocks cross-tier rice-ball combinations', () => {
    const first = product({ id: 'a', name: 'A 飯團', category: '紫米飯團', price: 41, ruleKind: 'rice_ball', tier: 'A' });
    const second = product({ id: 'b', name: 'B 飯團', category: '紫米飯團', price: 43, ruleKind: 'rice_ball', tier: 'B' });
    const issues = validateSelections(first, { riceBallId: 'a', secondRiceBallId: 'b' }, { a: first, b: second });
    expect(issues.some((issue) => issue.message.includes('相同價層'))).toBe(true);
  });

  it('converts cart selections into Worker order-contract payload', () => {
    const base = product();
    const catalog = { p1: base };
    const item = buildCartItem(base, catalog, { riceBase: 'braised', riceAmount: 'less', noEgg: true }, '分開包裝');
    const payload = toApiItem(item, catalog);
    expect(payload.product_id).toBe('p1');
    expect(payload.selections).toMatchObject({ riceBase: 'braised', riceAmount: 'less', noEgg: 'true' });
    expect(payload.note).toBe('分開包裝');
  });
});
