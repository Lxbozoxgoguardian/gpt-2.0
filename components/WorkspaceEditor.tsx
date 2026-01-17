
import React, { useState, useEffect, useMemo } from 'react';
import { ProjectFile } from '../types.ts';
import { 
  RotateCcw, Globe, Layout, ExternalLink, FileCode
} from 'lucide-react';

interface WorkspaceEditorProps {
  editingFile: ProjectFile | null;
  previewFile: ProjectFile | null;
  allFiles: ProjectFile[];
  activeTab: 'editor' | 'preview';
  onUpdate: (id: string, content: string) => void;
}

const WorkspaceEditor: React.FC<WorkspaceEditorProps> = ({ 
  editingFile, 
  previewFile,
  allFiles,
  activeTab,
  onUpdate 
}) => {
  const [localContent, setLocalContent] = useState('');
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (editingFile) {
      setLocalContent(editingFile.content);
    } else {
      setLocalContent('');
    }
  }, [editingFile?.id, editingFile?.content]);

  // Process HTML for preview to inject virtual styles and scripts
  const processedPreviewContent = useMemo(() => {
    if (!previewFile || !previewFile.path.endsWith('.html')) {
      return previewFile?.content || '';
    }

    let content = previewFile.content;

    // Smart Injection: Find all CSS files and inject them into the HTML head
    const cssFiles = allFiles.filter(f => f.path.endsWith('.css'));
    const styleTags = cssFiles.map(f => `<style data-filename="${f.path}">${f.content}</style>`).join('\n');
    
    if (content.includes('</head>')) {
      content = content.replace('</head>', `${styleTags}\n</head>`);
    } else {
      content = styleTags + content;
    }

    // Smart Injection: Find all JS files and inject them into the body
    const jsFiles = allFiles.filter(f => f.path.endsWith('.js') || f.path.endsWith('.ts'));
    const scriptTags = jsFiles.map(f => `<script data-filename="${f.path}">${f.content}</script>`).join('\n');

    if (content.includes('</body>')) {
      content = content.replace('</body>', `${scriptTags}\n</body>`);
    } else {
      content = content + scriptTags;
    }

    return content;
  }, [previewFile, allFiles]);

  if (!editingFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-700 p-8 text-center">
        <div className="p-6 rounded-full bg-slate-900 mb-6 shadow-xl">
          <Layout size={48} className="opacity-10" />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-600">Workspace Empty</h3>
        <p className="text-[10px] mt-2 max-w-xs text-slate-700 font-medium italic">Describe your idea to start coding.</p>
      </div>
    );
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalContent(val);
    onUpdate(editingFile.id, val);
  };

  const handleRefresh = () => setPreviewKey(prev => prev + 1);

  const isPreviewable = previewFile && (
    previewFile.path.endsWith('.html') || 
    previewFile.path.endsWith('.svg') || 
    previewFile.path.endsWith('.md')
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {activeTab === 'editor' ? (
        <div className="flex-1 flex flex-col bg-[#0d1117] relative">
          <div className="absolute top-4 right-6 z-10 opacity-30 hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-2 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
              <FileCode size={12} />
              {editingFile.path}
            </span>
          </div>
          <div className="flex h-full">
            <div className="w-12 bg-slate-900/40 text-slate-700 text-[10px] font-mono py-6 flex flex-col items-center select-none border-r border-slate-800/50">
              {Array.from({length: 60}).map((_, i) => <div key={i} className="h-[22px]">{i + 1}</div>)}
            </div>
            <textarea
              value={localContent}
              onChange={handleContentChange}
              spellCheck={false}
              className="flex-1 h-full bg-transparent text-slate-300 p-6 font-mono text-sm leading-[22px] resize-none focus:outline-none scrollbar-hide"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white">
          <div className="h-10 flex items-center gap-3 px-4 bg-slate-100 border-b border-slate-200 shrink-0">
            <div className="flex gap-1.5 mr-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            </div>
            <div className="flex-1 h-7 bg-white rounded border border-slate-300 flex items-center px-4 text-[10px] text-slate-400 font-mono truncate">
              <Globe size={10} className="mr-2 text-slate-400" />
              http://devmind-preview.local/{previewFile?.path || 'loading...'}
            </div>
            <button 
              onClick={handleRefresh} 
              className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors"
              title="Refresh Preview"
            >
              <RotateCcw size={14} />
            </button>
          </div>
          
          <div className="flex-1 relative bg-white">
            {!isPreviewable ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50 p-8 text-center">
                <ExternalLink size={32} className="mb-4 opacity-10" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-tighter text-center">Preview unavailable</p>
                <p className="text-[10px] mt-2 max-w-[240px] text-slate-400 text-center">
                  Create an index.html file to view your project in the live preview.
                </p>
              </div>
            ) : (
              <div key={previewKey} className="w-full h-full">
                {previewFile?.path.endsWith('.svg') ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: processedPreviewContent }} 
                    className="flex items-center justify-center min-h-full p-4" 
                  />
                ) : previewFile?.path.endsWith('.md') ? (
                  <div className="p-10 prose prose-slate max-w-3xl mx-auto h-full overflow-y-auto">
                     <div className="whitespace-pre-wrap font-sans text-sm text-slate-800">{processedPreviewContent}</div>
                  </div>
                ) : (
                  <iframe 
                    title="preview"
                    srcDoc={processedPreviewContent}
                    className="w-full h-full border-none bg-white"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceEditor;
