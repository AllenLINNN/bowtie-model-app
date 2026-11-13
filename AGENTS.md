# Bowtie Model App

Bowtie 風險分析的單頁 web app。使用者在畫布上拖放節點建立 Bowtie 圖（危害、威脅、頂端事件、屏障、後果），再選用 LOPA 半定量／定量分析與 5×5 風險矩陣。領域是鐵道營運安全，介面全部是繁體中文。

部署在 GitHub Pages：push 到 `main` 就會觸發 `.github/workflows/deploy.yml` 自動建置上線。所以 push 前要先確認 build 通過，並取得 Allen 同意。

## 指令

前端在 `frontend/`，所有 npm 指令都在這個目錄執行。

| 用途 | 指令 | 怎麼算成功 |
|---|---|---|
| 開發 | `npm run dev` | Vite 印出 `http://localhost:5173/bowtie-model-app/` |
| 型別檢查 | `npx tsc --noEmit` | 沒有任何輸出 |
| 建置 | `npm run build` | 最後一行是 `✓ built in …`；chunk 超過 500 kB 的警告是既有狀況 |

專案沒有自動化測試。改 UI 後用 dev server 在瀏覽器實際操作一次受影響的流程，並確認 console 沒有錯誤。

## 架構

- React 18 + TypeScript + Vite 5，樣式用 Tailwind CSS 3。
- 畫布用 `@xyflow/react`（React Flow 12），狀態用 Zustand。
- 資料存在瀏覽器 IndexedDB（`localforage`），沒有後端。

| 檔案 | 負責 |
|---|---|
| `frontend/src/store/useStore.ts` | 唯一的狀態來源：專案、資料庫、編號計數器、undo/redo、LOPA 路徑同步（`syncScenarioPaths`）與計算（`calculateLopa`） |
| `frontend/src/components/ui.tsx` | 共用元件：`SegmentedTabs`、`Switch`、`Field`、`inputClass`、`isImeComposing` |
| `frontend/src/utils/nodeTypes.ts` | 六種節點的名稱與配色，畫布、範本、資料庫、專案卡片共用 |
| `frontend/src/components/BowtieEditor.tsx` | 畫布、拖放、連線規則（`VALID_PATHS`） |
| `frontend/src/components/PropertiesPanel.tsx` | 節點／資料庫項目／連線的屬性編輯 |
| `frontend/src/components/LopaTable.tsx`、`RiskMatrixDashboard.tsx` | LOPA 報表、CSV 匯出、風險矩陣 |
| `Bowtie and LOPA schema.md`、`LOPA 量化分析使用說明.md` | 資料模型與 LOPA 計算規格 |

## 必須守住的規則

- **只存在本機。** 核心的新增、修改、刪除都不能呼叫伺服器 API。理由是使用者的風險資料可能涉及未公開的營運資訊，而 GitHub Pages 也沒有後端。
- **屬性面板有兩種寫入對象。** 選取畫布節點時寫回節點，選取左側資料庫項目時寫回資料庫。新增欄位一律透過 `PropertiesPanel` 裡的 `patchEntity`。直接呼叫 `updateNodeData(selectedNode!.id, …)` 在資料庫模式會因為 `selectedNode` 是 undefined 而讓整個面板當掉。
- **連線規則只有一份，在 `VALID_PATHS`。** 規則是：威脅 → 預防性屏障（可串接）→ 頂端事件 → 減緩性屏障（可串接）→ 後果；危害只能連到頂端事件。`syncScenarioPaths` 依同一套規則走訪圖形，兩邊要一起改。
- **已存的資料要能讀。** 使用者的 IndexedDB 和匯出的 JSON 裡有舊版資料。改 `EntityData`、`Project`、`LopaAnalysisConfig` 的欄位時，讀取端要容許欄位不存在。參考 `needsUpgradeCriteria` 的升級做法。
- **改了計算邏輯要說明數字變化。** LOPA 的結果會進報告。只要改了 `calculateLopa` 或 CSV 匯出，就要說明哪些既有專案的數字會變、怎麼變。

## UI 慣例

