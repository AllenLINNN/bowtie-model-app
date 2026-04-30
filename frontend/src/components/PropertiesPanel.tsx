import React from 'react';
import { useStore } from '../store/useStore';
import { Database } from 'lucide-react';
import toast from 'react-hot-toast';

const PropertiesPanel = () => {
  const { nodes, updateNodeData, addToLibrary, selectedLibraryItemId, library, updateLibraryItem } = useStore();
  const selectedNode = nodes.find((n) => n.selected);
  const selectedLibraryItem = library.find(item => item.id === selectedLibraryItemId);

  if (!selectedNode && !selectedLibraryItem) {
    return (
      <aside className="w-80 border-l border-gray-200 bg-white p-4 overflow-y-auto shrink-0 z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.05)]">
        <div className="text-gray-500 text-sm text-center mt-10">點擊畫布上的節點或左側資料庫項目來編輯屬性。</div>
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
    if (data.fromLibraryId) {
      updateLibraryItem(data.fromLibraryId, {
        label: data.label,
        entityData: data.entityData || {}
      });
      toast.success(`已將 "${data.label}" 更新至資料庫！`);
    } else {
      const newId = addToLibrary({
        type: data.type,
        label: data.label,
        entityData: data.entityData || {}
      });
      if (selectedNode) {
        updateNodeData(selectedNode.id, { fromLibraryId: newId });
      }
      toast.success(`已將 "${data.label}" 儲存至資料庫！`);
    }
  };

  const entityData = data.entityData || {};

  const typeLabels: Record<string, string> = {
    hazard: '危害 (Hazard)',
    top_event: '頂端事件 (Top Event)',
    threat: '威脅 (Threat)',
    consequence: '後果 (Consequence)',
    preventive_barrier: '預防性屏障 (Preventive Barrier)',
    mitigative_barrier: '減緩性屏障 (Mitigative Barrier)'
  };

  return (
    <aside className="w-80 border-l border-gray-200 bg-white p-4 overflow-y-auto flex flex-col gap-4 shrink-0 z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-start border-b pb-2">
        <h2 className="font-bold text-lg text-gray-800">
          {isLibraryMode ? '資料庫項目屬性' : typeLabels[data.type] || '節點屬性'}
        </h2>
        {!isLibraryMode && (
          <button 
            onClick={handleSaveToLibrary}
            className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded font-semibold transition-colors"
            title="將此節點設定儲存至全域資料庫，以便未來重複使用"
          >
            <Database size={12} /> 儲存至庫
          </button>
        )}
      </div>
      
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700">名稱 (Label)</label>
        <input 
          type="text" 
          name="label" 
          value={data.label} 
          onChange={handleChange} 
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700">系統編號 (Code)</label>
        <input 
          type="text" 
          name="code" 
          value={entityData.code || ''} 
          onChange={handleChange} 
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-gray-50"
          placeholder="自動產生或手動輸入..."
          disabled={!isLibraryMode && data.fromLibraryId != null}
          title={!isLibraryMode && data.fromLibraryId ? "已從資料庫連動，不可修改" : ""}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700">詳細描述 (Description)</label>
        <textarea 
          name="description" 
          value={entityData.description || ''} 
          onChange={handleChange} 
          rows={4}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
          placeholder="輸入詳細說明..."
        />
      </div>

      {(data.type === 'preventive_barrier' || data.type === 'mitigative_barrier') && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">控制效力 (Effectiveness)</label>
            <select 
              name="effectiveness" 
              value={entityData.effectiveness || ''} 
              onChange={handleChange}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
            >
              <option value="" disabled>請選擇效力...</option>
              <option value="very-good">非常好 (Very Good)</option>
              <option value="good">良好 (Good)</option>
              <option value="poor">不佳 (Poor)</option>
              <option value="very-poor">極差 (Very Poor)</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">屏障類型 (Barrier Type)</label>
            <select 
              name="barrier_type" 
              value={entityData.barrier_type || ''} 
              onChange={handleChange}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
            >
              <option value="" disabled>請選擇類型...</option>
              <option value="behavioral">行為控制 (Behavioral)</option>
              <option value="socio-technical">社會技術 (Socio-technical)</option>
              <option value="active-hardware">主動硬體 (Active-hardware)</option>
              <option value="continuous-hardware">持續硬體 (Continuous-hardware)</option>
              <option value="passive-hardware">被動硬體 (Passive-hardware)</option>
              <option value="organizational">組織管理 (Organizational)</option>
              <option value="other">其他 (Other)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700">負責人 / 單位 (Owner)</label>
            <input 
              type="text" 
              name="owner" 
              value={entityData.owner || ''} 
              onChange={handleChange} 
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="e.g., 工安部、維修課..."
            />
          </div>
        </>
      )}
      
      <div className="text-[10px] text-gray-400 mt-auto pt-4 border-t break-all font-mono">
        節點 ID: {data.entityId}
        {data.fromLibraryId && <div className="mt-1 text-blue-500 font-bold">🔗 已連動至全域資料庫</div>}
      </div>
    </aside>
  );
};

export default PropertiesPanel;