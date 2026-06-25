'use client';

import { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Sparkles, Send, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chatWithAI } from '@/lib/api';

interface Message {
  role: 'assistant' | 'user';
  text: string;
  timestamp: Date;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  text: "Hi! I'm your SpendNest AI. Ask me anything about your finances — income, expenses, savings, or affordability.",
  timestamp: new Date(),
};

const SUGGESTED_QUESTIONS = [
  'What is my financial health score?',
  'How much did I spend this month?',
  'What is my savings rate?',
  'How much is safe to spend?',
];

export function RedesignedAiAdvisor() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (text: string) => {
    const userText = text.trim();
    if (!userText || isLoading) return;

    // Add user message immediately
    const userMsg: Message = { role: 'user', text: userText, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const data = await chatWithAI(userText);
      const assistantMsg: Message = {
        role: 'assistant',
        text: data.reply || 'Sorry, I could not get a response. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = {
        role: 'assistant',
        text: '⚠️ Could not reach the AI advisor. Please upload your bank statement first, or check your connection.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-24 right-0 w-[380px] bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_20px_60px_rgba(37,99,235,0.15)] overflow-hidden flex flex-col"
            style={{ maxHeight: '85vh' }}
          >
            {/* Header */}
            <div className="p-8 bg-blue-600 border-b border-blue-700/10 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-xl text-white">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="font-black text-white tracking-tight uppercase text-sm">Financial AI</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-all">
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-blue-100 font-medium leading-relaxed">
                Powered by your personal financial data.
              </p>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-hide min-h-0">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] px-5 py-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm',
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none'
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none px-5 py-3 flex items-center gap-2">
                    <Loader2 size={14} className="text-blue-500 animate-spin" />
                    <span className="text-xs text-slate-400 font-semibold">Thinking...</span>
                  </div>
                </div>
              )}

              {/* Suggested questions (only shown after initial message) */}
              {messages.length === 1 && !isLoading && (
                <div className="space-y-3 mt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Questions</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:shadow-md transition-all flex items-center gap-2"
                      >
                        {q} <ArrowRight size={10} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex-shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your finances..."
                  disabled={isLoading}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 pr-14 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-all shadow-sm font-bold disabled:opacity-60"
                />
                <button
                  onClick={() => sendMessage(inputValue)}
                  disabled={isLoading || !inputValue.trim()}
                  className="absolute right-2 top-2 p-3 bg-blue-600 text-white rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-blue-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <m.button
        whileHover={{ scale: 1.05, y: -4 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(!isOpen);
          setHasBeenOpened(true);
        }}
        className={cn(
          "relative p-6 rounded-[2rem] shadow-2xl transition-all duration-500",
          isOpen ? "bg-slate-900 text-white" : "bg-blue-600 text-white shadow-blue-200"
        )}
      >
        <m.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
        </m.div>
        
        {!isOpen && !hasBeenOpened && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-white shadow-sm"></span>
          </span>
        )}
      </m.button>
    </div>
  );
}
