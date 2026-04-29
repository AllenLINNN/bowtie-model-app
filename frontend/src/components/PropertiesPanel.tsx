import React from 'react';
import { useStore } from '../store/useStore';
import { Database } from 'lucide-react';

const PropertiesPanel = () => {
  const { nodes, updateNodeData, addToLibrary, selectedLibraryItemId, library, updateLibraryItem } = useStore();
  const selectedNode = nodes.find((n) => n.selected);
  const selectedLibraryItem = library.find(item => item.id === selectedLibraryItemId);

  if (!selectedNode && !selectedLibraryItem) {
    return (
      <aside className="w-80 border-l border-gray-200 bg-white p-4 overflow-y-auto shrink-0 z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.05)]">
        <div className="text-gray-500 text-sm text-center mt-10">Select a node on the canvas or in the library to edit its properties.</div>
      </aside>
    );
  }

  const isLibraryMode = !selectedNode && !!selectedLibraryItem;
  
  const data = isLibraryMode ? {
    label: selectedLibraryItem!.label,
    type: selectedLibraryItem!.type,
    entityId: selectedLibraryItem!.id,
    entityData: selectedLibraryItem!.entityData,
    fromLibraryId: null
  } : selectedNode!.data;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (isLibraryMode) {
      if (name === 'label') {
        updateLibraryItem(selectedLibraryItem!.id, { label: value });
      } else {
        updateLibraryItem(selectedLibraryItem!.id, {
          entityData: { ...selectedLibraryItem!.entityData, [name]: value }
        });
      }
    } else {
      if (name === 'label') {
        updateNodeData(selectedNode!.id, { label: value });
      } else {
        updateNodeData(selectedNode!.id, {
          entityData: { ...data.entityData, [name]: value }
        });
      }
    }
  };

  const handleSaveToLibrary = () => {
    addToLibrary({
      type: data.type,
      label: data.label,
      entityData: data.entityData || {}
    });
    alert(`Added "${data.label}" to Library!`);
  };

  const entityData = data.entityData || {};

  return (
    <aside className="w-80 border-l border-gray-200 bg-white p-4 overflow-y-auto flex flex-col gap-4 shrink-0 z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-start border-b pb-2">
        <h2 className="font-bold text-lg capitalize">
          {isLibraryMode ? 'Library Item' : `${data.type.replace('_', ' ')} Properties`}
        </h2>
        {!isLibraryMode && (
          <button 
            onClick={handleSaveToLibrary}
            className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded font-semibold transition-colors"
            title="Save this entity to the global library to reuse in other projects"
          >
            <Database size={12} /> Save
          </button>
        )}
      </div>
      
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700">Name (Label)</label>
        <input 
          type="text" 
          name="label" 
          value={data.label} 
          onChange={handleChange} 
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700">Code</label>
        <input 
          type="text" 
          name="code" 
          value={entityData.code || ''} 
          onChange={handleChange} 
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          placeholder="e.g., HAZ-01"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700">Description</label>
        <textarea 
          name="description" 
          value={entityData.description || ''} 
          onChange={handleChange} 
          rows={4}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
          placeholder="Detailed description..."
        />
      </div>

      {(data.type === 'preventive_barrier' || data.type === 'mitigative_barrier') && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">Effectiveness</label>
            <select 
              name="effectiveness" 
              value={entityData.effectiveness || 'good'} 
              onChange={handleChange}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
            >
              <option value="very-good">Very Good</option>
              <option value="good">Good</option>
              <option value="poor">Poor</option>
              <option value="very-poor">Very Poor</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">Owner / PIC</label>
            <input 
              type="text" 
              name="owner" 
              value={entityData.owner || ''} 
              onChange={handleChange} 
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="e.g., Safety Dept."
            />
          </div>
        </>
      )}
      
      <div className="text-[10px] text-gray-400 mt-auto pt-4 border-t break-all font-mono">
        Entity ID: {data.entityId}
        {data.fromLibraryId && <div className="mt-1">Linked to Library</div>}
      </div>
    </aside>
  );
};

export default PropertiesPanel;