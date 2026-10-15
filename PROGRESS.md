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

### 下一步

1. **在 Apps Script 編輯器執行測試**（還沒做）
   - 先按 `⌘ + R` 重新整理編輯器，點左側 `Tests.gs`
   - 依序執行：`testAuth` → `testAddWord` → `testAddWord`（第二次）→ `testGetData`
   - 預期結果：
     - `testAuth`：前兩行 `unauthorized`，第三行 `unknown_action`
     - `testAddWord` 第一次：`ok: true`，Vocabulary 多一列 `la boulangerie`
     - `testAddWord` 第二次：`error: duplicate`
     - `testGetData`：`單字 1、複習進度 0、練習紀錄 0`
   - 到 Sheet 確認：外文前後空白已去除、語言為 `FR`、標籤為 `地點,商店`
2. 寫回合結果寫入：PracticeHistory、Rounds、ReviewProgress，`round_id` 重複不寫入
3. 寫 onEdit：在 Sheet 直接輸入 `word` 時自動補 `word_id` 與 `date_added`
4. 部署 Web App
5. 正式使用前執行 `resetToken` 換一組新 token（目前的 token 曾出現在截圖中）

### 常用指令

在 VS Code 的終端機（已在 `my-vocabulary` 資料夾）執行：

```bash
npx @google/clasp push --force   # 把 apps-script/ 推送到 Google
```
