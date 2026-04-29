import { useState } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { FolderOpen, Plus, Trash2 } from 'lucide-react';

const Dashboard = () => {
  const { projects, createProject, openProject, deleteProject } = useStore();
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName('');
    }
  };

  return (
    <div className="w-full h-full bg-gray-50 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">My Bowtie Projects</h2>
        
        <form onSubmit={handleCreate} className="mb-10 bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex gap-4">
          <input 
            type="text" 
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="New Project Name..." 
            className="flex-grow px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium flex items-center gap-2 transition-colors">
            <Plus size={18} /> Create Project
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group relative">
              <div className="p-6 cursor-pointer" onClick={() => openProject(project.id)}>
                <div className="flex items-center gap-3 mb-3 text-blue-600">
                  <FolderOpen size={24} />
                  <h3 className="font-bold text-lg text-gray-800 truncate">{project.name}</h3>
                </div>
                <div className="text-sm text-gray-500 mb-1">
                  Nodes: {project.nodes.length} | Edges: {project.edges.length}
                </div>
                <div className="text-xs text-gray-400">
                  Last updated: {format(project.last_modified, 'PP pp')}
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Project"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              No projects yet. Create your first Bowtie model above!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
