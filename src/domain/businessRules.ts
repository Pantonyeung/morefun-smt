import type { CartItem, CartSelections, PendingIssue, Product, ProductAvailability, ProductRuleKind } from './types';

const RICE_BASE_LABELS: Record<NonNullable<CartSelections['riceBase']>, string> = {
  braised: '肉燥飯',
  curry: '咖喱飯',
  vegetable: '菜飯',
};
const RICE_AMOUNT_LABELS: Record<NonNullable<CartSelections['riceAmount']>, string> = {
  normal: '正常飯',
  less: '少飯',
  half: '半飯',
  more: '多飯',
};
const ICE_LABELS: Record<NonNullable<CartSelections['ice']>, string> = { normal: '正常冰', less: '少冰', no_ice: '走冰' };
const SWEET_LABELS: Record<NonNullable<CartSelections['sweetness']>, string> = { normal: '正常甜', less: '少甜', no_sugar: '走甜' };

export interface CatalogBundle {
  products: Record<string, Product>;
  categories: string[];
  paymentMethods: Record<string, Record<string, unknown>>;
  manifest?: Record<string, unknown>;
}

export function normalizeCatalog(input: unknown): CatalogBundle {
  const root = asRecord(input);
  const rawProducts = asRecord(root.products ?? root.catalog ?? root);
  const availability = asRecord(root.availability);
  const products: Record<string, Product> = {};

  for (const [key, value] of Object.entries(rawProducts)) {
    const raw = asRecord(value);
    if (!Object.keys(raw).length) continue;
    const id = text(raw.product_id ?? raw.id ?? key) || key;
    const code = text(raw.code ?? raw.sku ?? raw.product_code ?? id);
    const name = text(raw.name ?? raw.display_name ?? raw.product_name ?? code);
    const category = text(raw.category_name ?? raw.category ?? raw.category_id ?? '其他');
    const availabilityRaw = asRecord(availability[id] ?? availability[key]);
    const availabilityState = normalizeAvailability(
      availabilityRaw.state ?? availabilityRaw.status ?? raw.availability ?? raw.status ?? 'available',
    );
    const price = money(raw.price ?? raw.base_price ?? raw.price_hkd ?? raw.sale_price ?? 0);
    const tags = arrayOfText(raw.tags ?? raw.keywords ?? []);
    const tier = normalizeTier(raw.tier ?? raw.price_tier, price);
    products[id] = {
      id,
      code,
      name,
      category,
      price,
      tags,
      availability: availabilityState,
      ruleKind: inferRuleKind({ code, name, category, raw }),
      imageUrl: text(raw.image_url ?? raw.image ?? raw.photo_url) || undefined,
      tier,
      raw,
    };
  }

  return {
    products,
    categories: [...new Set(Object.values(products).map((product) => product.category))],
    paymentMethods: asRecord(root.paymentMethods ?? root.payment_methods),
    manifest: asRecord(root.manifest),
  };
}

export function inferRuleKind(product: Pick<Product, 'code' | 'name' | 'category'> & { raw?: Record<string, unknown> }): ProductRuleKind {
  const explicit = text(product.raw?.rule_kind ?? product.raw?.product_type).toLowerCase();
  if (['simple', 'bento', 'fixed_set', 'custom_set', 'rice_ball', 'salad', 'snack', 'drink'].includes(explicit)) {
    return explicit as ProductRuleKind;
  }
  const haystack = `${product.code} ${product.name} ${product.category}`.toLowerCase();
  if (/飲品|奶茶|檸檬茶|茶|coffee|drink/.test(haystack)) return 'drink';
  if (/沙律|salad/.test(haystack)) return 'salad';
  if (/小食|炸物|薯角|snack/.test(haystack)) return 'snack';
  if (/自選.*套餐|自選.*餐|custom/.test(haystack)) return 'custom_set';
  if (/紫米套餐|飯團餐|^f[1-6]\b/.test(haystack)) return 'fixed_set';
  if (/飯團/.test(haystack)) return 'rice_ball';
  if (/便當|肉燥飯|咖喱飯|菜飯|拌麵|薯角餐/.test(haystack) || /^(c|v)?\d{1,3}$/i.test(product.code)) return 'bento';
  return 'simple';
}

export function makeInitialSelections(product: Product, catalog: Record<string, Product>): CartSelections {
  const selections: CartSelections = {};
  if (product.ruleKind === 'bento') {
    selections.riceBase = product.code.toUpperCase().startsWith('C') ? 'curry' : product.code.toUpperCase().startsWith('V') ? 'vegetable' : 'braised';
    selections.riceAmount = 'normal';
    selections.noEgg = false;
  }
  if (product.ruleKind === 'fixed_set') {
    selections.drinkId = findProduct(catalog, (candidate) => /台式奶茶/.test(candidate.name))?.id;
    selections.noDrink = false;
  }
  if (product.ruleKind === 'salad') selections.saucePrimary = 'none';
  if (product.ruleKind === 'snack') selections.doubleSauce = false;
  if (product.ruleKind === 'drink') {
    selections.ice = 'normal';
    selections.sweetness = 'normal';
  }
  return selections;
}

