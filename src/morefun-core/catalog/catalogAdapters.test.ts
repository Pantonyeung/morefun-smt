import { describe, expect, it } from 'vitest';
import type { Product } from '../../domain/types';
import { adaptCustomerOrderLine } from './orderSnapshotAdapter';
import { adaptProductForStaff } from './staffDisplayAdapter';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'SNACK_023',
    code: 'YB',
    name: '芋頭蕃薯波波',
    category: '小食',
    price: 18,
    tags: [],
    availability: 'available',
    ruleKind: 'snack',
    raw: {},
    ...overrides,
  };
}

describe('staff catalog display adapter', () => {
  it('keeps one product id while exposing customer and staff names', () => {
    const item = product({
      raw: {
        customer_name: '芋頭蕃薯波波',
        staff_name: '黃波',
        kitchen_name: '黃波',
        print_name: '黃波',
        menu_category_key: 'snack',
      },
    });

    const view = adaptProductForStaff(item);

    expect(view.productId).toBe('SNACK_023');
    expect(view.customerName).toBe('芋頭蕃薯波波');
    expect(view.staffName).toBe('黃波');
    expect(view.kitchenName).toBe('黃波');
    expect(view.printName).toBe('黃波');
    expect(view.aliases).toEqual(expect.arrayContaining(['芋頭蕃薯波波', '黃波']));
  });
});

describe('customer order snapshot adapter', () => {
  it('resolves customer order lines by product id and preserves snapshot copy', () => {
    const catalog = {
      SNACK_023: product({ raw: { staff_name: '黃波', kitchen_name: '黃波', print_name: '黃波' } }),
    };

    const result = adaptCustomerOrderLine({
      product_id: 'SNACK_023',
      product_code: 'YB',
      customer_snapshot_name: '芋頭蕃薯波波',
      quantity: 2,
      unit_price: 18,
      catalog_version: '2026-07-14-v1',
    }, catalog);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.line.staffName).toBe('黃波');
    expect(result.line.customerSnapshotName).toBe('芋頭蕃薯波波');
    expect(result.line.quantity).toBe(2);
    expect(result.line.priceMismatch).toBe(false);
  });

  it('marks unknown product ids as abnormal instead of guessing by name', () => {
    const result = adaptCustomerOrderLine({
      product_id: 'UNKNOWN',
      customer_snapshot_name: '芋頭蕃薯波波',
      quantity: 1,
      unit_price: 18,
    }, {});

    expect(result).toEqual({ ok: false, reason: 'unknown_product_id', productId: 'UNKNOWN' });
  });

  it('detects price mismatch against the current canonical catalog', () => {
    const catalog = { SNACK_023: product({ price: 18 }) };
    const result = adaptCustomerOrderLine({
      product_id: 'SNACK_023',
      quantity: 1,
      unit_price: 20,
    }, catalog);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.line.priceMismatch).toBe(true);
    expect(result.line.currentCatalogPrice).toBe(18);
  });
});
