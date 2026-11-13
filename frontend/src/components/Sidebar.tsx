import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { NodeType } from '../types';
import { useStore } from '../store/useStore';
import { Database, PlusSquare, Trash2, ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { NODE_TYPES, getNodeTypeMeta } from '../utils/nodeTypes';
import { SegmentedTabs } from './ui';

type SidebarTab = 'templates' | 'library';

const revealOnHover = 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity';

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('templates');
  const [selectedCategory, setSelectedCategory] = useState<NodeType | null>(null);
  const { library, nodes, removeFromLibrary, restoreLibraryItem, setSelectedLibraryItemId, selectedLibraryItemId, addNodeFromTemplate, addNodeFromLibrary } = useStore();
  const { screenToFlowPosition } = useReactFlow();

  /** 點擊新增時放在畫布中央，依現有節點數錯開，避免疊在一起 */
  const getCanvasCenter = () => {
    const pane = document.querySelector('.react-flow');
    const rect = pane?.getBoundingClientRect();
    const offset = (nodes.length % 6) * 48;
    if (!rect) return { x: offset, y: offset };
    const pos = screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    return { x: pos.x - 80 + offset, y: pos.y - 24 + offset };
  };

  const onDragStartTemplate = (event: React.DragEvent<HTMLElement>, nodeType: NodeType, label: string) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragStartLibrary = (event: React.DragEvent<HTMLElement>, libraryId: string) => {
    event.dataTransfer.setData('application/reactflow-library-id', libraryId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleRemove = (id: string) => {
    const item = library.find(i => i.id === id);
    if (!item) return;
    removeFromLibrary(id);
    toast((t) => (
      <span className="flex items-center gap-3">
        已從資料庫刪除「{item.label}」
        <button
          type="button"
          onClick={() => { restoreLibraryItem(item); toast.dismiss(t.id); }}
          className="font-semibold text-blue-600 dark:text-blue-400"
        >
          復原
        </button>
      </span>
    ), { duration: 6000 });
  };

  const libraryItems = selectedCategory ? library.filter(item => item.type === selectedCategory) : [];

  return (
    <aside aria-label="節點範本與資料庫" className="w-64 border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex flex-col h-full shrink-0">
      <div className="p-3 border-b border-gray-200 dark:border-slate-800 shrink-0">
        <SegmentedTabs<SidebarTab>
          ariaLabel="左側面板內容"
          className="w-full [&>button]:flex-1"
          value={activeTab}
          onChange={(v) => { setActiveTab(v); setSelectedCategory(null); }}
          options={[
            { value: 'templates', label: <span className="flex items-center justify-center gap-1.5"><PlusSquare size={14} aria-hidden="true" />節點範本</span> },
            { value: 'library', label: <span className="flex items-center justify-center gap-1.5"><Database size={14} aria-hidden="true" />專屬資料庫</span> },
          ]}
        />
      </div>

      <div className="p-4 flex-grow overflow-y-auto">
        {activeTab === 'templates' ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">拖曳到畫布，或點擊加入畫布中央。</p>
            {NODE_TYPES.map((nt) => (
              // 用 div role="button"：Firefox 不會對 <button draggable> 觸發拖曳
              <div
                key={nt.type}
                role="button"
                tabIndex={0}
                draggable
                aria-label={`新增${nt.label}到畫布`}
                onDragStart={(event) => onDragStartTemplate(event, nt.type, nt.label)}
                onClick={() => addNodeFromTemplate(nt.type, nt.label, getCanvasCenter())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addNodeFromTemplate(nt.type, nt.label, getCanvasCenter()); }
                }}
                className={`p-3 rounded-md border border-gray-200 dark:border-slate-700 border-l-4 ${nt.card} text-left font-semibold text-sm shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing`}
              >
                {nt.label}
              </div>
            ))}
          </div>
        ) : !selectedCategory ? (
          <div className="flex flex-col gap-2.5 motion-safe:animate-fade-in">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">選擇類別以檢視儲存的項目。</p>
            {NODE_TYPES.map((nt) => {
              const count = library.filter(item => item.type === nt.type).length;
              return (
                <button
                  key={`cat-${nt.type}`}
                  type="button"
                  onClick={() => setSelectedCategory(nt.type)}
                  className="flex w-full text-left items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm transition-[border-color,box-shadow] group"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span aria-hidden="true" className={`w-3 h-3 rounded-full shrink-0 ${nt.dot}`} />
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-200 truncate">{nt.label}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-mono tabular-nums">
                      {count}<span className="sr-only"> 個項目</span>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3 motion-safe:animate-slide-in-right">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                aria-label="返回類別列表"
                className="p-1 hover:bg-gray-200 dark:hover:bg-slate-800 rounded text-gray-500 dark:text-gray-400 transition-colors"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <h2 className="font-bold text-sm text-gray-800 dark:text-gray-200">{getNodeTypeMeta(selectedCategory).label}</h2>
            </div>

            {libraryItems.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg">
                這個類別還沒有儲存的節點。
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {libraryItems.map((item) => {
                  const nt = getNodeTypeMeta(item.type);
                  const isSelected = selectedLibraryItemId === item.id;
                  return (
                    <li key={item.id} className="relative group">
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        draggable
                        onDragStart={(event) => onDragStartLibrary(event, item.id)}
                        onClick={() => setSelectedLibraryItemId(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedLibraryItemId(item.id); }
                        }}
                        className={`p-3 pr-16 rounded-md border border-gray-200 dark:border-slate-700 border-l-4 ${nt.card} cursor-grab font-medium text-sm text-left shadow-sm transition-shadow ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900' : 'hover:shadow-md'}`}
                      >
                        <span className="inline-block mb-1.5 bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/20 rounded px-1.5 py-0.5 text-xs font-mono">
                          {item.entityData?.code || '尚未編號'}
                        </span>
                        <div className="truncate">{item.label}</div>
                      </div>
                      <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 ${revealOnHover}`}>
                        <button
                          type="button"
                          onClick={() => addNodeFromLibrary(item.id, getCanvasCenter())}
                          className="bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-200 hover:text-blue-600 border border-gray-200 dark:border-slate-600 rounded p-1 shadow-sm"
                          aria-label={`將「${item.label}」加入畫布`}
                          title="加入畫布"
                        >
                          <Plus size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          className="bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-200 hover:text-white hover:bg-red-500 border border-gray-200 dark:border-slate-600 rounded p-1 shadow-sm"
                          aria-label={`從資料庫刪除「${item.label}」`}
                          title="從資料庫刪除"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