export function requiresConfiguration(product: Product): boolean {
  return ['bento', 'fixed_set', 'custom_set', 'salad', 'drink'].includes(product.ruleKind);
}

export function buildCartItem(product: Product, catalog: Record<string, Product>, selections = makeInitialSelections(product, catalog), note = ''): CartItem {
  const pendingIssues = validateSelections(product, selections, catalog);
  return {
    id: `cart-${crypto.randomUUID()}`,
    productId: product.id,
    quantity: 1,
    selections,
    note,
    estimatedUnitPrice: estimateUnitPrice(product, selections, catalog),
    summary: summarizeSelections(product, selections, catalog),
    pendingIssues,
    addedAt: new Date().toISOString(),
  };
}

export function updateCartItem(item: CartItem, product: Product, catalog: Record<string, Product>, selections: CartSelections, note = item.note): CartItem {
  return {
    ...item,
    selections,
    note,
    estimatedUnitPrice: estimateUnitPrice(product, selections, catalog),
    summary: summarizeSelections(product, selections, catalog),
    pendingIssues: validateSelections(product, selections, catalog),
  };
}

export function validateSelections(product: Product, selections: CartSelections, catalog: Record<string, Product>): PendingIssue[] {
  const issues: PendingIssue[] = [];
  if (product.availability !== 'available') issues.push({ kind: 'sold_out', message: `${product.name} 已售罄或停用` });

  if (product.ruleKind === 'bento' && !selections.riceBase) issues.push({ kind: 'rice_base', message: '請選擇飯底' });
  if (product.ruleKind === 'fixed_set' && !selections.noDrink && !selections.drinkId) issues.push({ kind: 'drink', message: '請選擇飲品或選擇無需飲品' });
  if (product.ruleKind === 'custom_set') {
    if (!selections.riceBallId) issues.push({ kind: 'rice_ball', message: '請選擇飯團' });
    if (!selections.snackId) issues.push({ kind: 'snack', message: '請選擇小食' });
    if (!selections.noDrink && !selections.drinkId) issues.push({ kind: 'drink', message: '請選擇飲品或無需飲品' });
  }
  if (product.ruleKind === 'salad' && !selections.saucePrimary) issues.push({ kind: 'sauce', message: '請選擇醬汁' });
  if (product.ruleKind === 'drink') {
    if (!selections.ice) issues.push({ kind: 'invalid_product', message: '請選擇冰量' });
    if (!selections.sweetness) issues.push({ kind: 'invalid_product', message: '請選擇甜度' });
  }

  for (const id of [selections.riceBallId, selections.secondRiceBallId, selections.snackId, selections.drinkId]) {
    if (!id) continue;
    const selected = catalog[id];
    if (!selected) issues.push({ kind: 'invalid_product', message: '已選項目已不存在' });
    else if (selected.availability !== 'available') issues.push({ kind: 'sold_out', message: `${selected.name} 已售罄` });
  }

  if (selections.riceBallId && selections.secondRiceBallId) {
    const first = catalog[selections.riceBallId];
    const second = catalog[selections.secondRiceBallId];
    if (first && second && first.tier && second.tier && first.tier !== second.tier) {
      issues.push({ kind: 'rice_ball', message: '雙拼只可選擇相同價層飯團' });
    }
    if (first && second && isForbiddenRiceBallPair(first, second)) {
      issues.push({ kind: 'rice_ball', message: '此飯團組合不可雙拼' });
    }
  }
  return dedupeIssues(issues);
}

export function estimateUnitPrice(product: Product, selections: CartSelections, catalog: Record<string, Product>): number {
  let total = product.price;
  if (selections.noDrink) total -= 1;
  if (selections.secondRiceBallId) total += 6;
  if (selections.sauceSecondary) total += 2;
  if (selections.doubleSauce) total += 2;
  if (selections.drinkId) total += drinkUpgrade(catalog[selections.drinkId]);
  return Math.max(0, roundMoney(total));
}

