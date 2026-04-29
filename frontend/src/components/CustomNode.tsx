import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { DiagramNodeData } from '../types';
import { useStore } from '../store/useStore';

const colorMap: Record<string, { bg: string, border: string, text: string, title: string }> = {
  hazard: { bg: 'bg-blue-900', border: 'border-blue-950', text: 'text-white', title: '危害 (Hazard)' },
  top_event: { bg: 'bg-red-600', border: 'border-red-700', text: 'text-white', title: '頂端事件 (Top Event)' },
  threat: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white', title: '威脅 (Threat)' },
  consequence: { bg: 'bg-red-500', border: 'border-red-600', text: 'text-white', title: '後果 (Consequence)' },
  preventive_barrier: { bg: 'bg-gray-200', border: 'border-gray-400', text: 'text-gray-800', title: '預防性屏障 (Prev. Barrier)' },
  mitigative_barrier: { bg: 'bg-gray-200', border: 'border-gray-400', text: 'text-gray-800', title: '減緩性屏障 (Mitig. Barrier)' },
};

const CustomNode = ({ id, data, selected }: { id: string, data: DiagramNodeData, selected?: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const { updateNodeData } = useStore();

  const colors = colorMap[data.type] || colorMap.preventive_barrier;
  
  // Decide handles based on node type to enforce bowtie rules visually
  const showLeftHandle = ['top_event', 'consequence', 'preventive_barrier', 'mitigative_barrier'].includes(data.type);
  const showRightHandle = ['hazard', 'top_event', 'threat', 'preventive_barrier', 'mitigative_barrier'].includes(data.type);
  const showBottomHandle = data.type === 'hazard';
  const showTopHandle = data.type === 'top_event';

  const entityData = data.entityData || {};

  const handleDoubleClick = () => {
    setEditValue(data.label);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editValue.trim() !== data.label) {
      updateNodeData(id, { label: editValue.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditValue(data.label);
      setIsEditing(false);
    }
  };

  return (
    <div 
      onDoubleClick={handleDoubleClick}
      className={`px-4 py-2 shadow-md rounded-md border-2 ${colors.bg} ${colors.border} ${colors.text} min-w-[150px] max-w-[250px] text-center text-sm font-semibold transition-all ${selected ? 'ring-4 ring-blue-400 ring-offset-2 scale-105 z-50' : ''}`}
    >
      {showLeftHandle && <Handle type="target" position={Position.Left} className="w-3 h-3" />}
      {showTopHandle && <Handle type="target" position={Position.Top} className="w-3 h-3" id="top" />}
      
      {entityData.code && (
        <div className="text-[10px] opacity-80 mb-1 font-mono tracking-wider">{entityData.code}</div>
      )}
      
      {isEditing ? (
        <input 
          autoFocus
          className="w-full text-center text-gray-900 px-1 py-0.5 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div className="leading-tight whitespace-pre-wrap">{data.label}</div>
      )}
      
      <div className="text-[10px] opacity-75 mt-2 pt-1 border-t border-white/20">
        {colors.title}
        
        {/* Show Effectiveness and Barrier Type for barriers */}
        {(data.type === 'preventive_barrier' || data.type === 'mitigative_barrier') && (
          <div className="flex flex-col gap-0.5 mt-1 font-normal">
            {entityData.effectiveness && (
              <span className="opacity-100 bg-white/20 px-1 rounded">效力: {entityData.effectiveness}</span>
            )}
            {entityData.barrier_type && (
              <span className="opacity-100 bg-white/20 px-1 rounded">類型: {entityData.barrier_type}</span>
            )}
          </div>
        )}
      </div>
      
      {showRightHandle && <Handle type="source" position={Position.Right} className="w-3 h-3" />}
      {showBottomHandle && <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="bottom" />}
    </div>
  );
};

export default CustomNode;