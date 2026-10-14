import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { post } from '../lib/http';

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  streaming?: boolean;
}

interface ChatSessionContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  sendMessage: (question: string) => Promise<void>;
  clearMessages: () => void;
}

const ChatSessionContext = createContext<ChatSessionContextType | null>(null);

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const INITIAL_GREETING: ChatMessage = {
  role: 'bot',
  text: `${getGreeting()}! I can answer questions about your sales, inventory, customers, purchases, and expenses. What would you like to know?`,
};

const TYPEWRITER_DELAY_MS = 12;

export function ChatSessionProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const abortRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const clearMessages = useCallback(() => setMessages([INITIAL_GREETING]), []);

  const streamText = useCallback((fullText: string, messageIndex: number): void => {
    let charIndex = 0;

    const tick = () => {
      charIndex++;
      setMessages((prev) => {
        const next = [...prev];
        const msg = next[messageIndex];
        if (!msg) return prev;
        next[messageIndex] = {
          ...msg,
          text: fullText.slice(0, charIndex),
          streaming: charIndex < fullText.length,
        };
        return next;
      });

      if (charIndex < fullText.length) {
        abortRef.current = setTimeout(tick, TYPEWRITER_DELAY_MS);
      }
    };

    abortRef.current = setTimeout(tick, TYPEWRITER_DELAY_MS);
  }, []);

  const sendMessage = useCallback(
    async (question: string): Promise<void> => {
      if (abortRef.current) {
        clearTimeout(abortRef.current);
        abortRef.current = null;
      }

      let botIndex = -1;
      setMessages((prev) => {
        botIndex = prev.length + 1;
        return [...prev, { role: 'user', text: question }];
      });
      setIsLoading(true);

      try {
        const result = await post<{ answer: string; sources: string[] }>('/api/v1/chatbot/ask', { question });

        setMessages((prev) => {
          botIndex = prev.length;
          return [...prev, { role: 'bot', text: '', streaming: true }];
        });
        setIsLoading(false);

        streamText(result.answer, botIndex);
      } catch {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          { role: 'bot', text: 'Something went wrong. Please try again.' },
        ]);
      }
    },
    [streamText],
  );

  return (
    <ChatSessionContext.Provider
      value={{ messages, isLoading, isDrawerOpen, openDrawer, closeDrawer, sendMessage, clearMessages }}
    >
      {children}
    </ChatSessionContext.Provider>
  );
}

export function useChatSession(): ChatSessionContextType {
  const ctx = useContext(ChatSessionContext);
  if (!ctx) throw new Error('useChatSession must be used within ChatSessionProvider');
  return ctx;
}
