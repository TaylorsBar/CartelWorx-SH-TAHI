
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { getDiagnosticAnswer } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

const Diagnostics: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', text: "System Online. KC Diagnostic Core initialized. Awaiting queries regarding vehicle status, error codes, or telemetry analysis.", sender: 'ai' }
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
        text: "Error: Uplink connection failed. Please retry transmission.",
        sender: 'ai',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050508] relative overflow-hidden font-mono">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      ></div>

      {/* Header */}
      <div className="p-4 border-b border-brand-cyan/30 bg-black/50 backdrop-blur-md flex justify-between items-center z-10">
        <div>
            <h2 className="text-xl font-bold text-brand-cyan tracking-widest uppercase">Secure Uplink // TERMINAL</h2>
            <p className="text-xs text-gray-400">Encryption: AES-256 // Status: <span className="text-green-500 animate-pulse">CONNECTED</span></p>
        </div>
        <div className="flex gap-2">
            <div className="w-2 h-2 bg-brand-cyan rounded-full"></div>
            <div className="w-2 h-2 bg-brand-cyan rounded-full opacity-50"></div>
            <div className="w-2 h-2 bg-brand-cyan rounded-full opacity-25"></div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar z-10 space-y-6">
        {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`text-[10px] uppercase mb-1 tracking-wider ${msg.sender === 'user' ? 'text-brand-blue' : 'text-brand-cyan'}`}>
                    {msg.sender === 'user' ? 'OPERATOR' : 'SYSTEM CORE'}
                </div>
                <div className={`max-w-2xl p-4 rounded-lg border backdrop-blur-sm ${
                    msg.sender === 'user' 
                    ? 'bg-brand-blue/10 border-brand-blue/30 text-white rounded-tr-none' 
                    : 'bg-brand-cyan/5 border-brand-cyan/20 text-gray-200 rounded-tl-none'
                }`}>
                    <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                </div>
            </div>
        ))}
        {isLoading && (
             <div className="flex flex-col items-start">
                <div className="text-[10px] uppercase mb-1 tracking-wider text-brand-cyan">SYSTEM CORE</div>
                <div className="p-4 rounded-lg bg-brand-cyan/5 border border-brand-cyan/20 rounded-tl-none">
                  <div className="flex items-center space-x-2">
                    <span className="text-brand-cyan text-xs animate-pulse">PROCESSING DATA STREAM...</span>
                  </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-brand-cyan/30 bg-black/80 backdrop-blur-md z-10">
        <form onSubmit={handleSend} className="flex items-center gap-0 bg-[#0a0c10] border border-gray-700 rounded overflow-hidden shadow-lg focus-within:border-brand-cyan transition-colors">
          <div className="px-3 py-3 bg-gray-900 text-brand-cyan font-bold select-none">{'>'}</div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter command or query..."
            className="flex-1 bg-transparent border-none px-4 py-3 text-white placeholder-gray-600 focus:ring-0 font-mono"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-brand-cyan/10 text-brand-cyan font-bold px-6 py-3 hover:bg-brand-cyan hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm"
          >
            Transmit
          </button>
        </form>
      </div>
    </div>
  );
};

export default Diagnostics;
