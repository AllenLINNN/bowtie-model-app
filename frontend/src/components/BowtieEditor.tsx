import React, { useRef, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Panel,
  useReactFlow,
  Connection,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/useStore';
import CustomNode from './CustomNode';
import { NodeType } from '../types';
import toast from 'react-hot-toast';

const nodeTypes = {
  custom: CustomNode,
};

const Editor = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, setSelectedLibraryItemId } = useStore();
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const templateType = event.dataTransfer.getData('application/reactflow-type') as NodeType;
      const templateLabel = event.dataTransfer.getData('application/reactflow-label');
      const libraryId = event.dataTransfer.getData('application/reactflow-library-id');

      if (!templateType && !libraryId) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let newNodeData;

      if (libraryId) {
        // Find in library
        const { library } = useStore.getState();
        const libItem = library.find(item => item.id === libraryId);
        if (!libItem) return;
        
        newNodeData = {
          label: libItem.label,
          type: libItem.type,
          entityId: uuidv4(),
          entityData: { ...libItem.entityData },
          fromLibraryId: libItem.id
        };
      } else {
        // Blank template - generate auto-code
        const { peekNextCode } = useStore.getState();
        const autoCode = peekNextCode(templateType);
        
        newNodeData = {
          label: templateLabel,
          type: templateType,
          entityId: uuidv4(),
          entityData: { code: autoCode }
        };
      }

      const newNode = {
        id: uuidv4(),
        type: 'custom',
        position,
        data: newNodeData,
      };

      setNodes([...nodes, newNode]);
    },
    [nodes, screenToFlowPosition, setNodes],
  );

  const isValidConnection = useCallback((connection: Edge | Connection) => {
    // Implement Bowtie strict validation rules based on schema
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) return false;

    const sType = sourceNode.data.type;
    const tType = targetNode.data.type;

    const validPaths = [
      { source: 'threat', target: 'preventive_barrier' },
      { source: 'preventive_barrier', target: 'preventive_barrier' },
      { source: 'preventive_barrier', target: 'top_event' },
      { source: 'top_event', target: 'mitigative_barrier' },
      { source: 'mitigative_barrier', target: 'mitigative_barrier' },
      { source: 'mitigative_barrier', target: 'consequence' },
      { source: 'threat', target: 'top_event' },
      { source: 'top_event', target: 'consequence' },
      { source: 'hazard', target: 'top_event' }
    ];

    const isValid = validPaths.some(
      (path) => path.source === sType && path.target === tType
    );

    if (!isValid) {
      toast.error(`無效的連線：無法將 ${sType.replace('_', ' ')} 連接到 ${tType.replace('_', ' ')}`);
    }

    return isValid;
  }, [nodes]);

  const defaultEdgeOptions = useMemo(() => ({
    style: { stroke: '#9ca3af', strokeWidth: 2 }
  }), []);

  return (
    <div className="flex-grow h-full w-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        defaultEdgeOptions={defaultEdgeOptions}
        onPaneClick={() => setSelectedLibraryItemId(null)}
        onNodeClick={() => setSelectedLibraryItemId(null)}
        fitView
      >
        <Background />
        <Controls />
        <Panel position="top-right" className="bg-white/80 p-2 rounded shadow text-xs text-gray-600">
          提示：拖曳節點並從左至右連線（威脅 &rarr; 頂端事件 &rarr; 後果）。
        </Panel>
        
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 p-8 rounded-xl shadow-lg border border-blue-100 max-w-lg text-center backdrop-blur-sm pointer-events-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">開始建構您的 Bowtie 模型</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                這是一個空白的畫布。請依照以下三個簡單的步驟開始：
              </p>
              <div className="text-left space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center font-bold shrink-0 mt-0.5">1</div>
                  <p className="text-sm text-gray-700">從左側的 <strong>「節點範本」</strong> 拖曳您需要的元素（如 Hazard、Top Event）到這個畫布上。</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center font-bold shrink-0 mt-0.5">2</div>
                  <p className="text-sm text-gray-700">在畫布上 <strong>雙擊節點</strong> 可以快速修改名稱。點擊節點後，也能在右側的 <strong>屬性面板</strong> 輸入詳細資料並將它「儲存至庫」。</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center font-bold shrink-0 mt-0.5">3</div>
                  <p className="text-sm text-gray-700">將滑鼠游標移到節點邊緣的圓點，按住並拖曳即可將節點連線起來，建立完整的風險關聯圖！</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </ReactFlow>
    </div>
  );
};

export default Editor;
