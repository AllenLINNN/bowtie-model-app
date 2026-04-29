import { useState } from 'react';
import { NodeType } from '../types';
import { useStore } from '../store/useStore';
import { Database, PlusSquare, Trash2 } from 'lucide-react';

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

  const nodeTypes: { type: NodeType; label: string; colorClass: string }[] = [
    { type: 'hazard', label: 'Hazard', colorClass: 'bg-blue-900 text-white border-blue-950' },
    { type: 'top_event', label: 'Top Event', colorClass: 'bg-red-600 text-white border-red-700' },
    { type: 'threat', label: 'Threat', colorClass: 'bg-blue-500 text-white border-blue-600' },
    { type: 'preventive_barrier', label: 'Preventive Barrier', colorClass: 'bg-gray-200 text-gray-800 border-gray-400' },
    { type: 'mitigative_barrier', label: 'Mitigative Barrier', colorClass: 'bg-gray-200 text-gray-800 border-gray-400' },
    { type: 'consequence', label: 'Consequence', colorClass: 'bg-red-500 text-white border-red-600' },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col h-full shrink-0">
      <div className="flex border-b border-gray-200">
        <button 
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'templates' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          onClick={() => setActiveTab('templates')}
        >
          <PlusSquare size={16} /> Templates
        </button>
        <button 
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'library' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          onClick={() => setActiveTab('library')}
        >
          <Database size={16} /> Library
        </button>
      </div>

      <div className="p-4 flex-grow overflow-y-auto">
        {activeTab === 'templates' ? (
          <div className="flex flex-col gap-3">
            <div className="text-xs text-gray-500 mb-2">Drag blank nodes to create new entities.</div>
            {nodeTypes.map((nt) => (
              <div
                key={nt.type}
                className={`p-3 rounded border-2 shadow-sm cursor-grab text-center font-medium text-sm ${nt.colorClass} hover:opacity-90`}
                onDragStart={(event) => onDragStartTemplate(event, nt.type, nt.label)}
                draggable
              >
                {nt.label}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-gray-500 mb-1">Drag saved entities from your library.</div>
            {library.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400 border border-dashed border-gray-300 rounded">
                Your library is empty.<br/>Save nodes from the properties panel.
              </div>
            )}
            
            {nodeTypes.map((nt) => {
              const items = library.filter(item => item.type === nt.type);
              if (items.length === 0) return null;
              
              return (
                <div key={`lib-group-${nt.type}`} className="flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 pb-1">
                    {nt.label}s
                  </div>
                  {items.map((item) => (
                    <div key={item.id} className="relative group">
                      <div
                        className={`p-3 pr-8 rounded border-2 shadow-sm cursor-grab font-medium text-sm text-left transition-colors ${nt.colorClass} ${selectedLibraryItemId === item.id ? 'ring-4 ring-blue-400 ring-offset-1' : ''}`}
                        onDragStart={(event) => onDragStartLibrary(event, item.id)}
                        onClick={() => setSelectedLibraryItemId(item.id)}
                        draggable
                      >
                        <div className="text-[10px] opacity-75 font-mono mb-1">{item.entityData?.code || 'NO-CODE'}</div>
                        <div className="truncate">{item.label}</div>
                      </div>
                      <button 
                        onClick={() => removeFromLibrary(item.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove from Library"
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
