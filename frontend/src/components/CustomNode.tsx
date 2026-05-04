import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { DiagramNodeData } from '../types';
import { useStore } from '../store/useStore';

const colorMap: Record<string, { bg: string, borderL: string, text: string }> = {
  hazard: { bg: 'bg-slate-50 dark:bg-slate-800', borderL: 'border-l-blue-700 dark:border-l-blue-400', text: 'text-slate-800 dark:text-slate-200' },
  top_event: { bg: 'bg-red-50 dark:bg-red-950/30', borderL: 'border-l-red-600 dark:border-l-red-400', text: 'text-slate-800 dark:text-red-100' },
  threat: { bg: 'bg-blue-50 dark:bg-blue-950/30', borderL: 'border-l-blue-500 dark:border-l-blue-400', text: 'text-slate-700 dark:text-blue-100' },
  consequence: { bg: 'bg-orange-50 dark:bg-orange-950/30', borderL: 'border-l-orange-500 dark:border-l-orange-400', text: 'text-slate-700 dark:text-orange-100' },
  preventive_barrier: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', borderL: 'border-l-emerald-500 dark:border-l-emerald-400', text: 'text-slate-700 dark:text-emerald-100' },
  mitigative_barrier: { bg: 'bg-purple-50 dark:bg-purple-950/30', borderL: 'border-l-purple-500 dark:border-l-purple-400', text: 'text-slate-700 dark:text-purple-100' },
};

const CustomNode = ({ id, data, selected }: { id: string, data: DiagramNodeData, selected?: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const { updateNodeData } = useStore();

  const colors = colorMap[data.type] || colorMap.preventive_barrier;
  
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
      className={`px-4 py-3 shadow-sm hover:shadow-md transition-all rounded-md border border-gray-200 dark:border-slate-700 border-l-4 ${colors.bg} ${colors.borderL} ${colors.text} min-w-[160px] max-w-[220px] text-left text-sm font-semibold ${selected ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-slate-900 z-50' : ''}`}
    >
      {showLeftHandle && <Handle type="target" position={Position.Left} className="w-3 h-3 dark:bg-slate-300 dark:border-slate-600" />}
      {showTopHandle && <Handle type="target" position={Position.Top} className="w-3 h-3 dark:bg-slate-300 dark:border-slate-600" id="top" />}
      
      {entityData.code && (
        <div className="mb-1.5">
          <span className="inline-block bg-white/80 dark:bg-white/10 border border-current/20 dark:border-white/20 rounded px-1.5 py-0.5 text-[10px] font-mono opacity-80">
            {entityData.code}
          </span>
        </div>
      )}
      
      {isEditing ? (
        <input 
          autoFocus
          className="w-full text-left text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div className="leading-snug whitespace-pre-wrap">{data.label}</div>
      )}
      
      {(data.type === 'preventive_barrier' || data.type === 'mitigative_barrier') && (
        <div className="flex flex-wrap gap-1 mt-2 text-[10px] font-normal">
          {entityData.effectiveness && (
            <span className="opacity-90 bg-white/60 dark:bg-white/10 border border-current/10 dark:border-white/10 px-1.5 py-0.5 rounded">效力: {entityData.effectiveness}</span>
          )}
          {entityData.barrier_type && (
            <span className="opacity-90 bg-white/60 dark:bg-white/10 border border-current/10 dark:border-white/10 px-1.5 py-0.5 rounded">類型: {entityData.barrier_type}</span>
          )}
        </div>
      )}
      
      {showRightHandle && <Handle type="source" position={Position.Right} className="w-3 h-3 dark:bg-slate-300 dark:border-slate-600" />}
      {showBottomHandle && <Handle type="source" position={Position.Bottom} className="w-3 h-3 dark:bg-slate-300 dark:border-slate-600" id="bottom" />}
    </div>
  );
};

export default CustomNode;