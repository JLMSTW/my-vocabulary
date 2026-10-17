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
- [x] Web App 已部署（v1，執行身分：我，存取：所有人），健康檢查 `doGet` 正常
- Vocabulary 目前有 `la boulangerie`、`il pane`

**第 1 步完成。**

Web App 網址與 token 只存在自己的密碼管理工具，不放進 repo。

## 2026-10-16（下午）：第 2 步前端原型

前端放在 `docs/`，目前使用假資料（`docs/js/mock.js`）。設計稿截圖在 `design/`。

- [x] 第 1 段：骨架（底部分頁、配色、資料層 `data.js`、假資料）
- [x] 第 2 段：學習紀錄（每日目標、連續練習、本月達標、月曆、生字庫、待複習），統計規則已用測試資料驗證
- [x] 第 3 段：篩選 + 生字卡（2026-10-17）
  - 篩選頁加「只練待複習」；少於 5 字不能套用
  - 生字卡可切換方向（外文 → 中文／中文 → 外文），中文 → 外文翻面前不能發音
  - 發音速度 0.6 / 0.8 / 1 倍可點選並記住；語言切換按鈕改「法文／義文」（已更新 CLAUDE.md）
  - 離開生字卡時一次寫入；寫入失敗時上方顯示「重送」
- [x] 第 4 段：拼字、選擇題、回合結束（2026-10-17）
  - 拼字批改：大小寫不計、重音與定冠詞嚴格、iPhone 彎引號視為相同，答錯說明原因並標示位置
  - 選擇題可切換方向（外文 → 中文／中文 → 外文），已更新 CLAUDE.md
  - 錯題優先加權抽題（待複習權重 3），已用模擬驗證
- [x] 第 5 段：新增單字（2026-10-17）

**第 2 步完成。**

## 2026-10-17：第 3 步串接 Apps Script

- [x] 連線設定頁：輸入 Web App 網址與 token，測試連線成功才儲存在手機（`docs/js/connection.js`）
- [x] `data.js` 改接後端；假資料改為開發用（網址加 `?mock=1` 開啟、`?mock=0` 關閉）
- [x] 讀取中、錯誤畫面（重試、連線設定）、學習紀錄頁的重新讀取與設定按鈕
- [x] iPhone 實測連線成功（token 貼上時會自動去掉「token：」與空白）
- [x] 新增單字：新主題改為有「加入」按鈕
- [x] 修正：主題下拉選單沒有列出既有主題、新主題沒存進 Sheet（原生 replaceChildren 不展開陣列）；改用 `setChildren` / `appendChildren`，也修正畫面出現 "null" 字樣
- [x] 詞性加「片語」（存 `phr.`）
- [ ] 實測：手機新增單字寫入 Sheet、練習一回合後 PracticeHistory / Rounds / ReviewProgress 正確

### 本機預覽

需要預覽伺服器（Mac 內建 Python，只讀取 `docs/`）。啟動前先問過使用者。

```bash
python3 -m http.server 8000 --directory docs
```

電腦開 http://localhost:8000 ；iPhone 連同一個網路時開 http://電腦IP:8000

### 下一步

1. 完成第 3 步實測（新增單字、練習一回合，到 Sheet 檢查）
2. 第 4 步：開啟 GitHub Pages、App 圖示、iPhone 加入主畫面、驗收清單

### 後端改版時

改了 `apps-script/` 之後：

1. `npx @google/clasp push --force`
2. Apps Script 編輯器 →「部署」→「管理部署作業」→ 鉛筆圖示 → 版本選「新版本」→「部署」（網址不變）

### 常用指令

在 VS Code 的終端機（已在 `my-vocabulary` 資料夾）執行：

```bash
npx @google/clasp push --force   # 把 apps-script/ 推送到 Google
```
