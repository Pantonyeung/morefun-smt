# More Fun SMT Operations-first V2 Design

## Goal

Make the SMT usable at More Fun peak periods: fewer taps, less scrolling, larger touch targets, cart-first verification, order cards instead of long rows, and no repeated data entry for website/app orders.

## Locked operating rules

- Main ordering screen is named `首頁`; workbench is named `訂單`.
- Cart lines are numbered and compressed for verbal checking with customers.
- Search and secondary filters do not occupy the main ordering surface.
- Categories use at most six buttons per row.
- High-frequency actions stay in the lower reach zone.
- Network orders require one confirmation; known source/payment/print routing is reused automatically.
- Order handling is exception-driven. Normal orders should not require staff to repeatedly update status.
- Storm Mode prioritizes taking and printing orders over perfect per-order payment classification.
- Cash is reconciled during day close by denomination count and cash-drawer reverse calculation.

## V2 trial scope

This branch introduces a reversible presentation layer over the existing tested controller:

- denser five-column product grid on the standard Sunmi landscape viewport;
- six-across category grid;
- numbered compact cart lines;
- collapsed source/search/tag controls on the primary screen;
- simplified top status strip;
- six-entry bottom navigation with renamed `首頁` and `訂單`;
- card-based order board with stronger pending and abnormal states;
- larger touch targets and reduced visual noise.

## Deferred functional work

The following require controller/backend contracts and are intentionally not faked in this visual trial:

- opening-float and denomination day-close persistence;
- batch pending-item allocation;
- single-item `可組合` upgrade engine;
- automatic ready/archive timers;
- full-screen payment redesign;
- printer routing UAT on physical hardware;
- persisted card-size modes.

## Rollback

Remove the two V2 imports from `src/main.tsx`. Existing controller, Firebase adapters, Worker client, product configuration, checkout, tables, holds, and print-request behavior remain unchanged.
