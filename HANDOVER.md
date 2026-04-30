# Bowtie App Prototype - 專案交接說明 (Handover)

本文件旨在為接手的 AI Agent 或開發者提供完整的專案上下文，確保開發的延續性。

---

## 1. 專案基本資訊
*   **專案名稱**：Bowtie Web App Prototype
*   **線上網址**：[https://allenlinnn.github.io/](https://allenlinnn.github.io/)
*   **部署方式**：GitHub Pages (使用 GitHub Actions 自動化打包部署)
*   **目前分支**：`main`

## 2. 技術架構
*   **前端框架**：React 18 + TypeScript
*   **畫布引擎**：`@xyflow/react` (React Flow 12)
*   **狀態管理**：Zustand (搭配 `localforage` 實現 IndexedDB 持久化)
*   **樣式處理**：Tailwind CSS (自定義現代化 UI 樣式)
*   **核心套件**：
    *   `dagre`：處理畫布自動排版邏輯
    *   `html-to-image`：高品質 PNG/PDF 輸出（透明去背支援）
    *   `react-hot-toast`：系統通知氣泡
    *   `lucide-react`：系統圖示庫

## 3. 已實作核心邏輯 (Critical Logic)
*   **Local-First 原則**：所有資料僅儲存於使用者瀏覽器的 `IndexedDB`。嚴禁引入後端 API 儲存。
*   **自動編號 (Auto-numbering)**：
    *   拖曳「節點範本」進入畫布時僅顯示「預覽編號」。
    *   必須在屬性面板點擊「儲存至庫」後，計數器才會正式推進並鎖定該編號。
    *   若是從「專屬資料庫」拉出的節點，編號保持固定，再次儲存會改為「覆蓋/更新」原資料庫項目。
*   **兩級匯入/匯出**：
    *   **Dashboard 頁面**：匯出/匯入「整個工作區 (.json)」，包含所有專案與資料庫。
    *   **專案畫布頁面**：匯出/匯入「單一專案 (.json)」。匯入單一專案時，系統會自動將其「追加」進當前工作區，而非覆蓋。
*   **UI 設計規範**：
    *   採用「淡色背景 + 彩色左邊框」的卡片設計。
    *   支援左右側邊欄摺疊功能。
    *   雙擊節點可直接進入編輯模式。

## 4. 目錄結構
*   `/frontend/src/store/useStore.ts`：核心狀態管理，包含資料庫讀寫、專案管理、編號計數器邏輯。
*   `/frontend/src/components/BowtieEditor.tsx`：React Flow 畫布邏輯，包含連線規則驗證。
*   `/frontend/src/components/Sidebar.tsx`：包含「節點範本」與「專屬資料庫 (兩層式導覽)」。
*   `/frontend/src/components/Dashboard.tsx`：專案管理中心，包含統計分佈與「垃圾桶 (Soft Delete)」功能。
*   `.github/workflows/deploy.yml`：CI/CD 打包腳本。

## 5. 待辦清單與未來方向 (Roadmap)
*   [ ] **PWA 升級**：目前在離線狀態下重新整理網頁會失敗。未來可加入 Service Worker 實現真正的全離線網頁開啟。
*   [ ] **資料加密**：針對極高機密需求，實作前端 IndexedDB 的加密儲存 (E2EE)。
*   [ ] **匯入驗證**：加入 `Zod` 或 `JSON Schema` 驗證，防止匯入格式錯誤的 JSON 導致系統崩潰。
*   [ ] **更細緻的欄位**：依照 `Bowtie app schema.md` 補齊如 `category`, `lifecycle_phase` 等進階元數據欄位。

---
*此文件由 Gemini CLI 於 2026/04/30 撰寫。*
