# MoreFun SMT

磨飯 SMT（Store Management Terminal）網頁原型與 Android APK 前端專案。

## 專案定位

- 獨立於 `morefun-ordering-web` Customer Web。
- 先以可操作網頁原型驗證 UI、流程與高峰操作。
- 後續接入 Firebase RTDB、Cloudflare Worker、Staff／Sync API 與 Android 原生打印服務。
- Customer Web V42DY 不在本 repository 內修改。

## V0.1 範圍

- 快速開單主介面
- 購物車快速修改卡
- 類內快找（只篩選目前候選池）
- 全店快找與類內快找邏輯隔離
- 假資料操作原型

## 開發方向

- React + Vite + TypeScript
- Sunmi T2s 橫屏優先
- 平板／手機備援操作
- 後續使用 Capacitor 封裝 Android APK
- 打印由 Android 原生服務／橋接處理，不由瀏覽器直接控制

## 硬性邊界

- 不修改 `Pantonyeung/morefun-ordering-web`。
- 不把 SMT route 加入 Customer Web。
- 不在前端保存秘密或正式憑證。
- 第一階段不寫入正式訂單、付款、退款、流水、PrintJob 或 Day Close。
- 假資料原型確認後，才逐步接正式後端。

## 狀態

`SMT Prototype Foundation V0.1`：Repository initialization.
