import { Handle, Position } from '@xyflow/react';
import { DiagramNodeData } from '../types';

const colorMap: Record<string, { bg: string, border: string, text: string }> = {
  hazard: { bg: 'bg-blue-900', border: 'border-blue-950', text: 'text-white' },
  top_event: { bg: 'bg-red-600', border: 'border-red-700', text: 'text-white' },
  threat: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white' },
  consequence: { bg: 'bg-red-500', border: 'border-red-600', text: 'text-white' },
  preventive_barrier: { bg: 'bg-gray-200', border: 'border-gray-400', text: 'text-gray-800' },
  mitigative_barrier: { bg: 'bg-gray-200', border: 'border-gray-400', text: 'text-gray-800' },
};

const CustomNode = ({ data, selected }: { data: DiagramNodeData, selected?: boolean }) => {
  const colors = colorMap[data.type] || colorMap.preventive_barrier;
  
  // Decide handles based on node type to enforce bowtie rules visually
  const showLeftHandle = ['top_event', 'consequence', 'preventive_barrier', 'mitigative_barrier'].includes(data.type);
  const showRightHandle = ['hazard', 'top_event', 'threat', 'preventive_barrier', 'mitigative_barrier'].includes(data.type);
  const showBottomHandle = data.type === 'hazard';
  const showTopHandle = data.type === 'top_event';

  const entityData = data.entityData || {};

  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${colors.bg} ${colors.border} ${colors.text} min-w-[150px] text-center text-sm font-semibold transition-all ${selected ? 'ring-4 ring-blue-400 ring-offset-2 scale-105' : ''}`}>
      {showLeftHandle && <Handle type="target" position={Position.Left} className="w-3 h-3" />}
      {showTopHandle && <Handle type="target" position={Position.Top} className="w-3 h-3" id="top" />}
      
      {entityData.code && (
        <div className="text-[10px] opacity-80 mb-1 font-mono tracking-wider">{entityData.code}</div>
      )}
      
      <div className="leading-tight">{data.label}</div>
      
      <div className="text-[10px] opacity-75 mt-2 capitalize pt-1 border-t border-white/20">
        {data.type.replace('_', ' ')}
        {entityData.effectiveness && (
           <span className="ml-1 opacity-100 font-bold">({entityData.effectiveness})</span>
        )}
      </div>
      
      {showRightHandle && <Handle type="source" position={Position.Right} className="w-3 h-3" />}
      {showBottomHandle && <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="bottom" />}
    </div>
  );
};

export default CustomNode;
