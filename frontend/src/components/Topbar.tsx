import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { Download, Upload, Image, FileText, WifiOff, ArrowLeft, Edit2, LayoutTemplate } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { getLayoutedElements } from '../utils/layout';
import toast from 'react-hot-toast';

const Topbar = () => {
  const { exportJSON, importJSON, activeProjectId, projects, openProject, updateProjectName, nodes, edges, setNodes, setEdges } = useStore();
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
      importJSON(file);
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

  const getPreciseViewportDataUrl = async (): Promise<{dataUrl: string, width: number, height: number} | null> => {
    const element = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!element || nodes.length === 0) return null;

    const nodesBounds = getNodesBounds(nodes);
    const padding = 100;
    const width = nodesBounds.width + padding * 2;
    const height = nodesBounds.height + padding * 2;
    
    const viewport = getViewportForBounds(nodesBounds, width, height, 0.5, 2, 0.1);

    const dataUrl = await toPng(element, {
      backgroundColor: '#f3f4f6',
      width: width,
      height: height,
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
      const result = await getPreciseViewportDataUrl();
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
      const result = await getPreciseViewportDataUrl();
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
    <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0 shadow-sm z-10">
      <div className="flex items-center gap-4">
        {activeProjectId ? (
          <button 
            onClick={() => openProject(null)} 
            className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors mr-2"
            title="返回專案列表"
          >
            <ArrowLeft size={18} />
          </button>
        ) : null}
        
        {isEditingName ? (
          <input 
            autoFocus
            type="text" 
            value={editNameValue} 
            onChange={(e) => setEditNameValue(e.target.value)} 
            onKeyDown={handleNameKeyDown}
            onBlur={handleNameSave}
            className="border border-blue-400 rounded px-2 py-1 text-xl font-bold text-gray-800 focus:outline-none w-64"
          />
        ) : (
          <div className="flex items-center gap-2 group cursor-pointer" onClick={handleEditNameClick}>
            <h1 className="font-bold text-xl text-gray-800">
              {currentProject ? currentProject.name : 'Bowtie App 專案總覽'}
            </h1>
            {currentProject && (
              <Edit2 size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
          <WifiOff size={14} />
          本機離線模式
        </div>
      </div>

      <div className="flex items-center gap-6">
        {currentProject && (
          <div className="text-xs text-gray-500 hidden md:block">
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
          <button onClick={handleImportClick} className="btn-action" title="匯入工作區">
            <Download size={16} /> <span className="text-sm">匯入 JSON</span>
          </button>
          
          <button onClick={() => { exportJSON(); toast.success('工作區已匯出'); }} className="btn-action" title="匯出工作區">
            <Upload size={16} /> <span className="text-sm">匯出 JSON</span>
          </button>
          
          {activeProjectId && (
            <>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button onClick={handleAutoLayout} className="btn-action" title="自動整理節點排列">
                <LayoutTemplate size={16} /> <span className="text-sm">自動排版</span>
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button onClick={exportPNG} className="btn-action" title="匯出為圖片">
                <Image size={16} /> <span className="text-sm">PNG</span>
              </button>
              <button onClick={exportPDF} className="btn-action" title="匯出為PDF">
                <FileText size={16} /> <span className="text-sm">PDF</span>
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
          background-color: #f3f4f6;
          transition: all 0.2s;
        }
        .btn-action:hover {
          background-color: #e5e7eb;
          color: #111827;
        }
      `}</style>
    </header>
  );
};

export default Topbar;