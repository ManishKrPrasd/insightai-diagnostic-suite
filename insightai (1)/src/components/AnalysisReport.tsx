import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart4, 
  Hash, 
  Info, 
  Play, 
  Brain,
  FileText,
  Clock,
  Briefcase
} from "lucide-react";
import { Dataset, AIReport } from "../types";

interface AnalysisReportProps {
  dataset: Dataset;
  aiReport: AIReport | null;
  onReportGenerated: (report: AIReport) => void;
}

export default function AnalysisReport({ dataset, aiReport, onReportGenerated }: AnalysisReportProps) {
  const [userQuery, setUserQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState<string>("overview"); // overview, stats, ai-analyst
  const [openAccordion, setOpenAccordion] = useState<string | null>("STEP 1");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // loading phrases
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const loadingPhrases = [
    "Analyzing Dataset...",
    "Generating Report...",
    "Checking schema boundaries & identifying columns...",
    "Scanning dataset density & checking data completeness ratios...",
    "Evaluating variable correlations and detecting metrics covariance...",
    "Constructing outlier forensics on standard statistical deviations...",
    "Synthesizing actionable executive recommendations (Steps 1 to 14)...",
    "Polishing the final executive report narrative..."
  ];

  // Rotate loading instructions periodically during processing
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingPhraseIndex(prev => (prev + 1) % loadingPhrases.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Compile concise sample data for the Gemini request body
  const summaryPayload = useMemo(() => {
    return {
      fileName: dataset.fileName,
      totalRows: dataset.rowCount,
      totalFeatures: dataset.columnCount,
      statistics: dataset.statistics,
      columns: dataset.columns.map(c => ({
        name: c.name,
        type: c.type,
        missingPercentage: c.missingPercentage,
        uniqueCount: c.uniqueCount,
        sampleValues: c.sampleValues,
        ...(c.type === 'numeric' ? {
          min: c.min,
          max: c.max,
          mean: c.mean,
          median: c.median,
          stdDev: c.stdDev
        } : {})
      })),
      // Give model first 5 rows as structural representation
      headRows: dataset.rows.slice(0, 5)
    };
  }, [dataset]);

  // Dispatches report builder trigger to Express API
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setLoadingPhraseIndex(0);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summaryData: summaryPayload,
          userQuery: userQuery.trim() || undefined
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reach pipeline models.");
      }

      onReportGenerated({
        report: data.report,
        generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong in the model server pipeline.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Parses markdown text by headers like "STEP X: ..."
  const parsedAISections = useMemo(() => {
    if (!aiReport || !aiReport.report) return [];

    const lines = aiReport.report.split("\n");
    const sections: { id: string; title: string; content: string[] }[] = [];
    let currentSectionId = "PREFACE";
    let currentSectionTitle = "Preface Analysis";
    let currentLines: string[] = [];

    const stepRegex = /STEP\s*(\d+)[:\-]\s*([^\n\r]*)|(?:={10,})\s*STEP\s*(\d+)[:\-]\s*([^\n\r]*)\s*(?:={10,})/i;

    lines.forEach(line => {
      const isHeaderLine = line.includes("========================") || line.includes("----------");
      const cleanLine = line.replace(/={10,}/g, "").replace(/-{10,}/g, "").trim();
      
      // Match step markings
      const match = cleanLine.match(/STEP\s*(\d+)[:\s-]+\s*([A-Za-z\s]+)/i);
      if (match) {
        if (currentLines.length > 0 || currentSectionId !== "PREFACE") {
          sections.push({
            id: currentSectionId,
            title: currentSectionTitle,
            content: [...currentLines]
          });
          currentLines = [];
        }
        currentSectionId = `STEP ${match[1]}`;
        currentSectionTitle = match[2].trim();
      } else if (!isHeaderLine) {
        currentLines.push(line);
      }
    });

    // push last
    if (currentLines.length > 0) {
      sections.push({
        id: currentSectionId,
        title: currentSectionTitle,
        content: currentLines
      });
    }

    return sections;
  }, [aiReport]);

  const toggleAccordion = (id: string) => {
    setOpenAccordion(prev => prev === id ? null : id);
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      
      {/* Sub tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-black/40 w-fit rounded border border-white/10">
        <button
          onPointerDown={() => setActiveStepTab("overview")}
          className={`px-4 py-2.5 rounded text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${
            activeStepTab === "overview" ? "bg-white text-black" : "text-white/50 hover:text-white"
          }`}
        >
          Column Profiles
        </button>
        <button
          onPointerDown={() => setActiveStepTab("stats")}
          className={`px-4 py-2.5 rounded text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${
            activeStepTab === "stats" ? "bg-white text-black" : "text-white/50 hover:text-white"
          }`}
        >
          Descriptives
        </button>
        <button
          onPointerDown={() => setActiveStepTab("ai-analyst")}
          className={`px-4 py-2.5 rounded text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all select-none flex items-center gap-1.5 ${
            activeStepTab === "ai-analyst" ? "bg-blue-600 text-white" : "text-white/50 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Elite AI Analyst
        </button>
      </div>

      <AnimatePresence mode="wait">
        
        {/* Column Profile Overview Tab */}
        {activeStepTab === "overview" && (
          <motion.div
            key="overview-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {dataset.columns.map((col, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-sans text-xs font-black text-white uppercase tracking-wider block max-w-[200px] truncate">
                      {col.name}
                    </span>
                    <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded border ${
                      col.type === 'numeric' ? 'bg-blue-500/10 border-blue-500/25 text-blue-400' :
                      col.type === 'categorical' ? 'bg-white/5 border-white/10 text-white/80' :
                      col.type === 'date' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      {col.type}
                    </span>
                  </div>

                  <div className="space-y-2 mt-4 font-sans text-xs">
                    <div className="flex justify-between items-center text-white/40">
                      <span className="uppercase tracking-wider text-[9px]">Unique Cardinality</span>
                      <strong className="text-white font-mono">{col.uniqueCount}</strong>
                    </div>

                    <div className="flex justify-between items-center text-white/40">
                      <span className="uppercase tracking-wider text-[9px]">Missing Density</span>
                      <strong className="text-white font-mono">
                        {col.missingCount} ({col.missingPercentage}%)
                      </strong>
                    </div>

                    {/* Progress slider for completeness */}
                    <div className="pt-2">
                      <div className="w-full bg-white/5 border border-white/5 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${100 - col.missingPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sample Values Row */}
                <div className="mt-5 pt-3 border-t border-white/10">
                  <span className="text-[9px] text-white/30 uppercase tracking-widest block mb-2 font-mono">
                    Sample spectrum
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {col.sampleValues.map((sv, sIdx) => {
                      const text = String(sv);
                      return (
                        <span 
                          key={sIdx} 
                          className="text-[9px] font-mono px-2 py-1 rounded bg-black/40 border border-white/10 text-white/60 max-w-[120px] truncate inline-block"
                        >
                          {text === "" ? "[empty]" : text}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Detailed Stats Descriptives Tab */}
        {activeStepTab === "stats" && (
          <motion.div
            key="stats-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full overflow-hidden rounded-xl border border-white/10 bg-black/10 font-sans"
          >
            <div className="p-6 bg-white/[0.03] border-b border-white/10">
              <h4 className="text-xs font-black uppercase tracking-widest text-white">Descriptive Statistics Pipeline</h4>
              <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">Statistical outputs generated on-the-fly for numeric continuous ranges.</p>
            </div>
            
            <table className="w-full text-left text-xs divide-y divide-white/5">
              <thead className="bg-[#0A0A0B] text-white/40 uppercase tracking-widest text-[9px]">
                <tr>
                  <th className="px-6 py-4">Column Dimension</th>
                  <th className="px-4 py-4 text-right">Min</th>
                  <th className="px-4 py-4 text-right">Max</th>
                  <th className="px-4 py-4 text-right">Mean</th>
                  <th className="px-4 py-4 text-right">Median</th>
                  <th className="px-4 py-4 text-right">Std Dev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#0A0A0B]/20 font-mono text-xs">
                {dataset.columns.filter(c => c.type === 'numeric').map((col, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-black uppercase text-white font-sans">{col.name}</td>
                    <td className="px-4 py-4 text-right text-blue-400 font-bold">{col.min}</td>
                    <td className="px-4 py-4 text-right text-blue-400 font-bold">{col.max}</td>
                    <td className="px-4 py-4 text-right text-emerald-400 font-bold">{col.mean}</td>
                    <td className="px-4 py-4 text-right text-emerald-400 font-bold">{col.median}</td>
                    <td className="px-4 py-4 text-right text-white/50">{col.stdDev}</td>
                  </tr>
                ))}

                {dataset.columns.filter(c => c.type === 'numeric').length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-white/20 font-black uppercase tracking-widest font-sans italic">
                      No numerical features found in this dataset to compute continuous descriptive statistics.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Elite AI Analyst Tab */}
        {activeStepTab === "ai-analyst" && (
          <motion.div
            key="ai-analyst-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            
            {/* Model Generation Box */}
            <div className="p-6 rounded-2xl bg-[#0A0A0B]/40 border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2.5 rounded bg-blue-600/10 border border-blue-500/20 text-blue-500">
                    <Brain className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans">
                    Generate Executive Data Analysis Story
                  </h3>
                </div>
                
                <p className="text-xs text-white/40 leading-relaxed font-sans">
                  InsightAI compiles the parsed statistics, column profiles, missing variables ratios, and head observations, and securely consults our server intelligence model to draft 14 procedural analysis steps.
                </p>

                {/* Additional context input */}
                <div className="pt-2">
                  <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5 font-mono">
                    Direct the Analysis Prompt (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="E.G. FOCUS ON FINDING SALES VARIANCES BY REGION..."
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    id="analysis-direct-prompt-input"
                    className="w-full px-3 py-2.5 text-xs bg-black border border-white/10 hover:border-white/20 focus:border-blue-500 rounded text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-sans uppercase tracking-widest"
                  />
                </div>
              </div>

              <div className="shrink-0">
                <button
                  onPointerDown={handleGenerateReport}
                  disabled={isGenerating}
                  id="generate-executive-report-btn"
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 bg-white text-black hover:bg-blue-600 hover:text-white font-black px-6 py-3 rounded text-xs uppercase tracking-widest transition-all duration-300 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group shrink-0"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                      PREPARATION...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-black group-hover:text-white group-hover:scale-110 transition-all" />
                      Build Report
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 rounded bg-red-950/20 border border-red-800/40 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-red-200">Model Framework Error</h4>
                  <p className="text-xs text-red-400 mt-1 font-mono">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Generative Loading feedback */}
            {isGenerating && (
              <div className="p-12 rounded-2xl bg-white/[0.01] border border-white/10 flex flex-col items-center text-center space-y-6">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-2 border-white/5 border-t-blue-500 animate-spin" />
                  <div className="absolute inset-2 rounded-full border-2 border-white/5 border-b-blue-400 animate-spin animate-reverse" />
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-widest text-white animate-pulse">Running Procedural Executive Pipeline...</h4>
                  <p className="text-xs text-white/40 font-mono tracking-widest uppercase max-w-md mx-auto">
                    {loadingPhrases[loadingPhraseIndex]}
                  </p>
                </div>
              </div>
            )}

            {/* The generated Accordion report output */}
            {aiReport && !isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4 font-sans"
              >
                
                {/* Meta details */}
                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                      Report generated successfully at: <strong className="text-white">{aiReport.generatedAt}</strong>
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded uppercase font-mono tracking-widest">
                    Validated Status
                  </span>
                </div>

                {/* Narrative Sections */}
                <div className="space-y-3 font-sans">
                  {parsedAISections.map((section, idx) => {
                    const isOpen = openAccordion === section.id;
                    return (
                      <div 
                        key={idx} 
                        className="rounded-xl border border-white/10 overflow-hidden bg-black/25"
                      >
                        {/* Summary Header trigger */}
                        <button
                          onPointerDown={() => toggleAccordion(section.id)}
                          className="w-full flex items-center justify-between p-4 bg-white/[0.01] hover:bg-white/[0.04] transition-all text-left select-none cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black font-mono text-blue-400 shrink-0 bg-black px-2.5 py-1 rounded border border-white/10">
                              {section.id}
                            </span>
                            <span className="text-xs font-black uppercase tracking-wider text-white">
                              {section.title}
                            </span>
                          </div>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-white/40" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-white/40" />
                          )}
                        </button>

                        {/* Accordion inner contents */}
                        {isOpen && (
                          <div className="p-6 bg-black/40 border-t border-white/10 text-xs text-white/70 leading-relaxed font-sans space-y-3 max-h-[500px] overflow-y-auto">
                            {section.content.map((line, lIdx) => {
                              // Render structured headers like ### Observation or bold key terms elegantly
                              if (line.trim().startsWith("###")) {
                                return (
                                  <h4 key={lIdx} className="text-blue-400 font-bold text-[10px] font-mono tracking-widest uppercase mt-4 mb-2">
                                    {line.replace("###", "").trim()}
                                  </h4>
                                );
                              }
                              if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
                                return (
                                  <ul key={lIdx} className="list-disc pl-5 space-y-1 my-1">
                                    <li className="text-xs text-white/70">{line.replace(/^[\s-*]+/, "").trim()}</li>
                                  </ul>
                                );
                              }
                              
                              if (line.trim() === "") return <div key={lIdx} className="h-2" />;

                              return (
                                <p key={lIdx} className="text-xs text-white/60 antialiased font-normal">
                                  {line}
                                </p>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
