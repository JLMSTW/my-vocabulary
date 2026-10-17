# My Vocabulary

個人的法文、義大利文生字複習網站。手機優先，可加入 iPhone 主畫面，全螢幕開啟。

網站：https://jlmstw.github.io/my-vocabulary/

## 功能

- **學習紀錄**：每日目標（每天 10 個字，兩種語言合計）、連續練習天數、本月達標、練習月曆、待複習字數
- **單字紀錄**：每個字答對、答錯幾次，以及是否待複習
- **生字卡**：翻面、發音，標記「記住了」或「再複習」；可切換「外文 → 中文」「中文 → 外文」
- **拼字練習**：看中文拼外文，每回合 5 題；重音與定冠詞必須正確，答錯時說明原因
- **選擇題**：四選一，每回合 5 題；可切換方向
- **錯題優先**：答錯的字比較常出現，連續答對 3 次後恢復
- **篩選**：語言、主題、標籤（可多選）、加入日期、只練待複習
- **新增單字**：在手機上新增，直接寫入 Google Sheet
- **發音**：瀏覽器內建語音，速度可選 0.6 / 0.8 / 1 倍

## 架構

| 層 | 位置 | 說明 |
|---|---|---|
| 前端 | `docs/` | 純 HTML / CSS / JavaScript，由 GitHub Pages 發布 |
| 後端 | `apps-script/` | Google Apps Script Web App，只負責讀寫 Google Sheet |
| 資料 | Google Sheet | 存在個人 Google Drive，不公開 |

前端以 POST（`Content-Type: text/plain`）呼叫 Web App，每個請求都要帶 token；沒有正確 token 一律回傳 `unauthorized`。

## 第一次使用

1. 在 Google Sheet 綁定的 Apps Script 執行 `setup()`，建立工作表並產生 token（執行記錄會顯示）
2. 部署為網頁應用程式：執行身分「我」，存取權「所有人」，取得結尾是 `/exec` 的網址
3. 用手機打開網站，在「連線設定」貼上 Web App 網址與 token
4. Safari 分享按鈕 →「加入主畫面」

Web App 網址與 token 只存在手機上，不放進這個 repo。忘記 token 時，在 Apps Script 執行 `showToken()`；要換新的 token 時，執行 `resetToken()`。

## 開發

### 前端

改完 `docs/` 後 commit 並 push，GitHub Pages 約 1～2 分鐘後更新。

本機預覽：

```bash
python3 -m http.server 8000 --directory docs
```

在網址加上 `?mock=1` 可以改用假資料（`?mock=0` 關閉）。

### 後端

用 [clasp](https://github.com/google/clasp) 推送 `apps-script/`：

```bash
npx @google/clasp push --force
```

推送後，到 Apps Script 編輯器「部署」→「管理部署作業」→ 編輯 → 版本選「新版本」→「部署」。網址不會改變。

## 文件

- `CLAUDE.md`：完整規格（功能、Sheet 結構、API、配色、驗收清單）
- `PROGRESS.md`：開發紀錄
- `design/`：介面設計稿截圖
