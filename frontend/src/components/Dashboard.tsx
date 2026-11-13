import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { FolderOpen, Plus, Trash2, ArchiveRestore, Archive, CheckCircle2, AlertTriangle, Search, FileJson } from 'lucide-react';
import toast from 'react-hot-toast';
import { BowtieNode, NodeType, Project } from '../types';
import { NODE_TYPES } from '../utils/nodeTypes';

const revealOnHover = 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity';

const countByType = (nodes: BowtieNode[]) => {
  const counts: Partial<Record<NodeType, number>> = {};
  nodes.forEach(n => {
    const t = n.data?.type;
    if (t) counts[t] = (counts[t] || 0) + 1;
  });
  return counts;
};

const Dashboard = () => {
  const { projects, createProject, openProject, deleteProject, restoreProject, permanentlyDeleteProject, importProjectJSON } = useStore();
  const [newProjectName, setNewProjectName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewArchived, setViewArchived] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const matches = (p: Project) => p.name.toLowerCase().includes(searchQuery.toLowerCase());
  const activeProjects = projects.filter(p => !p.archived && matches(p)).sort((a, b) => b.last_modified - a.last_modified);
  const archivedProjects = projects.filter(p => p.archived && matches(p)).sort((a, b) => b.last_modified - a.last_modified);
  const totalArchivedCount = projects.filter(p => p.archived).length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importProjectJSON(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name) {
      toast.error('請先輸入專案名稱');
      return;
    }
    createProject(name);
    toast.success(`已建立專案「${name}」`);
    setNewProjectName('');
  };

  const handleDelete = (project: Project) => {
    deleteProject(project.id);
    toast((t) => (
      <span className="flex items-center gap-3">
        已將「{project.name}」移到垃圾桶
        <button
          type="button"
          onClick={() => { restoreProject(project.id); toast.dismiss(t.id); }}
          className="font-semibold text-blue-600 dark:text-blue-400"
        >
          復原
        </button>
      </span>
    ), { duration: 6000 });
  };

  const handleRestore = (project: Project) => {
    restoreProject(project.id);
    toast.success(`已復原「${project.name}」`);
  };

  const executePermanentDelete = (id: string) => {
    permanentlyDeleteProject(id);
    setConfirmDeleteId(null);
    toast.success('專案已永久刪除');
  };

  const iconButton = 'text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-full p-1.5 shadow-sm transition-colors';

  const renderProjectCard = (project: Project, isArchived: boolean) => {
    const counts = countByType(project.nodes);
    const isComplete = !!(counts.hazard && counts.top_event && counts.threat && counts.consequence);
    const isConfirmingDelete = confirmDeleteId === project.id;
    const titleId = `project-title-${project.id}`;

    const body = (
      <>
        <div className={`flex items-start justify-between gap-3 mb-4 ${isArchived ? 'pr-20' : 'pr-10'}`}>
          <div className={`flex items-center gap-3 min-w-0 ${isArchived ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>
            <FolderOpen size={22} aria-hidden="true" className="shrink-0" />
            <h3 id={titleId} className="font-bold text-lg text-gray-800 dark:text-slate-100 truncate">
              {isArchived ? project.name : (
                // 整張卡片可點：按鈕的 ::after 撐滿卡片（stretched link），操作按鈕用 z-index 疊在上面
                <button
                  type="button"
                  onClick={() => openProject(project.id)}
                  className="no-press block max-w-full truncate text-left focus-visible:outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-blue-500"
                >
                  {project.name}
                </button>
              )}
            </h3>
          </div>
          {!isArchived && isComplete && (
            <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs px-2 py-1 rounded-full font-bold shrink-0" title="包含危害、頂端事件、威脅、後果四種核心元素">
              <CheckCircle2 size={12} aria-hidden="true" />
              完整
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {NODE_TYPES.map(nt => counts[nt.type] ? (
            <span key={nt.type} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${nt.chip}`}>
              {nt.shortLabel} × {counts[nt.type]}
            </span>
          ) : null)}
          {project.nodes.length === 0 && <span className="text-xs text-gray-500 dark:text-gray-400">尚未加入任何節點</span>}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 mt-auto pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center gap-2 tabular-nums">
          <span>共 {project.nodes.length} 節點 / {project.edges.length} 連線</span>
          <span>更新於 {format(project.last_modified, 'MM/dd HH:mm')}</span>
        </div>
      </>
    );

    return (
      <article
        key={project.id}
        aria-labelledby={titleId}
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 border-t-4 ${isComplete ? 'border-t-emerald-500' : 'border-t-gray-200 dark:border-t-slate-700'} overflow-hidden transition-shadow group relative flex flex-col ${isArchived ? 'opacity-80' : 'hover:shadow-lg dark:hover:shadow-black/50 cursor-pointer'}`}
      >
        <div className="p-6 flex-grow flex flex-col">{body}</div>

        {!isConfirmingDelete ? (
          <div className={`absolute top-5 right-4 z-10 flex gap-2 ${revealOnHover}`}>
            {isArchived ? (
              <>
                <button type="button" onClick={() => handleRestore(project)} className={`${iconButton} hover:text-green-600 dark:hover:text-green-400`} aria-label={`復原專案「${project.name}」`} title="復原專案">
                  <ArchiveRestore size={16} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setConfirmDeleteId(project.id)} className={`${iconButton} hover:text-red-600 dark:hover:text-red-400`} aria-label={`永久刪除專案「${project.name}」`} title="永久刪除">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </>
            ) : (
              <button type="button" onClick={() => handleDelete(project)} className={`${iconButton} hover:text-red-500 dark:hover:text-red-400`} aria-label={`將專案「${project.name}」移到垃圾桶`} title="移到垃圾桶">
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <div role="alertdialog" aria-labelledby={`confirm-${project.id}`} className="absolute inset-0 bg-white dark:bg-slate-900 z-10 flex flex-col items-center justify-center p-6 text-center motion-safe:animate-fade-in">
            <AlertTriangle size={32} aria-hidden="true" className="text-red-500 mb-3" />
            <h4 id={`confirm-${project.id}`} className="text-gray-900 dark:text-slate-100 font-bold mb-1">永久刪除「{project.name}」？</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">刪除後無法復原這個專案的任何資料。</p>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmDeleteId(null)}
                onKeyDown={(e) => { if (e.key === 'Escape') setConfirmDeleteId(null); }}
                className="flex-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-transparent dark:border-slate-600 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => executePermanentDelete(project.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                永久刪除
              </button>
            </div>
          </div>
        )}
      </article>
    );
  };

  const EmptyState = ({ isArchived }: { isArchived: boolean }) => (
    <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl bg-white/50 dark:bg-slate-800/50">
      {searchQuery ? (
        <>
          <Search size={32} aria-hidden="true" className="text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-slate-200 mb-2">找不到符合「{searchQuery}」的專案</h3>
          <button type="button" onClick={() => setSearchQuery('')} className="text-sm font-medium text-blue-600 dark:text-blue-400">清除搜尋</button>
        </>
      ) : isArchived ? (
        <>
          <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-full mb-4">
            <Trash2 size={32} aria-hidden="true" className="text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 dark:text-slate-200 mb-2">垃圾桶是空的</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-sm">移到垃圾桶的專案會暫時放在這裡。</p>
        </>
      ) : (
        <>
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-full mb-4">
            <FolderOpen size={32} aria-hidden="true" className="text-blue-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 dark:text-slate-200 mb-2">開始第一個分析</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-sm">
            目前沒有任何專案。在上方輸入名稱並按「建立專案」，開始建構 Bowtie 模型。
          </p>
        </>
      )}
    </div>
  );

  const list = viewArchived ? archivedProjects : activeProjects;

  return (
    <div className="w-full flex-1 min-h-0 bg-slate-50 dark:bg-slate-900 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {viewArchived ? '垃圾桶' : '我的 Bowtie 專案'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              {viewArchived ? '復原或永久刪除已移到垃圾桶的專案' : '建立與管理風險評估模型'}
            </p>
          </div>
          <button
            type="button"
            aria-pressed={viewArchived}
            onClick={() => {
              setViewArchived(!viewArchived);
              setConfirmDeleteId(null);
            }}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-shadow hover:shadow"
          >
            {viewArchived ? (
              <><FolderOpen size={16} aria-hidden="true" /> 返回專案列表</>
            ) : (
              <><Archive size={16} aria-hidden="true" /> 垃圾桶 <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs tabular-nums">{totalArchivedCount}</span></>
            )}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-10">
          {!viewArchived && (
            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex gap-2 flex-grow focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400">
              <form onSubmit={handleCreate} className="flex gap-2 flex-grow min-w-0">
                <label htmlFor="new-project-name" className="sr-only">新專案名稱</label>
                <input
                  id="new-project-name"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="輸入新專案名稱…"
                  className="flex-grow min-w-0 px-4 py-3 bg-transparent focus:outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm shrink-0">
                  <Plus size={18} aria-hidden="true" /> 建立專案
                </button>
              </form>
              <div aria-hidden="true" className="w-px h-8 bg-slate-200 dark:bg-slate-700 my-auto mx-1 shrink-0" />
              <input type="file" accept=".json,application/json" className="hidden" ref={fileInputRef} onChange={handleFileChange} tabIndex={-1} aria-hidden="true" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-transparent dark:border-slate-600 px-4 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors shrink-0"
                title="匯入單一專案的 JSON 檔"
              >
                <FileJson size={18} aria-hidden="true" /> 匯入專案
              </button>
            </div>
          )}

          <div className={`bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-2 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400 ${viewArchived ? 'w-full' : 'w-full md:w-1/3'}`}>
            <Search size={18} aria-hidden="true" className="ml-3 text-slate-400 dark:text-slate-500 shrink-0" />
            <label htmlFor="project-search" className="sr-only">搜尋專案名稱</label>
            <input
              id="project-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋專案名稱…"
              className="flex-grow min-w-0 px-2 py-3 bg-transparent focus:outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.length > 0 ? list.map(p => renderProjectCard(p, viewArchived)) : <EmptyState isArchived={viewArchived} />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
