
import React from 'react';
import { User, Cpu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock.tsx';
import { Message } from '../types.ts';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full py-8 ${isUser ? 'bg-slate-900' : 'bg-slate-800/50 border-y border-slate-700/30'}`}>
      <div className="max-w-4xl mx-auto w-full px-4 flex gap-6">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
          isUser ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-emerald-600 shadow-lg shadow-emerald-500/20'
        }`}>
          {isUser ? <User size={22} className="text-white" /> : <Cpu size={22} className="text-white" />}
        </div>
        
        <div className="flex-1 space-y-2 overflow-hidden">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isUser ? 'You' : 'DevMind AI'}
          </div>
          
          <div className="text-slate-200 leading-7 prose prose-invert max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({ inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <CodeBlock 
                      language={match[1]} 
                      value={String(children).replace(/\n$/, '')} 
                      {...props} 
                    />
                  ) : (
                    <code className="bg-slate-700 px-1.5 py-0.5 rounded text-blue-300 font-mono text-sm" {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc ml-6 mb-4 space-y-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal ml-6 mb-4 space-y-2">{children}</ol>,
                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-white border-b border-slate-700 pb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 text-white">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4 text-white">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 italic text-slate-400 my-4 bg-blue-500/5 py-2 rounded-r">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
