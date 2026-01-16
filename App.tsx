
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Trash2, Github, Terminal as TerminalIcon, 
  Sparkles, Menu, X, Code, Eye, Maximize2, Minimize2
} from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import FileExplorer from './components/FileExplorer';
import WorkspaceEditor from './components/WorkspaceEditor';
import { geminiService } from './services/geminiService';
import { Message, ProjectFile } from './types';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // File currently being EDITED
  const editingFile = useMemo(() => {
    const selected = files.find(f => f.id === selectedFileId);
    if (selected) return selected;
    if (files.length === 0) return null;
    
    return files.find(f => f.path === 'index.html') 
           || files.find(f => f.path.startsWith('index.'))
           || files[0];
  }, [files, selectedFileId]);

  // File currently being PREVIEWED (Always try to find an HTML file)
  const previewFile = useMemo(() => {
    if (files.length === 0) return null;
    
    // 1. Try index.html
    const indexHtml = files.find(f => f.path === 'index.html');
    if (indexHtml) return indexHtml;

    // 2. Try any other HTML file
    const anyHtml = files.find(f => f.path.endsWith('.html'));
    if (anyHtml) return anyHtml;

    // 3. Try SVG or MD
    const visual = files.find(f => f.path.endsWith('.svg') || f.path.endsWith('.md'));
    if (visual) return visual;

    // 4. Fallback to editing file
    return editingFile;
  }, [files, editingFile]);

  const parseFilesFromResponse = (text: string) => {
    const fileRegex = /FILE:\s*([^\n]+)\n\s*```(\w+)?\n([\s\S]*?)```/g;
    let match;
    const newFiles = [...files];
    let foundAny = false;

    while ((match = fileRegex.exec(text)) !== null) {
      const path = match[1].trim();
      const language = match[2] || 'plaintext';
      const content = match[3];

      const existingIndex = newFiles.findIndex(f => f.path === path);
      if (existingIndex >= 0) {
        newFiles[existingIndex] = { ...newFiles[existingIndex], content, language };
      } else {
        const newFile: ProjectFile = {
          id: Math.random().toString(36).substr(2, 9),
          path,
          content,
          language
        };
        newFiles.push(newFile);
      }
      foundAny = true;
    }

    if (foundAny) {
      setFiles(newFiles);
    }
  };

  const handleSend = async (content: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMsg]);

    try {
      let accumulatedResponse = '';
      const stream = geminiService.streamMessage(content, files);

      for await (const chunk of stream) {
        accumulatedResponse += chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMsgId 
              ? { ...msg, content: accumulatedResponse } 
              : msg
          )
        );
        parseFilesFromResponse(accumulatedResponse);
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMsgId 
            ? { ...msg, content: "⚠️ Error processing request." } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpdate = (id: string, content: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, content } : f));
  };

  const deleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (selectedFileId === id) setSelectedFileId(null);
  };

  const renameFile = (id: string, newPath: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { 
      ...f, 
      path: newPath, 
      language: newPath.split('.').pop() || 'plaintext' 
    } : f));
  };

  const createFile = (path: string) => {
    const newFile: ProjectFile = {
      id: Math.random().toString(36).substr(2, 9),
      path,
      content: '',
      language: path.split('.').pop() || 'plaintext'
    };
    setFiles(prev => [...prev, newFile]);
    setSelectedFileId(newFile.id);
  };

  const clearChat = () => {
    setMessages([]);
    setFiles([]);
    setSelectedFileId(null);
    geminiService.resetSession();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <header className="h-14 flex items-center justify-between px-4 bg-slate-900 border-b border-slate-800 z-50 shrink-0 shadow-lg">
        <div className="flex items-center gap-4 min-w-[200px]">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-all"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <TerminalIcon size={18} className="text-blue-500" />
            <h1 className="font-bold text-[10px] tracking-[0.2em] uppercase hidden lg:block text-slate-500">DevMind IDE</h1>
          </div>
        </div>

        <div className="flex-1 flex justify-center h-full items-center">
          <div className="flex items-center bg-slate-950/80 rounded-xl p-1 border border-slate-800 h-10 w-full max-w-md shadow-inner">
            <button 
              onClick={() => setActiveTab('editor')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 h-full text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'editor' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Code size={14} />
              Editor
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 h-full text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'preview' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Eye size={14} />
              Preview
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-[200px] justify-end">
          <button 
            onClick={clearChat}
            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
            title="Clear All"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={() => setIsZenMode(!isZenMode)}
            className={`p-2 transition-colors ${isZenMode ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
            title="Zen Mode"
          >
            {isZenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <div className="h-6 w-px bg-slate-800 mx-1" />
          <a href="https://github.com" target="_blank" rel="noreferrer">
            <Github size={18} className="text-slate-500 hover:text-white transition-colors" />
          </a>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen && !isZenMode ? 'w-64' : 'w-0'} overflow-hidden border-r border-slate-800 bg-slate-900/50`}>
          <FileExplorer 
            files={files}
            selectedFileId={selectedFileId}
            onSelect={setSelectedFileId}
            onDelete={deleteFile}
            onCreate={createFile}
            onRename={renameFile}
          />
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className={`transition-all duration-300 ease-in-out ${isZenMode ? 'w-0 opacity-0 pointer-events-none' : 'flex-[2] min-w-[320px]'} flex flex-col bg-slate-900 border-r border-slate-800 relative`}>
            <main className="flex-1 overflow-y-auto pb-40 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <Sparkles size={40} className="text-blue-500 mb-6 opacity-30 animate-pulse" />
                  <h2 className="text-lg font-bold mb-2">Architect Mode</h2>
                  <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">
                    Tell me what to build. I'll scaffold the files and maintain your live preview.
                  </p>
                </div>
              ) : (
                <div className="w-full">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              )}
            </main>
            <ChatInput onSend={handleSend} isLoading={isLoading} />
          </div>

          <div className="flex-[8] flex flex-col min-w-0 bg-slate-950">
            <WorkspaceEditor 
              editingFile={editingFile} 
              previewFile={previewFile}
              allFiles={files}
              activeTab={activeTab}
              onUpdate={handleFileUpdate} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
