# More Fun POS Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 將 Customer Web 已驗證的磨飯點餐邏輯建立為唯一共用核心，完成 SMT 橫屏 POS，再由同一核心衍生 SMM 手機版，最後由 Admin 統一管理文案、價格、顯示、權限與數據。

**Architecture:** Customer Web 的商業規則與產品呈現為來源基準。SMT 保留現有 React、Firebase、Worker、裝置、Realtime、Capacitor 與打印邊界，替換目前簡化版點餐規則。SMM 共用同一 domain/core，只改手機操作殼；Admin 不承擔落單，而是配置與數據中樞。

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Vitest, Firebase Auth/RTDB, Cloudflare Worker, Capacitor Android.

## Global Constraints

- Customer Web `morefun-ordering-web` 暫不修改，先作規則與視覺來源基準。
- 正式訂單、接單、狀態、重新計價及重印只經 Cloudflare Worker。
- Firebase RTDB 作即時讀取與正式狀態資料，不允許 SMT 直接越權寫正式訂單。
- SMT 第一優先：現場外賣、網站/App 網絡單、WhatsApp、電話、Foodpanda、Keeta 補錄。
- 堂食第一版只做開枱、加單、整單結帳；拆單、部分付款、混合付款延後。
- 未完成必選項可以加入購物車成為「待補」，但付款前必須完成。
- 所有價格以 Worker 重新計價為最終權威；前端只顯示估算及差異提示。
- 所有功能先 Web/PWA 驗收，UI Lock 後才接 Android native printer bridge。
- 採用 TDD：每項商業規則先寫失敗測試，再寫最小實作。

---

## Platform Responsibility Lock

### Customer Web

- 顧客自助點餐與品牌體驗。
- 提供正確產品分類、產品詳情、套餐選擇、選項摘要與價格呈現基準。
- 不承擔 POS 收款、打印、掛單、查單或員工營運功能。

### SMT

- Sunmi T2s／橫屏主 POS。
- 共用 Customer Web 商業規則。
- 增加來源選擇、現場開單、網絡接單、待補、掛單、收款、售罄、查單、重印、裝置健康及打印橋。

### SMM

- 基於 SMT 同一 domain/core 的手機操作版。
- 主要處理流動接單、售罄、查單、簡單開單、訂單狀態及管理快捷操作。
- 不另建商業規則，不複製另一套價格計算。

### Admin

- 管理文案、商品、分類、價格、套餐規則、顯示模板、售罄、角色、裝置及跨端配置。
- 整合 Customer Web、SMT、SMM 的營運數據與報表。
- 不成為第二個正式訂單權威。

---

## Task 1: 建立 More Fun Core 資料模型

**Files:**
- Create: `src/morefun-core/types/product.ts`
- Create: `src/morefun-core/types/selection.ts`
- Create: `src/morefun-core/types/order.ts`
- Create: `src/morefun-core/types/completion.ts`
- Test: `src/morefun-core/types/coreContracts.test.ts`

**Produces:** `ProductProfile`, `PricingContext`, `SelectionSchema`, `CompletionState`, `OrderSource`。

- [ ] 先寫測試，鎖定 fixed meal、custom meal、bento、salad、snack、drink、riceball bundle 等正式類型。
- [ ] 執行 `npm test -- src/morefun-core/types/coreContracts.test.ts`，確認因類型／函式未建立而失敗。
- [ ] 建立最小型別與 contract parser。
- [ ] 再執行測試並通過。
- [ ] 執行 `npm run check`。

## Task 2: 移植 Customer Web 規則鎖

**Files:**
- Create: `src/morefun-core/rules/orderRules.ts`
- Create: `src/morefun-core/rules/mealPricing.ts`
- Create: `src/morefun-core/rules/fixedMealReplacement.ts`
- Create: `src/morefun-core/rules/packagingFee.ts`
- Create: `src/morefun-core/rules/riceBallPairing.ts`
- Test: `src/morefun-core/rules/orderRules.test.ts`
- Test: `src/morefun-core/rules/pricing.test.ts`

**Produces:** `evaluateCompletion()`, `estimateLinePrice()`, `calculateFixedMealReplacementDelta()`, `calculatePackagingFee()`。

- [ ] 為飲品升級、無需飲品 -$1、同價層雙拼 +$6、禁拼、第二份醬 +$2、雙倍醬 +$2、外賣盒費先寫失敗測試。
- [ ] 為 F1-F6 replacement delta 先寫失敗測試。
- [ ] 最小實作並逐項通過。
- [ ] 確保名稱推斷只作 legacy fallback，不作正式規則來源。

## Task 3: 正式待補模型

**Files:**
- Create: `src/morefun-core/rules/pendingRules.ts`
- Modify: `src/domain/businessRules.ts`
- Modify: `src/domain/types.ts`
- Test: `src/morefun-core/rules/pendingRules.test.ts`

**Produces:** `complete | pending_allowed | blocking_invalid | reminder_only`。

- [ ] 測試未選飲品可加入購物車但不可付款。
- [ ] 測試跨價層雙拼不可加入。
- [ ] 測試 reminder-only 商品可直接付款。
- [ ] 修改現有 `canSave` 與 checkout gate，讓待補成為正常 POS 流程。

## Task 4: Catalog 正式映射

**Files:**
- Create: `src/morefun-core/catalog/normalizeProduct.ts`
- Create: `src/morefun-core/catalog/categoryMapping.ts`
- Create: `src/morefun-core/catalog/productPresentation.ts`
- Modify: `src/domain/businessRules.ts`
- Test: `src/morefun-core/catalog/normalizeProduct.test.ts`

