import { normalizeCatalog } from '../domain/businessRules';
import { adaptCatalogForSmt, type StaffCatalogBundle } from '../morefun-core/catalog/canonicalCatalog';

/**
 * Keeps the Firebase path and payload contract unchanged while presenting the
 * shared customer catalog through the SMT staff-name/category adapter.
 */
export function normalizeSmtCatalogSnapshot(raw: unknown): StaffCatalogBundle {
  return adaptCatalogForSmt(normalizeCatalog(raw));
}
