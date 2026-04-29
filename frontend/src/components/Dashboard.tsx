import { useState } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { FolderOpen, Plus, Trash2, Activity, ShieldAlert, ShieldCheck, ArchiveRestore, Archive } from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { projects, createProject, openProject, deleteProject, restoreProject, permanentlyDeleteProject } = useStore();
  const [newProjectName, setNewProjectName] = useState('');
  const [viewArchived, setViewArchived] = useState(false);

  const activeProjects = projects.filter(p => !p.archived);
  const archivedProjects = projects.filter(p => p.archived);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      toast.success(`成功建立專案：${newProjectName.trim()}`);
      setNewProjectName('');
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

  const handlePermanentDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('確定要永久刪除這個專案嗎？此動作無法復原。')) {
      permanentlyDeleteProject(id);
      toast.success('專案已永久刪除');
    }
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
    
    return (
      <div key={project.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-shadow group relative flex flex-col ${isArchived ? 'opacity-75' : 'hover:shadow-md'}`}>
        <div className={`p-6 flex-grow ${!isArchived ? 'cursor-pointer' : ''}`} onClick={() => !isArchived && openProject(project.id)}>
          <div className={`flex items-center gap-3 mb-4 ${isArchived ? 'text-gray-500' : 'text-blue-600'}`}>
            <FolderOpen size={24} />
            <h3 className="font-bold text-lg text-gray-800 truncate flex-grow">{project.name}</h3>
            {!isArchived && isComplete && (
              <div className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold" title="包含完整的核心 Bowtie 元素">
                完整
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 mb-4">
            <div className="flex items-center gap-1.5"><Activity size={14} className={isArchived ? 'text-gray-400' : 'text-blue-900'} /> 危害: {stats.hazard}</div>
            <div className="flex items-center gap-1.5"><Activity size={14} className={isArchived ? 'text-gray-400' : 'text-red-600'} /> 頂端事件: {stats.topEvent}</div>
            <div className="flex items-center gap-1.5"><Activity size={14} className={isArchived ? 'text-gray-400' : 'text-blue-500'} /> 威脅: {stats.threat}</div>
            <div className="flex items-center gap-1.5"><Activity size={14} className={isArchived ? 'text-gray-400' : 'text-red-500'} /> 後果: {stats.consequence}</div>
            <div className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-gray-400" /> 預防屏障: {stats.prevBarrier}</div>
            <div className="flex items-center gap-1.5"><ShieldAlert size={14} className="text-gray-400" /> 減緩屏障: {stats.mitigBarrier}</div>
          </div>

          <div className="text-xs text-gray-400 mt-auto">
            總節點: {project.nodes.length} | 連線: {project.edges.length} <br/>
            更新於 {format(project.last_modified, 'PP pp')}
          </div>
        </div>
        
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isArchived ? (
            <>
              <button 
                onClick={(e) => handleRestore(project.id, e)}
                className="text-gray-500 hover:text-green-600 bg-white/90 rounded p-1 shadow-sm"
                title="復原專案"
              >
                <ArchiveRestore size={18} />
              </button>
              <button 
                onClick={(e) => handlePermanentDelete(project.id, e)}
                className="text-gray-500 hover:text-red-600 bg-white/90 rounded p-1 shadow-sm"
                title="永久刪除"
              >
                <Trash2 size={18} />
              </button>
            </>
          ) : (
            <button 
              onClick={(e) => handleDelete(project.id, e)}
              className="text-gray-400 hover:text-red-500 bg-white/90 rounded p-1 shadow-sm"
              title="移至垃圾桶"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-gray-50 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            {viewArchived ? '垃圾桶 (已刪除專案)' : '我的 Bowtie 專案總覽'}
          </h2>
          <button 
            onClick={() => setViewArchived(!viewArchived)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            {viewArchived ? (
              <><FolderOpen size={16} /> 返回專案列表</>
            ) : (
              <><Archive size={16} /> 檢視垃圾桶 ({archivedProjects.length})</>
            )}
          </button>
        </div>
        
        {!viewArchived && (
          <form onSubmit={handleCreate} className="mb-10 bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex gap-4">
            <input 
              type="text" 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="輸入新專案名稱..." 
              className="flex-grow px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium flex items-center gap-2 transition-colors">
              <Plus size={18} /> 建立新專案
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {viewArchived ? (
            archivedProjects.length > 0 ? (
              archivedProjects.map(p => renderProjectCard(p, true))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                垃圾桶是空的。
              </div>
            )
          ) : (
            activeProjects.length > 0 ? (
              activeProjects.map(p => renderProjectCard(p, false))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                目前沒有任何專案。請在上方建立您的第一個 Bowtie 模型！
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;