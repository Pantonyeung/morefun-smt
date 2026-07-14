export type MenuCategoryKey =
  | 'popular'
  | 'riceball'
  | 'set_meal'
  | 'bento'
  | 'snack'
  | 'drink'
  | 'more';

export interface MenuCategoryDefinition {
  key: MenuCategoryKey;
  customerLabel: string;
  staffLabel: string;
  order: number;
}

export const MENU_CATEGORIES: readonly MenuCategoryDefinition[] = [
  { key: 'popular', customerLabel: '人氣推薦', staffLabel: '人氣', order: 10 },
  { key: 'riceball', customerLabel: '飯團', staffLabel: '飯團', order: 20 },
  { key: 'set_meal', customerLabel: '套餐', staffLabel: '套餐', order: 30 },
  { key: 'bento', customerLabel: '便當', staffLabel: '便當', order: 40 },
  { key: 'snack', customerLabel: '小食', staffLabel: '小食', order: 50 },
  { key: 'drink', customerLabel: '飲品', staffLabel: '飲品', order: 60 },
  { key: 'more', customerLabel: '更多', staffLabel: '更多', order: 70 },
] as const;

const CATEGORY_KEY_SET = new Set<MenuCategoryKey>(MENU_CATEGORIES.map((item) => item.key));

export function isMenuCategoryKey(value: unknown): value is MenuCategoryKey {
  return typeof value === 'string' && CATEGORY_KEY_SET.has(value as MenuCategoryKey);
}

export function categoryDefinition(key: MenuCategoryKey): MenuCategoryDefinition {
  return MENU_CATEGORIES.find((item) => item.key === key) ?? MENU_CATEGORIES[MENU_CATEGORIES.length - 1];
}
