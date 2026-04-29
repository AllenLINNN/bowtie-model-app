import { useState } from 'react';
import { NodeType } from '../types';
import { useStore } from '../store/useStore';
import { Database, PlusSquare, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'library'>('templates');
  const { library, removeFromLibrary, setSelectedLibraryItemId, selectedLibraryItemId } = useStore();

  const onDragStartTemplate = (event: React.DragEvent<HTMLDivElement>, nodeType: NodeType, label: string) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragStartLibrary = (event: React.DragEvent<HTMLDivElement>, libraryId: string) => {
    event.dataTransfer.setData('application/reactflow-library-id', libraryId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromLibrary(id);
    toast.success('已從資料庫刪除');
  };

  const nodeTypes: { type: NodeType; label: string; colorClass: string }[] = [
    { type: 'hazard', label: '危害 (Hazard)', colorClass: 'bg-slate-50 border-l-blue-700 text-slate-800' },
    { type: 'top_event', label: '頂端事件 (Top Event)', colorClass: 'bg-red-50 border-l-red-600 text-slate-800' },
    { type: 'threat', label: '威脅 (Threat)', colorClass: 'bg-blue-50 border-l-blue-500 text-slate-700' },
    { type: 'preventive_barrier', label: '預防性屏障 (Preventive)', colorClass: 'bg-emerald-50 border-l-emerald-500 text-slate-700' },
    { type: 'mitigative_barrier', label: '減緩性屏障 (Mitigative)', colorClass: 'bg-purple-50 border-l-purple-500 text-slate-700' },
    { type: 'consequence', label: '後果 (Consequence)', colorClass: 'bg-orange-50 border-l-orange-500 text-slate-700' },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col h-full shrink-0">
      <div className="flex border-b border-gray-200">
        <button 
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'templates' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          onClick={() => setActiveTab('templates')}
        >
          <PlusSquare size={16} /> 節點範本
        </button>
        <button 
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'library' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          onClick={() => setActiveTab('library')}
        >
          <Database size={16} /> 專屬資料庫
        </button>
      </div>

      <div className="p-4 flex-grow overflow-y-auto">
        {activeTab === 'templates' ? (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-gray-500 mb-2">拖曳下方空白節點至畫布以開始分析。</div>
            {nodeTypes.map((nt) => (
              <div
                key={nt.type}
                className={`p-3 rounded border border-gray-200 border-l-4 shadow-sm cursor-grab text-left font-medium text-sm transition-shadow hover:shadow-md ${nt.colorClass}`}
                onDragStart={(event) => onDragStartTemplate(event, nt.type, nt.label)}
                draggable
              >
                {nt.label}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-gray-500 mb-1">拖曳您儲存的專屬節點以快速套用設定。</div>
            {library.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400 border border-dashed border-gray-300 rounded">
                資料庫目前是空的。<br/>請在畫布點擊節點並按下「儲存至庫」。
              </div>
            )}
            
            {nodeTypes.map((nt) => {
              const items = library.filter(item => item.type === nt.type);
              if (items.length === 0) return null;
              
              return (
                <div key={`lib-group-${nt.type}`} className="flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 pb-1">
                    {nt.label}
                  </div>
                  {items.map((item) => (
                    <div key={item.id} className="relative group">
                      <div
                        className={`p-3 pr-8 rounded border border-gray-200 border-l-4 shadow-sm cursor-grab font-medium text-sm text-left transition-all ${nt.colorClass} ${selectedLibraryItemId === item.id ? 'ring-2 ring-blue-400 ring-offset-1' : 'hover:shadow-md'}`}
                        onDragStart={(event) => onDragStartLibrary(event, item.id)}
                        onClick={() => setSelectedLibraryItemId(item.id)}
                        draggable
                      >
                        <div className="mb-1.5">
                          <span className="inline-block bg-white/80 border border-current/20 rounded px-1.5 py-0.5 text-[10px] font-mono opacity-80">
                            {item.entityData?.code || '尚未編號'}
                          </span>
                        </div>
                        <div className="truncate">{item.label}</div>
                      </div>
                      <button 
                        onClick={(e) => handleRemove(item.id, e)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded p-1 shadow-sm"
                        title="從資料庫刪除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;