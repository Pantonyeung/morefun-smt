import { describe, expect, it } from 'vitest';
import { normalizeSmtCatalogSnapshot } from './smtCatalogGatewayAdapter';

describe('normalizeSmtCatalogSnapshot', () => {
  it('keeps the shared product id while exposing staff names and canonical categories', () => {
    const catalog = normalizeSmtCatalogSnapshot({
      products: {
        snack23: {
          product_id: 'SNACK_023',
          code: 'YB',
          name: '芋頭蕃薯波波',
          category_name: '小食',
          price: 18,
          product_type: 'snack',
          menu_category_key: 'snack',
          customer_name: '芋頭蕃薯波波',
          staff_name: '黃波',
          kitchen_name: '黃波',
          print_name: '黃波',
          smt_visible: true,
          staff_sort: 8,
        },
      },
    });

    expect(Object.keys(catalog.products)).toEqual(['SNACK_023']);
    expect(catalog.products.SNACK_023.name).toBe('黃波');
    expect(catalog.products.SNACK_023.category).toBe('小食');
    expect(catalog.products.SNACK_023.raw.customer_name).toBe('芋頭蕃薯波波');
  });

  it('removes products hidden from SMT without changing the Firebase path contract', () => {
    const catalog = normalizeSmtCatalogSnapshot({
      products: {
        hidden: {
          product_id: 'HIDDEN_01',
          code: 'H1',
          name: '客戶限定商品',
          category_name: '小食',
          price: 10,
          product_type: 'snack',
          smt_visible: false,
        },
      },
      manifest: { catalog_version: 'v1' },
    });

    expect(catalog.products).toEqual({});
    expect(catalog.manifest).toMatchObject({ catalog_version: 'v1' });
  });
});
