# SMT iPhone Landscape Layout Validation Design

## Status

Approved for implementation on `work/smt-web-core-v1-integration-20260717`.

## Goal

Provide a temporary iPhone landscape validation surface that preserves the same SMT page structure, component order, and operation positions as Sunmi T2s. The iPhone version exists to expose layout mistakes quickly; after layout lock, T2s remains the final production target.

## Locked responsive rule

- T2s, iPad landscape, and iPhone landscape use the same top status bar, 30/70 work area, fixed five-item bottom navigation, page order, and interaction positions.
- Smaller screens may reduce font size, image height, card gaps, control padding, and top/bottom bar height.
- iPhone landscape may show four product columns instead of five.
- The layout must not collapse into vertical stacking, a hamburger menu, a different table list, or a reduced workflow.
- Quick drinks, quick mode, status center, temporary order/retrieve order, and the 3x3 dine-in table grid remain present.
- Portrait orientation shows a rotate-to-landscape notice and does not become a separate production layout.

## Main layout

- Top status bar: brand, business status, connection/local-work status, quick mode, print/sync, new submissions, clock.
- Main area: fixed 30% left operational workspace and 70% right work surface.
- Bottom navigation: `點單｜訂單｜堂食｜售罄｜更多`.
- iPhone short-landscape target: top bar about 44px, bottom navigation about 50px, remaining height assigned to internal scroll areas.

## Page corrections

### Order

- One 2x7 category matrix; search occupies the final cell and expands inside the matrix.
- No duplicate search row.
- Temporary/retrieve control stays in the fixed left footer.
- Required state controls `先整理` versus `結帳`.
- Product cards keep quantity badges and the `⋯` configuration entry.
- Quick drinks remain visible on all landscape targets.

### Product configuration

- Replace the old centered modal with a right-side operational drawer.
- Cart workspace remains visible.
- Cart-item modification opens a compact quick-edit view first; full details are one step deeper.
- Full details group current rule-backed choices under Required, Pool, and Link Up sections without inventing unavailable backend state.

### Orders

- New submissions remain separate from formal operational orders.
- Formal orders use Active and History views.
- Cards show countdown/elapsed time, source, payment classification, print state, and sync state from available data, with honest fallback labels.

### Dine-in

- Left column keeps active table sessions and temporary orders.
- Right area keeps a fixed 3x3 table grid.
- Waiting area stays below the grid, not inside the left column.
- Selecting a vacant table shows confirmation/details before entering dine-in ordering.

### Sold-out

- Three explicit actions: today sold out, permanent stop, restore supply.
- Search, selection, select current result, and purple-rice quick filter remain visible.
- Demo preview may keep permanent-stop state locally; no fake cloud success claim.

### More and status

- Quick mode and theme controls remain visible.
- Global status center remains reachable from the top bar and More.

## Technical boundary

- Preserve Firebase, Worker, RTDB, Capacitor, authentication, order authority, and printer bridge contracts.
- UI changes consume the existing controller; unsupported preview-only states are labelled local/demo and do not claim cloud persistence.
- Do not merge to `main` until iPhone, iPad, and T2s landscape review passes.

## Acceptance

- At 844x390 and 932x430, the same structural layout is visible without vertical stacking.
- At 1024x600 and typical T2s landscape size, positions match the iPhone validation layout at larger scale.
- No quick-drink row or top status function disappears solely because height is short.
- No page requires Safari toolbars to be manually hidden to reach bottom navigation.
- Internal work areas scroll independently without moving the global bars.
