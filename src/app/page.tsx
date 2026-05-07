"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, FileText, Send, Loader2, Database, Info, MessageSquare, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: "" });
  
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  type Message = { role: "user" | "assistant", content: string, chunks?: any[] };
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm your NotebookLM AI. Upload a document (PDF or Text) on the left, and ask me anything about it!" }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus({ type: null, message: "" });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadStatus({ type: null, message: "" });
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        setUploadStatus({ type: "success", message: data.message });
      } else {
        setUploadStatus({ type: "error", message: data.error || "Failed to upload file." });
      }
    } catch (error: any) {
      console.error("Upload Error:", error);
      setUploadStatus({ 
        type: "error", 
        message: `System Error: ${error.message || "Failed to contact server"}` 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;

    const userMessage = query.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setQuery("");
    setIsSearching(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: data.answer, chunks: data.chunks }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: "assistant", content: "Network error occurred." }]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-200 font-sans flex overflow-hidden">
      
      {/* SIDEBAR: Upload & Config */}
      <motion.div 
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-1/3 max-w-md bg-[#161920] border-r border-slate-800 p-6 flex flex-col h-screen overflow-y-auto"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Database size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">NotebookLM Clone</h1>
        </div>

        <div className="bg-[#1c2028] border border-slate-700/50 rounded-2xl p-5 mb-6 shadow-lg">
          <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Upload size={16} /> 1. Upload Source
          </h2>
          
          <div className="space-y-4">
            <div className="relative group cursor-pointer border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-xl p-6 text-center transition-all bg-[#161920]">
              <input 
                type="file" 
                accept=".pdf,.txt" 
                onChange={handleFileChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-3">
                <FileText size={32} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    {file ? file.name : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PDF or TXT up to 10MB</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
              {isUploading ? "Indexing Document..." : "Index Document"}
            </button>
            
            <AnimatePresence>
              {uploadStatus.message && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-3 rounded-lg text-sm border ${
                    uploadStatus.type === 'success' 
                      ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400' 
                      : 'bg-rose-900/20 border-rose-800 text-rose-400'
                  }`}
                >
                  {uploadStatus.message}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-[#1c2028] border border-slate-700/50 rounded-2xl p-5 shadow-lg flex-1">
          <h2 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Info size={16} /> Chunking Strategy
          </h2>
          <div className="prose prose-invert prose-sm">
            <p className="text-slate-300">
              This application implements a complete RAG pipeline. It uses <strong>LangChain's RecursiveCharacterTextSplitter</strong> to process uploaded documents.
            </p>
            <ul className="text-slate-400 space-y-2 mt-3 list-disc pl-4 marker:text-indigo-500">
              <li><strong>Chunk Size:</strong> 1000 characters. Large enough to capture meaningful context.</li>
              <li><strong>Overlap:</strong> 200 characters. Ensures concepts split across chunk boundaries are preserved.</li>
              <li><strong>Vector Store:</strong> Embeddings are generated using <code>text-embedding-3-large</code> and stored in Qdrant Cloud.</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-screen relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1c2028] via-[#0f1115] to-[#0f1115]">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800/60 bg-[#0f1115]/50 backdrop-blur-md flex items-center px-8 z-10 absolute top-0 w-full">
          <h2 className="text-slate-300 font-medium flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-400" />
            Document Chat
          </h2>
        </header>

        {/* Chat Log */}
        <div className="flex-1 overflow-y-auto px-8 pt-24 pb-32 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-8">
            {messages.map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-indigo-400" />
                  </div>
                )}
                
                <div className={`max-w-[80%] rounded-2xl p-5 shadow-sm ${
                  msg.role === "user" 
                    ? "bg-indigo-600 text-white" 
                    : "bg-[#1c2028] border border-slate-700/50 text-slate-200"
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  
                  {msg.chunks && msg.chunks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sources Referenced:</p>
                      <div className="space-y-2">
                        {msg.chunks.map((chunk, i) => (
                          <div key={i} className="text-xs text-slate-400 bg-slate-800/40 rounded p-2 border border-slate-700/30">
                            "{chunk.pageContent.substring(0, 150)}..."
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {isSearching && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex gap-4 justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-indigo-400" />
                </div>
                <div className="bg-[#1c2028] border border-slate-700/50 rounded-2xl p-5 flex items-center gap-3">
                  <Loader2 size={16} className="animate-spin text-indigo-400" />
                  <span className="text-sm text-slate-400">Thinking and searching documents...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#0f1115] via-[#0f1115] to-transparent pt-10 pb-8 px-8">
          <div className="max-w-3xl mx-auto relative">
            <form onSubmit={handleSearch} className="relative flex items-center group">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about the document..."
                disabled={isSearching}
                className="w-full bg-[#1c2028] border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl py-4 pl-6 pr-16 text-slate-200 placeholder-slate-500 shadow-xl transition-all disabled:opacity-50 outline-none"
              />
              <button 
                type="submit"
                disabled={!query.trim() || isSearching}
                className="absolute right-2 p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
            <p className="text-center text-xs text-slate-500 mt-3">
              Answers are generated based solely on the uploaded document context.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
