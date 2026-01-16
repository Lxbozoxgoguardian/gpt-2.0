
import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent pt-12 pb-8 px-4">
      <div className="max-w-4xl mx-auto relative group">
        <form 
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl focus-within:border-blue-500/50 transition-all p-2 pr-3"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about code, architecture, or debugging..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 resize-none py-3 px-4 max-h-[200px] text-sm md:text-base scrollbar-hide"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
              !input.trim() || isLoading 
                ? 'bg-slate-700 text-slate-500' 
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowUp size={20} />
            )}
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-500 mt-3 font-medium uppercase tracking-widest">
          Powered by Gemini 3 Pro • Context-aware Software Engineering AI
        </p>
      </div>
    </div>
  );
};

export default ChatInput;
