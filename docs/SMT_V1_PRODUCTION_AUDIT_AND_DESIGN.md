# More Fun SMT V1｜Production Trial Audit & Design

## 目標

將現有 `SMT Prototype Foundation V0.1` 升級為可發佈的 SMT 試運行版本：保留已定版的主要視覺方向，但移除假資料操作、DOM patch、硬編碼付款／重印／堂食資料，接入 Firebase Auth、Realtime Database 及 Cloudflare Worker staging API。

## 核心判斷

目前 UI 不是單純缺少美化，而是「外觀接近正式、資料流仍是 demo」。主要根因：

1. `App.tsx` 同時負責導航、點單、付款、堂食、網絡單、售罄、重印與設定，責任過多。
2. 商品只使用 11 個 hardcoded sample，與 Firebase 118 商品正式 catalog 不一致。
3. 商品詳情頁的選項按鈕沒有實際選擇邏輯。
4. 加入購物車時未依餐類建立必選項與待補項。
5. 收款完成只清空購物車，沒有建立正式 order／payment／print batch。
6. 網絡單「接單」只改本機 React state，刷新後消失。
7. 重印直接在前端建立 fake print job，違反 Worker／SMT-controlled print contract。
8. 售罄只改本機產品狀態，沒有權限／同步／自動恢復。
9. 堂食平均分單與按商品拆單分成兩套互相競爭的 UI。
10. `DineInItemSplitPatch` 使用 MutationObserver 和 DOM injection，脫離 React state，不能安全發佈。
11. 堂食拆單使用 hardcoded 枱單資料，並以「模擬付款」完成。
12. 查單只顯示 toast，沒有查詢結果。
13. 健康狀態是 seed data，不代表真實 Firebase／API／printer 狀態。
14. 沒有登入、角色驗證、device registration、heartbeat 或 revoke handling。
15. 沒有 loading、retry、offline queue、duplicate submit 或 idempotency UX。
16. 目前多層 CSS override（styles/ui-v05/nav-fix/interaction/dinein patch）容易互相覆蓋。
17. 底部 10 個快捷入口同時顯示，主次不清，高峰時誤按風險高。
18. Modal 沒有 focus trap、Escape、ARIA label、reduced motion 處理。
19. 所有金額使用 number + 字串，沒有一致的 rounding／server repricing 提示。
20. 沒有 source selector，現場、WhatsApp、電話、平台單可能被錯誤記為 walk-in。
21. 沒有訂單確認頁；付款與正式送單次序不清。
22. 部分付款／混合付款沒有分拆明細與剩餘金額保護。
23. 堂食追加單沒有真實 table session／order linkage。
24. 待補批次只標 resolved，未真正寫回商品 selections 或重新計價。
25. 商品卡沒有售罄原因、缺圖 fallback、快捷加購與詳細頁分流。
26. 沒有正式的 PWA／APK bridge contract 與 printer bridge readiness。
27. 沒有 unit test、flow test、build CI 或 release gate。
28. 沒有 staging/live 明確 banner，容易把試運行誤認為正式營運。
29. 沒有 audit event viewer，關鍵操作難以追查。
30. 沒有安全 rollback 開關。

## 已鎖定優化方案（30+）

### P0｜資料與安全

1. Firebase Email/Password 登入與角色檢查。
2. SMT device ID／device number 註冊。
3. Worker API 作唯一正式寫入入口。
4. Firebase RTDB 只作 authenticated realtime read。
5. staging/live/demo 三種 runtime，畫面永久顯示模式。
6. API disabled 時禁止假裝正式成功。
7. 所有 submit 使用 Idempotency-Key。
8. server repricing 回應與前端價格差異提示。
9. SMM/Customer/Printer 權限與 SMT UI 完全分離。
10. local draft／hold 可保存，但明確標為本機未提交。

### P1｜點單與營運流程

