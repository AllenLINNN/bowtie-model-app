import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { FolderOpen, Plus, Trash2, ArchiveRestore, Archive, CheckCircle2, AlertTriangle, Search, FileJson } from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { projects, createProject, openProject, deleteProject, restoreProject, permanentlyDeleteProject, importProjectJSON } = useStore();
  const [newProjectName, setNewProjectName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewArchived, setViewArchived] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProjects = projects
    .filter(p => !p.archived && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.last_modified - a.last_modified);
    
  const archivedProjects = projects
    .filter(p => p.archived && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.last_modified - a.last_modified);
    
  const totalArchivedCount = projects.filter(p => p.archived).length;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importProjectJSON(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      toast.success(`成功建立專案：${newProjectName.trim()}`);
      setNewProjectName('');
    } else {
      toast.error('請輸入專案名稱！');
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteProject(id);
    toast.success('專案已移至垃圾桶');
  };

  const handleRestore = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    restoreProject(id);
    toast.success('專案已復原');
  };

  const initiatePermanentDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const executePermanentDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    permanentlyDeleteProject(id);
    setConfirmDeleteId(null);
    toast.success('專案已永久刪除');
  };

  const cancelPermanentDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const getNodeStats = (nodes: any[]) => {
    const stats = {
      hazard: 0,
      topEvent: 0,
      threat: 0,
      consequence: 0,
      prevBarrier: 0,
      mitigBarrier: 0
    };
    nodes.forEach(n => {
      if (n.data?.type === 'hazard') stats.hazard++;
      if (n.data?.type === 'top_event') stats.topEvent++;
      if (n.data?.type === 'threat') stats.threat++;
      if (n.data?.type === 'consequence') stats.consequence++;
      if (n.data?.type === 'preventive_barrier') stats.prevBarrier++;
      if (n.data?.type === 'mitigative_barrier') stats.mitigBarrier++;
    });
    return stats;
  };

  const renderProjectCard = (project: any, isArchived: boolean) => {
    const stats = getNodeStats(project.nodes);
    const isComplete = stats.hazard > 0 && stats.topEvent > 0 && stats.threat > 0 && stats.consequence > 0;
    const isConfirmingDelete = confirmDeleteId === project.id;
    
    const topBorderClass = isComplete ? 'border-t-4 border-t-emerald-400' : 'border-t-4 border-t-gray-200';
    
    return (
      <div 
        key={project.id} 
        className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all group relative flex flex-col ${isArchived ? 'opacity-80' : 'hover:shadow-lg'} ${topBorderClass}`}
      >
        <div className={`p-6 flex-grow flex flex-col ${!isArchived ? 'cursor-pointer' : ''}`} onClick={() => !isArchived && !isConfirmingDelete && openProject(project.id)}>
          <div className="flex items-start justify-between mb-4">
            <div className={`flex items-center gap-3 ${isArchived ? 'text-gray-500' : 'text-blue-600'} flex-grow min-w-0 pr-4`}>
              <FolderOpen size={24} className="shrink-0" />
              <h3 className="font-bold text-lg text-gray-800 truncate">{project.name}</h3>
            </div>
            {!isArchived && isComplete && (
              <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs px-2 py-1 rounded-full font-bold shrink-0" title="包含完整的核心 Bowtie 元素">
                <CheckCircle2 size={12} />
                完整
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-6">
            {stats.hazard > 0 && <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">危害 × {stats.hazard}</span>}
            {stats.topEvent > 0 && <span className="text-[11px] font-medium bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">頂端事件 × {stats.topEvent}</span>}
            {stats.threat > 0 && <span className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">威脅 × {stats.threat}</span>}
            {stats.consequence > 0 && <span className="text-[11px] font-medium bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">後果 × {stats.consequence}</span>}
            {stats.prevBarrier > 0 && <span className="text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">預防屏障 × {stats.prevBarrier}</span>}
            {stats.mitigBarrier > 0 && <span className="text-[11px] font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">減緩屏障 × {stats.mitigBarrier}</span>}
            {project.nodes.length === 0 && <span className="text-[11px] text-gray-400 italic">尚未加入任何節點</span>}
          </div>

          <div className="text-xs text-gray-400 mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
            <span>共 {project.nodes.length} 節點 / {project.edges.length} 連線</span>
            <span>更新於 {format(project.last_modified, 'MM/dd HH:mm')}</span>
          </div>
        </div>
        
        {/* Actions Overlay */}
        {!isConfirmingDelete ? (
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isArchived ? (
              <>
                <button 
                  onClick={(e) => handleRestore(project.id, e)}
                  className="text-gray-500 hover:text-green-600 bg-white border border-gray-200 rounded-full p-1.5 shadow-sm transition-colors"
                  title="復原專案"
                >
                  <ArchiveRestore size={16} />
                </button>
                <button 
                  onClick={(e) => initiatePermanentDelete(project.id, e)}
                  className="text-gray-500 hover:text-red-600 bg-white border border-gray-200 rounded-full p-1.5 shadow-sm transition-colors"
                  title="永久刪除"
                >
                  <Trash2 size={16} />
                </button>
              </>
            ) : (
              <button 
                onClick={(e) => handleDelete(project.id, e)}
                className="text-gray-400 hover:text-red-500 bg-white border border-gray-200 rounded-full p-1.5 shadow-sm transition-colors"
                title="移至垃圾桶"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">
            <AlertTriangle size={32} className="text-red-500 mb-3" />
            <h4 className="text-gray-900 font-bold mb-1">確認永久刪除？</h4>
            <p className="text-xs text-gray-500 mb-4">刪除後將無法復原此專案的所有資料。</p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={cancelPermanentDelete}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button 
                onClick={(e) => executePermanentDelete(project.id, e)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                永久刪除
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const EmptyState = ({ isArchived }: { isArchived: boolean }) => (
    <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-white/50">
      {isArchived ? (
        <>
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <Trash2 size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">垃圾桶是空的</h3>
          <p className="text-gray-500 text-sm text-center max-w-sm">
            您刪除的專案將會暫時存放在這裡。
          </p>
        </>
      ) : (
        <>
          <div className="bg-blue-50 p-4 rounded-full mb-4">
            <FolderOpen size={32} className="text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">開始您的第一個分析</h3>
          <p className="text-gray-500 text-sm text-center max-w-sm">
            目前沒有任何專案。請在上方輸入名稱並點擊「建立新專案」來開始建構您的 Bowtie 模型。
          </p>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full h-full bg-slate-50 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              {viewArchived ? '垃圾桶' : '我的 Bowtie 專案總覽'}
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              {viewArchived ? '管理已刪除的風險模型專案' : '管理與建立您的風險評估模型'}
            </p>
          </div>
          <button 
            onClick={() => {
              setViewArchived(!viewArchived);
              setConfirmDeleteId(null);
            }}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow"
          >
            {viewArchived ? (
              <><FolderOpen size={16} /> 返回專案列表</>
            ) : (
              <><Archive size={16} /> 檢視垃圾桶 <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{totalArchivedCount}</span></>
            )}
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          {!viewArchived && (
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex gap-2 flex-grow">
              <form onSubmit={handleCreate} className="flex gap-2 flex-grow">
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="輸入新專案名稱開始分析..." 
                  className="flex-grow px-4 py-3 bg-transparent focus:outline-none text-slate-700 placeholder:text-slate-400"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow shrink-0">
                  <Plus size={18} /> 建立新專案
                </button>
              </form>
              <div className="w-px h-8 bg-slate-200 my-auto mx-1 shrink-0"></div>
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
              />
              <button 
                type="button" 
                onClick={handleImportClick} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow shrink-0" 
                title="匯入單一專案 JSON (.json 檔案)"
              >
                <FileJson size={18} /> 匯入專案
              </button>
            </div>
          )}

          <div className={`bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-2 ${viewArchived ? 'w-full' : 'w-full md:w-1/3'}`}>
            <div className="pl-3 text-slate-400 shrink-0">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋專案名稱..." 
              className="flex-grow px-2 py-3 bg-transparent focus:outline-none text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {viewArchived ? (
            archivedProjects.length > 0 ? (
              archivedProjects.map(p => renderProjectCard(p, true))
            ) : (
              <EmptyState isArchived={true} />
            )
          ) : (
            activeProjects.length > 0 ? (
              activeProjects.map(p => renderProjectCard(p, false))
            ) : (
              <EmptyState isArchived={false} />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;