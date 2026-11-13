import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { DiagramNodeData } from '../types';
import { useStore } from '../store/useStore';
import { getNodeTypeMeta } from '../utils/nodeTypes';
import { isImeComposing } from './ui';

const EFFECTIVENESS_LABELS: Record<string, string> = {
  'very-good': '非常好',
  good: '良好',
  poor: '不佳',
  'very-poor': '極差',
};

const BARRIER_TYPE_LABELS: Record<string, string> = {
  behavioral: '行為控制',
  'socio-technical': '社會技術',
  'active-hardware': '主動硬體',
  'continuous-hardware': '持續硬體',
  'passive-hardware': '被動硬體',
  organizational: '組織管理',
  other: '其他',
};

const handleClass = '!w-3 !h-3 dark:!bg-slate-300 dark:!border-slate-600';

const CustomNode = ({ id, data, selected }: { id: string, data: DiagramNodeData, selected?: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const { updateNodeData } = useStore();

  const meta = getNodeTypeMeta(data.type);

  const showLeftHandle = ['top_event', 'consequence', 'preventive_barrier', 'mitigative_barrier'].includes(data.type);
  const showRightHandle = ['hazard', 'top_event', 'threat', 'preventive_barrier', 'mitigative_barrier'].includes(data.type);
  const showBottomHandle = data.type === 'hazard';
  const showTopHandle = data.type === 'top_event';

  const entityData = data.entityData || {};
  const isBarrier = data.type === 'preventive_barrier' || data.type === 'mitigative_barrier';

  const handleDoubleClick = () => {
    setEditValue(data.label);
    setIsEditing(true);
  };

  const handleSave = () => {
    const next = editValue.trim();
    if (next && next !== data.label) {
      updateNodeData(id, { label: next });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isImeComposing(e)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(data.label);
      setIsEditing(false);
    }
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`px-4 py-3 shadow-sm hover:shadow-md transition-shadow rounded-md border border-gray-200 dark:border-slate-700 border-l-4 ${meta.card} min-w-[160px] max-w-[220px] text-left text-sm font-semibold ${selected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
    >
      {showLeftHandle && <Handle type="target" position={Position.Left} className={handleClass} />}
      {showTopHandle && <Handle type="target" position={Position.Top} className={handleClass} id="top" />}

      {entityData.code && (
        <div className="mb-1.5">
          <span className="inline-block bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/20 rounded px-1.5 py-0.5 text-xs font-mono font-medium text-slate-700 dark:text-slate-200">
            {entityData.code}
          </span>
        </div>
      )}

      {isEditing ? (
        <input
          autoFocus
          aria-label="節點名稱"
          className="nodrag w-full text-left text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-sm outline-none ring-2 ring-blue-500 bg-white dark:bg-slate-800"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div className="leading-snug whitespace-pre-wrap break-words">{data.label}</div>
      )}

      {isBarrier && (entityData.effectiveness || entityData.barrier_type) && (
        <div className="flex flex-wrap gap-1 mt-2 text-xs font-normal">
          {entityData.effectiveness && (
            <span className="bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 px-1.5 py-0.5 rounded">
              效力：{EFFECTIVENESS_LABELS[entityData.effectiveness] ?? entityData.effectiveness}
            </span>
          )}
          {entityData.barrier_type && (
            <span className="bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 px-1.5 py-0.5 rounded">
              {BARRIER_TYPE_LABELS[entityData.barrier_type] ?? entityData.barrier_type}
            </span>
          )}
        </div>
      )}

      {showRightHandle && <Handle type="source" position={Position.Right} className={handleClass} />}
      {showBottomHandle && <Handle type="source" position={Position.Bottom} className={handleClass} id="bottom" />}
    </div>
  );
};

export default CustomNode;
