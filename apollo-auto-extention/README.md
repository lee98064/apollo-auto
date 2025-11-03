# Apollo Auto Extension v2

Vue 3 + Vite 重新實作的 Apollo Auto Chrome Extension。新的 popup 介面完整移植既有功能，並新增狀態記憶能力，重新開啟時會回到上一次使用的頁面與分頁。

## 開發環境

```bash
cd apollo-auto-extention-v2
yarn install
yarn dev
```

- `yarn dev` 會啟動 Vite 開發伺服器，可直接在瀏覽器中預覽 popup（部分 Chrome API 在瀏覽器環境中會 fallback 到模擬邏輯）。
- 若開發時需要使用 Chrome API，建議以 `yarn build` 產出 `dist` 後，在 Chrome 的擴充功能模式中載入。

## 建置

```bash
yarn build
```

產物會輸出到 `dist/`，包含：

- `popup.html` 與對應的編譯資產
- `background.js`（service worker）
- `manifest.json`（從 `public/manifest.json` 複製）

## 載入擴充功能

1. 在 Chrome 開啟 `chrome://extensions/`
2. 開啟「開發人員模式」
3. 點選「載入未封裝項目」，選擇 `dist/` 目錄

## 差異與注意事項

- UI 採 Element Plus，整合 Vue Router 進行頁面切換，並將各功能拆分為對應的 view / component，減少樣式與狀態耦合問題。
- popup 以 Vue 組件重構，所有登入、排程、Cookie、Telegram 流程與原版本相同。
- 會將登入狀態、伺服器位址與上次瀏覽頁面/分頁存入 `chrome.storage.local`，未在擴充環境執行時則以 `localStorage` 模擬。
- 若需要圖示，可以在 `public/` 內新增 `icon-*.png`，並更新 `manifest.json`。
