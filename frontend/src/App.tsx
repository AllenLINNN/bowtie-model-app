import { useEffect } from 'react';
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

function App() {
  const { loadData, isLoading, activeProjectId, isSidebarOpen, isPropertiesPanelOpen, activeTab, isLopaEnabled } = useStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return <div className="w-screen h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-gray-400">Loading your workspace...</div>;
  }

  // 決定主視圖渲染
  const renderMainContent = () => {
    if (!isLopaEnabled || activeTab === 'canvas') {
      return (
        <div className="flex flex-row flex-grow h-[calc(100vh-56px)]">
          {isSidebarOpen && <Sidebar />}
          <main className="flex-grow h-full relative">
            <BowtieEditor />
          </main>
          {isPropertiesPanelOpen && <PropertiesPanel />}
        </div>
      );
    }

    if (activeTab === 'lopa_table') {
      return (
        <main className="flex-grow h-[calc(100vh-56px)] overflow-auto bg-gray-50 dark:bg-slate-950">
          <LopaTable />
        </main>
      );
    }

    if (activeTab === 'risk_matrix') {
      return (
        <main className="flex-grow h-[calc(100vh-56px)] overflow-auto bg-gray-50 dark:bg-slate-950">
          <RiskMatrixDashboard />
        </main>
      );
    }

    return null;
  };

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen bg-gray-100 dark:bg-slate-900 overflow-hidden">
        <Toaster position="bottom-right" />
        <Topbar />
        {activeProjectId ? renderMainContent() : (
          <Dashboard />
        )}
      </div>
    </ReactFlowProvider>
  );
}

export default App;

