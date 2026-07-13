import { describe, expect, it } from 'vitest';
import { estimateUnitPrice } from './businessRules';
import type { Product } from './types';

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: 'base',
    code: 'F1',
    name: '招牌雞扒紫米飯團餐',
    category: '紫米套餐',
    price: 51,
    tags: [],
    availability: 'available',
    ruleKind: 'fixed_set',
    raw: {},
    ...overrides,
  };
}

describe('fixed-set drink estimate', () => {
  it('keeps the base price when the included drink has no explicit delta', () => {
    const set = makeProduct({ id: 'set' });
    const drink = makeProduct({ id: 'drink', code: 'D01', name: '台式奶茶', category: '飲品', price: 18, ruleKind: 'drink' });
    expect(estimateUnitPrice(set, { drinkId: 'drink' }, { set, drink })).toBe(51);
  });

  it('uses a catalog-provided combo delta when present', () => {
    const set = makeProduct({ id: 'set' });
    const drink = makeProduct({ id: 'drink', code: 'D01', name: '台式奶茶', category: '飲品', price: 18, ruleKind: 'drink', raw: { combo_delta: 8 } });
    expect(estimateUnitPrice(set, { drinkId: 'drink' }, { set, drink })).toBe(59);
  });
});
