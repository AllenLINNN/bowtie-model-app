import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import localforage from 'localforage';
import { BowtieNode, Project, LibraryItem, NodeType } from '../types';
import { v4 as uuidv4 } from 'uuid';

localforage.config({
  name: 'BowtieApp',
  storeName: 'bowtie_data'
});

interface AppState {
  // Global State
  projects: Project[];
  library: LibraryItem[];
  counters: Record<string, number>;
  activeProjectId: string | null;
  isLoading: boolean;

  // Active Project State (mirrors the active project's nodes/edges for React Flow)
  nodes: BowtieNode[];
  edges: Edge[];

  // Actions
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
  peekNextCode: (type: NodeType) => string;
  selectedLibraryItemId: string | null;
  setSelectedLibraryItemId: (id: string | null) => void;
  updateLibraryItem: (id: string, newData: Partial<LibraryItem>) => void;
  
  // Project Management
  createProject: (name: string, description?: string) => void;
  openProject: (id: string | null) => void;
  deleteProject: (id: string) => void;
  updateProjectName: (name: string) => void;

  // Editor Actions
  onNodesChange: OnNodesChange<BowtieNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: BowtieNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNodeData: (nodeId: string, newData: any) => void;

  // Library Actions
  addToLibrary: (item: Omit<LibraryItem, 'id' | 'created_at'>) => void;
  removeFromLibrary: (id: string) => void;

  // Export / Import
  exportJSON: () => void;
  importJSON: (file: File) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  projects: [],
  library: [],
  counters: {},
  activeProjectId: null,
  selectedLibraryItemId: null,
  setSelectedLibraryItemId: (id) => set({ selectedLibraryItemId: id }),
  isLoading: true,
  nodes: [],
  edges: [],

  loadData: async () => {
    try {
      const data = await localforage.getItem<{projects: Project[], library: LibraryItem[], counters: Record<string, number>}>('app_data');
      if (data) {
        set({
          projects: data.projects || [],
          library: data.library || [],
          counters: data.counters || {},
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error("Failed to load data", error);
      set({ isLoading: false });
    }
  },

  saveData: async () => {
    // Before saving global data, ensure the active project's nodes/edges are synced back to the projects array
    const { activeProjectId, nodes, edges, projects, library, counters } = get();
    
    let updatedProjects = projects;
    if (activeProjectId) {
      const now = Date.now();
      updatedProjects = projects.map(p => 
        p.id === activeProjectId 
          ? { ...p, nodes, edges, last_modified: now }
          : p
      );
      set({ projects: updatedProjects }); // Update state implicitly
    }

    try {
      await localforage.setItem('app_data', {
        projects: updatedProjects,
        library,
        counters
      });
    } catch (error) {
      console.error("Failed to save data", error);
    }
  },

  peekNextCode: (type: NodeType) => {
    const prefixes: Record<string, string> = {
      hazard: 'H',
      top_event: 'E',
      threat: 'T',
      preventive_barrier: 'PB',
      mitigative_barrier: 'MB',
      consequence: 'C'
    };
    const prefix = prefixes[type] || 'X';
    const currentCount = get().counters[type] || 0;
    const nextCount = currentCount + 1;
    
    return `${prefix}-${nextCount.toString().padStart(3, '0')}`;
  },

  createProject: (name, description) => {
    const newProject: Project = {
      id: uuidv4(),
      name,
      description,
      created_at: Date.now(),
      last_modified: Date.now(),
      nodes: [],
      edges: []
    };
    set((state) => ({
      projects: [...state.projects, newProject]
    }));
    get().saveData();
  },

  openProject: (id) => {
    if (!id) {
      // Close project and go to dashboard
      get().saveData().then(() => {
        set({ activeProjectId: null, nodes: [], edges: [] });
      });
      return;
    }

    const project = get().projects.find(p => p.id === id);
    if (project) {
      set({
        activeProjectId: id,
        nodes: project.nodes || [],
        edges: project.edges || []
      });
    }
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter(p => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
      nodes: state.activeProjectId === id ? [] : state.nodes,
      edges: state.activeProjectId === id ? [] : state.edges,
    }));
    get().saveData();
  },

  updateProjectName: (name) => {
    const id = get().activeProjectId;
    if (!id) return;
    set((state) => ({
      projects: state.projects.map(p => p.id === id ? { ...p, name } : p)
    }));
    get().saveData();
  },

  onNodesChange: (changes: NodeChange<BowtieNode>[]) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as BowtieNode[] });
    get().saveData();
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    get().saveData();
  },

  onConnect: (connection: Connection) => {
    set({ edges: addEdge(connection, get().edges) });
    get().saveData();
  },

  setNodes: (nodes) => {
    set({ nodes });
    get().saveData();
  },

  setEdges: (edges) => {
    set({ edges });
    get().saveData();
  },

  updateNodeData: (nodeId, newData) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      }),
    });
    get().saveData();
  },

  addToLibrary: (item) => {
    const state = get();
    const nextCode = state.peekNextCode(item.type);
    let newCounters = { ...state.counters };
    
    if (item.entityData?.code === nextCode) {
      newCounters[item.type] = (state.counters[item.type] || 0) + 1;
    }

    const newItem: LibraryItem = {
      ...item,
      id: uuidv4(),
      created_at: Date.now()
    };
    set({
      library: [...state.library, newItem],
      counters: newCounters
    });
    get().saveData();
  },

  updateLibraryItem: (id, newData) => {
    set((state) => ({
      library: state.library.map(item => item.id === id ? { ...item, ...newData, entityData: { ...item.entityData, ...(newData.entityData || {}) } } : item)
    }));
    get().saveData();
  },

  removeFromLibrary: (id) => {
    set((state) => ({
      library: state.library.filter(item => item.id !== id)
    }));
    get().saveData();
  },

  exportJSON: () => {
    const data = JSON.stringify({
      projects: get().projects,
      library: get().library
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bowtie-workspace-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importJSON: async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.projects && Array.isArray(data.projects)) {
        set({
          projects: data.projects,
          library: data.library || [],
          activeProjectId: null, // Go to dashboard on import
          nodes: [],
          edges: []
        });
        await get().saveData();
      }
    } catch (error) {
      console.error("Failed to parse JSON file", error);
      alert("Invalid JSON file");
    }
  }
}));
