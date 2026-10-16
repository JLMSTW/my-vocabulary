# 開發進度

## 2026-10-16

目前在「開發順序」第 1 步：Sheet 結構與 Apps Script。

### 已完成

- [x] clasp 設定：用 `npx @google/clasp` 執行（全域安裝會遇到權限錯誤 EACCES）
- [x] 已登入 clasp，已 clone 綁定在試算表「My Vocabulary」的 Apps Script 專案
- [x] 已開啟 Google Apps Script API
- [x] `setup()`：建立四個工作表、標題列、純文字格式、token（已在編輯器執行成功）
- [x] API 入口 `doGet` / `doPost`、token 驗證
- [x] `getData`（讀取單字、複習進度、練習紀錄）
- [x] `addWord`（新增單字、重複判定、NFC 正規化）
- [x] 程式碼已推送到 Google

## 2026-10-16（上午）

- [x] 編輯器測試全部通過：`testAuth`、`testAddWord`（新增成功、第二次擋下 duplicate）、`testGetData`
- [x] `saveRound`：寫入 PracticeHistory、ReviewProgress、Rounds；錯題優先規則與 `round_id` 防重複皆測試通過（`testSaveRound`），測試資料已用 `testCleanup` 清除
- [x] `onEdit`：Sheet 直接輸入時自動補 `word_id`、`date_added`，更新 `updated_at`，去空白，重複時跳提示，皆測試通過
- [x] `onEdit`：複製整列貼上時，`word_id` 與其他列重複會自動換新 ID（測試通過）
- Vocabulary 目前有 `la boulangerie`、`il pane`

### 下一步

1. 部署 Web App（第 1 步最後一項）
2. 開始第 2 步：前端原型（先用假資料）
3. 正式使用前執行 `resetToken` 換一組新 token（目前的 token 曾出現在截圖中）

### 常用指令

在 VS Code 的終端機（已在 `my-vocabulary` 資料夾）執行：

```bash
npx @google/clasp push --force   # 把 apps-script/ 推送到 Google
```