這些慣例來自 2026-11 的設計檢核（Apple HIG 原則與 modern web guidance）。新程式碼照著寫。

- **中文輸入法。** 單行輸入框若用 Enter 送出，先檢查 `isImeComposing(e)`。注音選字時按的 Enter 也會觸發 keydown，不檢查就會存進還沒組完的字。
- **深色模式跟隨系統。** Tailwind 設定為 `darkMode: 'media'`，React Flow 設定為 `colorMode="system"`。JS 裡要判斷深色用 `matchMedia('(prefers-color-scheme: dark)')`，不要找 `.dark` class，因為頁面上不會出現這個 class。
- **只用 Tailwind 預設色階**（50、100、200…900、950）。`gray-150` 這類不存在的 class 不會報錯，只會悄悄失去樣式。
- **動畫。**
  - 自訂動畫定義在 `tailwind.config.js`：`fade-in`、`menu-in`、`slide-in-right`。
  - 使用時加 `motion-safe:` 前綴。
  - 專案沒有安裝 `tailwindcss-animate`，`animate-in` 系列的 class 都無效。
- **按下回饋。** `index.css` 對所有按鈕套用按下時 `scale: .97`。用 `::after` 撐滿整張卡片的按鈕（stretched link）要加 `no-press` class，否則放開滑鼠時已不在按鈕上，click 不會觸發。
- **無障礙。**
  - 可點的東西用 `<button>`。需要拖曳的元素用 `div role="button" tabIndex={0}` 並處理 Enter／Space，因為 Firefox 不會對 `<button draggable>` 觸發拖曳。
  - 只有圖示的按鈕要給 `aria-label`。
  - 表單欄位用 `Field` 元件綁定 label。
  - 開關用 `Switch`（`role="switch"`）。
  - 分頁與檢視切換用 `SegmentedTabs`（`role="tab"`，支援方向鍵）。
  - 只在滑鼠滑過時出現的操作，加上 `group-focus-within:opacity-100 [@media(hover:none)]:opacity-100`，讓鍵盤與觸控也看得到。
- **刪除。** 可復原的刪除直接執行，並在 toast 提供「復原」按鈕。只有無法復原的永久刪除才跳確認。
- **用語。** 用臺灣用語：匯出（不寫「導出」）、資料（不寫「數據」）、機率（不寫「概率」）、檔案（不寫「文件」）、稽核（不寫「審計」）、信賴度（不寫「置信度」）。同一個概念全站用同一個詞：屏障分成「預防性」與「減緩性」，不寫「緩和性」。

## 已知問題（尚未處理）

- **編號計數器。** 從範本拖出節點時，`generateNextCode` 就會遞增計數器。舊文件寫的是「拖出時只預覽，存到資料庫才遞增」。兩者不一致，要以哪個為準需要 Allen 決定。
- **IPL 合規判定。** `calculateLopa` 判定 IPL 時只看 `is_effective` 和 `is_independent`，沒有看 `is_auditable`。但報表和 CSV 會把「不可稽核」標成不合規、以 PFD 1.0 計。畫面上的說明和實際計算不一致。
- **undo/redo 不會重算 LOPA。** 復原後 LOPA 結果維持舊值，要等下一次編輯才會更新。
- **效力欄位對不上。** 屬性面板的效力選項是 `very-good`／`good`／`poor`／`very-poor`，`syncScenarioPaths` 只認 `high`／`medium`／`low`，所以 `semi_quant_effectiveness` 一律是 `medium`。這個值目前沒有用在計算裡。
- **匯入沒有驗證。** 匯入的 JSON 沒做 schema 驗證，格式錯誤的檔案可能讓畫面壞掉。
- **用不到的套件。** `zundo` 沒有用到。

## 工作方式

- 這個 repo 久久才動一次。動手前先讀相關檔案的現況，不要依賴文件或舊對話的描述。
- 改動範圍以使用者要求為準。發現範圍外的問題（特別是計算邏輯），先回報再決定要不要改。
- 回覆與文件用繁體中文，commit 訊息沿用既有的 Conventional Commits 英文格式（`feat:`、`fix:`、`refactor:`、`style:`）。
