# SMT iPhone Landscape Layout Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one locked SMT landscape layout that keeps identical structure and operation positions across iPhone, iPad, and Sunmi T2s while allowing only density and size changes.

**Architecture:** Replace the current monolithic preview shell with focused locked UI components that consume the existing `useSmtController` contract. Keep Firebase, Worker, RTDB, Capacitor, and printer boundaries unchanged; add responsive CSS tokens and honest demo-only local UI state where the backend contract does not yet expose an action.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Vitest 3, existing Firebase/Capacitor runtime.

## Global Constraints

- Never modify `main`; work only on `work/smt-web-core-v1-integration-20260717`.
- Keep `點單｜訂單｜堂食｜售罄｜更多` fixed at the bottom.
- Keep top status functions visible on every landscape target.
- Keep 30/70 left/right structure; never stack vertically on iPhone landscape.
- Keep quick drinks and 3x3 dine-in grid visible.
- iPhone may reduce font, image, spacing, and product columns from five to four only.
- Unsupported preview-only state must be labelled local/demo and must not claim cloud persistence.

---

### Task 1: Pure layout and timing policy

**Files:**
- Create: `src/lockedV2/layoutPolicy.ts`
- Create: `src/lockedV2/layoutPolicy.test.ts`

**Interfaces:**
- Produces: `buildCategorySlots(categories: string[]): string[]`
- Produces: `getOperationalTiming(order: NetworkOrder, now: number, extensionMinutes?: number)`
- Produces: `displayTableName(index: number): string`

- [ ] Write tests for search being the final category cell, 30-minute countdown, and table names `堂1..堂8/外1`.
- [ ] Implement the pure helpers.
- [ ] Run `npm test -- src/lockedV2/layoutPolicy.test.ts` and expect PASS.

### Task 2: Right-side product drawer

**Files:**
- Create: `src/lockedV2/ProductDrawer.tsx`
- Create: `src/lockedV2/product-drawer.css`

**Interfaces:**
- Consumes existing business-rule functions and `CartItem`, `CartSelections`, `Product`.
- Produces quick-edit and full-detail drawer modes with `onSave`, `onClose`, and `onQuantity` callbacks.

- [ ] Implement quick-edit first view for cart items.
- [ ] Implement full Required/Pool/Link Up rule-backed sections.
- [ ] Keep the cart workspace visible by using a right-side drawer, not a centered modal.
- [ ] Verify TypeScript with `npm run check`.

### Task 3: Locked V2 application surfaces

**Files:**
- Create: `src/lockedV2/LockedOperationsAppV2.tsx`
- Create: `src/lockedV2/locked-v2.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes `useSmtController` unchanged.
- Produces order, orders, dine-in, sold-out, more, status drawer, and global shell.

- [ ] Implement fixed top status bar and bottom navigation.
- [ ] Implement order page with one 2x7 category matrix, search in final cell, fixed left footer, quantity badges, and always-visible quick drinks.
- [ ] Implement submissions separated from Active/History formal orders.
- [ ] Implement left summary plus right 3x3 dine-in grid and waiting strip below the grid.
- [ ] Implement sold-out explicit actions with honest local/demo permanent-stop handling.
- [ ] Implement quick mode/theme/status center in More.
- [ ] Change `main.tsx` to mount `LockedOperationsAppV2` and import the new CSS.
- [ ] Run `npm run check`.

### Task 4: Landscape density and safe-area validation

**Files:**
- Modify: `src/lockedV2/locked-v2.css`
- Modify: `public/sw.js`

**Interfaces:**
- Produces one responsive shell for 844x390, 932x430, 1024x600, and T2s landscape.

- [ ] Remove fixed minimum-height assumptions.
- [ ] Add `100dvh/100svh`, safe-area padding, 44px/50px short-landscape bars, four product columns on iPhone, and internal scroll containment.
- [ ] Keep quick drinks, quick mode, and all five navigation entries visible at short height.
- [ ] Bump service-worker cache name.
- [ ] Run `npm run ci` and expect TypeScript, Vitest, and Vite build PASS.

### Task 5: Preview verification

**Files:**
- No production file changes unless verification exposes a reproducible defect.

- [ ] Wait for GitHub CI and Cloudflare preview.
- [ ] Verify the preview URL loads in demo mode.
- [ ] Check 844x390, 932x430, and 1024x600 using Playwright if available; otherwise record Browser/Playwright unavailability and rely on CI plus user-device screenshots.
- [ ] Confirm no framework error overlay, no missing global bars, and no hidden quick-drink row.
- [ ] Keep PR #7 unmerged pending user review.
