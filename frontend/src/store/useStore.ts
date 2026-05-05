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
import toast from 'react-hot-toast';

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

  // UI State
  isSidebarOpen: boolean;
  isPropertiesPanelOpen: boolean;
  isMiniMapOpen: boolean;
  toggleSidebar: () => void;
  togglePropertiesPanel: () => void;
  toggleMiniMap: () => void;

  // Active Project State (mirrors the active project's nodes/edges for React Flow)
  nodes: BowtieNode[];
  edges: Edge[];

  // History State for Undo/Redo
  pastStates: { nodes: BowtieNode[], edges: Edge[] }[];
  futureStates: { nodes: BowtieNode[], edges: Edge[] }[];

  // Actions
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
  generateNextCode: (type: NodeType) => string;
  peekNextCode: (type: NodeType) => string;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  selectedLibraryItemId: string | null;
  setSelectedLibraryItemId: (id: string | null) => void;
  updateLibraryItem: (id: string, newData: Partial<LibraryItem>) => void;
  
  // Project Management
  createProject: (name: string, description?: string) => void;
  openProject: (id: string | null) => void;
  deleteProject: (id: string) => void;
  restoreProject: (id: string) => void;
  permanentlyDeleteProject: (id: string) => void;
  updateProjectName: (name: string) => void;

  // Editor Actions
  onNodesChange: OnNodesChange<BowtieNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: BowtieNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNodeData: (nodeId: string, newData: any) => void;
  updateEdgeData: (edgeId: string, newData: any) => void;

  // Library Actions
  addToLibrary: (item: Omit<LibraryItem, 'id' | 'created_at'>) => string;
  removeFromLibrary: (id: string) => void;

  // Export / Import
  exportJSON: () => void;
  importJSON: (file: File) => Promise<void>;
  exportProjectJSON: (projectId: string) => void;
  importProjectJSON: (file: File) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  projects: [],
  library: [],
  counters: {},
  activeProjectId: null,
  selectedLibraryItemId: null,
  setSelectedLibraryItemId: (id) => set({ selectedLibraryItemId: id }),
  isLoading: true,
  isSidebarOpen: true,
  isPropertiesPanelOpen: true,
  isMiniMapOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  togglePropertiesPanel: () => set((state) => ({ isPropertiesPanelOpen: !state.isPropertiesPanelOpen })),
  toggleMiniMap: () => set((state) => ({ isMiniMapOpen: !state.isMiniMapOpen })),
  nodes: [],
  edges: [],
  pastStates: [],
  futureStates: [],

  pushHistory: () => {
    const { nodes, edges, pastStates } = get();
    // Save up to 50 states
    const newPast = [...pastStates, { nodes, edges }].slice(-50);
    set({ pastStates: newPast, futureStates: [] });
  },

  undo: () => {
    const { pastStates, futureStates, nodes, edges } = get();
    if (pastStates.length === 0) return;
    const previous = pastStates[pastStates.length - 1];
    const newPast = pastStates.slice(0, -1);
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      pastStates: newPast,
      futureStates: [{ nodes, edges }, ...futureStates],
    });
    get().saveData();
  },

  redo: () => {
    const { pastStates, futureStates, nodes, edges } = get();
    if (futureStates.length === 0) return;
    const next = futureStates[0];
    const newFuture = futureStates.slice(1);
    set({
      nodes: next.nodes,
      edges: next.edges,
      pastStates: [...pastStates, { nodes, edges }],
      futureStates: newFuture,
    });
    get().saveData();
  },

  generateNextCode: (type: NodeType) => {
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
    
    set(state => ({
      counters: { ...state.counters, [type]: nextCount }
    }));
    get().saveData();
    
    return `${prefix}-${nextCount.toString().padStart(3, '0')}`;
  },

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
        set({ activeProjectId: null, nodes: [], edges: [], pastStates: [], futureStates: [] });
      });
      return;
    }

    const project = get().projects.find(p => p.id === id);
    if (project) {
      set({
        activeProjectId: id,
        nodes: project.nodes || [],
        edges: project.edges || [],
        pastStates: [],
        futureStates: []
      });
    }
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.map(p => p.id === id ? { ...p, archived: true } : p),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
      nodes: state.activeProjectId === id ? [] : state.nodes,
      edges: state.activeProjectId === id ? [] : state.edges,
    }));
    get().saveData();
  },

  restoreProject: (id) => {
    set((state) => ({
      projects: state.projects.map(p => p.id === id ? { ...p, archived: false } : p)
    }));
    get().saveData();
  },

  permanentlyDeleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter(p => p.id !== id)
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
    const hasSignificantChange = changes.some(c => c.type === 'remove' || c.type === 'add');
    if (hasSignificantChange) get().pushHistory();
    set({ nodes: applyNodeChanges(changes, get().nodes) as BowtieNode[] });
    get().saveData();
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    const hasSignificantChange = changes.some(c => c.type === 'remove' || c.type === 'add');
    if (hasSignificantChange) get().pushHistory();
    set({ edges: applyEdgeChanges(changes, get().edges) });
    get().saveData();
  },

  onConnect: (connection: Connection) => {
    get().pushHistory();
    set({ edges: addEdge(connection, get().edges) });
    get().saveData();
  },

  setNodes: (nodes) => {
    get().pushHistory();
    set({ nodes });
    get().saveData();
  },

  setEdges: (edges) => {
    get().pushHistory();
    set({ edges });
    get().saveData();
  },

  updateNodeData: (nodeId, newData) => {
    get().pushHistory();
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

  updateEdgeData: (edgeId: string, newData: any) => {
    get().pushHistory();
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === edgeId) {
          return { 
            ...edge, 
            data: { ...edge.data, ...newData },
            label: newData.label || edge.label
          };
        }
        return edge;
      })
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

    const newId = uuidv4();
    const newItem: LibraryItem = {
      ...item,
      id: newId,
      created_at: Date.now()
    };
    set({
      library: [...state.library, newItem],
      counters: newCounters
    });
    get().saveData();
    return newId;
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
        toast.success("工作區匯入成功");
      } else {
        toast.error("這不是一個有效的工作區 JSON 檔案");
      }
    } catch (error) {
      console.error("Failed to parse JSON file", error);
      toast.error("無效的 JSON 檔案或格式錯誤");
    }
  },

  exportProjectJSON: (projectId) => {
    const project = get().projects.find(p => p.id === projectId);
    if (!project) return;
    const data = JSON.stringify({
      isSingleProject: true,
      project: project
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bowtie-project-${project.name}-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importProjectJSON: async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.isSingleProject && data.project) {
        // Append as a new project
        const newProject = {
          ...data.project,
          id: uuidv4(), // generate new ID to avoid collision
          name: `${data.project.name} (匯入)`,
          last_modified: Date.now()
        };
        set((state) => ({
          projects: [...state.projects, newProject]
        }));
        await get().saveData();
        toast.success(`已匯入專案：${newProject.name}`);
      } else {
        toast.error("這不是一個有效的單一專案 JSON 檔案");
      }
    } catch (error) {
      console.error("Failed to parse project JSON file", error);
      toast.error("無效的 JSON 檔案或格式錯誤");
    }
  }
}));
