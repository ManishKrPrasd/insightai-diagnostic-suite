import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Send, 
  Sparkles, 
  RefreshCw, 
  Trash2, 
  ArrowRight, 
  CheckCircle,
  AlertCircle,
  HelpCircle,
  FileText,
  TrendingUp,
  Award,
  Zap,
  Info
} from "lucide-react";
import Markdown from "react-markdown";
import { Dataset } from "../types";

interface Message {
  role: "user" | "model";
  content: string;
  keyFinding?: string;
  confidenceLevel?: string;
  recommendedAction?: string;
}

interface ChatWithDataProps {
  dataset: Dataset;
}

export default function ChatWithData({ dataset }: ChatWithDataProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: "Hello! I am your **InsightAI Agent**. I have loaded your dataset and parsed all observations. Feel free to ask me questions, and I will present strategic findings, anomalies, and recommendations directly from the data. How can I help you today?",
      keyFinding: `Successfully loaded ${dataset.fileName || 'spreadsheet'} with ${dataset.rowCount} rows across ${dataset.columnCount} columns.`,
      confidenceLevel: "High",
      recommendedAction: "Select components to visualize, filter metrics, or run suggested context questions below."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Suggested canned questions
  const suggestions = [
    { label: "Summarize my dataset", query: "Summarize this dataset, identifying columns and structural highlights." },
    { label: "Find anomalies", query: "Can you analyze the dataset for anomalies, gaps, missing values, or outliers?" },
    { label: "Show important trends", query: "What are the most important trends, values, or distributions in this dataset?" },
    { label: "Which columns need cleaning?", query: "Identify columns that have missing values or require data cleaning, and provide the fix." },
    { label: "Give business insights", query: "Provide high-level raw strategic business insights and decisions I can extract from this dataset." }
  ];

  // Map dataset into clean structure for prompt context
  const datasetContext = React.useMemo(() => {
    return {
      name: dataset.fileName,
      rowCount: dataset.rowCount,
      columnCount: dataset.columnCount,
      fileSize: dataset.fileSize,
      statistics: dataset.statistics,
      columns: dataset.columns.map(c => ({
        name: c.name,
        type: c.type,
        uniqueCount: c.uniqueCount,
        missingCount: c.missingCount,
        missingPercentage: c.missingPercentage,
        sampleValues: c.sampleValues ? c.sampleValues.slice(0, 5) : [],
        min: c.min,
        max: c.max,
        mean: c.mean,
        median: c.median,
        stdDev: c.stdDev
      }))
    };
  }, [dataset]);

  // Handle scrolling
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isLoading]);

  // Handle form send
  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setError(null);
    const userMessage: Message = { role: "user", content: textToSend };
    
    // Add user message locally
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          summaryData: datasetContext
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API returned an error code: ${response.status}`);
      }

      const data = await response.json();
      
      // Expected payload format: { reply, keyFinding, confidenceLevel, recommendedAction }
      const modelMessage: Message = {
        role: "model",
        content: data.reply || "I encountered an issue processing that answer.",
        keyFinding: data.keyFinding,
        confidenceLevel: data.confidenceLevel,
        recommendedAction: data.recommendedAction
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An unexpected communication failure occurred while requesting the server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: "model",
        content: "Hello! I am your **InsightAI Agent**. Ask me anything about your spreadsheet records, and I will analyze them for you.",
        keyFinding: `Successfully loaded ${dataset.fileName || 'spreadsheet'}.`,
        confidenceLevel: "High",
        recommendedAction: "Run a suggested prompt or ask custom questions."
      }
    ]);
    setError(null);
  };

  return (
    <div 
      className="w-full h-[620px] rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between shadow-2xl relative overflow-hidden font-sans" 
      id="chat-assistant-container"
    >
      {/* Upper Title Header */}
      <div className="px-6 py-4.5 bg-black/40 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Chat With Your Data
            </h4>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
              Powered by server-side Gemini &bull; Dataset Agent Contextualized
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          className="text-[10px] uppercase font-bold text-white/40 hover:text-white/85 flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-white/5 border border-transparent hover:border-white/5 transition-all"
          title="Clear Conversation Logs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {/* Main Conversation Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
        id="messages-scroll-area"
      >
        {messages.map((msg, index) => {
          const isModel = msg.role === "model";
          return (
            <div 
              key={index} 
              className={`flex flex-col space-y-2 ${isModel ? "items-start" : "items-end"}`}
              id={`chat-message-bubble-${index}`}
            >
              {/* Message Bubble Base */}
              <div 
                className={`max-w-[85%] md:max-w-[75%] px-5 py-4 rounded-2xl text-xs font-sans ${
                  isModel 
                    ? "bg-white/[0.03] border border-white/10 text-white/90" 
                    : "bg-blue-600/25 border border-blue-500/20 text-blue-100"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-2 border-b border-white/5 pb-1.5">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-white/30">
                    {isModel ? "InsightAI Assistant" : "Authorized User"}
                  </span>
                </div>

                <div className="prose prose-invert max-w-none text-xs text-white/80 leading-relaxed space-y-1 markdown-body select-text">
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>

              {/* Insight Card Container (Only generated/shown for model messages) */}
              {isModel && (msg.keyFinding || msg.recommendedAction) && (
                <div 
                  className="w-full max-w-[85%] md:max-w-[75%] p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col space-y-2.5 mt-1 animate-fade-in text-xs"
                  id={`insight-card-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-mono font-black uppercase text-blue-400 tracking-widest flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Analytical Summary Card
                    </span>
                    
                    {msg.confidenceLevel && (
                      <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded border ${
                        msg.confidenceLevel.toLowerCase().includes("high") 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                          : msg.confidenceLevel.toLowerCase().includes("medium")
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}>
                        Confidence: {msg.confidenceLevel}
                      </span>
                    )}
                  </div>

                  {msg.keyFinding && (
                    <div className="space-y-1">
                      <div className="text-[9px] uppercase tracking-wider text-white/40 font-mono">
                        Key Finding
                      </div>
                      <p className="text-white/80 leading-relaxed font-sans font-medium text-[11px]">
                        {msg.keyFinding}
                      </p>
                    </div>
                  )}

                  {msg.recommendedAction && (
                    <div className="p-2.5 rounded bg-blue-600/5 border border-blue-500/10 space-y-1">
                      <div className="text-[9px] uppercase tracking-wider text-blue-400 font-mono">
                        Recommended Action
                      </div>
                      <p className="text-white/70 leading-relaxed font-sans text-[11px]">
                        {msg.recommendedAction}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Generate Loading State placeholder */}
        {isLoading && (
          <div className="flex flex-col space-y-2 items-start" id="chat-loading-placeholder">
            <div className="px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/10 max-w-[200px] flex items-center space-x-3">
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span className="text-xs text-white/50 font-mono uppercase tracking-widest animate-pulse">
                Consulting AI Analyst...
              </span>
            </div>
          </div>
        )}

        {/* Catch Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200 uppercase tracking-widest font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Error: {error}</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Questions & Search Inputs Box */}
      <div className="px-6 py-4 bg-black/20 border-t border-white/5 space-y-4">
        
        {/* Quick Suggestion Pills */}
        <div className="space-y-2">
          <span className="text-[8px] font-mono font-black uppercase text-white/30 tracking-widest block">
            Suggested Analysis Questions:
          </span>
          <div className="flex flex-wrap gap-2" id="chat-suggestions-wrapper">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(s.query)}
                disabled={isLoading}
                className="text-[9px] uppercase tracking-wider px-3 py-1.5 font-bold rounded-lg bg-white/5 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/20 text-white/60 hover:text-blue-200 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input Box Form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex items-center gap-2.5"
          id="chat-input-form-control"
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="ASK THE DATA ANALYST AGENT ANYTHING..."
            className="flex-1 bg-black/60 border border-white/10 hover:border-white/20 focus:border-blue-500 rounded-lg px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none transition-all uppercase tracking-widest"
          />
          
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-white/5 disabled:text-white/30 flex items-center justify-center border border-blue-500 hover:border-blue-600 disabled:border-transparent text-white transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
            id="chat-msg-send-btn"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
