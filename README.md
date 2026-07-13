# MoreFun SMT V1

磨飯 SMT（Store Management Terminal）獨立 Web／PWA 前端，目標裝置為 Sunmi T2s 橫屏。Customer Web 不在本 repository 內修改。

## V1 已完成

- Firebase Email/Password 登入及 `staffProfiles` 角色驗證
- SMT device ID／`SMT-01` 裝置編號
- Firebase RTDB Catalog、SMT pending／active queue、orders、print jobs realtime read
- Cloudflare Worker staff order、接單、狀態、重印、device register／heartbeat adapter
- Firebase 118 商品 catalog normalization
- 磨飯點單規則：便當飯底、走蛋、飯量、紫米套餐、飲品升級、沙律醬汁、小食雙倍醬、飲品冰甜、飯團同價層雙拼
- 待補檢查，未完成不可收款
- 訂單來源：現場、WhatsApp、電話、網站、App、Foodpanda、Keeta
- 工作台、掛單、查單、售罄試運行、重印請求、堂食按商品拆單
- Demo／Staging／Live 明確模式
- TypeScript、Vitest、GitHub Actions build gate
- 已移除 MutationObserver／DOM injection 堂食 patch

## 重要安全邊界

- 正式 order、接單、狀態及重印只經 Cloudflare Worker。
- SMT 不直接寫 `ordersV1` 或 `printJobsV1`。
- Worker `ORDER_API_ENABLED=false` 時，畫面顯示阻塞並保留購物車，不會假成功。
- Firebase／Cloudflare secrets 不可提交到 GitHub。
- Firebase Web App config 經 Cloudflare Pages Environment Variables 注入。
- 真實打印由 Android native bridge／printer agent 執行；瀏覽器只讀 print status。

## 模式

### Demo

```text
VITE_RUNTIME_MODE=demo
```

只供 UI／流程驗收。商品、訂單與堂食資料保存在本機，不寫 Firebase。

### Staging

```text
VITE_RUNTIME_MODE=staging
VITE_ORDER_API_URL=https://<staging-worker>.workers.dev
```

接 Firebase Auth／RTDB／Worker staging。Worker 是否可寫入由 `/health` 及後端 readiness gate 決定。

### Live

只在以下全部通過後設定：

- SMT Staff 帳戶及裝置綁定
- Firebase Rules 已部署
- Worker secrets 已配置
- staging 正式測試單成功
- 五部打印機及 Sunmi APK 真機驗收
- 回滾測試完成

## Cloudflare Pages

- Repository：`Pantonyeung/morefun-smt`
- Production branch：`main`
- Build command：`npm run build`
- Output directory：`dist`
- Node：22
- Environment Variables：參考 `.env.example`

## 本機開發

```bash
npm install
npm run dev
npm run check
npm test
npm run build
```

## 已知後端 contract 缺口

現有 Worker V1 可支援正式外賣 order、網絡單接收、狀態更新與重印。以下功能在 UI 已有安全試運行介面，但未完成正式後端寫入：

1. `TableSession`／堂食枱號正式實體
2. `PaymentBatch`／混合付款分項
3. SMT availability／售罄 Worker endpoint
4. 歷史訂單 search endpoint
5. Android native printer bridge

UI 不會直接越權寫 Firebase。這些位置會明確標示「本機試運行」或「後端 endpoint 未完成」。

## Audit

完整問題、30+ 優化項目與發佈邊界：

`docs/SMT_V1_PRODUCTION_AUDIT_AND_DESIGN.md`
