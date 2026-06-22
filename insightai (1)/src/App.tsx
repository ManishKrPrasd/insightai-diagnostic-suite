import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  FileSpreadsheet, 
  Table, 
  LineChart, 
  BarChart4, 
  Info, 
  Layers, 
  RefreshCw,
  TrendingUp,
  Brain,
  Moon,
  Compass,
  Award,
  Wand2,
  FileText,
  Presentation
} from "lucide-react";

import { Dataset, AIReport } from "./types";
import LandingPage from "./components/LandingPage";
import DashboardHome from "./components/DashboardHome";
import DataPreview from "./components/DataPreview";
import AnalysisReport from "./components/AnalysisReport";
import VisualizationTab from "./components/VisualizationTab";
import AnalysisDashboard from "./components/AnalysisDashboard";
import ChatWithData from "./components/ChatWithData";
import SmartCleaning from "./components/SmartCleaning";
import ExecutiveReport from "./components/ExecutiveReport";
import PresentationGenerator from "./components/PresentationGenerator";

export default function App() {
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'preview' | 'profile' | 'visuals' | 'analysis-dashboard' | 'chat' | 'cleaning' | 'executive' | 'presentation'>('overview');

  // Clear state and return to upload view
  const handleReset = () => {
    setDataset(null);
    setAiReport(null);
    setActiveTab('overview');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#EDEDED] flex flex-col font-sans selection:bg-blue-500/35 selection:text-white">
      
      {/* 1. Global Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#0A0A0B]/90 backdrop-blur-md border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            onPointerDown={() => setShowLanding(true)}
            onClick={() => setShowLanding(true)}
            id="brand-header-link"
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="p-2 rounded bg-blue-600 shadow shadow-blue-500/20 group-hover:scale-105 transition-all">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tighter text-white block">
                INSIGHT<span className="text-blue-500">AI</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest font-mono text-white/40 block">
                Elite Data Analytics
              </span>
            </div>
          </div>

          {/* Right Header Controls / State Indicator */}
          <div className="flex items-center gap-3">
            {dataset && !showLanding && (
              <button
                onPointerDown={handleReset}
                onClick={handleReset}
                id="header-change-dataset-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 rounded text-white/70 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Upload New</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 p-1 px-2.5 bg-white/5 rounded border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[9px] text-white/50 font-mono font-bold uppercase tracking-wider select-none">
                Active Environment
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Content Display Router */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {showLanding ? (
            <motion.div
              key="landing-scene"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LandingPage onStart={() => setShowLanding(false)} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard-scene"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
            >
              
              {/* Back navigation option when custom dataset is loaded */}
              <div className="mb-6">
                <button
                  onPointerDown={() => setShowLanding(true)}
                  onClick={() => setShowLanding(true)}
                  id="nav-back-landing-btn"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-blue-400 uppercase tracking-widest transition-colors cursor-pointer"
                >
                  ← Return to Landing Page
                </button>
              </div>

              {/* Upload stage panel or structured workspace */}
              {!dataset ? (
                <div className="space-y-6">
                  <div className="text-center max-w-xl mx-auto mb-8">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                      Start your analysis
                    </h1>
                    <p className="text-xs uppercase tracking-widest text-white/40 mt-2">
                      Drop any standard spreadsheet locally to trigger our local compiler.
                    </p>
                  </div>
                  
                  <DashboardHome 
                    onDatasetLoaded={(ds) => {
                      setDataset(ds);
                      setActiveTab('overview');
                    }}
                    dataset={null}
                    onReset={handleReset}
                  />
                </div>
              ) : (
                <div className="flex flex-col space-y-6">
                  
                  {/* Tab controllers */}
                  <div className="flex border-b border-white/10 gap-6 overflow-x-auto pb-px">
                    <button
                      onPointerDown={() => setActiveTab('overview')}
                      onClick={() => setActiveTab('overview')}
                      className={`text-xs font-black uppercase tracking-wider pb-3.5 relative transition-all cursor-pointer whitespace-nowrap select-none ${
                        activeTab === 'overview' ? "text-blue-500 font-bold" : "text-white/40 hover:text-white/80"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        Statistical Overview
                      </span>
                      {activeTab === 'overview' && (
                        <motion.div 
                          layoutId="dashboard-tab-indicator" 
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" 
                        />
                      )}
                    </button>

                    <button
                      onPointerDown={() => setActiveTab('analysis-dashboard')}
                      onClick={() => setActiveTab('analysis-dashboard')}
                      className={`text-xs font-black uppercase tracking-wider pb-3.5 relative transition-all cursor-pointer whitespace-nowrap select-none ${
                        activeTab === 'analysis-dashboard' ? "text-blue-500 font-bold" : "text-white/40 hover:text-white/80"
                      }`}
                      id="analysis-dashboard-tab-btn"
                    >
                      <span className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        Analysis Dashboard
                      </span>
                      {activeTab === 'analysis-dashboard' && (
                        <motion.div 
                          layoutId="dashboard-tab-indicator" 
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" 
                        />
                      )}
                    </button>

                    <button
                      onPointerDown={() => setActiveTab('executive')}
                      onClick={() => setActiveTab('executive')}
                      className={`text-xs font-black uppercase tracking-wider pb-3.5 relative transition-all cursor-pointer whitespace-nowrap select-none ${
                        activeTab === 'executive' ? "text-blue-500 font-bold" : "text-white/40 hover:text-white/80"
                      }`}
                      id="executive-report-tab-btn"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        Executive Report
                      </span>
                      {activeTab === 'executive' && (
                        <motion.div 
                          layoutId="dashboard-tab-indicator" 
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" 
                        />
                      )}
                    </button>

                    <button
                      onPointerDown={() => setActiveTab('presentation')}
                      onClick={() => setActiveTab('presentation')}
                      className={`text-xs font-black uppercase tracking-wider pb-3.5 relative transition-all cursor-pointer whitespace-nowrap select-none ${
                        activeTab === 'presentation' ? "text-blue-500 font-bold" : "text-white/40 hover:text-white/80"
                      }`}
                      id="ai-presentation-tab-btn"
                    >
                      <span className="flex items-center gap-1.5">
                        <Presentation className="w-3.5 h-3.5 text-blue-400" />
                        AI Presentation
                      </span>
                      {activeTab === 'presentation' && (
                        <motion.div 
                          layoutId="dashboard-tab-indicator" 
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" 
                        />
                      )}
                    </button>

                    <button
                      onPointerDown={() => setActiveTab('chat')}
                      onClick={() => setActiveTab('chat')}
                      className={`text-xs font-black uppercase tracking-wider pb-3.5 relative transition-all cursor-pointer whitespace-nowrap select-none ${
                        activeTab === 'chat' ? "text-blue-500 font-bold" : "text-white/40 hover:text-white/80"
                      }`}
                      id="chat-data-tab-btn"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Chat With Your Data
                      </span>
                      {activeTab === 'chat' && (
                        <motion.div 
                          layoutId="dashboard-tab-indicator" 
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" 
                        />
                      )}
                    </button>

                    <button
                      onPointerDown={() => setActiveTab('cleaning')}
                      onClick={() => setActiveTab('cleaning')}
                      className={`text-xs font-black uppercase tracking-wider pb-3.5 relative transition-all cursor-pointer whitespace-nowrap select-none ${
                        activeTab === 'cleaning' ? "text-blue-500 font-bold" : "text-white/40 hover:text-white/80"
                      }`}
                      id="smart-cleaning-tab-btn"
                    >
                      <span className="flex items-center gap-1.5">
                        <Wand2 className="w-3.5 h-3.5 text-blue-400" />
                        AI Smart Cleaning
                      </span>
                      {activeTab === 'cleaning' && (
                        <motion.div 
                          layoutId="dashboard-tab-indicator" 
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" 
                        />
                      )}
                    </button>

                    <button
                      onPointerDown={() => setActiveTab('preview')}
                      onClick={() => setActiveTab('preview')}
                      className={`text-xs font-black uppercase tracking-wider pb-3.5 relative transition-all cursor-pointer whitespace-nowrap select-none ${
                        activeTab === 'preview' ? "text-blue-500 font-bold" : "text-white/40 hover:text-white/80"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Table className="w-3.5 h-3.5" />
                        Preview Records
                      </span>
                      {activeTab === 'preview' && (
                        <motion.div 
                          layoutId="dashboard-tab-indicator" 
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" 
                        />
                      )}
                    </button>

                    <button
                      onPointerDown={() => setActiveTab('profile')}
                      onClick={() => setActiveTab('profile')}
                      className={`text-xs font-black uppercase tracking-wider pb-3.5 relative transition-all cursor-pointer whitespace-nowrap select-none ${
                        activeTab === 'profile' ? "text-blue-500 font-bold" : "text-white/40 hover:text-white/80"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5" />
                        Data Profiling & AI
                      </span>
                      {activeTab === 'profile' && (
                        <motion.div 
                          layoutId="dashboard-tab-indicator" 
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" 
                        />
                      )}
                    </button>

                    <button
                      onPointerDown={() => setActiveTab('visuals')}
                      onClick={() => setActiveTab('visuals')}
                      className={`text-xs font-black uppercase tracking-wider pb-3.5 relative transition-all cursor-pointer whitespace-nowrap select-none ${
                        activeTab === 'visuals' ? "text-blue-500 font-bold" : "text-white/40 hover:text-white/80"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <LineChart className="w-3.5 h-3.5" />
                        Visual Playground
                      </span>
                      {activeTab === 'visuals' && (
                        <motion.div 
                          layoutId="dashboard-tab-indicator" 
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" 
                        />
                      )}
                    </button>
                  </div>

                  {/* Dynamic Render according to current workspace tab */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="w-full pt-2"
                  >
                    {activeTab === 'overview' && (
                      <DashboardHome 
                        dataset={dataset} 
                        onDatasetLoaded={setDataset} 
                        onReset={handleReset}
                      />
                    )}

                    {activeTab === 'analysis-dashboard' && (
                      <AnalysisDashboard dataset={dataset} />
                    )}

                    {activeTab === 'executive' && (
                      <ExecutiveReport dataset={dataset} aiReport={aiReport} />
                    )}

                    {activeTab === 'presentation' && (
                      <PresentationGenerator dataset={dataset} aiReport={aiReport} />
                    )}

                    {activeTab === 'chat' && (
                      <ChatWithData dataset={dataset} />
                    )}

                    {activeTab === 'cleaning' && (
                      <SmartCleaning dataset={dataset} onUpdateDataset={(updated) => setDataset(updated)} />
                    )}

                    {activeTab === 'preview' && (
                      <DataPreview dataset={dataset} />
                    )}

                    {activeTab === 'profile' && (
                      <AnalysisReport 
                        dataset={dataset} 
                        aiReport={aiReport}
                        onReportGenerated={(rep) => setAiReport(rep)}
                      />
                    )}

                    {activeTab === 'visuals' && (
                      <VisualizationTab dataset={dataset} />
                    )}
                  </motion.div>

                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Executive Workspace Footer */}
      <footer className="py-6 border-t border-white/10 bg-[#0A0A0B] text-white/30 font-sans text-[10px] uppercase tracking-widest">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span>© 2026 INSIGHTAI PLATFORM. BOLD ANALYTICAL SYSTEM.</span>
          <div className="flex gap-4">
            <span className="hover:text-white/60 transition-colors cursor-pointer">Security Sandbox</span>
            <span>•</span>
            <span className="hover:text-white/60 transition-colors cursor-pointer">Local browser-parsing engine</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
