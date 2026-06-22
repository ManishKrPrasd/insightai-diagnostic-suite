import React, { useMemo, useState } from "react";
import { 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  TrendingUp, 
  Layers, 
  Award, 
  Database,
  Hash,
  Activity,
  Maximize2,
  Calendar,
  HelpCircle,
  Search,
  Eye
} from "lucide-react";
import { Dataset } from "../types";

interface AnalysisDashboardProps {
  dataset: Dataset;
}

export default function AnalysisDashboard({ dataset }: AnalysisDashboardProps) {
  const [columnSearch, setColumnSearch] = useState("");

  // 1. Data Quality Score calculation
  const qualityDetails = useMemo(() => {
    const { rowCount, columnCount, columns, statistics, rows } = dataset;
    if (rowCount === 0 || columnCount === 0) {
      return { score: 100, missingDeduction: 0, duplicateDeduction: 0, invalidDeduction: 0, invalidCount: 0 };
    }

    // Missing cells impact
    const totalCells = statistics.totalCells || (rowCount * columnCount);
    const missingCells = statistics.totalMissingCells || 0;
    const missingRatio = missingCells / totalCells;
    const missingDeduction = missingRatio * 100; // Deduct up to 100 points for completeness

    // Duplicate rows impact
    const duplicateRatio = (statistics.duplicateRowsCount || 0) / rowCount;
    const duplicateDeduction = duplicateRatio * 150; // Deduct aggressively for duplicates (max 150 points weight)

    // Invalid entries check:
    // Determine invalid entries where a column is expected to be numeric but cannot be parsed, 
    // or string values are found in numeric columns.
    let invalidCount = 0;
    columns.forEach(col => {
      if (col.type === 'numeric') {
        const key = col.name;
        rows.forEach(row => {
          const rawValue = row[key];
          if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
            const parsed = Number(rawValue);
            if (isNaN(parsed)) {
              invalidCount++;
            }
          }
        });
      }
    });

    const invalidRatio = totalCells > 0 ? (invalidCount / totalCells) : 0;
    const invalidDeduction = invalidRatio * 200; // invalid cells count deducted up to 200 weight

    // Compound score starts at 100
    let scoreFloat = 100 - (missingDeduction * 0.8) - (duplicateDeduction * 0.5) - (invalidDeduction * 1.5);
    const score = Math.max(0, Math.min(100, Math.round(scoreFloat)));

    return {
      score,
      missingDeduction: Math.round(missingDeduction * 0.8),
      duplicateDeduction: Math.round(duplicateDeduction * 0.5),
      invalidDeduction: Math.round(invalidDeduction * 1.5),
      invalidCount
    };
  }, [dataset]);

  // 2. Insights Panel automatically generated calculations
  const insights = useMemo(() => {
    const { columns, rowCount, columnCount, fileSize, statistics } = dataset;
    if (!columns || columns.length === 0) {
      return {
        mostComplete: "N/A",
        mostMissing: "N/A",
        highestVariance: "N/A",
        sizeSummary: "No records found"
      };
    }

    // Most complete column (lowest missing count / percentage)
    const sortedByCompleteness = [...columns].sort((a, b) => a.missingCount - b.missingCount);
    const mostComplete = sortedByCompleteness[0]?.name || "N/A";

    // Most missing column (highest missing count, only if > 0)
    const sortedByMissing = [...columns].sort((a, b) => b.missingCount - a.missingCount);
    const mostMissing = sortedByMissing[0]?.missingCount > 0 
      ? `${sortedByMissing[0].name} (${sortedByMissing[0].missingCount} empty cells)` 
      : "None (Fully intact)";

    // Column with highest variance (find highest standard deviation)
    const numericCols = columns.filter(c => c.type === 'numeric' && c.stdDev !== undefined);
    let highestVariance = "N/A (No numeric columns)";
    if (numericCols.length > 0) {
      const sortedByVariance = [...numericCols].sort((a, b) => (b.stdDev || 0) - (a.stdDev || 0));
      if (sortedByVariance[0]) {
        highestVariance = `${sortedByVariance[0].name} (Std Dev: ${sortedByVariance[0].stdDev})`;
      }
    }

    // Size summary description
    const totalCells = statistics.totalCells || (rowCount * columnCount);
    const formattedSize = fileSize > 1024 * 1024 
      ? `${(fileSize / (1024 * 1024)).toFixed(2)} MB` 
      : `${(fileSize / 1024).toFixed(1)} KB`;

    const sizeSummary = `Dataset consists of ${rowCount.toLocaleString()} rows and ${columnCount} Columns, representing ${totalCells.toLocaleString()} metadata cells stored in approximately ${formattedSize} raw payload memory.`;

    return {
      mostComplete,
      mostMissing,
      highestVariance,
      sizeSummary
    };
  }, [dataset]);

  // Formatter for Bytes representation
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    return dataset.columns.filter(col => 
      col.name.toLowerCase().includes(columnSearch.toLowerCase())
    );
  }, [dataset.columns, columnSearch]);

  const numericColumns = useMemo(() => {
    return dataset.columns.filter(col => col.type === 'numeric');
  }, [dataset.columns]);

  return (
    <div className="w-full flex flex-col space-y-8 font-sans animate-fade-in" id="analysis-dashboard-section">
      
      {/* 2x2 Header: Executive Performance Summary & Quality Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quality Score Meter */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between shadow-xl relative overflow-hidden" id="dashboard-quality-meter-card">
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/[0.03] rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest block mb-1">
              SYSTEM VALIDATION PIPELINE
            </span>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Data Quality Score
            </h3>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">
              Consolidated score incorporating completeness density ratios, unique duplicates, and parse-type match errors.
            </p>
          </div>

          <div className="my-6 flex flex-col items-center">
            {/* Visual Ring Indicator */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  stroke="rgba(255, 255, 255, 0.03)" 
                  strokeWidth="8" 
                  fill="transparent" 
                />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="42" 
                  stroke={qualityDetails.score > 80 ? "#10b981" : qualityDetails.score > 50 ? "#f59e0b" : "#ef4444"} 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="263.8"
                  strokeDashoffset={263.8 - (263.8 * qualityDetails.score) / 100}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-white tracking-tighter">
                  {qualityDetails.score}
                </span>
                <span className="text-[8px] font-mono uppercase tracking-widest text-white/40">
                  / 100 POINTS
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-4 border-t border-white/5">
            <div className="flex justify-between text-[10px] uppercase font-mono tracking-wider text-white/40">
              <span>Intact Density Weight</span>
              <span className="text-white/80 font-bold">-{qualityDetails.missingDeduction} pts</span>
            </div>
            <div className="flex justify-between text-[10px] uppercase font-mono tracking-wider text-white/40">
              <span>Duplicates Penalty</span>
              <span className="text-amber-500 font-bold">-{qualityDetails.duplicateDeduction} pts</span>
            </div>
            <div className="flex justify-between text-[10px] uppercase font-mono tracking-wider text-white/40">
              <span>Invalid Type Penalty</span>
              <span className="text-red-400 font-bold">-{qualityDetails.invalidDeduction} pts</span>
            </div>
          </div>
        </div>

        {/* Dataset Summary Cards */}
        <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between shadow-sm" id="summary-card-total-rows">
              <div>
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1">
                  DIMENSIONAL SCALE
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Total Row Observations
                </h4>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  {dataset.rowCount.toLocaleString()}
                </span>
                <Database className="w-5 h-5 text-blue-500/80" />
              </div>
              <p className="text-[10px] text-white/30 uppercase mt-2 font-mono">
                Payload observations count
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between shadow-sm" id="summary-card-total-columns">
              <div>
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1">
                  SCHEMA FACTOR
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Total Header Columns
                </h4>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  {dataset.columnCount}
                </span>
                <Layers className="w-5 h-5 text-blue-500/80" />
              </div>
              <p className="text-[10px] text-white/30 uppercase mt-2 font-mono">
                Unique parsed features
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between shadow-sm" id="summary-card-missing-cells">
              <div>
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1">
                  DENSITY ANOMALY
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Missing Cells Count
                </h4>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  {dataset.statistics.totalMissingCells.toLocaleString()}
                </span>
                <AlertTriangle className="w-5 h-5 text-amber-500/80" />
              </div>
              <p className="text-[10px] text-white/30 uppercase mt-2 font-mono">
                Overall completeness voids
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between shadow-sm" id="summary-card-duplicates">
              <div>
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1">
                  REDUNDANCY GAP
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Duplicate Rows Count
                </h4>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  {dataset.statistics.duplicateRowsCount}
                </span>
                <Info className="w-5 h-5 text-emerald-500/80" />
              </div>
              <p className="text-[10px] text-white/30 uppercase mt-2 font-mono">
                {dataset.statistics.duplicatePercentage}% redundancy ratio
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* Inputs & Analytics Insights Panel */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 shadow-xl relative overflow-hidden" id="dashboard-insights-panel">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
        
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4.5 h-4.5 text-blue-500 shrink-0" />
          <h4 className="text-xs font-black uppercase tracking-widest text-white">
            Analytical Insights Summary
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              Most Complete Column
            </span>
            <div className="text-sm font-black text-white truncate" id="insight-most-complete">
              {insights.mostComplete.toUpperCase()}
            </div>
            <p className="text-[10px] text-white/30 font-sans leading-relaxed">
              Maintains clean continuous presence with minimal voids.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              Most Missing Column
            </span>
            <div className="text-sm font-black text-amber-400 truncate" id="insight-most-missing">
              {insights.mostMissing.toUpperCase()}
            </div>
            <p className="text-[10px] text-white/30 font-sans leading-relaxed">
              Highest density anomaly concentration requiring curation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
              Highest Variance Numeric
            </span>
            <div className="text-sm font-black text-blue-400 truncate" id="insight-highest-variance">
              {insights.highestVariance.toUpperCase()}
            </div>
            <p className="text-[10px] text-white/30 font-sans leading-relaxed">
              Indicates maximum statistical diversity and model spread.
            </p>
          </div>

        </div>

        <div className="mt-5 p-4 rounded-xl bg-blue-600/5 border border-blue-500/10">
          <span className="text-[9px] font-mono uppercase tracking-widest font-black text-blue-400 block mb-1">
            DATASET SIZE SUMMARY & CONTEXT
          </span>
          <p className="text-xs text-white/70 leading-relaxed font-sans" id="insight-size-summary">
            {insights.sizeSummary}
          </p>
        </div>
      </div>

      {/* Primary Column Analyzer Grid */}
      <div className="flex flex-col space-y-4" id="dashboard-column-analyzer-wrapper">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Data Dimension Column Analyzer
            </h4>
            <p className="text-xs text-white/40 uppercase tracking-wider mt-0.5">
              Comprehensive scan of schema categories, sampling distributions, missing rates & type validations.
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/40" />
            <input 
              type="text" 
              placeholder="FILTER COLUMNS..."
              value={columnSearch}
              onChange={(e) => setColumnSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-black/60 border border-white/10 hover:border-white/20 focus:border-blue-500 rounded text-white placeholder-white/30 focus:outline-none transition-all uppercase tracking-widest"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="column-analyzer-items-grid">
          {filteredColumns.map((col, idx) => (
            <div 
              key={idx}
              className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between hover:bg-white/[0.04] transition-all"
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                  <span className="font-sans text-xs font-black text-white uppercase tracking-wider block max-w-[180px] truncate">
                    {col.name}
                  </span>
                  
                  <span className={`text-[8px] uppercase font-black tracking-widest px-2 py-0.5 rounded border ${
                    col.type === 'numeric' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                    col.type === 'categorical' ? 'bg-white/5 border-white/10 text-white/70' :
                    col.type === 'date' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {col.type}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-sans">
                  <div className="flex justify-between items-center text-white/40">
                    <span className="uppercase tracking-wider text-[9px]">Missing Density</span>
                    <strong className="text-white font-mono">{col.missingCount} cells ({col.missingPercentage}%)</strong>
                  </div>

                  <div className="flex justify-between items-center text-white/40">
                    <span className="uppercase tracking-wider text-[9px]">Unique Cardinality</span>
                    <strong className="text-white font-mono">{col.uniqueCount}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5">
                <span className="text-[8px] text-white/30 uppercase tracking-widest block mb-2 font-mono">
                  Sample Distribution Matrix
                </span>
                <div className="flex flex-wrap gap-1">
                  {col.sampleValues && col.sampleValues.slice(0, 4).map((sv, sIdx) => {
                    const text = sv !== null && sv !== undefined ? String(sv) : "";
                    return (
                      <span 
                        key={sIdx}
                        className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/5 text-white/50 max-w-[100px] truncate"
                        title={text}
                      >
                        {text === "" ? "[empty]" : text}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {filteredColumns.length === 0 && (
            <div className="col-span-full py-12 text-center text-white/30 uppercase tracking-widest font-mono text-xs">
              No matching dataset columns observed.
            </div>
          )}
        </div>
      </div>

      {/* Detailed Descriptive Statistics for Continuous Variables */}
      <div className="flex flex-col space-y-4" id="dashboard-statistical-summary-wrapper">
        <div className="border-b border-white/10 pb-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-white">
            Descriptive Continuous Statistics (Numeric Columns Only)
          </h4>
          <p className="text-xs text-white/40 uppercase tracking-wider mt-0.5">
            Automatic regression indicators and continuous dispersion models for numerical vectors.
          </p>
        </div>

        <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black/10 font-sans" id="numerical-descriptives-table-container">
          <table className="w-full text-left text-xs divide-y divide-white/5">
            <thead className="bg-white/[0.03] text-white/40 uppercase tracking-widest text-[9px]">
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
              {numericColumns.map((col, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-black uppercase text-white font-sans">{col.name}</td>
                  <td className="px-4 py-4 text-right text-blue-400 font-bold">{col.min !== undefined ? col.min : "N/A"}</td>
                  <td className="px-4 py-4 text-right text-blue-400 font-bold">{col.max !== undefined ? col.max : "N/A"}</td>
                  <td className="px-4 py-4 text-right text-emerald-400 font-bold">{col.mean !== undefined ? col.mean : "N/A"}</td>
                  <td className="px-4 py-4 text-right text-emerald-400 font-bold">{col.median !== undefined ? col.median : "N/A"}</td>
                  <td className="px-4 py-4 text-right text-white/50">{col.stdDev !== undefined ? col.stdDev : "N/A"}</td>
                </tr>
              ))}

              {numericColumns.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-white/20 font-black uppercase tracking-widest font-sans italic">
                    No numerical columns found within this spreadsheet dataset.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
