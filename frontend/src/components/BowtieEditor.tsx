import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Panel,
  useReactFlow,
  Connection,
  Edge,
  MiniMap,
  FinalConnectionState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import CustomNode from './CustomNode';
import { NodeType } from '../types';
import toast from 'react-hot-toast';

const nodeTypes = {
  custom: CustomNode,
};

// Bowtie 連線規則（來源類型 → 允許的目標類型）
const VALID_PATHS: Record<NodeType, NodeType[]> = {
  hazard: ['top_event'],
  threat: ['preventive_barrier', 'top_event'],
  preventive_barrier: ['preventive_barrier', 'top_event'],
  top_event: ['mitigative_barrier', 'consequence'],
  mitigative_barrier: ['mitigative_barrier', 'consequence'],
  consequence: [],
};

const RULE_MESSAGES: Record<NodeType, string> = {
  hazard: '危害只能連到「頂端事件」。',
  threat: '威脅只能連到「預防性屏障」或「頂端事件」。',
  preventive_barrier: '預防性屏障只能連到「預防性屏障」或「頂端事件」。',
  top_event: '頂端事件只能連到「減緩性屏障」或「後果」。',
  mitigative_barrier: '減緩性屏障只能連到「減緩性屏障」或「後果」。',
  consequence: '後果是終點，不能再往下連線。',
};

const HINT_STORAGE_KEY = 'bowtie.canvasHintDismissed';

const readHintDismissed = () => {
  try {
    return localStorage.getItem(HINT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const Editor = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNodeFromTemplate, addNodeFromLibrary, setSelectedLibraryItemId, isMiniMapOpen } = useStore();
  const { screenToFlowPosition } = useReactFlow();
  const [hintDismissed, setHintDismissed] = useState(readHintDismissed);

  const dismissHint = () => {
    setHintDismissed(true);
    try {
      localStorage.setItem(HINT_STORAGE_KEY, '1');
    } catch {
      /* 私密模式等情況寫不進去，只影響下次是否再顯示 */
    }
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeDragStart = useCallback(() => {
    useStore.getState().pushHistory();
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const templateType = event.dataTransfer.getData('application/reactflow-type') as NodeType;
      const templateLabel = event.dataTransfer.getData('application/reactflow-label');
      const libraryId = event.dataTransfer.getData('application/reactflow-library-id');
      if (!templateType && !libraryId) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      if (libraryId) addNodeFromLibrary(libraryId, position);
      else addNodeFromTemplate(templateType, templateLabel, position);
    },
    [screenToFlowPosition, addNodeFromLibrary, addNodeFromTemplate],
  );

  // 拖曳過程中會反覆呼叫；只回傳結果，視覺回饋由連接點的 .valid class 呈現
  const isValidConnection = useCallback((connection: Edge | Connection) => {
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode) return false;
    return VALID_PATHS[sourceNode.data.type]?.includes(targetNode.data.type) ?? false;
  }, [nodes]);

  // 放開滑鼠時才說明為什麼不能連，每次無效連線都有回饋
  const onConnectEnd = useCallback((_event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
    if (state.isValid !== false || !state.fromNode || !state.toNode) return;
    const sType = state.fromNode.data?.type as NodeType;
    toast.error(`無法連線：${RULE_MESSAGES[sType] ?? '不符合 Bowtie 連線規則。'}`, { id: 'invalid-connection', duration: 4000 });
  }, []);

  const defaultEdgeOptions = useMemo(() => ({
    style: { stroke: '#9ca3af', strokeWidth: 2 }
  }), []);

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        defaultEdgeOptions={defaultEdgeOptions}
        onPaneClick={() => setSelectedLibraryItemId(null)}
        onNodeClick={() => setSelectedLibraryItemId(null)}
        onNodeDragStart={onNodeDragStart}
        colorMode="system"
        fitView
      >
        <Background />
        <Controls />
        {isMiniMapOpen && <MiniMap nodeStrokeWidth={3} zoomable pannable />}

        {nodes.length > 0 && !hintDismissed && (
          <Panel position="top-right" className="flex items-start gap-2 bg-white/90 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 px-3 py-2 rounded-lg shadow-sm text-xs text-gray-600 dark:text-gray-300 max-w-xs">
            <p>從節點邊緣的圓點拖曳連線，由左至右：威脅 → 頂端事件 → 後果。雙擊節點可改名。</p>
            <button type="button" onClick={dismissHint} aria-label="關閉提示" className="shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-100">
              <X size={14} aria-hidden="true" />
            </button>
          </Panel>
        )}

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 max-w-lg pointer-events-auto">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 text-center">開始建構 Bowtie 模型</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">畫布是空的。依照以下三個步驟開始：</p>
              <ol className="text-left space-y-4">
                {[
                  <>從左側<strong>「節點範本」</strong>拖曳元素（如危害、頂端事件）到畫布，或直接點擊範本加入畫布中央。</>,
                  <><strong>雙擊節點</strong>可直接改名。點選節點後，可在右側<strong>屬性面板</strong>填寫詳細資料，並儲存到資料庫。</>,
                  <>從節點邊緣的圓點拖曳到另一個節點即可連線。連接點顯示綠色代表可以連，紅色代表不符規則。</>,
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span aria-hidden="true" className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full w-6 h-6 flex items-center justify-center font-bold shrink-0 mt-0.5 text-sm">{i + 1}</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </ReactFlow>
    </div>
  );
};

export default Editor;
