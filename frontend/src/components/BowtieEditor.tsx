import React, { useRef, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
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
      alert(`Invalid connection: Cannot connect ${sType.replace('_', ' ')} to ${tType.replace('_', ' ')}`);
    }

    return isValid;
  }, [nodes]);

  const defaultEdgeOptions = useMemo(() => ({
    style: { stroke: '#9ca3af', strokeWidth: 2 }
  }), []);

  return (
    <div className="flex-grow h-full w-full" ref={reactFlowWrapper}>
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
          Tip: Drop nodes and connect them strictly left-to-right (Threat &rarr; Top Event &rarr; Consequence).
        </Panel>
      </ReactFlow>
    </div>
  );
};

const BowtieEditor = () => {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
};

export default BowtieEditor;
