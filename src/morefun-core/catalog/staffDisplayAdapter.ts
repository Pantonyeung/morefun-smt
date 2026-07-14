import type { Product } from '../../domain/types';
import { isMenuCategoryKey, type MenuCategoryKey } from './menuCategory';

export interface CanonicalProductView {
  productId: string;
  productCode: string;
  customerName: string;
  staffName: string;
  kitchenName: string;
  printName: string;
  categoryKey: MenuCategoryKey;
  price: number;
  customerVisible: boolean;
  smtVisible: boolean;
  smmVisible: boolean;
  customerSort: number;
  staffSort: number;
  aliases: string[];
}

export function adaptProductForStaff(product: Product): CanonicalProductView {
  const raw = product.raw ?? {};
  const categoryKey = resolveCategoryKey(raw.menu_category_key, product);
  const customerName = text(raw.customer_name ?? raw.display_name ?? product.name) || product.name;
  const staffName = text(raw.staff_name ?? raw.pos_name ?? raw.short_name ?? customerName) || customerName;
  const kitchenName = text(raw.kitchen_name ?? raw.kds_name ?? staffName) || staffName;
  const printName = text(raw.print_name ?? raw.label_name ?? kitchenName) || kitchenName;

  return {
    productId: product.id,
    productCode: product.code,
    customerName,
    staffName,
    kitchenName,
    printName,
    categoryKey,
    price: product.price,
    customerVisible: bool(raw.customer_visible, true),
    smtVisible: bool(raw.smt_visible, true),
    smmVisible: bool(raw.smm_visible, true),
    customerSort: integer(raw.customer_sort, 9999),
    staffSort: integer(raw.staff_sort ?? raw.smt_sort, 9999),
    aliases: unique([
      customerName,
      staffName,
      kitchenName,
      printName,
      product.name,
      ...arrayOfText(raw.aliases),
    ]),
  };
}

function resolveCategoryKey(value: unknown, product: Product): MenuCategoryKey {
  if (isMenuCategoryKey(value)) return value;
  if (product.ruleKind === 'rice_ball') return 'riceball';
  if (product.ruleKind === 'fixed_set' || product.ruleKind === 'custom_set') return 'set_meal';
  if (product.ruleKind === 'bento') return 'bento';
  if (product.ruleKind === 'snack' || product.ruleKind === 'salad') return 'snack';
  if (product.ruleKind === 'drink') return 'drink';
  return 'more';
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function bool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = text(value).toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return fallback;
}

function integer(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function arrayOfText(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  return text(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
