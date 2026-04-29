import { useEffect } from 'react';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import BowtieEditor from './components/BowtieEditor';
import PropertiesPanel from './components/PropertiesPanel';
import Dashboard from './components/Dashboard';
import { useStore } from './store/useStore';
import { ReactFlowProvider } from '@xyflow/react';
import { Toaster } from 'react-hot-toast';

function App() {
  const { loadData, isLoading, activeProjectId, isSidebarOpen, isPropertiesPanelOpen } = useStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return <div className="w-screen h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading your workspace...</div>;
  }

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen bg-gray-100 overflow-hidden">
        <Toaster position="bottom-right" />
        <Topbar />
        {activeProjectId ? (
          <div className="flex flex-row flex-grow h-[calc(100vh-56px)]">
            {isSidebarOpen && <Sidebar />}
            <main className="flex-grow h-full relative">
              <BowtieEditor />
            </main>
            {isPropertiesPanelOpen && <PropertiesPanel />}
          </div>
        ) : (
          <Dashboard />
        )}
      </div>
    </ReactFlowProvider>
  );
}

export default App;
