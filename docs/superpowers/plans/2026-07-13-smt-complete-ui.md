# More Fun SMT Complete UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete tablet-first SMT UI shell and all primary operational views in the existing React/Vite prototype, using fake local data and preserving locked UI-01/UI-02A behavior.

**Architecture:** Keep one React application with a shared tablet shell, global status bar, configurable bottom quick-launch rail, order/cart state, and route-like view switching managed in component state. All views reuse the same design tokens, badges, cards, drawers, and operational data models. Backend, Firebase, Worker, printing, payment execution, and APK packaging remain out of scope.

**Tech Stack:** React 18, TypeScript, Vite, CSS.

## Global Constraints

- Tablet landscape is the primary design target.
- Preserve UI-01 layout and UI-02A detail workspace structure.
- Use local fake data only.
- Do not connect Firebase, Worker, payment, printer, or APK code.
- Fixed quick entries: 掛單／取單、待補／重組、堂食、工作台.
- Configurable quick entries may extend beyond eight; show paging arrows when needed.
- Workbench shows separate network-order and exception badges.
- Cart must not contain掛單 or 待補 buttons.
- Status bar uses icon-only health indicators; abnormal indicators flash and may show badges.
- Product/category density is setting-driven in the UI prototype.

---

### Task 1: Shared SMT shell and navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] Build a global header with order number, icon-only system health, new-order badge, and More entry.
- [ ] Build the configurable bottom quick-launch rail with fixed operational entries and paged extra entries.
- [ ] Implement view switching for 開單、掛單、待補、堂食、工作台、全店快找、整單備註、售罄、重印、更多.
- [ ] Preserve state when switching views.
- [ ] Commit.

### Task 2: Main ordering workspace

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] Implement locked UI-01 cart/product split.
- [ ] Merge quantity, total, and 收款 into one compact red checkout bar.
- [ ] Move 清空 to the cart top-right.
- [ ] Add configurable category columns and product columns.
- [ ] Preserve quick edit and UI-02A entry points.
- [ ] Commit.

### Task 3: Operational views

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] Implement 掛單／取單 list and restore action.
- [ ] Implement 待補／重組 queue with item-level action.
- [ ] Implement 堂食 table board for tables 1–8 and 院外枱.
- [ ] Implement 工作台 with network orders, active orders, reservations, and exception sections.
- [ ] Implement 重印 order finder and print-type actions.
- [ ] Implement 售罄 management list.
- [ ] Implement 全店快找 and 整單備註 views.
- [ ] Commit.

### Task 4: Detail and quick-edit consistency

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] Keep quick-edit and full detail based on product type.
- [ ] Preserve bento 12/C12/V12 naming and rice-base behavior.
- [ ] Preserve rice-ball combination flow, adjustment collapse, remarks, sold-out entry, and price summary.
- [ ] Ensure all details return to the previous screen without resetting the cart.
- [ ] Commit.

### Task 5: Verification and documentation

**Files:**
- Modify: `CHANGELOG.md`
- Create: `docs/ui/SMT-COMPLETE-UI-V0.2-LOCK.md`

- [ ] Verify TypeScript syntax and React render flow.
- [ ] Confirm all quick entries open a visible view.
- [ ] Confirm fixed badges and workbench dual badges render.
- [ ] Confirm cart has no 掛單 or 待補 actions.
- [ ] Record fake-data and backend limitations.
- [ ] Commit.