**Produces:** 優先使用 `product_type`, `rule_profile_id`, `pricing_context`, `selection_schema_id`, `box_fee_policy`, `pending_policy`。

- [ ] 測試正式欄位優先於名稱推斷。
- [ ] 測試麵餐、薯角餐、飯團＋飲品、飯團＋小食不再誤判為 bento/simple。
- [ ] 保留舊 catalog fallback 並顯示資料品質警告。

## Task 5: 拆分產品設定器

**Files:**
- Create: `src/features/order-entry/configurators/BentoConfigurator.tsx`
- Create: `src/features/order-entry/configurators/FixedMealConfigurator.tsx`
- Create: `src/features/order-entry/configurators/CustomMealConfigurator.tsx`
- Create: `src/features/order-entry/configurators/RiceballConfigurator.tsx`
- Create: `src/features/order-entry/configurators/SaladConfigurator.tsx`
- Create: `src/features/order-entry/configurators/SnackConfigurator.tsx`
- Create: `src/features/order-entry/configurators/DrinkConfigurator.tsx`
- Modify: `src/components/ProductConfigurator.tsx`
- Test: `src/features/order-entry/configurators/configurators.test.tsx`

- [ ] 每餐類依 Customer Web 已驗證順序顯示選項。
- [ ] 固定餐未修改只顯示 F 編號，修改後只顯示變更。
- [ ] 咖喱不顯示蛋；肉燥／菜飯可走蛋。
- [ ] 待補可儲存，blocking invalid 不可儲存。

## Task 6: Customer Web 視覺語言移植至 SMT

**Files:**
- Create: `src/styles/morefun-tokens.css`
- Create: `src/features/order-entry/OrderEntryPage.tsx`
- Create: `src/features/order-entry/CatalogPanel.tsx`
- Create: `src/features/order-entry/CartPanel.tsx`
- Modify: `src/styles.css`
- Modify: `src/App.tsx`

- [ ] 使用前端暖米色、紙張白、深啡、金色行動色、紫色選取色。
- [ ] 建立橫屏雙欄，不照搬手機寬度。
- [ ] 商品卡、分類、詳情選項與摘要延續 Customer Web 語言。
- [ ] 主要 touch target 不少於 44px。

## Task 7: 簡化 SMT 主導航

**Files:**
- Create: `src/app/MainNavigation.tsx`
- Modify: `src/App.tsx`
- Modify: `src/domain/types.ts`

- [ ] 主入口只保留「開單、訂單、堂食、更多」。
- [ ] 掛單、待補放入開單流程。
- [ ] 查單、重印放入訂單流程。
- [ ] 售罄、裝置、打印、健康及設定放入更多。

## Task 8: 訂單工作台

**Files:**
- Create: `src/features/dispatch/DispatchPage.tsx`
- Create: `src/features/dispatch/NetworkOrderList.tsx`
- Create: `src/features/dispatch/NetworkOrderDetail.tsx`
- Modify: `src/hooks/useSmtController.ts`

- [ ] 狀態只突出待接、已接、可取餐、異常。
- [ ] 不以「製作中」作必需人工步驟。
- [ ] 接單、完成、重印全部使用 Worker API。
- [ ] 新單有明確聲音、視覺與重複提醒策略。

## Task 9: 收款與送單 Review

**Files:**
- Create: `src/features/payment/CheckoutReview.tsx`
- Create: `src/features/payment/PaymentPanel.tsx`
- Modify: `src/components/CheckoutModal.tsx`
- Modify: `src/hooks/useSmtController.ts`
- Test: `src/features/payment/checkout.test.ts`

- [ ] 顯示來源、模式、商品、變更、待補、備註、估算及 Worker 重計價結果。
- [ ] 待補未清除不可付款。
- [ ] Worker 價格不同時必須顯示差額並要求確認。
- [ ] 第一版只鎖現金及單一電子付款；混合付款延後。

## Task 10: SMM 共用核心準備

**Files:**
- Create: `src/morefun-core/index.ts`
- Create: `docs/architecture/SMM_FROM_SMT.md`

- [ ] 所有商業規則從 React UI 中抽離。
- [ ] 確認核心不依賴桌面 DOM、Firebase component 或 Capacitor。
- [ ] 定義 SMM 手機殼只需要的 routes 與權限。

## Task 11: Admin Contract

**Files:**
- Create: `docs/architecture/ADMIN_CONTROL_CONTRACT.md`
- Create: `src/morefun-core/types/adminConfig.ts`
- Test: `src/morefun-core/types/adminConfig.test.ts`

- [ ] 定義 Admin 可管理：文案、商品、價格、分類、顯示、套餐規則、售罄、裝置、角色、報表。
- [ ] 定義版本、發布、回滾及跨端 cache invalidation。
- [ ] 明確 Admin 不直接成為第二個 order database。

## Task 12: Release Gate

**Files:**
- Modify: `README.md`
- Create: `docs/release/SMT_V21_ACCEPTANCE.md`

- [ ] `npm run check` 通過。
- [ ] `npm test` 通過。
- [ ] `npm run build` 通過。
- [ ] Demo、Staging、Live banner 正確。
- [ ] Cloudflare Pages／Sunmi Chrome 真機操作驗收。
- [ ] UI Lock 後才開始 Android native printer bridge。
