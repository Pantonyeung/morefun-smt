import type { Product } from '../../domain/types';
import type { CatalogBundle } from '../../domain/businessRules';
import { categoryDefinition, MENU_CATEGORIES, type MenuCategoryKey } from './menuCategory';
import { adaptProductForStaff, type CanonicalProductView } from './staffDisplayAdapter';

export interface StaffCatalogBundle extends CatalogBundle {
  products: Record<string, Product>;
  categories: string[];
  canonicalViews: Record<string, CanonicalProductView>;
}

/**
 * Converts the shared canonical catalog into the SMT presentation model.
 * Product identity, price, availability and raw rule data remain unchanged.
 * Only staff-facing name/category/sort/visibility are adapted.
 */
export function adaptCatalogForSmt(bundle: CatalogBundle): StaffCatalogBundle {
  const canonicalViews: Record<string, CanonicalProductView> = {};
  const visibleProducts: Array<{ product: Product; view: CanonicalProductView }> = [];

  for (const product of Object.values(bundle.products)) {
    const view = adaptProductForStaff(product);
    canonicalViews[product.id] = view;
    if (!view.smtVisible) continue;

    visibleProducts.push({
      product: {
        ...product,
        name: view.staffName,
        category: categoryDefinition(view.categoryKey).staffLabel,
        raw: {
          ...product.raw,
          customer_name: view.customerName,
          staff_name: view.staffName,
          kitchen_name: view.kitchenName,
          print_name: view.printName,
          menu_category_key: view.categoryKey,
          customer_sort: view.customerSort,
          staff_sort: view.staffSort,
        },
      },
      view,
    });
  }

  visibleProducts.sort((left, right) => {
    const categoryDelta = categoryOrder(left.view.categoryKey) - categoryOrder(right.view.categoryKey);
    if (categoryDelta !== 0) return categoryDelta;
    const sortDelta = left.view.staffSort - right.view.staffSort;
    if (sortDelta !== 0) return sortDelta;
    return left.product.code.localeCompare(right.product.code, 'zh-Hant', { numeric: true });
  });

  const products = Object.fromEntries(visibleProducts.map(({ product }) => [product.id, product]));
  const presentKeys = new Set(visibleProducts.map(({ view }) => view.categoryKey));
  const categories = MENU_CATEGORIES
    .filter((category) => category.key !== 'popular' && presentKeys.has(category.key))
    .map((category) => category.staffLabel);

  return {
    ...bundle,
    products,
    categories,
    canonicalViews,
  };
}

function categoryOrder(key: MenuCategoryKey): number {
  return categoryDefinition(key).order;
}
