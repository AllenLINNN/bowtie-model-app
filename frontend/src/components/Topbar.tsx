import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { ImageDown, Image, FileText, ArrowLeft, Pencil, LayoutTemplate, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, FileUp, FileDown, Map, Undo2, Redo2, ChevronDown } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { getLayoutedElements } from '../utils/layout';
import toast from 'react-hot-toast';
import { SegmentedTabs, Switch, isImeComposing } from './ui';

const toolButton =
  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0';

const toggleButton = (active: boolean) =>
  `flex items-center p-1.5 rounded-md transition-colors shrink-0 ${
    active
      ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/20 dark:text-blue-400'
      : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800'
  }`;

const Divider = () => <div aria-hidden="true" className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1 shrink-0" />;

const isDarkScheme = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

/** 匯出下拉選單：Esc 關閉並把焦點還給按鈕、點外面關閉、上下鍵移動 */
const ExportMenu = ({ onPng, onPdf }: { onPng: () => void; onPdf: () => void }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'Tab') setOpen(false);
  };

  const run = (fn: () => void) => { close(); fn(); };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="export-menu"
        aria-label="匯出畫布"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); } }}
        className={`${toolButton} ${open ? '!bg-blue-50 dark:!bg-blue-500/20 !text-blue-600 dark:!text-blue-400' : ''}`}
      >
        <ImageDown size={16} aria-hidden="true" />
        <span className="text-sm hidden lg:inline">匯出</span>
        <ChevronDown size={14} aria-hidden="true" className={`hidden lg:block transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id="export-menu"
          role="menu"
          aria-label="匯出畫布"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 mt-1 w-44 origin-top-right bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-30 motion-safe:animate-menu-in"
        >
          <button
            ref={(el) => (itemRefs.current[0] = el)}
            type="button"
            role="menuitem"
            onClick={() => run(onPng)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 focus:bg-gray-100 dark:focus:bg-slate-700 focus:outline-none"
          >
            <Image size={14} aria-hidden="true" className="text-gray-500 dark:text-gray-400" />
            匯出 PNG 圖片
          </button>
          <button
            ref={(el) => (itemRefs.current[1] = el)}
            type="button"
            role="menuitem"
            onClick={() => run(onPdf)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 focus:bg-gray-100 dark:focus:bg-slate-700 focus:outline-none"
          >
            <FileText size={14} aria-hidden="true" className="text-gray-500 dark:text-gray-400" />
            匯出 PDF 檔案
          </button>
        </div>
      )}
    </div>
  );
};

const Topbar = () => {
  const {
    exportJSON,
    importJSON,
    exportProjectJSON,
    importProjectJSON,
    activeProjectId,
    projects,
    openProject,
    updateProjectName,
    nodes,
    edges,
    setNodes,
    setEdges,
    isSidebarOpen,
    isPropertiesPanelOpen,
    isMiniMapOpen,
    toggleSidebar,
    togglePropertiesPanel,
    toggleMiniMap,
    undo,
    redo,
    pastStates,
    futureStates,
    isLopaEnabled,
    toggleLopaEnabled,
    activeTab,
    setActiveTab
  } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactFlowInstance = useReactFlow();

  const currentProject = projects.find(p => p.id === activeProjectId);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const isCanvas = !!activeProjectId && activeTab === 'canvas';

  // Ctrl/Cmd+Z 復原、Ctrl/Cmd+Shift+Z 或 Ctrl+Y 重做（輸入框內交給瀏覽器處理）
  useEffect(() => {
    if (!isCanvas) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCanvas, undo, redo]);

  const handleEditNameClick = () => {
    if (currentProject) {
      setEditNameValue(currentProject.name);
      setIsEditingName(true);
    }
  };

  const handleNameSave = () => {
    if (editNameValue.trim()) {
      updateProjectName(editNameValue.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (isImeComposing(e)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (activeProjectId) {
        importProjectJSON(file);
      } else {
        importJSON(file);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const getPreciseViewportDataUrl = async (isTransparent: boolean = false): Promise<{dataUrl: string, width: number, height: number} | null> => {
    const element = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!element || nodes.length === 0) return null;

    const nodesBounds = getNodesBounds(nodes);
    const padding = 100;
    const width = nodesBounds.width + padding * 2;
    const height = nodesBounds.height + padding * 2;

    const viewport = getViewportForBounds(nodesBounds, width, height, 0.5, 2, 0.1);

    const dataUrl = await toPng(element, {
      backgroundColor: isTransparent ? 'transparent' : (isDarkScheme() ? '#0f172a' : '#ffffff'),
      width: width,
      height: height,
      pixelRatio: 3,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
      }
    });

    return { dataUrl, width, height };
  };

  const exportPNG = async () => {
    const loadingToast = toast.loading('正在匯出 PNG…');
    try {
      const result = await getPreciseViewportDataUrl(true);
      if (result) {
        downloadImage(result.dataUrl, `bowtie-${new Date().getTime()}.png`);
        toast.success('PNG 已匯出', { id: loadingToast });
      } else {
        toast.error('畫布上沒有節點可以匯出', { id: loadingToast });
      }
    } catch (e) {
      toast.error('匯出失敗', { id: loadingToast });
    }
  };

  const exportPDF = async () => {
    const loadingToast = toast.loading('正在匯出 PDF…');
    try {
      const result = await getPreciseViewportDataUrl(false);
      if (!result) {
        toast.error('畫布上沒有節點可以匯出', { id: loadingToast });
        return;
      }

      const pdf = new jsPDF({
        orientation: result.width > result.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [result.width, result.height]
      });

      pdf.addImage(result.dataUrl, 'PNG', 0, 0, result.width, result.height);
      pdf.save(`bowtie-${new Date().getTime()}.pdf`);
      toast.success('PDF 已匯出', { id: loadingToast });
    } catch (e) {
      toast.error('匯出失敗', { id: loadingToast });
    }
  };

  const handleAutoLayout = () => {
    if (nodes.length === 0) {
      toast('畫布上沒有節點可以排版');
      return;
    }
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, 'LR');
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    requestAnimationFrame(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
    });
  };

  const handleDownloadJSON = () => {
    if (activeProjectId) {
      exportProjectJSON(activeProjectId);
      toast.success('專案 JSON 已下載');
    } else {
      exportJSON();
      toast.success('工作區 JSON 已下載');
    }
  };

  const importLabel = activeProjectId ? '匯入專案 JSON' : '匯入工作區 JSON';
  const downloadLabel = activeProjectId ? '下載專案 JSON' : '下載工作區 JSON';

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 flex items-center justify-between gap-3 shrink-0 z-10">
      {/* 左側：返回、側欄、專案名稱 */}
      <div className="flex items-center gap-3 min-w-0">
        {activeProjectId && (
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => openProject(null)} className={toggleButton(false)} aria-label="返回專案列表" title="返回專案列表">
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            {activeTab === 'canvas' && (
              <button
                type="button"
                onClick={toggleSidebar}
                className={toggleButton(false)}
                aria-label="左側面板"
                aria-pressed={isSidebarOpen}
                title={isSidebarOpen ? '收起左側面板' : '展開左側面板'}
              >
                {isSidebarOpen ? <PanelLeftClose size={20} aria-hidden="true" /> : <PanelLeft size={20} aria-hidden="true" />}
              </button>
            )}
          </div>
        )}

        {isEditingName ? (
          <input
            autoFocus
            type="text"
            aria-label="專案名稱"
            value={editNameValue}
            onChange={(e) => setEditNameValue(e.target.value)}
            onKeyDown={handleNameKeyDown}
            onBlur={handleNameSave}
            className="border border-blue-400 dark:border-blue-500 rounded-md px-2 py-1 text-lg font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-64"
          />
        ) : currentProject ? (
          <h1 className="min-w-0">
            <button
              type="button"
              onClick={handleEditNameClick}
              className="group flex items-center gap-2 max-w-[160px] md:max-w-[220px] lg:max-w-[320px] rounded-md px-1 -mx-1 text-left"
              title={`${currentProject.name}（點擊重新命名）`}
            >
              <span className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate">{currentProject.name}</span>
              <Pencil size={14} aria-hidden="true" className="text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity shrink-0" />
              <span className="sr-only">重新命名</span>
            </button>
          </h1>
        ) : (
          <h1 className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate">Bowtie 專案總覽</h1>
        )}
      </div>

      {/* 中間：檢視切換（啟用 LOPA 時） */}
      {activeProjectId && isLopaEnabled && (
        <SegmentedTabs
          ariaLabel="檢視"
          size="sm"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'canvas', label: <>畫布<span className="hidden xl:inline">編輯</span></> },
            { value: 'lopa_table', label: <>LOPA<span className="hidden xl:inline"> 分析報表</span></> },
            { value: 'risk_matrix', label: <><span className="hidden xl:inline">5×5 </span>風險矩陣</> },
          ]}
        />
      )}

      {/* 右側操作 */}
      <div className="flex items-center gap-3 shrink-0">
        {currentProject && (
          <div className="text-xs text-gray-500 dark:text-gray-400 hidden xl:block tabular-nums" aria-live="polite">
            已自動儲存 {format(currentProject.last_modified, 'HH:mm:ss')}
          </div>
        )}

        {activeProjectId && (
          <Switch
            checked={isLopaEnabled}
            onChange={toggleLopaEnabled}
            label="LOPA 分析"
            labelClassName="hidden md:inline"
          />
        )}

        <div className="flex items-center gap-1">
          <input type="file" accept=".json,application/json" className="hidden" ref={fileInputRef} onChange={handleFileChange} tabIndex={-1} aria-hidden="true" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className={toolButton} aria-label={importLabel} title={importLabel}>
            <FileUp size={16} aria-hidden="true" /> <span className="text-sm hidden lg:inline">{activeProjectId ? '匯入' : importLabel}</span>
          </button>
          <button type="button" onClick={handleDownloadJSON} className={toolButton} aria-label={downloadLabel} title={downloadLabel}>
            <FileDown size={16} aria-hidden="true" /> <span className="text-sm hidden lg:inline">{activeProjectId ? '下載' : downloadLabel}</span>
          </button>

          {isCanvas && (
            <>
              <Divider />
              <button type="button" onClick={undo} disabled={pastStates.length === 0} className={toolButton} aria-label="復原" title="復原（Ctrl+Z）">
                <Undo2 size={16} aria-hidden="true" />
              </button>
              <button type="button" onClick={redo} disabled={futureStates.length === 0} className={toolButton} aria-label="重做" title="重做（Ctrl+Shift+Z）">
                <Redo2 size={16} aria-hidden="true" />
              </button>
              <button type="button" onClick={handleAutoLayout} className={toolButton} aria-label="自動排版" title="自動整理節點排列">
                <LayoutTemplate size={16} aria-hidden="true" /> <span className="text-sm hidden lg:inline">自動排版</span>
              </button>
              <Divider />
              <ExportMenu onPng={exportPNG} onPdf={exportPDF} />
              <Divider />
              <button
                type="button"
                onClick={toggleMiniMap}
                className={toggleButton(isMiniMapOpen)}
                aria-label="迷你地圖"
                aria-pressed={isMiniMapOpen}
                title={isMiniMapOpen ? '隱藏迷你地圖' : '顯示迷你地圖'}
              >
                <Map size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={togglePropertiesPanel}
                className={toggleButton(isPropertiesPanelOpen)}
                aria-label="右側屬性面板"
                aria-pressed={isPropertiesPanelOpen}
                title={isPropertiesPanelOpen ? '收起右側屬性面板' : '展開右側屬性面板'}
              >
                {isPropertiesPanelOpen ? <PanelRightClose size={20} aria-hidden="true" /> : <PanelRight size={20} aria-hidden="true" />}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
