
import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shadow-xl group">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-slate-300 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-blue-400" />
          <span>{language || 'plaintext'}</span>
        </div>
        <button 
          onClick={copyToClipboard}
          className="hover:text-white transition-colors flex items-center gap-1"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="code-font text-sm leading-relaxed text-slate-100">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
