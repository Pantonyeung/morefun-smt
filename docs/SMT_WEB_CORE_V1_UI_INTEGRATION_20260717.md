# SMT Web Core V1 UI Integration

Branch: `work/smt-web-core-v1-integration-20260717`

This integration preserves the existing React + Vite + TypeScript + Firebase + Cloudflare Worker + Capacitor architecture. It does not replace the repository with the standalone static prototype.

## Included in this change

- Locked top status bar and fixed five-item bottom navigation styling
- Six More Fun brand themes
- Daily automatic theme rotation with manual-theme storage support
- Quick-mode layout tokens and touch-target expansion
- Safe-area handling for Android kiosk and tablet landscape
- Theme/quick-mode initialization before React renders
- Existing Firebase, Worker, controller, order, dine-in, sold-out, day-close and Capacitor flows remain intact

## Local storage contract

- `morefun.smt.theme-mode`: `auto_daily` or `manual`
- `morefun.smt.theme-id`: `sunrise`, `rice`, `zimi`, `moss`, `ocean`, `night`
- `morefun.smt.quick-mode`: `true` or `false`

## Deliberately unchanged

- Firebase authentication and staff role gate
- Worker order submission and acceptance contract
- Firebase RTDB paths and rules
- Production order authority
- Printer bridge contract
- Runtime mode and environment variables
- `ORDER_API_ENABLED` release gate

## Next integration slices

1. Add visible theme and quick-mode controls to the locked More page.
2. Rename remaining legacy UI copy from `掛單` to `暫存` without changing draft storage behavior.
3. Add locked global App/Web new-order modal, badge and defer interaction.
4. Align checkout, payment verification and packaging summary.
5. Run TypeScript, Vitest, build and Cloudflare preview verification before any merge to `main`.
