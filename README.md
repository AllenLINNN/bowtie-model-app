# Bowtie App Prototype

**線上展示網址：[https://allenlinnn.github.io/](https://allenlinnn.github.io/)**

這是一個基於 React + TypeScript 打造的「純前端離線版」Bowtie 風險模型編輯器 Prototype。

## 🎯 專案特色與核心功能

本系統專為風險管理人員設計，提供直覺、安全且高效的 Bowtie 模型建構體驗：

*   **🌐 隨開即用 (免安裝)**：只需開啟網頁即可開始繪製 Bowtie 圖表，支援跨平台使用。
*   **🔒 完全離線安全 (Local-First)**：所有的畫布操作、模型資料與庫存皆自動儲存於您當下瀏覽器的本機資料庫 (`IndexedDB`)。資料**絕不上傳雲端伺服器**，確保企業機密絕對安全。
*   **🖱️ 視覺化拖曳編輯 (React Flow)**：
    *   從左側側邊欄拖曳節點 (Hazard, Top Event, Threat, Consequence, Barrier) 建立模型。
    *   內建嚴格的 Bowtie 邏輯防呆驗證（例如：Threat 只能連接到 Preventive Barrier 或 Top Event）。
    *   支援連線高亮顯示，點擊連線即可清楚辨識關聯。
*   **📚 全域資料庫 (Global Library)**：
    *   在畫布右側的屬性面板編輯完節點資訊後，點擊「Save」即可將該節點永久存入全域資料庫。
    *   未來在任何專案中，皆可從左側「Library」分頁直接拖曳已建檔的公版節點，自動帶入所有屬性設定（如 Code、描述、有效性等），大幅提升重複利用率。
*   **🔢 自動編號系統**：拖曳新節點時會自動指派流水號（如 `H-001`, `PB-002`），並在正式存入 Library 時鎖定編號，確保不重複、不空號。
*   **📁 完整匯出/匯入機制**：
    *   **JSON 匯出/匯入**：一鍵將整個工作區（包含所有專案與 Library）打包為 `.json` 檔案。方便本機備份，或傳送給同事直接 Import 進行無縫協作。
    *   **圖檔匯出**：支援將當前畫布一鍵匯出為高畫質 **PNG 圖片**或 **PDF 文件**，方便插入會議簡報或報告附件。
*   **📂 多專案管理 (Dashboard)**：首頁提供專案總覽面板，可建立並快速切換多個獨立的 Bowtie 分析案，點擊頂端專案名稱可隨時編輯專案名稱。

---

*Built with React, Vite, Zustand, and React Flow.*