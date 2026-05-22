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
import { LopaAnalysisConfig, RiskCriteria, ScenarioPath, InitiatingEvent, BarrierAnalysis } from '../types/lopa';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

localforage.config({
  name: 'BowtieApp',
  storeName: 'bowtie_data'
});

const defaultRiskCriteria = (): RiskCriteria => ({
  id: uuidv4(),
  name: '鐵路營運安全風險指標與矩陣定義',
  tmel_fatality: 1e-4,          // 致命事故 TMEL 上限：10^-4 次/年
  tmel_serious_injury: 1e-3,   // 重傷 TMEL 上限：10^-3 次/年
  tmel_minor_injury: 1e-2,     // 輕傷 TMEL 上限：10^-2 次/年
  tmel_property_damage: 1e-3,  // 財損 TMEL 上限：10^-3 次/年
  risk_matrix_config: {
    severity_levels: [
      { level: 1, label: '虛驚', description: '無人員受傷，鐵路行車無實質影響之異常事件' },
      { level: 2, label: '延誤行車', description: '鐵路運轉受阻，行車受延誤之運轉異常事件' },
      { level: 3, label: '財損', description: '造成設備或車輛損毀，中等財產損失' },
      { level: 4, label: '受傷', description: '造成人員受傷（包含重傷或輕傷）' },
      { level: 5, label: '死亡', description: '造成鐵路人員、旅客或民眾死亡' }
    ],
    likelihood_levels: [
      { level: 1, label: '幾乎不可能', description: '年頻率 <= 1e-5，在同類營運環境下極罕見' },
      { level: 2, label: '不太可能', description: '年頻率 1e-4 到 1e-5，在營運壽期內少見發生' },
      { level: 3, label: '可能', description: '年頻率 1e-3 到 1e-4，偶爾發生之事件' },
      { level: 4, label: '極有可能', description: '年頻率 1e-2 到 1e-3，經常發生之運轉事件' },
      { level: 5, label: '幾乎可確定', description: '年頻率 >= 1e-1，持續發生之常見運轉問題' }
    ],
    acceptability_matrix: [
      // 橫軸為 Severity (1-5)，縱軸為 Likelihood (1-5)
      // 對應的二維數組，這裡採用 [severity - 1][likelihood - 1] 結構映射
      // row 0: Severity 1 (虛驚)
      ['R1', 'R1', 'R2', 'R3', 'R4'],
      // row 1: Severity 2 (延誤行車)
      ['R1', 'R2', 'R3', 'R4', 'R5'],
      // row 2: Severity 3 (財損)
      ['R2', 'R3', 'R4', 'R5', 'R5'],
      // row 3: Severity 4 (受傷)
      ['R4', 'R5', 'R5', 'R5', 'R5'],
      // row 4: Severity 5 (死亡)
      ['R5', 'R5', 'R5', 'R5', 'R5']
    ]
  }
});

