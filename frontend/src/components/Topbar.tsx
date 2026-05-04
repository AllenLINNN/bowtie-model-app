import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { Download, Image, FileText, WifiOff, ArrowLeft, Edit2, LayoutTemplate, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, FileUp, Map } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { getLayoutedElements } from '../utils/layout';
import toast from 'react-hot-toast';

const Topbar = () => {
  const { exportJSON, importJSON, exportProjectJSON, importProjectJSON, activeProjectId, projects, openProject, updateProjectName, nodes, edges, setNodes, setEdges, isSidebarOpen, isPropertiesPanelOpen, isMiniMapOpen, toggleSidebar, togglePropertiesPanel, toggleMiniMap } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactFlowInstance = useReactFlow();

  const currentProject = projects.find(p => p.id === activeProjectId);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

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
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
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
      backgroundColor: isTransparent ? 'transparent' : (document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff'),
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
    const loadingToast = toast.loading('正在輸出 PNG...');
    try {
      const result = await getPreciseViewportDataUrl(true); 
      if (result) {
        downloadImage(result.dataUrl, `bowtie-${new Date().getTime()}.png`);
        toast.success('PNG 輸出成功！', { id: loadingToast });
      } else {
        toast.error('畫布上沒有節點可以輸出', { id: loadingToast });
      }
    } catch (e) {
      toast.error('輸出失敗', { id: loadingToast });
    }
  };

  const exportPDF = async () => {
    const loadingToast = toast.loading('正在輸出 PDF...');
    try {
      const result = await getPreciseViewportDataUrl(false); 
      if (!result) {
        toast.error('畫布上沒有節點可以輸出', { id: loadingToast });
        return;
      }
      
      const pdf = new jsPDF({
        orientation: result.width > result.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [result.width, result.height]
      });
      
      pdf.addImage(result.dataUrl, 'PNG', 0, 0, result.width, result.height);
      pdf.save(`bowtie-${new Date().getTime()}.pdf`);
      toast.success('PDF 輸出成功！', { id: loadingToast });
    } catch (e) {
      toast.error('輸出失敗', { id: loadingToast });
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
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
      toast.success('自動排版完成');
    }, 50);
  };

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 px-4 flex items-center justify-between shrink-0 shadow-sm z-10">
      <div className="flex items-center gap-4">
        {activeProjectId ? (
          <div className="flex items-center gap-2 mr-2">
            <button 
              onClick={() => openProject(null)} 
              className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              title="返回專案列表"
            >
              <ArrowLeft size={20} />
            </button>
            <button 
              onClick={toggleSidebar} 
              className="flex items-center text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title={isSidebarOpen ? "收起左側面板" : "展開左側面板"}
            >
              {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            </button>
          </div>
        ) : null}
        
        {isEditingName ? (
          <input 
            autoFocus
            type="text" 
            value={editNameValue} 
            onChange={(e) => setEditNameValue(e.target.value)} 
            onKeyDown={handleNameKeyDown}
            onBlur={handleNameSave}
            className="border border-blue-400 dark:border-blue-500 rounded px-2 py-1 text-xl font-bold text-gray-800 dark:text-gray-100 bg-white dark:bg-slate-800 focus:outline-none w-64"
          />
        ) : (
          <div className="flex items-center gap-2 group cursor-pointer" onClick={handleEditNameClick}>
            <h1 className="font-bold text-xl text-gray-800 dark:text-gray-100">
              {currentProject ? currentProject.name : 'Bowtie App 專案總覽'}
            </h1>
            {currentProject && (
              <Edit2 size={16} className="text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500 px-2 py-1 rounded text-xs font-semibold border border-yellow-200 dark:border-yellow-900/50">
          <WifiOff size={14} />
          本機離線模式
        </div>
      </div>

      <div className="flex items-center gap-6">
        {currentProject && (
          <div className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
            最後儲存時間: {format(currentProject.last_modified, 'HH:mm:ss')}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
          />
          <button onClick={handleImportClick} className="btn-action" title={activeProjectId ? "匯入單一專案" : "匯入工作區"}>
            <FileUp size={16} /> <span className="text-sm">{activeProjectId ? "匯入單一專案" : "匯入工作區 JSON"}</span>
          </button>
          
          <button 
            onClick={() => { 
              if (activeProjectId) {
                exportProjectJSON(activeProjectId);
                toast.success('單一專案已下載');
              } else {
                exportJSON(); 
                toast.success('工作區已下載');
              }
            }} 
            className="btn-action" 
            title={activeProjectId ? "下載單一專案" : "下載工作區"}
          >
            <Download size={16} /> <span className="text-sm">{activeProjectId ? "下載單一專案" : "下載工作區 JSON"}</span>
          </button>
          
          {activeProjectId && (
            <>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1"></div>
              <button onClick={handleAutoLayout} className="btn-action" title="自動整理節點排列">
                <LayoutTemplate size={16} /> <span className="text-sm hidden lg:inline">自動排版</span>
              </button>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1"></div>
              <button onClick={exportPNG} className="btn-action" title="匯出為圖片">
                <Image size={16} /> <span className="text-sm">PNG</span>
              </button>
              <button onClick={exportPDF} className="btn-action" title="匯出為PDF">
                <FileText size={16} /> <span className="text-sm">PDF</span>
              </button>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1"></div>
              <button 
                onClick={toggleMiniMap} 
                className={`flex items-center p-1.5 rounded transition-colors ${isMiniMapOpen ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/20 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                title={isMiniMapOpen ? "隱藏迷你地圖" : "顯示迷你地圖"}
              >
                <Map size={20} />
              </button>
              <button 
                onClick={togglePropertiesPanel} 
                className={`flex items-center p-1.5 rounded transition-colors ${isPropertiesPanelOpen ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/20 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                title={isPropertiesPanelOpen ? "收起右側屬性面板" : "展開右側屬性面板"}
              >
                {isPropertiesPanelOpen ? <PanelRightClose size={20} /> : <PanelRight size={20} />}
              </button>
            </>
          )}
        </div>
      </div>
      
      <style>{`
        .btn-action {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 6px;
          color: #4b5563;
          background-color: transparent;
          transition: all 0.2s;
        }
        .dark .btn-action {
          color: #9ca3af;
        }
        .btn-action:hover {
          background-color: #f3f4f6;
          color: #111827;
        }
        .dark .btn-action:hover {
          background-color: #1e293b;
          color: #f3f4f6;
        }
      `}</style>
    </header>
  );
};

export default Topbar;