11. 118 商品 catalog adapter，支援 availability。
12. 商品 quick card：快捷加單；需要選項時先開詳細頁。
13. 商品詳情根據餐類建立真實選項。
14. 便當飯底、走蛋、飯量規則。
15. 紫米套餐飯團／小食／飲品規則。
16. 飲品升級差價與無需飲品 -$1。
17. 沙律醬汁、第二份醬 +$2。
18. 小食固定醬／雙倍醬 +$2。
19. 飲品冰量／甜度。
20. 飯團同價層雙拼 +$6 與禁拼規則。
21. 自動建立待補，禁止未完成項目付款。
22. order source selector：walk-in/WhatsApp/電話/Web/App/Foodpanda/Keeta。
23. 正式 checkout review：商品、來源、模式、備註、金額、待補。
24. 現金／FPS／PayMe／Alipay／WeChat／平台／混合付款。
25. 混合付款顯示已付、尚欠與每次付款紀錄。
26. 掛單恢復時重新檢查售罄及價格版本。
27. 網絡單按 new/accepted/ready/abnormal 分組。
28. 接單／狀態更新使用 Worker API。
29. 重印使用 authenticated reprint request，不直接建 print job。
30. 查單支援單號、來源、枱號、狀態篩選。
31. 堂食 table session、追加單、按商品拆單、部分付款、完成清枱。
32. 堂食拆單納入 React state，移除 DOM injection。
33. 售罄 UI 顯示本機待同步／雲端已同步／失敗原因。
34. system health 來自 Firebase/API/heartbeat 真實狀態。

### P2｜視覺與動效

35. 保留磨飯暖色系，壓低裝飾、提高訂單資訊密度。
36. 主要操作固定：點單、工作台、堂食、掛單；低頻入口放更多。
37. 商品卡按壓、加入購物車、Modal、toast 使用短動效。
38. `prefers-reduced-motion` 停止非必要動畫。
39. 高危操作二次確認。
40. loading skeleton、empty、offline、retry、permission denied 狀態。
41. 44px 以上 touch target、鍵盤 focus、ARIA label。
42. 付款與送單按鈕使用明確狀態，不用含糊 toast 取代結果。

### P3｜發佈與驗證

43. TypeScript strict、Vitest domain tests、CI build/check/test。
44. staging environment example 與 Cloudflare Pages 設定文件。
45. Firebase/Worker smoke check。
46. APK bridge contract：print request、device health、foreground/background event。
47. 不包含任何 secret；Firebase web config 可公開，staff 密碼不得進 repo。
48. 正式切換前保持 Worker `ORDER_API_ENABLED=false`，由後端 readiness gate 決定。

## 架構

```text
React UI
  → SMT store / domain rules
  → Firebase Auth
  → Firebase RTDB listeners (catalog, dispatch, orders, print status)
  → Cloudflare Worker API (formal writes, accept, status, reprint, device)
  → local persistence (draft/hold only)
  → Android bridge adapter (future Sunmi APK printer execution)
```

## 發佈邊界

本 PR 可做到：

- 可登入、可讀 Firebase catalog／queue／orders。
- 可在 Worker staging enabled 時正式送單、接單、改狀態、要求重印。
- Worker disabled／未部署時清楚顯示阻塞，不會假成功。
- 本機 demo fallback 只用於 UI 驗收，畫面永久標示「本機試運行」。

本 PR 不能虛構完成：

- 未有 Firebase staff 帳戶／Cloudflare secrets 時，不能替店主登入。
- 未部署 Worker staging 時，不能產生正式 Firebase order。
- 未有 Android native bridge 時，不能真實驅動 Sunmi／LAN printer。

## 成功標準

1. `npm run check`、`npm test`、`npm run build` 全過。
2. 無 MutationObserver／DOM injection business flow。
3. 商品選項與待補邏輯有單元測試。
4. API disabled、離線、未登入、權限錯誤均有明確 UI。
5. SMT 可在 staging 帳戶及 Worker 啟用後完成一張正式測試單。
6. PR 不修改 Customer Web。
