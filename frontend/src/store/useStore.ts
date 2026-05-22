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
import { LopaAnalysisConfig, RiskCriteria, ScenarioPath } from '../types/lopa';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

localforage.config({
  name: 'BowtieApp',
  storeName: 'bowtie_data'
});

const defaultRiskCriteria = (): RiskCriteria => ({
  id: uuidv4(),
  name: '預設風險目標與矩陣定義',
  tmel_fatality: 1e-4,          // 致命事故 TMEL 上限：10^-4 次/年
  tmel_serious_injury: 1e-3,   // 重傷 TMEL 上限：10^-3 次/年
  tmel_minor_injury: 1e-2,     // 輕傷 TMEL 上限：10^-2 次/年
  tmel_property_damage: 1e-3,  // 財損 TMEL 上限：10^-3 次/年
  risk_matrix_config: {
    severity_levels: [
      { level: 1, label: '可忽略', description: '無人員受傷，財產損失極低' },
      { level: 2, label: '輕微', description: '人員輕傷，小規模財物損失' },
      { level: 3, label: '中等', description: '人員受傷住院，中等財產損失' },
      { level: 4, label: '嚴重', description: '人員重傷，重大財產與營運損失' },
      { level: 5, label: '災難性', description: '人員死亡，災難性毀滅損失' }
    ],
    likelihood_levels: [
      { level: 1, label: '極不可能', description: '年頻率 <= 1e-5，幾乎不曾發生' },
      { level: 2, label: '不可能', description: '年頻率 1e-4 到 1e-5，罕見發生' },
      { level: 3, label: '可能', description: '年頻率 1e-3 到 1e-4，偶爾發生' },
      { level: 4, label: '極可能', description: '年頻率 1e-2 到 1e-3，經常發生' },
      { level: 5, label: '幾乎確定', description: '年頻率 >= 1e-1，持續發生' }
    ],
    acceptability_matrix: [
      // 橫軸為 Severity (1-5)，縱軸為 Likelihood (1-5)
      // 對應的二維數組，這裡採用 [severity - 1][likelihood - 1] 結構映射
      // row 0: Severity 1 (可忽略)
      ['acceptable', 'acceptable', 'acceptable', 'acceptable', 'alarp'],
      // row 1: Severity 2 (輕微)
      ['acceptable', 'acceptable', 'acceptable', 'alarp', 'unacceptable'],
      // row 2: Severity 3 (中等)
      ['acceptable', 'acceptable', 'alarp', 'unacceptable', 'unacceptable'],
      // row 3: Severity 4 (嚴重)
      ['acceptable', 'alarp', 'unacceptable', 'unacceptable', 'unacceptable'],
      // row 4: Severity 5 (災難性)
      ['alarp', 'unacceptable', 'unacceptable', 'unacceptable', 'unacceptable']
    ]
  }
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
  analysisConfig: LopaAnalysisConfig | null;

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

  // LOPA Actions
  initLopaConfig: () => void;
  updateLopaConfig: (newData: Partial<LopaAnalysisConfig>) => void;
  updateRiskCriteria: (newData: Partial<RiskCriteria>) => void;
  addScenarioPath: (path: ScenarioPath) => void;
  updateScenarioPath: (pathId: string, newData: Partial<ScenarioPath>) => void;
  removeScenarioPath: (pathId: string) => void;
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
  analysisConfig: null,
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
    // Before saving global data, ensure the active project's nodes/edges/analysisConfig are synced back to the projects array
    const { activeProjectId, nodes, edges, analysisConfig, projects, library, counters } = get();
    
    let updatedProjects = projects;
    if (activeProjectId) {
      const now = Date.now();
      updatedProjects = projects.map(p => 
        p.id === activeProjectId 
          ? { ...p, nodes, edges, analysisConfig: analysisConfig || undefined, last_modified: now }
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
        set({ activeProjectId: null, nodes: [], edges: [], pastStates: [], futureStates: [], analysisConfig: null });
      });
      return;
    }

    const project = get().projects.find(p => p.id === id);
    if (project) {
      set({
        activeProjectId: id,
        nodes: project.nodes || [],
        edges: project.edges || [],
        analysisConfig: project.analysisConfig || null,
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
            label: newData.label !== undefined ? newData.label : edge.label
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
  },

  // LOPA Actions
  initLopaConfig: () => {
    const activeId = get().activeProjectId;
    if (!activeId) return;

    const newConfig: LopaAnalysisConfig = {
      id: uuidv4(),
      version: '0.1.0',
      created_at: Date.now(),
      updated_at: Date.now(),
      riskCriteria: defaultRiskCriteria(),
      scenarioPaths: []
    };

    set({ analysisConfig: newConfig });
    get().saveData();
  },

  updateLopaConfig: (newData) => {
    const current = get().analysisConfig;
    if (!current) return;

    const updated: LopaAnalysisConfig = {
      ...current,
      ...newData,
      updated_at: Date.now()
    };

    set({ analysisConfig: updated });
    get().saveData();
  },

  updateRiskCriteria: (newData) => {
    const current = get().analysisConfig;
    if (!current) return;

    const updated: LopaAnalysisConfig = {
      ...current,
      riskCriteria: {
        ...current.riskCriteria,
        ...newData
      },
      updated_at: Date.now()
    };

    set({ analysisConfig: updated });
    get().saveData();
  },

  addScenarioPath: (path) => {
    const current = get().analysisConfig;
    if (!current) return;

    const updated: LopaAnalysisConfig = {
      ...current,
      scenarioPaths: [...current.scenarioPaths, path],
      updated_at: Date.now()
    };

    set({ analysisConfig: updated });
    get().saveData();
  },

  updateScenarioPath: (pathId, newData) => {
    const current = get().analysisConfig;
    if (!current) return;

    const updated: LopaAnalysisConfig = {
      ...current,
      scenarioPaths: current.scenarioPaths.map(p => 
        p.id === pathId 
          ? { ...p, ...newData, updated_at: Date.now() } 
          : p
      ),
      updated_at: Date.now()
    };

    set({ analysisConfig: updated });
    get().saveData();
  },

  removeScenarioPath: (pathId) => {
    const current = get().analysisConfig;
    if (!current) return;

    const updated: LopaAnalysisConfig = {
      ...current,
      scenarioPaths: current.scenarioPaths.filter(p => p.id !== pathId),
      updated_at: Date.now()
    };

    set({ analysisConfig: updated });
    get().saveData();
  }
}));
