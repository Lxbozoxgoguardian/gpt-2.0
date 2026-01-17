
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

const STORAGE_KEY = 'coding_bot_projects_v1';

const App: React.FC = () => {
  const saveToLocalStorage = (allProjects: Project[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allProjects));
    } catch (e) {
      console.error("Storage sync failed", e);
    }
  };

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
        console.error("Load failed", e);
      }
    }
    return [{
      id: 'bot-init-' + Math.random().toString(36).substr(2, 4),
      name: 'Untitled Code',
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = projects.find(p => p.id === activeProjectId);
    if (current) {
      setMessages(current.messages);
      setFiles(current.files);
      setSelectedFileId(null);
      geminiService.resetSession();
    }
  }, [activeProjectId]);

  useEffect(() => {
    const activeP = projects.find(p => p.id === activeProjectId);
    if (!activeP) return;

    const changed = 
      JSON.stringify(activeP.files) !== JSON.stringify(files) || 
      JSON.stringify(activeP.messages) !== JSON.stringify(messages);

    if (changed) {
      const updated = projects.map(p => {
        if (p.id === activeProjectId) {
          return { ...p, files, messages, lastModified: Date.now() };
        }
        return p;
      }).sort((a, b) => b.lastModified - a.lastModified);

      setProjects(updated);
      saveToLocalStorage(updated);
    }
  }, [files, messages, activeProjectId]);

  const handleSend = async (content: string) => {
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
        
        // Parse and filter files for .html, .js, .py only
        const fileRegex = /FILE:\s*([^\n]+)\n\s*```(\w+)?\n([\s\S]*?)```/g;
        let match;
        const newFiles = [...files];
        let filesUpdated = false;

        while ((match = fileRegex.exec(accumulated)) !== null) {
          const path = match[1].trim();
          const ext = path.toLowerCase().slice(path.lastIndexOf('.'));
          if (['.html', '.js', '.py'].includes(ext)) {
            const content = match[3];
            const language = match[2] || (ext === '.py' ? 'python' : ext.slice(1));
            const existingIndex = newFiles.findIndex(f => f.path === path);
            if (existingIndex >= 0) {
              newFiles[existingIndex] = { ...newFiles[existingIndex], content, language };
            } else {
              newFiles.push({ id: 'file-' + Math.random().toString(36).substr(2, 9), path, content, language });
            }
            filesUpdated = true;
          }
        }
        if (filesUpdated) setFiles(newFiles);
      }
    } catch (error) {
      setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, content: "⚠️ Error: Connection failed. Verify your environment API Key." } : msg));
    } finally {
      setIsLoading(false);
    }
  };

  const editingFile = useMemo(() => {
    const selected = files.find(f => f.id === selectedFileId);
    if (selected) return selected;
    return files.find(f => f.path === 'index.html') || files[0] || null;
  }, [files, selectedFileId]);

  const previewFile = useMemo(() => {
    return files.find(f => f.path === 'index.html') || files.find(f => f.path.endsWith('.html')) || null;
  }, [files]);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <header className="h-14 flex items-center justify-between px-4 bg-slate-900 border-b border-slate-800 z-50 shrink-0 shadow-lg">
        <div className="flex items-center gap-4 min-w-[340px]">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-all">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="h-6 w-px bg-slate-800 mx-1" />

          <div className="relative">
            <button onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)} className="flex items-center gap-3 px-3 py-1.5 hover:bg-slate-800 rounded-lg transition-all group max-w-[280px]">
              <div className="w-6 h-6 bg-blue-600/20 rounded flex items-center justify-center">
                <FolderKanban size={14} className="text-blue-500" />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Bot Project</span>
                <span className="text-xs font-semibold text-slate-300 truncate w-full">{activeProject.name}</span>
              </div>
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProjectMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProjectMenuOpen(false)} />
                <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
                  <div className="p-2 border-b border-slate-800">
                    <button onClick={() => {
                      const newId = 'proj-' + Math.random().toString(36).substr(2, 9);
                      const newP = { id: newId, name: 'New Code Project', files: [], messages: [], lastModified: Date.now() };
                      setProjects([newP, ...projects]);
                      setActiveProjectId(newId);
                      setIsProjectMenuOpen(false);
                    }} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                      <Plus size={16} /> New Chat
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto py-2">
                    {projects.map(p => (
                      <div key={p.id} onClick={() => { setActiveProjectId(p.id); setIsProjectMenuOpen(false); }} className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer ${p.id === activeProjectId ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                        <span className="text-xs font-medium truncate flex-1">{p.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); setProjects(projects.filter(x => x.id !== p.id)); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400"><Trash2 size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

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
        <aside className={`transition-all duration-300 ease-in-out ${isSidebarOpen && !isZenMode ? 'w-64' : 'w-0'} overflow-hidden bg-slate-900/50`}>
          <FileExplorer 
            files={files}
            selectedFileId={selectedFileId}
            onSelect={setSelectedFileId}
            onDelete={(id) => setFiles(f => f.filter(x => x.id !== id))}
            onCreate={(path) => {
              const nf = { id: 'file-' + Math.random().toString(36).substr(2, 9), path, content: '', language: path.split('.').pop() || 'plaintext' };
              setFiles([...files, nf]);
              setSelectedFileId(nf.id);
            }}
            onRename={(id, path) => setFiles(prev => prev.map(f => f.id === id ? { ...f, path, language: path.split('.').pop() || 'plaintext' } : f))}
          />
        </aside>

        <div className="flex-1 flex overflow-hidden">
          <section className={`transition-all duration-300 ease-in-out ${isZenMode ? 'w-0 opacity-0' : 'flex-[2] min-w-[320px]'} flex flex-col bg-slate-900 border-r border-slate-800`}>
            <main className="flex-1 overflow-y-auto pb-40">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <Sparkles size={40} className="text-blue-500 mb-6 opacity-20 animate-pulse" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Coding Chat Bot</h2>
                  <p className="text-[11px] max-w-[200px] leading-relaxed italic">Only .html, .js, and .py allowed. Ask me to build something!</p>
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
