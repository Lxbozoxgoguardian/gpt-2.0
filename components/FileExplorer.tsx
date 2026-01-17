
import React, { useState } from 'react';
import { FileCode, Plus, Trash2, Edit3, AlertCircle } from 'lucide-react';
import { ProjectFile } from '../types.ts';

interface FileExplorerProps {
  files: ProjectFile[];
  selectedFileId: string | null;
  onSelect: (id: string | null) => void;
  onRename: (id: string, newPath: string) => void;
  onDelete: (id: string) => void;
  onCreate: (path: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, selectedFileId, onSelect, onRename, onDelete, onCreate 
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const allowedExtensions = ['.html', '.js', '.py'];

  const validateFileName = (name: string) => {
    const ext = name.toLowerCase().slice(name.lastIndexOf('.'));
    if (!allowedExtensions.includes(ext)) {
      setError(`Only ${allowedExtensions.join(', ')} allowed.`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName && validateFileName(newItemName)) {
      onCreate(newItemName);
      setNewItemName('');
      setIsCreating(false);
    }
  };

  const handleRename = (id: string) => {
    if (tempName.trim() && validateFileName(tempName)) {
      onRename(id, tempName.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-64 select-none">
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Project Files</h3>
        <button 
          onClick={() => { setIsCreating(true); setError(null); }}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {isCreating && (
          <div className="px-4 mb-4">
            <form onSubmit={handleCreate}>
              <input
                autoFocus
                className={`w-full bg-slate-800 border ${error ? 'border-red-500' : 'border-blue-500'} rounded px-2 py-1 text-sm text-slate-200 focus:outline-none`}
                placeholder="index.html"
                value={newItemName}
                onChange={(e) => { setNewItemName(e.target.value); setError(null); }}
                onBlur={() => !newItemName && setIsCreating(false)}
              />
            </form>
            {error && (
              <p className="text-[9px] text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle size={10} /> {error}
              </p>
            )}
          </div>
        )}

        {files.length === 0 && !isCreating && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-slate-600 italic">No .html, .js, or .py files yet.</p>
          </div>
        )}

        {files.map(file => (
          <div 
            key={file.id}
            onClick={() => onSelect(selectedFileId === file.id ? null : file.id)}
            className={`group flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-all ${
              selectedFileId === file.id ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-l-2 border-transparent'
            }`}
          >
            <FileCode size={14} className={selectedFileId === file.id ? 'text-blue-400' : 'text-slate-500'} />
            
            {editingId === file.id ? (
              <input
                autoFocus
                className="flex-1 min-w-0 bg-slate-800 border border-blue-500 rounded px-1 text-sm text-slate-200 focus:outline-none"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={() => handleRename(file.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(file.id)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-xs truncate font-mono flex-1">{file.path}</span>
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); setEditingId(file.id); setTempName(file.path); }}
                className="p-1 hover:text-blue-400"
              >
                <Edit3 size={12} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
                className="p-1 hover:text-red-400"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;
