import React, { useEffect } from 'react';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import BowtieEditor from './components/BowtieEditor';
import PropertiesPanel from './components/PropertiesPanel';
import Dashboard from './components/Dashboard';
import LopaTable from './components/LopaTable';
import RiskMatrixDashboard from './components/RiskMatrixDashboard';
import { useStore } from './store/useStore';
import { ReactFlowProvider } from '@xyflow/react';
import { Toaster } from 'react-hot-toast';

/** 單一面板出錯時只顯示錯誤訊息，不讓整個 app 白屏 */
class PanelErrorBoundary extends React.Component<{ name: string; children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`[${this.props.name}]`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="m-4 p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300">
          <p className="font-semibold">{this.props.name}發生錯誤，資料已保留。</p>
          <p className="mt-1 font-mono text-xs break-all">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-3 px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 font-medium"
          >
            重新載入此區塊
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const { loadData, isLoading, activeProjectId, isSidebarOpen, isPropertiesPanelOpen, activeTab, isLopaEnabled } = useStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div role="status" className="w-screen h-dvh flex items-center justify-center bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-gray-400">
        正在載入工作區…
      </div>
    );
  }

  const renderMainContent = () => {
    if (!isLopaEnabled || activeTab === 'canvas') {
      return (
        <div className="flex flex-row flex-1 min-h-0">
          {isSidebarOpen && <PanelErrorBoundary name="左側面板"><Sidebar /></PanelErrorBoundary>}
          <main className="flex-1 min-w-0 h-full relative">
            <PanelErrorBoundary name="畫布"><BowtieEditor /></PanelErrorBoundary>
          </main>
          {isPropertiesPanelOpen && <PanelErrorBoundary name="屬性面板"><PropertiesPanel /></PanelErrorBoundary>}
        </div>
      );
    }

    return (
      <main className="flex-1 min-h-0 overflow-auto bg-gray-50 dark:bg-slate-950">
        <PanelErrorBoundary name={activeTab === 'lopa_table' ? 'LOPA 分析報表' : '風險矩陣'}>
          {activeTab === 'lopa_table' ? <LopaTable /> : <RiskMatrixDashboard />}
        </PanelErrorBoundary>
      </main>
    );
  };

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-dvh w-screen bg-gray-100 dark:bg-slate-900 overflow-hidden">
        <Toaster position="bottom-center" />
        <Topbar />
        {activeProjectId ? renderMainContent() : (
          <PanelErrorBoundary name="專案總覽"><Dashboard /></PanelErrorBoundary>
        )}
      </div>
    </ReactFlowProvider>
  );
}

export default App;