const needsUpgradeCriteria = (criteria: any) => {
  if (!criteria) return true;
  const matrix = criteria.risk_matrix_config?.acceptability_matrix;
  if (!matrix) return true;
  // 檢查是否含有舊版的值 'acceptable' 或是 'alarp'
  return matrix.some((row: any) => row.includes('acceptable') || row.includes('alarp'));
};

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
  syncScenarioPaths: () => void;
  calculateLopa: () => void;
  activeTab: 'canvas' | 'lopa_table' | 'risk_matrix';
  setActiveTab: (tab: 'canvas' | 'lopa_table' | 'risk_matrix') => void;
  isLopaEnabled: boolean;
  toggleLopaEnabled: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  projects: [],
  library: [],
  counters: {},
  activeProjectId: null,
  activeTab: 'canvas',
  isLopaEnabled: false,
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
          ? { ...p, nodes, edges, analysisConfig: analysisConfig || undefined, isLopaEnabled: get().isLopaEnabled, last_modified: now }
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
      let config = project.analysisConfig || null;
      if (config && config.riskCriteria && needsUpgradeCriteria(config.riskCriteria)) {
        config = {
          ...config,
          riskCriteria: defaultRiskCriteria(),
          updated_at: Date.now()
        };
      }
      set({
        activeProjectId: id,
        nodes: project.nodes || [],
        edges: project.edges || [],
        analysisConfig: config,
        isLopaEnabled: project.isLopaEnabled !== undefined ? project.isLopaEnabled : !!config,
        activeTab: 'canvas',
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
    if (get().analysisConfig) {
      get().syncScenarioPaths();
      get().calculateLopa();
    } else {
      get().saveData();
    }
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    const hasSignificantChange = changes.some(c => c.type === 'remove' || c.type === 'add');
    if (hasSignificantChange) get().pushHistory();
    set({ edges: applyEdgeChanges(changes, get().edges) });
    if (get().analysisConfig) {
      get().syncScenarioPaths();
      get().calculateLopa();
    } else {
      get().saveData();
    }
  },

  onConnect: (connection: Connection) => {
    get().pushHistory();
    set({ edges: addEdge(connection, get().edges) });
    if (get().analysisConfig) {
      get().syncScenarioPaths();
      get().calculateLopa();
    } else {
      get().saveData();
    }
  },

  setNodes: (nodes) => {
    get().pushHistory();
    set({ nodes });
    if (get().analysisConfig) {
      get().syncScenarioPaths();
      get().calculateLopa();
    } else {
      get().saveData();
    }
  },

  setEdges: (edges) => {
    get().pushHistory();
    set({ edges });
    if (get().analysisConfig) {
      get().syncScenarioPaths();
      get().calculateLopa();
    } else {
      get().saveData();
    }
  },

  updateNodeData: (nodeId, newData) => {
    get().pushHistory();
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          const updatedEntityData = newData.entityData 
            ? { ...(node.data?.entityData || {}), ...newData.entityData }
            : node.data?.entityData;

          return { 
            ...node, 
            data: { 
              ...node.data, 
              ...newData,
              ...(updatedEntityData ? { entityData: updatedEntityData } : {})
            } 
          };
        }
        return node;
      }),
    });
    if (get().analysisConfig) {
      get().syncScenarioPaths();
      get().calculateLopa();
    } else {
      get().saveData();
    }
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
    if (get().analysisConfig) {
      get().syncScenarioPaths();
      get().calculateLopa();
    } else {
      get().saveData();
    }
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
  },

  syncScenarioPaths: () => {
    const nodes = get().nodes;
    const edges = get().edges;
    const currentConfig = get().analysisConfig;
    if (!currentConfig) return;

    const topEvent = nodes.find(n => n.data?.type === 'top_event');
    if (!topEvent) {
      if (currentConfig.scenarioPaths.length > 0) {
        set({
          analysisConfig: {
            ...currentConfig,
            scenarioPaths: [],
            updated_at: Date.now()
          }
        });
        get().saveData();
      }
      return;
    }

    const threats = nodes.filter(n => n.data?.type === 'threat');
    const oldPaths = currentConfig.scenarioPaths || [];

    const findPreventivePaths = (threatId: string, targetId: string): string[][] => {
      const paths: string[][] = [];
      const visited = new Set<string>();

      const dfs = (currentId: string, currentPath: string[]) => {
        if (currentId === targetId) {
          paths.push([...currentPath]);
          return;
        }
        if (visited.has(currentId)) return;
        visited.add(currentId);

        const outboundEdges = edges.filter(e => e.source === currentId);
        for (const edge of outboundEdges) {
          const nextNode = nodes.find(n => n.id === edge.target);
          if (!nextNode) continue;

          if (nextNode.id === targetId) {
            dfs(nextNode.id, currentPath);
          } else if (nextNode.data?.type === 'preventive_barrier') {
            dfs(nextNode.id, [...currentPath, nextNode.id]);
          }
        }

        visited.delete(currentId);
      };

      dfs(threatId, []);
      return paths;
    };

    interface MitigativePath {
      barrierIds: string[];
      consequenceId: string;
    }

    const findMitigativePaths = (startId: string): MitigativePath[] => {
      const paths: MitigativePath[] = [];
      const visited = new Set<string>();

      const dfs = (currentId: string, currentPath: string[]) => {
        const currentNode = nodes.find(n => n.id === currentId);
        if (!currentNode) return;

        if (currentNode.data?.type === 'consequence') {
          paths.push({
            barrierIds: currentPath,
            consequenceId: currentId
          });
          return;
        }
        if (visited.has(currentId)) return;
        visited.add(currentId);

        const outboundEdges = edges.filter(e => e.source === currentId);
        for (const edge of outboundEdges) {
          const nextNode = nodes.find(n => n.id === edge.target);
          if (!nextNode) continue;

          if (nextNode.data?.type === 'consequence') {
            dfs(nextNode.id, currentPath);
          } else if (nextNode.data?.type === 'mitigative_barrier') {
            dfs(nextNode.id, [...currentPath, nextNode.id]);
          }
        }

        visited.delete(currentId);
      };

      dfs(startId, []);
      return paths;
    };

    const newPaths: ScenarioPath[] = [];

    for (const threat of threats) {
      const prevPaths = findPreventivePaths(threat.id, topEvent.id);
      const mitgPaths = findMitigativePaths(topEvent.id);

      for (const pPath of prevPaths) {
        for (const mPath of mitgPaths) {
          const pbKeyStr = pPath.join('-');
          const mbKeyStr = mPath.barrierIds.join('-');
          const pathKey = `${threat.id}_${pbKeyStr}_${topEvent.id}_${mbKeyStr}_${mPath.consequenceId}`;

          const oldPath = oldPaths.find(p => p.id === pathKey);
          const newBarriers: BarrierAnalysis[] = [];

          pPath.forEach((pbId, index) => {
            const pbNode = nodes.find(n => n.id === pbId);
            const pbEntityData = pbNode?.data?.entityData || {};
            const oldBarrier = oldPath?.barriers.find(b => b.barrier_node_id === pbId && b.barrier_role === 'preventive');

            const rawEff = pbEntityData.effectiveness ?? oldBarrier?.semi_quant_effectiveness;
            const pbEffectiveness: 'high' | 'medium' | 'low' | null = 
              (rawEff === 'high' || rawEff === 'medium' || rawEff === 'low') ? rawEff : 'medium';

            newBarriers.push({
              id: oldBarrier?.id || uuidv4(),
              barrier_node_id: pbId,
              barrier_role: 'preventive',
              is_ipl: pbEntityData.is_ipl !== undefined ? pbEntityData.is_ipl : (oldBarrier?.is_ipl ?? pbEntityData.default_is_ipl ?? false),
              pfd: pbEntityData.pfd !== undefined ? pbEntityData.pfd : (oldBarrier?.pfd ?? pbEntityData.default_pfd ?? 0.1),
              rrf: pbEntityData.rrf !== undefined ? pbEntityData.rrf : (oldBarrier?.rrf ?? (pbEntityData.default_pfd ? 1 / pbEntityData.default_pfd : 10)),
              pfd_basis: pbEntityData.pfd_basis !== undefined ? pbEntityData.pfd_basis : (oldBarrier?.pfd_basis ?? '預設估計值'),
              is_independent: pbEntityData.is_independent !== undefined ? pbEntityData.is_independent : (oldBarrier?.is_independent ?? true),
              is_auditable: pbEntityData.is_auditable !== undefined ? pbEntityData.is_auditable : (oldBarrier?.is_auditable ?? true),
              is_effective: pbEntityData.is_effective !== undefined ? pbEntityData.is_effective : (oldBarrier?.is_effective ?? true),
              deficiency: pbEntityData.deficiency !== undefined ? pbEntityData.deficiency : (oldBarrier?.deficiency ?? null),
              semi_quant_effectiveness: pbEffectiveness,
              order_in_path: index + 1,
              control_type: pbEntityData.control_type !== undefined ? pbEntityData.control_type : (oldBarrier?.control_type ?? 'existing'),
              notes: pbEntityData.notes !== undefined ? pbEntityData.notes : (oldBarrier?.notes ?? '')
            });
          });

          mPath.barrierIds.forEach((mbId, index) => {
            const mbNode = nodes.find(n => n.id === mbId);
            const mbEntityData = mbNode?.data?.entityData || {};
            const oldBarrier = oldPath?.barriers.find(b => b.barrier_node_id === mbId && b.barrier_role === 'mitigative');

            const rawEff = mbEntityData.effectiveness ?? oldBarrier?.semi_quant_effectiveness;
            const mbEffectiveness: 'high' | 'medium' | 'low' | null = 
              (rawEff === 'high' || rawEff === 'medium' || rawEff === 'low') ? rawEff : 'medium';

            newBarriers.push({
              id: oldBarrier?.id || uuidv4(),
              barrier_node_id: mbId,
              barrier_role: 'mitigative',
              is_ipl: mbEntityData.is_ipl !== undefined ? mbEntityData.is_ipl : (oldBarrier?.is_ipl ?? mbEntityData.default_is_ipl ?? false),
              pfd: mbEntityData.pfd !== undefined ? mbEntityData.pfd : (oldBarrier?.pfd ?? mbEntityData.default_pfd ?? 0.1),
              rrf: mbEntityData.rrf !== undefined ? mbEntityData.rrf : (oldBarrier?.rrf ?? (mbEntityData.default_pfd ? 1 / mbEntityData.default_pfd : 10)),
              pfd_basis: mbEntityData.pfd_basis !== undefined ? mbEntityData.pfd_basis : (oldBarrier?.pfd_basis ?? '預設估計值'),
              is_independent: mbEntityData.is_independent !== undefined ? mbEntityData.is_independent : (oldBarrier?.is_independent ?? true),
              is_auditable: mbEntityData.is_auditable !== undefined ? mbEntityData.is_auditable : (oldBarrier?.is_auditable ?? true),
              is_effective: mbEntityData.is_effective !== undefined ? mbEntityData.is_effective : (oldBarrier?.is_effective ?? true),
              deficiency: mbEntityData.deficiency !== undefined ? mbEntityData.deficiency : (oldBarrier?.deficiency ?? null),
              semi_quant_effectiveness: mbEffectiveness,
              order_in_path: index + 1,
              control_type: mbEntityData.control_type !== undefined ? mbEntityData.control_type : (oldBarrier?.control_type ?? 'existing'),
              notes: mbEntityData.notes !== undefined ? mbEntityData.notes : (oldBarrier?.notes ?? '')
            });
          });

          const threatEntityData = threat.data?.entityData || {};
          const oldIE = oldPath?.initiating_event;

          const initiatingEvent: InitiatingEvent = {
            frequency_value: threatEntityData.frequency_value !== undefined ? threatEntityData.frequency_value : (oldIE?.frequency_value ?? 0.1),
            frequency_unit: threatEntityData.frequency_unit !== undefined ? threatEntityData.frequency_unit : (oldIE?.frequency_unit ?? 'per_year'),
            frequency_per_year: threatEntityData.frequency_per_year !== undefined ? threatEntityData.frequency_per_year : (oldIE?.frequency_per_year ?? 0.1),
            semi_quant_level: threatEntityData.semi_quant_likelihood !== undefined ? threatEntityData.semi_quant_likelihood : (oldIE?.semi_quant_level ?? 3),
            input_mode: threatEntityData.input_mode !== undefined ? threatEntityData.input_mode : (oldIE?.input_mode ?? 'semi_quantitative'),
            source: threatEntityData.source !== undefined ? threatEntityData.source : (oldIE?.source ?? '預設工藝安全設定'),
            confidence_level: threatEntityData.confidence_level !== undefined ? threatEntityData.confidence_level : (oldIE?.confidence_level ?? 'medium'),
            reference: threatEntityData.reference !== undefined ? threatEntityData.reference : (oldIE?.reference ?? '')
          };

          newPaths.push({
            id: pathKey,
            threat_node_id: threat.id,
            top_event_node_id: topEvent.id,
            consequence_node_id: mPath.consequenceId,
            initiating_event: initiatingEvent,
            barriers: newBarriers,
            conditional_modifiers: oldPath?.conditional_modifiers ?? [],
            calculation_result: oldPath?.calculation_result ?? null,
            is_active: oldPath?.is_active ?? true,
            created_at: oldPath?.created_at ?? Date.now(),
            updated_at: Date.now(),
            notes: oldPath?.notes ?? '',
            audit_trail: oldPath?.audit_trail ?? []
          });
        }
      }
    }

    set({
      analysisConfig: {
        ...currentConfig,
        scenarioPaths: newPaths,
        updated_at: Date.now()
      }
    });
    get().saveData();
  },

  calculateLopa: () => {
    const current = get().analysisConfig;
    if (!current) return;

    const riskCriteria = current.riskCriteria;
    const semiQuantLikelihoodMap: Record<number, number> = {
      5: 1e-1,
      4: 1e-2,
      3: 1e-3,
      2: 1e-4,
      1: 1e-5
    };

    // 可能性頻率區間映射演算法 (符合國際標準 10⁻⁴ ~ 10⁻¹ 分級)
    const frequencyToLikelihoodLevel = (freq: number): 1 | 2 | 3 | 4 | 5 => {
      if (freq >= 1e-1) return 5;
      if (freq >= 1e-2) return 4;
      if (freq >= 1e-3) return 3;
      if (freq >= 1e-4) return 2;
      return 1;
    };

    const updatedPaths = current.scenarioPaths.map(path => {
      let ieFrequency = path.initiating_event.frequency_per_year;
      if (path.initiating_event.input_mode === 'semi_quantitative') {
        const level = path.initiating_event.semi_quant_level || 3;
        ieFrequency = semiQuantLikelihoodMap[level] || 1e-3;
      }

      // 條件修飾因子乘積
      const activeModifiers = path.conditional_modifiers.filter(m => m.is_active);
      const modifierProduct = activeModifiers.reduce((prod, m) => prod * m.value, 1.0);

      // ==========================================
      // 1. 初始風險計算 (僅包含 existing 控制措施)
      // ==========================================
      const initialPrevIPLs = path.barriers.filter(b => 
        b.barrier_role === 'preventive' && 
        b.is_ipl && 
        b.is_effective && 
        b.is_independent && 
        b.pfd !== null &&
        (b.control_type === 'existing' || !b.control_type)
      );
      const initialPrevPfdProduct = initialPrevIPLs.reduce((prod, b) => prod * (b.pfd ?? 1), 1.0);
      const initialMitigatedFrequency = ieFrequency * initialPrevPfdProduct;

      const initialMitgIPLs = path.barriers.filter(b => 
        b.barrier_role === 'mitigative' && 
        b.is_ipl && 
        b.is_effective && 
        b.is_independent && 
        b.pfd !== null &&
        (b.control_type === 'existing' || !b.control_type)
      );
      const initialMitgPfdProduct = initialMitgIPLs.reduce((prod, b) => prod * (b.pfd ?? 1), 1.0);
      const initialFrequency = initialMitigatedFrequency * initialMitgPfdProduct * modifierProduct;

      // ==========================================
      // 2. 殘餘風險計算 (包含 existing + new 控制措施)
      // ==========================================
      const residualPrevIPLs = path.barriers.filter(b => 
        b.barrier_role === 'preventive' && 
        b.is_ipl && 
        b.is_effective && 
        b.is_independent && 
        b.pfd !== null &&
        (b.control_type === 'existing' || b.control_type === 'new' || !b.control_type)
      );
      const residualPrevPfdProduct = residualPrevIPLs.reduce((prod, b) => prod * (b.pfd ?? 1), 1.0);
      const residualMitigatedFrequency = ieFrequency * residualPrevPfdProduct;

      const residualMitgIPLs = path.barriers.filter(b => 
        b.barrier_role === 'mitigative' && 
        b.is_ipl && 
        b.is_effective && 
        b.is_independent && 
        b.pfd !== null &&
        (b.control_type === 'existing' || b.control_type === 'new' || !b.control_type)
      );
      const residualMitgPfdProduct = residualMitgIPLs.reduce((prod, b) => prod * (b.pfd ?? 1), 1.0);
      const residualFrequency = residualMitigatedFrequency * residualMitgPfdProduct * modifierProduct;

      // 取得後果資訊與目標頻率 TMEL
      const consequenceNode = get().nodes.find(n => n.id === path.consequence_node_id);
      const consequenceEntityData = consequenceNode?.data?.entityData || {};
      
      // 取得嚴重度與安全後果類別 (同時相容舊有資料與自動映射)
      const severityLevel = consequenceEntityData.semi_quant_severity || 3;
      const category = consequenceEntityData.consequence_category || 
        (severityLevel === 1 ? 'none' : 
         severityLevel === 2 ? 'minor_injury' : 
         severityLevel === 3 ? 'property_damage' : 
         severityLevel === 4 ? 'serious_injury' : 'fatality');

      let tmel: number | null = null;
      if (category === 'fatality') tmel = riskCriteria.tmel_fatality;
      else if (category === 'serious_injury') tmel = riskCriteria.tmel_serious_injury;
      else if (category === 'minor_injury') tmel = riskCriteria.tmel_minor_injury;
      else if (category === 'property_damage') tmel = riskCriteria.tmel_property_damage;
      else if (category === 'none') tmel = null; // 虛驚無安全目標頻率限制

      // 只有在非 'none' 且 tmel 依然為空時，才做 fallback 限制
      if (tmel === null && category !== 'none') {
        tmel = riskCriteria.tmel_fatality || 1e-4;
      }

      // 安全合規判定 (無安全目標頻率限制時恆為合規)
      const meetsCriteriaInitial = tmel !== null ? initialFrequency <= tmel : true;
      const meetsCriteria = tmel !== null ? residualFrequency <= tmel : true;
      const riskGap = tmel !== null ? residualFrequency / tmel : null;
      const requiredAdditionalRrf = tmel !== null && residualFrequency > tmel ? residualFrequency / tmel : 0;

      // 計算可能性等級
      const initialLikelihoodLevel = frequencyToLikelihoodLevel(initialFrequency);
      const residualLikelihoodLevel = frequencyToLikelihoodLevel(residualFrequency);

      const matrix = riskCriteria.risk_matrix_config.acceptability_matrix;
      let initialAcceptability: any = 'R5';
      let residualAcceptability: any = 'R5';
      try {
        initialAcceptability = matrix[severityLevel - 1][initialLikelihoodLevel - 1] || 'R5';
        residualAcceptability = matrix[severityLevel - 1][residualLikelihoodLevel - 1] || 'R5';
      } catch (err) {
        console.error("Matrix index out of bound", err);
      }

      const initialSemiQuantRiskScore = {
        severity_level: severityLevel as any,
        likelihood_level: initialLikelihoodLevel as any,
        acceptability: initialAcceptability
      };

      const semiQuantRiskScore = {
        severity_level: severityLevel as any,
        likelihood_level: residualLikelihoodLevel as any,
        acceptability: residualAcceptability
      };

      const iplCount = residualPrevIPLs.length + residualMitgIPLs.length;

      const calculationResult = {
        calculated_at: Date.now(),
        mitigated_event_frequency: residualMitigatedFrequency,
        consequence_frequency: residualFrequency, // 原本的殘餘後果頻率
        conditional_modified_frequency: residualFrequency,
        
        initial_frequency: initialFrequency,
        residual_frequency: residualFrequency,
        
        tmel: tmel,
        meets_criteria: meetsCriteria,
        meets_criteria_initial: meetsCriteriaInitial,
        risk_gap: riskGap,
        required_additional_rrf: requiredAdditionalRrf,
        
        semi_quant_risk_score: semiQuantRiskScore, // 殘餘分數
        initial_semi_quant_risk_score: initialSemiQuantRiskScore, // 初始分數
        
        ipl_count: iplCount,
        calculation_mode: path.initiating_event.input_mode,
        formula_snapshot: `F_consequence = F_IE (${ieFrequency.toExponential(2)}) * PB_PFD (${residualPrevPfdProduct.toExponential(2)}) * MB_PFD (${residualMitgPfdProduct.toExponential(2)}) * CM (${modifierProduct.toExponential(2)})`,
        initial_formula_snapshot: `F_consequence = F_IE (${ieFrequency.toExponential(2)}) * PB_PFD (${initialPrevPfdProduct.toExponential(2)}) * MB_PFD (${initialMitgPfdProduct.toExponential(2)}) * CM (${modifierProduct.toExponential(2)})`
      };

      return {
        ...path,
        calculation_result: calculationResult,
        updated_at: Date.now()
      };
    });

    set({
      analysisConfig: {
        ...current,
        scenarioPaths: updatedPaths,
        updated_at: Date.now()
      }
    });
    get().saveData();
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleLopaEnabled: () => {
    const activeId = get().activeProjectId;
    if (!activeId) return;

    const nextVal = !get().isLopaEnabled;
    if (nextVal) {
      let config = get().analysisConfig;
      if (!config) {
        config = {
          id: uuidv4(),
          version: '0.1.0',
          created_at: Date.now(),
          updated_at: Date.now(),
          riskCriteria: defaultRiskCriteria(),
          scenarioPaths: []
        };
      }
      set({ isLopaEnabled: true, analysisConfig: config });
      get().syncScenarioPaths();
      get().calculateLopa();
    } else {
      set({ isLopaEnabled: false, activeTab: 'canvas' });
    }
    get().saveData();
  }
}));
