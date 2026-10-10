import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Maximize2, X, Send, MessageCircle } from 'lucide-react';
import { useChatSession } from '../../context/ChatSessionContext';
import { cn } from '../../lib/utils';

export default function ChatDrawer() {
  const navigate = useNavigate();
  const { messages, isLoading, isDrawerOpen, openDrawer, closeDrawer, sendMessage } = useChatSession();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDrawerOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isDrawerOpen]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isLoading) return;
    setInput('');
    await sendMessage(question);
  };

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      void handleSend();
    }
  };

  const handleExpand = () => {
    closeDrawer();
    navigate('/ask-ai');
  };

  return (
    <>
      {/* Floating bot icon — shifts left when drawer is open */}
      <button
        onClick={isDrawerOpen ? closeDrawer : openDrawer}
        className={cn(
          'fixed bottom-5 z-40 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105',
          isDrawerOpen ? 'right-[356px]' : 'right-5',
        )}
        aria-label="Toggle AI assistant"
      >
        {isDrawerOpen ? <X size={18} /> : <MessageCircle size={20} />}
      </button>

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 z-30 w-[340px] bg-background border-l border-border flex flex-col shadow-2xl transition-transform duration-300',
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Drawer header */}
        <div className="h-[50px] border-b border-border flex items-center gap-2.5 px-3 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Sparkles size={14} className="text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground flex-1">Ask AI</span>
          <button
            onClick={handleExpand}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <Maximize2 size={11} />
            Expand
          </button>
          <button
            onClick={closeDrawer}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ml-1"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-3">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn('flex gap-2 items-start', msg.role === 'user' && 'flex-row-reverse')}>
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5',
                  msg.role === 'bot'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground border border-border',
                )}
              >
                {msg.role === 'bot' ? 'AI' : 'Me'}
              </div>
              <div
                className={cn(
                  'max-w-[82%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap',
                  msg.role === 'bot'
                    ? 'bg-card border border-border text-foreground rounded-tl-sm'
                    : 'bg-primary text-primary-foreground rounded-tr-sm',
                )}
              >
                {msg.text}
                {msg.streaming && (
                  <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                AI
              </div>
              <div className="bg-card border border-border rounded-xl rounded-tl-sm px-3 py-2.5 flex gap-1 items-center">
                <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-3 py-2.5 flex-shrink-0">
          <div className="flex items-end gap-2 bg-card border border-border rounded-lg px-3 py-2 focus-within:border-primary transition-colors">
            <textarea
              className="flex-1 bg-transparent resize-none outline-none text-xs text-foreground placeholder:text-muted-foreground max-h-24 leading-relaxed"
              placeholder="Ask your business anything…"
              rows={1}
              value={input}
              onChange={(ev) => setInput(ev.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || isLoading}
              className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity hover:opacity-90"
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
