import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { DiagramNodeData } from '../types';
import { useStore } from '../store/useStore';

const colorMap: Record<string, { bg: string, borderL: string, text: string, title: string }> = {
  hazard: { bg: 'bg-slate-50', borderL: 'border-l-blue-700', text: 'text-slate-800', title: '危害 (Hazard)' },
  top_event: { bg: 'bg-red-50', borderL: 'border-l-red-600', text: 'text-slate-800', title: '頂端事件 (Top Event)' },
  threat: { bg: 'bg-blue-50', borderL: 'border-l-blue-500', text: 'text-slate-700', title: '威脅 (Threat)' },
  consequence: { bg: 'bg-orange-50', borderL: 'border-l-orange-500', text: 'text-slate-700', title: '後果 (Consequence)' },
  preventive_barrier: { bg: 'bg-emerald-50', borderL: 'border-l-emerald-500', text: 'text-slate-700', title: '預防屏障 (Prev. Barrier)' },
  mitigative_barrier: { bg: 'bg-purple-50', borderL: 'border-l-purple-500', text: 'text-slate-700', title: '減緩屏障 (Mitig. Barrier)' },
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
      className={`px-4 py-3 shadow-sm hover:shadow-md transition-all rounded-md border border-gray-200 border-l-4 ${colors.bg} ${colors.borderL} ${colors.text} min-w-[160px] max-w-[220px] text-left text-sm font-semibold ${selected ? 'ring-2 ring-blue-400 ring-offset-2 z-50' : ''}`}
    >
      {showLeftHandle && <Handle type="target" position={Position.Left} className="w-3 h-3" />}
      {showTopHandle && <Handle type="target" position={Position.Top} className="w-3 h-3" id="top" />}
      
      {entityData.code && (
        <div className="mb-1.5">
          <span className="inline-block bg-white/80 border border-current/20 rounded px-1.5 py-0.5 text-[10px] font-mono opacity-80">
            {entityData.code}
          </span>
        </div>
      )}
      
      {isEditing ? (
        <input 
          autoFocus
          className="w-full text-left text-gray-900 px-1 py-0.5 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div className="leading-snug whitespace-pre-wrap">{data.label}</div>
      )}
      
      {/* Show Effectiveness and Barrier Type for barriers only, skipping the verbose title */}
      {(data.type === 'preventive_barrier' || data.type === 'mitigative_barrier') && (
        <div className="flex flex-wrap gap-1 mt-2 text-[10px] font-normal">
          {entityData.effectiveness && (
            <span className="opacity-90 bg-white/60 border border-current/10 px-1.5 py-0.5 rounded">效力: {entityData.effectiveness}</span>
          )}
          {entityData.barrier_type && (
            <span className="opacity-90 bg-white/60 border border-current/10 px-1.5 py-0.5 rounded">類型: {entityData.barrier_type}</span>
          )}
        </div>
      )}
      
      {showRightHandle && <Handle type="source" position={Position.Right} className="w-3 h-3" />}
      {showBottomHandle && <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="bottom" />}
    </div>
  );
};

export default CustomNode;