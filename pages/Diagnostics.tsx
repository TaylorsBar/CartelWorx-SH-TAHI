
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { getDiagnosticAnswer } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

const Diagnostics: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', text: "Hello! I'm KC, your AI diagnostic assistant. Ask me anything about your vehicle's performance, issues, or potential upgrades. For example: 'Why is my engine running rough?'", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === '' || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const aiResponseText = await getDiagnosticAnswer(input);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        sender: 'ai',
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I couldn't get a response. Please check your connection and try again.",
        sender: 'ai',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black rounded-lg border border-brand-cyan/30 shadow-lg">
      <div className="p-4 border-b border-brand-cyan/30">
        <h2 className="text-xl font-bold text-gray-100 font-display">Natural Language Diagnostics</h2>
        <p className="text-sm text-gray-400">Ask KC for help</p>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-brand-cyan flex-shrink-0 mt-1 shadow-glow-cyan"></div>}
              <div className={`max-w-xl p-3 rounded-lg ${msg.sender === 'user' ? 'bg-brand-blue text-white' : 'bg-base-800 text-gray-200'}`}>
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-cyan flex-shrink-0 mt-1 shadow-glow-cyan"></div>
                <div className="max-w-xl p-3 rounded-lg bg-base-800 text-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></div>
                  </div>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t border-brand-cyan/30">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question here..."
            className="flex-1 bg-base-800 border border-base-700 rounded-md px-4 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-brand-cyan text-black font-semibold px-4 py-2 rounded-md disabled:bg-base-700 disabled:cursor-not-allowed hover:bg-cyan-300 transition-colors shadow-glow-cyan"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Diagnostics;
