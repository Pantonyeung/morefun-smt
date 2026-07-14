import { describe, expect, it } from 'vitest';
import type { Product } from '../../domain/types';
import { adaptCatalogForSmt } from './canonicalCatalog';

function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    code: id,
    name: id,
    category: '其他',
    price: 10,
    tags: [],
    availability: 'available',
    ruleKind: 'simple',
    raw: {},
    ...overrides,
  };
}

describe('adaptCatalogForSmt', () => {
  it('keeps canonical identity while showing staff-facing names', () => {
    const yellowBall = product('SNACK_023', {
      code: 'YB',
      name: '芋頭蕃薯波波',
      ruleKind: 'snack',
      raw: {
        customer_name: '芋頭蕃薯波波',
        staff_name: '黃波',
        kitchen_name: '黃波',
        print_name: '黃波',
        menu_category_key: 'snack',
        staff_sort: 2,
      },
    });

    const adapted = adaptCatalogForSmt({
      products: { SNACK_023: yellowBall },
      categories: ['其他'],
      paymentMethods: {},
    });

    expect(adapted.products.SNACK_023.id).toBe('SNACK_023');
    expect(adapted.products.SNACK_023.name).toBe('黃波');
    expect(adapted.products.SNACK_023.category).toBe('小食');
    expect(adapted.products.SNACK_023.raw.customer_name).toBe('芋頭蕃薯波波');
    expect(adapted.canonicalViews.SNACK_023.printName).toBe('黃波');
  });

  it('filters products hidden from SMT without changing the source bundle', () => {
    const hidden = product('hidden', { raw: { smt_visible: false, menu_category_key: 'more' } });
    const source = { products: { hidden }, categories: ['其他'], paymentMethods: {} };
    const adapted = adaptCatalogForSmt(source);

    expect(adapted.products.hidden).toBeUndefined();
    expect(source.products.hidden).toBe(hidden);
  });

  it('orders categories and products using shared category keys and staff sort', () => {
    const products = {
      drink2: product('drink2', { code: 'D2', ruleKind: 'drink', raw: { menu_category_key: 'drink', staff_sort: 20 } }),
      snack2: product('snack2', { code: 'S2', ruleKind: 'snack', raw: { menu_category_key: 'snack', staff_sort: 20 } }),
      snack1: product('snack1', { code: 'S1', ruleKind: 'snack', raw: { menu_category_key: 'snack', staff_sort: 10 } }),
      riceball: product('riceball', { code: 'R1', ruleKind: 'rice_ball', raw: { menu_category_key: 'riceball', staff_sort: 10 } }),
    };

    const adapted = adaptCatalogForSmt({ products, categories: [], paymentMethods: {} });

    expect(adapted.categories).toEqual(['飯團', '小食', '飲品']);
    expect(Object.keys(adapted.products)).toEqual(['riceball', 'snack1', 'snack2', 'drink2']);
  });
});
