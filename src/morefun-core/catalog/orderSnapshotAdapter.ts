import type { Product } from '../../domain/types';
import { adaptProductForStaff } from './staffDisplayAdapter';

export interface CustomerOrderLineSnapshot {
  product_id: string;
  product_code?: string;
  customer_snapshot_name?: string;
  quantity: number;
  unit_price: number;
  components?: Array<{ product_id?: string; code?: string; quantity?: number }>;
  selections?: Record<string, unknown>;
  note?: string;
  catalog_version?: string;
}

export interface StaffOrderLineView {
  productId: string;
  productCode: string;
  customerSnapshotName: string;
  staffName: string;
  kitchenName: string;
  printName: string;
  quantity: number;
  submittedUnitPrice: number;
  currentCatalogPrice: number;
  priceMismatch: boolean;
  catalogVersion?: string;
  components: Array<{ productId?: string; code?: string; quantity: number }>;
  selections: Record<string, unknown>;
  note: string;
}

export type OrderLineAdaptResult =
  | { ok: true; line: StaffOrderLineView }
  | { ok: false; reason: 'missing_product_id' | 'unknown_product_id'; productId?: string };

export function adaptCustomerOrderLine(
  snapshot: CustomerOrderLineSnapshot,
  catalog: Record<string, Product>,
): OrderLineAdaptResult {
  const productId = String(snapshot.product_id ?? '').trim();
  if (!productId) return { ok: false, reason: 'missing_product_id' };

  const product = catalog[productId];
  if (!product) return { ok: false, reason: 'unknown_product_id', productId };

  const view = adaptProductForStaff(product);
  const submittedUnitPrice = money(snapshot.unit_price);

  return {
    ok: true,
    line: {
      productId,
      productCode: String(snapshot.product_code ?? view.productCode).trim() || view.productCode,
      customerSnapshotName: String(snapshot.customer_snapshot_name ?? view.customerName).trim() || view.customerName,
      staffName: view.staffName,
      kitchenName: view.kitchenName,
      printName: view.printName,
      quantity: positiveInteger(snapshot.quantity, 1),
      submittedUnitPrice,
      currentCatalogPrice: view.price,
      priceMismatch: submittedUnitPrice !== view.price,
      catalogVersion: snapshot.catalog_version,
      components: (snapshot.components ?? []).map((component) => ({
        productId: component.product_id,
        code: component.code,
        quantity: positiveInteger(component.quantity, 1),
      })),
      selections: snapshot.selections ?? {},
      note: String(snapshot.note ?? '').trim(),
    },
  };
}

function money(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
