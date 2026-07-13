# More Fun／磨飯 SMT｜UI Lock、網站部署與 APK 工作規則

日期：2026-07-13  
狀態：LOCKED PROCESS

## 1. 當前開發順序

目前先完成：

- UI-02A｜平板商品完整詳情工作區

UI-02A 完成並 lock 後，必須立即 rollback 回：

- UI-01｜SMT 主開單介面

目的：

- 修正主介面 layout
- 整合底部快捷功能列
- 確保主介面、快速修改、完整詳情三者一致
- 防止一路向後開發而遺漏主介面未完成事項

在 UI-01 未重新處理及 lock 前，不應繼續無限向後開發其他大型頁面。

---

## 2. 每個 UI 頁面的固定完成流程

每一個 UI／工作狀態必須依照以下次序：

1. 討論商業流程
2. 確認操作邏輯
3. 確認平板 layout
4. 製作可操作前端
5. 實機測試
6. 修正問題
7. 使用者正式確認
8. 標記 UI LOCK
9. 更新規格 MD
10. 更新 CHANGELOG
11. 推送 GitHub
12. Cloudflare Pages 自動部署
13. 在正式測試網站保留可操作版本

只有完成以上程序，該 UI 才算正式完成。

---

## 3. 網站保留要求

所有已 confirm 及 lock 的 UI，不只保留圖片或文字說明，必須保留在可操作網站內。

正式測試網站：

- `morefun-smt.pages.dev`

用途：

- 作為 SMT 最新可操作版本
- 保留所有已 lock 的前端功能
- 供手機、Android 平板及 Sunmi T2s 測試
- 日後可抽取已完成 UI 或元件
- 作為 APK 打包前的唯一前端基準

網站內容即為實際前端來源，不另做一套只供 APK 使用的介面。

---

## 4. 版本保留規則

每次 UI lock 後必須保留：

- UI 編號
- UI 名稱
- 版本號
- Lock 日期
- Git commit SHA
- 變更內容
- 未修改範圍
- 回滾版本
- 測試結果

建議命名例子：

```text
UI-02A｜平板商品完整詳情工作區 V0.1 LOCK
```

Git commit message 例子：

```text
lock(ui-02a): tablet product detail workspace v0.1
```

---

## 5. UI 拼接原則

後續頁面不需要整張重新設計。

可從已 lock UI 抽取：

- 頂部狀態列
- 左側購物車
- 商品分類列
- 商品卡
- 快速修改抽屜
- 詳情工作區
- 底部快捷功能列
- 收款模組
- 訂單狀態模組

再按正式主介面組合。

硬性規則：

- 不因新頁面而改掉已 lock 元件邏輯
- 不因效果圖外圍 layout 而覆蓋正式主介面
- 每次只鎖當前討論範圍
- 未 lock 區域只作臨時佔位

---

## 6. APK 最終方向

最終 APK 必須根據網站最終呈現方式生成。

正式流程：

```text
GitHub 前端原始碼
→ Cloudflare Pages 網站驗收
→ 平板／Sunmi T2s 實機確認
→ Capacitor Android 封裝
→ 原生打印橋接
→ Staging APK
→ 店舖實測
→ Production APK
```

APK 不會重新設計另一套 UI。

APK 與網站必須共用：

- React 前端
- UI layout
- 商業流程
- 商品選擇邏輯
- 訂單流程
- 收款流程
- 工作台流程

APK 只額外加入：

- Android 全屏與橫屏控制
- 防休眠
- 聲音與震動
- 本地資料保存
- Sunmi T2s 內置打印機橋接
- 網口廚房打印機
- 網口標籤打印機
- 背景 Print Agent
- 開機啟動
- 離線與重試能力

---

## 7. 目前鎖定的下一步

目前執行：

```text
完成 UI-02A
```

完成後必須：

```text
Rollback 至 UI-01
→ 修正 SMT 主介面
→ 整合已 lock 狀態列
→ 整合已 lock 詳情頁
→ 討論底部快捷功能列
→ 更新網站
→ 正式 lock UI-01
```

此項不得遺漏。
