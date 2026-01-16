
import React, { useState } from 'react';
import { FileCode, Plus, Edit2, Trash2, Edit3 } from 'lucide-react';
import { ProjectFile } from '../types';

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName) {
      onCreate(newItemName);
      setNewItemName('');
      setIsCreating(false);
    }
  };

  const handleRename = (id: string) => {
    if (tempName.trim()) {
      onRename(id, tempName.trim());
    }
    setEditingId(null);
  };

  const startRename = (e: React.MouseEvent, file: ProjectFile) => {
    e.stopPropagation();
    setEditingId(file.id);
    setTempName(file.path);
  };

  const handleFileClick = (id: string) => {
    // If clicking the same file, unselect it
    if (selectedFileId === id) {
      onSelect(null);
    } else {
      onSelect(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-64 select-none">
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Explorer</h3>
        <button 
          onClick={() => setIsCreating(true)}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {isCreating && (
          <form onSubmit={handleCreate} className="px-4 mb-2">
            <input
              autoFocus
              className="w-full bg-slate-800 border border-blue-500 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none"
              placeholder="filename.ts"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onBlur={() => !newItemName && setIsCreating(false)}
            />
          </form>
        )}

        {files.length === 0 && !isCreating && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-slate-500 italic">No files yet.</p>
          </div>
        )}

        {files.map(file => (
          <div 
            key={file.id}
            onClick={() => handleFileClick(file.id)}
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
                onClick={(e) => startRename(e, file)}
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
