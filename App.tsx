
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Trash2, Github, Terminal as TerminalIcon, 
  Sparkles, Menu, X, Code, Eye, Maximize2, Minimize2,
  ChevronDown, FolderKanban, Plus, Check, Edit3
} from 'lucide-react';
import ChatMessage from './components/ChatMessage.tsx';
import ChatInput from './components/ChatInput.tsx';
import FileExplorer from './components/FileExplorer.tsx';
import WorkspaceEditor from './components/WorkspaceEditor.tsx';
import { geminiService } from './services/geminiService.ts';
import { Message, ProjectFile, Project } from './types.ts';

const STORAGE_KEY = 'devmind_projects_v1';

const App: React.FC = () => {
  // --- INITIALIZATION ---
  const loadProjects = (): Project[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((p: any) => ({
          ...p,
          messages: p.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        }));
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }
    return [{
      id: 'default-id-' + Math.random().toString(36).substr(2, 4),
      name: 'Untitled Project',
      files: [],
      messages: [],
      lastModified: Date.now()
    }];
  };

  const [projects, setProjects] = useState<Project[]>(loadProjects());
  const [activeProjectId, setActiveProjectId] = useState<string>(projects[0].id);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [tempProjectName, setTempProjectName] = useState('');

  // --- WORKSPACE STATE (The current active view) ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- PROJECT SWITCHING ---
  useEffect(() => {
    const project = projects.find(p => p.id === activeProjectId);
    if (project) {
      setMessages(project.messages);
      setFiles(project.files);
      setSelectedFileId(null);
      geminiService.resetSession();
    }
  }, [activeProjectId]);

  // --- AUTO-SAVE (Sync current workspace state back to projects array & LocalStorage) ---
  useEffect(() => {
    const activeP = projects.find(p => p.id === activeProjectId);
    if (!activeP) return;

    // Only save if data actually changed
    if (JSON.stringify(activeP.files) !== JSON.stringify(files) || 
        JSON.stringify(activeP.messages) !== JSON.stringify(messages)) {
      
      const updatedProjects = projects.map(p => {
        if (p.id === activeProjectId) {
          return { ...p, files, messages, lastModified: Date.now() };
        }
        return p;
      });

      // Keep projects sorted by lastModified
      const sorted = [...updatedProjects].sort((a, b) => b.lastModified - a.lastModified);
      setProjects(sorted);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    }
  }, [files, messages, activeProjectId]);

  // --- PROJECT ACTIONS ---
  const createNewProject = () => {
    const newProject: Project = {
      id: 'proj-' + Math.random().toString(36).substr(2, 9),
      name: 'New Project',
      files: [],
      messages: [],
      lastModified: Date.now()
    };
    const newList = [newProject, ...projects];
    setProjects(newList);
    setActiveProjectId(newProject.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    setIsProjectMenuOpen(false);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let newList = projects.filter(p => p.id !== id);
    
    // If we delete the last project, create a new empty one
    if (newList.length === 0) {
      newList = [{
        id: 'default-' + Math.random().toString(36).substr(2, 4),
        name: 'Untitled Project',
        files: [],
        messages: [],
        lastModified: Date.now()
      }];
    }
    
    setProjects(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    
    if (activeProjectId === id) {
      setActiveProjectId(newList[0].id);
    }
  };

  const startRenaming = (e: React.MouseEvent, p: Project) => {
    e.stopPropagation();
    setEditingProjectId(p.id);
    setTempProjectName(p.name);
  };

  const saveProjectName = (id: string) => {
    const trimmed = tempProjectName.trim();
    if (trimmed) {
      const updated = projects.map(p => p.id === id ? { ...p, name: trimmed } : p);
      setProjects(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    setEditingProjectId(null);
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // --- DATA DERIVATION ---
  const editingFile = useMemo(() => {
    const selected = files.find(f => f.id === selectedFileId);
    if (selected) return selected;
    if (files.length === 0) return null;
    return files.find(f => f.path === 'index.html') 
           || files.find(f => f.path.startsWith('index.'))
           || files[0];
  }, [files, selectedFileId]);

  const previewFile = useMemo(() => {
    if (files.length === 0) return null;
    return files.find(f => f.path === 'index.html') 
           || files.find(f => f.path.endsWith('.html'))
           || files.find(f => f.path.endsWith('.svg') || f.path.endsWith('.md'))
           || editingFile;
  }, [files, editingFile]);

  // --- MESSAGE STREAMING ---
  const parseFilesFromResponse = (text: string) => {
    const fileRegex = /FILE:\s*([^\n]+)\n\s*```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let updated = false;
    const newFiles = [...files];

    while ((match = fileRegex.exec(text)) !== null) {
      const path = match[1].trim();
      const language = match[2] || 'plaintext';
      const content = match[3];

      const existingIndex = newFiles.findIndex(f => f.path === path);
      if (existingIndex >= 0) {
        newFiles[existingIndex] = { ...newFiles[existingIndex], content, language };
      } else {
        newFiles.push({
          id: 'file-' + Math.random().toString(36).substr(2, 9),
          path, content, language
        });
      }
      updated = true;
    }

    if (updated) setFiles(newFiles);
  };

  const handleSend = async (content: string) => {
    // If it's a first message in an untitled project, rename it based on prompt
    const currentP = projects.find(p => p.id === activeProjectId);
    if (messages.length === 0 && currentP?.name === 'New Project') {
      const autoName = content.slice(0, 24).trim() + (content.length > 24 ? '...' : '');
      setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, name: autoName } : p));
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      let accumulated = '';
      const stream = geminiService.streamMessage(content, files);
      for await (const chunk of stream) {
        accumulated += chunk;
        setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, content: accumulated } : msg));
        parseFilesFromResponse(accumulated);
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, content: "⚠️ Error: Connection failed. Verify your environment API Key." } : msg));
    } finally {
      setIsLoading(false);
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <header className="h-14 flex items-center justify-between px-4 bg-slate-900 border-b border-slate-800 z-50 shrink-0 shadow-lg">
        <div className="flex items-center gap-4 min-w-[340px]">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-all">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="h-6 w-px bg-slate-800 mx-1" />

          {/* Project Selector Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
              className="flex items-center gap-3 px-3 py-1.5 hover:bg-slate-800 rounded-lg transition-all group max-w-[280px]"
            >
              <div className="w-6 h-6 bg-blue-600/20 rounded flex items-center justify-center">
                <FolderKanban size={14} className="text-blue-500" />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Active Workspace</span>
                <span className="text-xs font-semibold text-slate-300 truncate w-full">{activeProject.name}</span>
              </div>
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProjectMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProjectMenuOpen(false)} />
                <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
                  <div className="p-2 border-b border-slate-800">
                    <button onClick={createNewProject} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                      <Plus size={16} /> New Project
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto py-2">
                    {projects.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => { if (!editingProjectId) { setActiveProjectId(p.id); setIsProjectMenuOpen(false); } }}
                        className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer ${
                          p.id === activeProjectId ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FolderKanban size={14} className={p.id === activeProjectId ? 'text-blue-400' : 'text-slate-600'} />
                          {editingProjectId === p.id ? (
                            <input 
                              autoFocus
                              className="bg-slate-800 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white w-full focus:outline-none"
                              value={tempProjectName}
                              onChange={(e) => setTempProjectName(e.target.value)}
                              onBlur={() => saveProjectName(p.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveProjectName(p.id);
                                if (e.key === 'Escape') setEditingProjectId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-medium truncate">{p.name}</span>
                              <span className="text-[8px] text-slate-600">MODIFIED: {new Date(p.lastModified).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 ml-2">
                          {!editingProjectId && (
                            <>
                              <button onClick={(e) => startRenaming(e, p)} className="p-1.5 hover:text-blue-400 transition-colors"><Edit3 size={12} /></button>
                              <button onClick={(e) => deleteProject(p.id, e)} className="p-1.5 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Editor/Preview Switch */}
        <div className="flex-1 flex justify-center h-full items-center">
          <div className="flex items-center bg-slate-950/80 rounded-xl p-1 border border-slate-800 h-10 w-full max-w-[280px]">
            <button onClick={() => setActiveTab('editor')} className={`flex-1 flex items-center justify-center gap-2 h-full text-[10px] font-bold uppercase rounded-lg transition-all ${activeTab === 'editor' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              <Code size={13} /> Editor
            </button>
            <button onClick={() => setActiveTab('preview')} className={`flex-1 flex items-center justify-center gap-2 h-full text-[10px] font-bold uppercase rounded-lg transition-all ${activeTab === 'preview' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              <Eye size={13} /> Preview
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-[340px] justify-end">
          <button onClick={() => setIsZenMode(!isZenMode)} className={`p-2 transition-colors ${isZenMode ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>
            {isZenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <div className="h-6 w-px bg-slate-800 mx-1" />
          <a href="https://github.com" target="_blank" rel="noreferrer"><Github size={18} className="text-slate-500 hover:text-white transition-colors" /></a>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className={`transition-all duration-300 ease-in-out ${isSidebarOpen && !isZenMode ? 'w-64' : 'w-0'} overflow-hidden border-r border-slate-800 bg-slate-900/50`}>
          <FileExplorer 
            files={files}
            selectedFileId={selectedFileId}
            onSelect={setSelectedFileId}
            onDelete={(id) => setFiles(f => f.filter(x => x.id !== id))}
            onCreate={(path) => {
              const nf: ProjectFile = { id: 'file-' + Math.random().toString(36).substr(2, 9), path, content: '', language: path.split('.').pop() || 'plaintext' };
              setFiles([...files, nf]);
              setSelectedFileId(nf.id);
            }}
            onRename={(id, path) => setFiles(prev => prev.map(f => f.id === id ? { ...f, path, language: path.split('.').pop() || 'plaintext' } : f))}
          />
        </aside>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat Panel */}
          <section className={`transition-all duration-300 ease-in-out ${isZenMode ? 'w-0 opacity-0 pointer-events-none' : 'flex-[2] min-w-[320px]'} flex flex-col bg-slate-900 border-r border-slate-800 relative shadow-inner`}>
            <main className="flex-1 overflow-y-auto pb-40 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <Sparkles size={40} className="text-blue-500 mb-6 opacity-20 animate-pulse" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">DevMind Architect</h2>
                  <p className="text-[11px] max-w-[200px] leading-relaxed italic">Start a project. Your work is safely stored in your browser's local storage.</p>
                </div>
              ) : (
                <div className="w-full">
                  {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              )}
            </main>
            <ChatInput onSend={handleSend} isLoading={isLoading} />
          </section>

          {/* Main Workspace (Editor/Preview) */}
          <section className="flex-[8] flex flex-col min-w-0 bg-slate-950">
            <WorkspaceEditor 
              editingFile={editingFile} 
              previewFile={previewFile}
              allFiles={files}
              activeTab={activeTab}
              onUpdate={(id, content) => setFiles(prev => prev.map(f => f.id === id ? { ...f, content } : f))} 
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;