export function summarizeSelections(product: Product, selections: CartSelections, catalog: Record<string, Product>): string {
  const parts: string[] = [];
  if (selections.riceBase) parts.push(`飯底：${RICE_BASE_LABELS[selections.riceBase]}`);
  if (selections.riceAmount && selections.riceAmount !== 'normal') parts.push(RICE_AMOUNT_LABELS[selections.riceAmount]);
  if (selections.noEgg && selections.riceBase !== 'curry') parts.push('走蛋');
  if (selections.riceBallId) parts.push(`飯團：${catalog[selections.riceBallId]?.name ?? '未找到'}`);
  if (selections.secondRiceBallId) parts.push(`雙拼：${catalog[selections.secondRiceBallId]?.name ?? '未找到'}`);
  if (selections.snackId) parts.push(`小食：${catalog[selections.snackId]?.name ?? '未找到'}`);
  if (selections.noDrink) parts.push('無需飲品 -$1');
  else if (selections.drinkId) parts.push(`飲品：${catalog[selections.drinkId]?.name ?? '未找到'}`);
  if (selections.saucePrimary) parts.push(`醬汁：${selections.saucePrimary === 'none' ? '不需要' : selections.saucePrimary}`);
  if (selections.sauceSecondary) parts.push(`第二份醬：${selections.sauceSecondary} +$2`);
  if (selections.doubleSauce) parts.push('雙倍醬 +$2');
  if (selections.ice) parts.push(ICE_LABELS[selections.ice]);
  if (selections.sweetness) parts.push(SWEET_LABELS[selections.sweetness]);
  return parts.join(' · ') || (product.ruleKind === 'simple' || product.ruleKind === 'rice_ball' ? '標準製作' : '尚未完成選項');
}

export function cartTotal(items: CartItem[]): number {
  return roundMoney(items.reduce((sum, item) => sum + item.estimatedUnitPrice * item.quantity, 0));
}

export function cartPendingIssues(items: CartItem[]): PendingIssue[] {
  return items.flatMap((item) => item.pendingIssues);
}

export function toApiItem(item: CartItem, catalog: Record<string, Product>) {
  const componentIds = [item.selections.riceBallId, item.selections.secondRiceBallId, item.selections.snackId, item.selections.drinkId].filter(Boolean) as string[];
  const components = componentIds.map((id) => ({ code: catalog[id]?.code ?? id, quantity: 1 }));
  const selections = Object.fromEntries(
    Object.entries(item.selections)
      .filter(([, value]) => value !== undefined && value !== false && value !== '')
      .map(([key, value]) => [key, String(value)]),
  );
  return {
    line_id: item.id,
    product_id: item.productId,
    quantity: item.quantity,
    components,
    selections,
    note: item.note,
  };
}

export function categoryCandidates(catalog: Record<string, Product>, kind: ProductRuleKind): Product[] {
  return Object.values(catalog).filter((product) => product.ruleKind === kind && product.availability === 'available');
}

function inferTier(price: number): Product['tier'] | undefined {
  if (price === 41) return 'A';
  if (price === 43) return 'B';
  if (price === 45) return 'C';
  if (price === 47) return 'D';
  return undefined;
}

function normalizeTier(value: unknown, price: number): Product['tier'] | undefined {
  const tier = text(value).toUpperCase();
  if (['A', 'B', 'C', 'D'].includes(tier)) return tier as Product['tier'];
  return inferTier(price);
}

function normalizeAvailability(value: unknown): ProductAvailability {
  const normalized = text(value).toLowerCase();
  if (['sold_out', 'soldout', 'unavailable', 'false', '0'].includes(normalized)) return 'sold_out';
  if (['permanently_disabled', 'disabled', 'stopped'].includes(normalized)) return 'permanently_disabled';
  return 'available';
}

function drinkUpgrade(product?: Product): number {
  if (!product) return 0;
  const name = product.name;
  if (/手打.*檸檬|手打檸檬/.test(name)) return 10;
  if (/台式奶茶/.test(name)) return 8;
  if (/冷泡|玄米|普洱|氣泡水|限定/.test(name)) return 6;
  if (/凍|冰|冷/.test(name)) return 3;
  return 0;
}

function isForbiddenRiceBallPair(first: Product, second: Product): boolean {
  const names = `${first.name}|${second.name}`;
  return /芒果菠蘿/.test(names) || /芝士泡菜/.test(names);
}

function dedupeIssues(issues: PendingIssue[]): PendingIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.kind}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findProduct(catalog: Record<string, Product>, predicate: (product: Product) => boolean): Product | undefined {
  return Object.values(catalog).find(predicate);
}
function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
}
function text(value: unknown): string { return String(value ?? '').trim(); }
function money(value: unknown): number { const number = Number(value); return Number.isFinite(number) ? roundMoney(number) : 0; }
function roundMoney(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
function arrayOfText(value: unknown): string[] { return Array.isArray(value) ? value.map(text).filter(Boolean) : text(value).split(',').map((item) => item.trim()).filter(Boolean); }
