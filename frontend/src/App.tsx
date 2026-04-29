import { useEffect } from 'react';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import BowtieEditor from './components/BowtieEditor';
import PropertiesPanel from './components/PropertiesPanel';
import Dashboard from './components/Dashboard';
import { useStore } from './store/useStore';

function App() {
  const { loadData, isLoading, activeProjectId } = useStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return <div className="w-screen h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading your workspace...</div>;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100 overflow-hidden">
      <Topbar />
      {activeProjectId ? (
        <div className="flex flex-row flex-grow h-[calc(100vh-56px)]">
          <Sidebar />
          <main className="flex-grow h-full relative">
            <BowtieEditor />
          </main>
          <PropertiesPanel />
        </div>
      ) : (
        <Dashboard />
      )}
    </div>
  );
}

export default App;
