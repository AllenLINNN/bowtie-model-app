import React, { useRef } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { Download, Upload, Image, FileText, WifiOff, ArrowLeft, Edit2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

const Topbar = () => {
  const { exportJSON, importJSON, activeProjectId, projects, openProject, updateProjectName } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentProject = projects.find(p => p.id === activeProjectId);
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editNameValue, setEditNameValue] = React.useState('');

  const handleEditNameClick = () => {
    if (currentProject) {
      setEditNameValue(currentProject.name);
      setIsEditingName(true);
    }
  };

  const handleNameSave = () => {
    if (editNameValue.trim()) {
      updateProjectName(editNameValue.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importJSON(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const exportPNG = async () => {
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (!element) return;
    const dataUrl = await toPng(element, { backgroundColor: '#ffffff' });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `bowtie-diagram-${new Date().getTime()}.png`;
    a.click();
  };

  const exportPDF = async () => {
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (!element) return;
    const imgData = await toPng(element, { backgroundColor: '#ffffff' });
    
    const pdf = new jsPDF({
      orientation: element.offsetWidth > element.offsetHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [element.offsetWidth, element.offsetHeight]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, element.offsetWidth, element.offsetHeight);
    pdf.save(`bowtie-diagram-${new Date().getTime()}.pdf`);
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0 shadow-sm z-10">
      <div className="flex items-center gap-4">
        {activeProjectId ? (
          <button 
            onClick={() => openProject(null)} 
            className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors mr-2"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
        ) : null}
        
        {isEditingName ? (
          <input 
            autoFocus
            type="text" 
            value={editNameValue} 
            onChange={(e) => setEditNameValue(e.target.value)} 
            onKeyDown={handleNameKeyDown}
            onBlur={handleNameSave}
            className="border border-blue-400 rounded px-2 py-1 text-xl font-bold text-gray-800 focus:outline-none w-64"
          />
        ) : (
          <div className="flex items-center gap-2 group cursor-pointer" onClick={handleEditNameClick}>
            <h1 className="font-bold text-xl text-gray-800">
              {currentProject ? currentProject.name : 'Bowtie App Workspace'}
            </h1>
            {currentProject && (
              <Edit2 size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
          <WifiOff size={14} />
          Local Offline Mode
        </div>
      </div>

      <div className="flex items-center gap-6">
        {currentProject && (
          <div className="text-xs text-gray-500 hidden md:block">
            Last saved: {format(currentProject.last_modified, 'HH:mm:ss')}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
          />
          <button onClick={handleImportClick} className="btn-action" title="Import JSON">
            <Download size={16} /> <span className="text-sm">Import</span>
          </button>
          
          <button onClick={exportJSON} className="btn-action" title="Export JSON">
            <Upload size={16} /> <span className="text-sm">Export Workspace</span>
          </button>
          
          {activeProjectId && (
            <>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button onClick={exportPNG} className="btn-action" title="Export PNG">
                <Image size={16} /> <span className="text-sm">PNG</span>
              </button>
              <button onClick={exportPDF} className="btn-action" title="Export PDF">
                <FileText size={16} /> <span className="text-sm">PDF</span>
              </button>
            </>
          )}
        </div>
      </div>
      
      <style>{`
        .btn-action {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 6px;
          color: #4b5563;
          background-color: #f3f4f6;
          transition: all 0.2s;
        }
        .btn-action:hover {
          background-color: #e5e7eb;
          color: #111827;
        }
      `}</style>
    </header>
  );
};

export default Topbar;
