import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { useChatSession } from '../../context/ChatSessionContext';
import { cn } from '../../lib/utils';

export default function AskAiPage() {
  const { messages, isLoading, sendMessage } = useChatSession();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Sparkles size={16} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground">Ask AI</h1>
          <p className="text-xs text-muted-foreground">Powered by Gemini · Your organisation data only</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn('flex gap-3 items-start', msg.role === 'user' && 'flex-row-reverse')}>
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5',
                  msg.role === 'bot'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground border border-border',
                )}
              >
                {msg.role === 'bot' ? 'AI' : 'Me'}
              </div>
              <div
                className={cn(
                  'max-w-[76%] px-4 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap',
                  msg.role === 'bot'
                    ? 'bg-card border border-border text-foreground rounded-tl-sm'
                    : 'bg-primary text-primary-foreground rounded-tr-sm',
                )}
              >
                {msg.text}
                {msg.streaming && (
                  <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                AI
              </div>
              <div className="bg-card border border-border rounded-xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-card border border-border rounded-xl px-4 py-2.5 focus-within:border-primary transition-colors">
            <textarea
              ref={textareaRef}
              className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground max-h-32 leading-relaxed"
              placeholder="Ask anything about your business…"
              rows={1}
              value={input}
              onChange={(ev) => setInput(ev.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity hover:opacity-90"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1.5">
            Read-only · Data scoped to your organisation
          </p>
        </div>
      </div>
    </div>
  );
}
