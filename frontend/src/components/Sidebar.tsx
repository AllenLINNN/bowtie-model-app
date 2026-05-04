import { useState } from 'react';
import { NodeType } from '../types';
import { useStore } from '../store/useStore';
import { Database, PlusSquare, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'library'>('templates');
  const [selectedCategory, setSelectedCategory] = useState<NodeType | null>(null);
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

  const nodeTypes: { type: NodeType; label: string; colorClass: string; borderL: string }[] = [
    { type: 'hazard', label: '危害 (Hazard)', colorClass: 'bg-blue-700 text-white', borderL: 'border-l-blue-700' },
    { type: 'top_event', label: '頂端事件 (Top Event)', colorClass: 'bg-red-600 text-white', borderL: 'border-l-red-600' },
    { type: 'threat', label: '威脅 (Threat)', colorClass: 'bg-blue-500 text-white', borderL: 'border-l-blue-500' },
    { type: 'preventive_barrier', label: '預防性屏障 (Preventive)', colorClass: 'bg-emerald-500 text-white', borderL: 'border-l-emerald-500' },
    { type: 'mitigative_barrier', label: '減緩性屏障 (Mitigative)', colorClass: 'bg-purple-500 text-white', borderL: 'border-l-purple-500' },
    { type: 'consequence', label: '後果 (Consequence)', colorClass: 'bg-orange-500 text-white', borderL: 'border-l-orange-500' },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-900 flex flex-col h-full shrink-0">
      <div className="flex border-b border-gray-200 dark:border-gray-800 shrink-0">
        <button 
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'templates' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800/50'}`}
          onClick={() => { setActiveTab('templates'); setSelectedCategory(null); }}
        >
          <PlusSquare size={16} /> 節點範本
        </button>
        <button 
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'library' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800/50'}`}
          onClick={() => setActiveTab('library')}
        >
          <Database size={16} /> 專屬資料庫
        </button>
      </div>

      <div className="p-4 flex-grow overflow-y-auto relative">
        {activeTab === 'templates' ? (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">拖曳下方空白節點至畫布以開始分析。</div>
            {nodeTypes.map((nt) => (
              <div
                key={nt.type}
                className={`p-3 rounded shadow-sm cursor-grab text-left font-medium text-sm transition-all hover:shadow-md dark:shadow-none hover:opacity-90 ${nt.colorClass}`}
                onDragStart={(event) => onDragStartTemplate(event, nt.type, nt.label)}
                draggable
              >
                {nt.label}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {!selectedCategory ? (
              <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-left">選擇節點類別以檢視儲存的項目。</div>
                {nodeTypes.map((nt) => {
                  const count = library.filter(item => item.type === nt.type).length;
                  return (
                    <button
                      key={`cat-${nt.type}`}
                      onClick={() => setSelectedCategory(nt.type)}
                      className="flex w-full text-left items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${nt.colorClass.split(' ')[0]}`}></div>
                        <span className="font-medium text-sm text-gray-700 dark:text-gray-200">{nt.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-mono">{count}</span>
                        <ChevronRight size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 fade-in duration-200">
                <div className="flex items-center gap-2 mb-2 pb-3 border-b border-gray-200 dark:border-gray-800">
                  <button 
                    onClick={() => setSelectedCategory(null)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-slate-800 rounded text-gray-500 dark:text-gray-400 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="font-bold text-sm text-gray-800 dark:text-gray-200 text-left">
                    {nodeTypes.find(n => n.type === selectedCategory)?.label}
                  </div>
                </div>

                {library.filter(item => item.type === selectedCategory).length === 0 ? (
                  <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    此類別目前沒有儲存的節點。
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {library.filter(item => item.type === selectedCategory).map((item) => {
                      const nt = nodeTypes.find(n => n.type === item.type)!;
                      return (
                        <div key={item.id} className="relative group">
                          <div
                            className={`p-3 pr-8 rounded shadow-sm cursor-grab font-medium text-sm text-left transition-all ${nt.colorClass} ${selectedLibraryItemId === item.id ? 'ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-slate-900' : 'hover:shadow-md dark:shadow-none hover:opacity-90'}`}
                            onDragStart={(event) => onDragStartLibrary(event, item.id)}
                            onClick={() => setSelectedLibraryItemId(item.id)}
                            draggable
                          >
                            <div className="mb-1.5">
                              <span className="inline-block bg-white/90 dark:bg-white/20 border border-black/10 dark:border-white/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-800 dark:text-white opacity-90 shadow-sm">
                                {item.entityData?.code || '尚未編號'}
                              </span>
                            </div>
                            <div className="truncate">{item.label}</div>
                          </div>
                          <button 
                            onClick={(e) => handleRemove(item.id, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white dark:text-white/50 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 hover:bg-red-500 rounded p-1 shadow-sm"
                            title="從資料庫刪除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;