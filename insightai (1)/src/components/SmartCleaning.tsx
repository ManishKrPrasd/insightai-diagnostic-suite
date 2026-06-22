import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wand2, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Undo2, 
  Check, 
  ArrowRight, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  Trash2,
  ListFilter,
  BarChart2,
  RefreshCw,
  MinusCircle
} from "lucide-react";
import { Dataset, ColumnInfo } from "../types";
import { analyzeRawData } from "../utils/dataAnalyzer";

interface SmartCleaningProps {
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
}

interface CleaningIssue {
  id: string;
  type: "missing" | "duplicates" | "empty_column" | "invalid_numeric" | "text_format" | "outliers";
  title: string;
  column: string;
  severity: "Low" | "Medium" | "High";
  suggestedFix: string;
  explanation: string;
  affectedCount: number;
}

export default function SmartCleaning({ dataset, onUpdateDataset }: SmartCleaningProps) {
  // We keep a local working copy of the dataset to allow full previewing, 
  // live metric re-evaluation, and non-destructive revert capability.
  const [workingDataset, setWorkingDataset] = useState<Dataset>(dataset);
  const [lastCommittedDatasetId, setLastCommittedDatasetId] = useState<string>(JSON.stringify(dataset.rows));
  const [showCommitSuccess, setShowCommitSuccess] = useState(false);

  // Lists of applied cleaning phases to present in the "Cleaning Report"
  const [appliedActions, setAppliedActions] = useState<string[]>([]);
  const [isSuccessToastVisible, setIsSuccessToastVisible] = useState(false);

  // Helper: Quality Score calculator
  const calculateQualityScore = (ds: Dataset) => {
    const { rowCount, columnCount, columns, statistics, rows } = ds;
    if (rowCount === 0 || columnCount === 0) {
      return 100;
    }

    const totalCells = rowCount * columnCount;
    const missingCells = statistics.totalMissingCells || 0;
    const missingRatio = totalCells > 0 ? (missingCells / totalCells) : 0;
    const missingDeduction = missingRatio * 100;

    const duplicateRatio = rowCount > 0 ? ((statistics.duplicateRowsCount || 0) / rowCount) : 0;
    const duplicateDeduction = duplicateRatio * 150;

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
    const invalidDeduction = invalidRatio * 200;

    const scoreFloat = 100 - (missingDeduction * 0.8) - (duplicateDeduction * 0.5) - (invalidDeduction * 1.5);
    return Math.max(0, Math.min(100, Math.round(scoreFloat)));
  };

  // Quality scores of the original context versus the current working preview
  const originalScore = useMemo(() => calculateQualityScore(dataset), [dataset]);
  const currentScore = useMemo(() => calculateQualityScore(workingDataset), [workingDataset]);
  const scoreImprovement = currentScore - originalScore;

  // Scanner Engine: Analyzes active working state and builds precise issue suggestions
  const detectedIssues = useMemo(() => {
    const issuesList: CleaningIssue[] = [];
    const { rows, columns, rowCount, columnCount, statistics } = workingDataset;

    if (rowCount === 0) return issuesList;

    // 1. Redundancy (Duplicates) Check
    if (statistics.duplicateRowsCount > 0) {
      issuesList.push({
        id: "duplicates",
        type: "duplicates",
        title: "Duplicate Rows Observed",
        column: "Entire Dataset Matrix",
        severity: "Medium",
        suggestedFix: "Purge all duplicate coordinate copies from active workspace storage.",
        explanation: `${statistics.duplicateRowsCount} duplicate data rows detected. Redundancy inflates category statistics and biases statistical models.`,
        affectedCount: statistics.duplicateRowsCount
      });
    }

    // 2. Scan columns for various anomalies
    columns.forEach(col => {
      // Empty column check (100% missing)
      if (col.missingPercentage === 100) {
        issuesList.push({
          id: `empty-col-${col.name}`,
          type: "empty_column",
          title: `Empty Structural Column`,
          column: col.name,
          severity: "High",
          suggestedFix: "Drop this empty column dimension from the dataset headers completely.",
          explanation: `The column '${col.name}' consists of 100% missing blank values and contributes zero explanatory value.`,
          affectedCount: rowCount
        });
        return; // Don't produce missing values alerts if the full column is empty
      }

      // Missing values check
      if (col.missingCount > 0) {
        const severity = col.missingPercentage > 20 ? "High" : "Medium";
        const fallbackValue = col.type === 'numeric' ? "median value" : "placeholder tag 'Unknown'";
        issuesList.push({
          id: `missing-${col.name}`,
          type: "missing",
          title: `Missing Attribute Values`,
          column: col.name,
          severity,
          suggestedFix: `Impute the missing attribute rows with modern calculated ${fallbackValue}.`,
          explanation: `The column '${col.name}' contains ${col.missingCount} empty cells (${col.missingPercentage}% missing). This disrupts machine calculations and charts.`,
          affectedCount: col.missingCount
        });
      }

      // Invalid numeric types
      if (col.type === 'numeric') {
        let badNumericParsed = 0;
        rows.forEach(r => {
          const val = r[col.name];
          if (val !== undefined && val !== null && String(val).trim() !== "") {
            if (isNaN(Number(val))) {
              badNumericParsed++;
            }
          }
        });

        if (badNumericParsed > 0) {
          issuesList.push({
            id: `invalid-num-${col.name}`,
            type: "invalid_numeric",
            title: `Invalid Numeric Cast Formatting`,
            column: col.name,
            severity: "High",
            suggestedFix: "Parse numeric values and force convert non-numeric entries to the median.",
            explanation: `Detected ${badNumericParsed} non-numeric values inside calculated numeric vector '${col.name}'.`,
            affectedCount: badNumericParsed
          });
        }
      }

      // Inconsistent text casing or tailing strings (Text formatting check)
      if (col.type === 'categorical') {
        let inconsistentSpaces = 0;
        rows.forEach(r => {
          const val = r[col.name];
          if (typeof val === 'string') {
            if (val.trim() !== val || val.includes("  ")) {
              inconsistentSpaces++;
            }
          }
        });

        if (inconsistentSpaces > 0) {
          issuesList.push({
            id: `text-format-${col.name}`,
            type: "text_format",
            title: "Inconsistent Whitespace Formatting",
            column: col.name,
            severity: "Low",
            suggestedFix: "Apply trim whitespace functions and collapse internal double spaces.",
            explanation: `Found ${inconsistentSpaces} records with uncleaned spacing in column '${col.name}', creating extraneous categorical cardinality keys.`,
            affectedCount: inconsistentSpaces
          });
        }
      }

      // Outliers scan (numerical deviations)
      if (col.type === 'numeric' && col.mean !== undefined && col.stdDev !== undefined && col.stdDev > 0) {
        let outlierCount = 0;
        rows.forEach(r => {
          const val = Number(r[col.name]);
          if (!isNaN(val)) {
            if (Math.abs(val - (col.mean || 0)) > 3 * (col.stdDev || 1)) {
              outlierCount++;
            }
          }
        });

        if (outlierCount > 0) {
          issuesList.push({
            id: `outliers-${col.name}`,
            type: "outliers",
            title: "Numeric Sigma Outliers (3x StdDev)",
            column: col.name,
            severity: "Low",
            suggestedFix: "Soft clamp outlier boundaries to upper or lower 3-sigma thresholds.",
            explanation: `Detected ${outlierCount} records that deviate by more than 3 standard deviations from mean representing unusual spikes.`,
            affectedCount: outlierCount
          });
        }
      }
    });

    return issuesList;
  }, [workingDataset]);

  // One-Click Action 1: Remove Duplicate Rows
  const runRemoveDuplicates = () => {
    const { rows, fileName, fileSize, headers } = workingDataset;
    const uniqueRows: Record<string, any>[] = [];
    const seen = new Set<string>();

    rows.forEach(row => {
      const str = JSON.stringify(row);
      if (!seen.has(str)) {
        seen.add(str);
        uniqueRows.push(row);
      }
    });

    const outputDataset = analyzeRawData(fileName, fileSize, headers, uniqueRows);
    setWorkingDataset(outputDataset);
    if (!appliedActions.includes("Duplicates Purged")) {
      setAppliedActions(prev => [...prev, "Duplicates Purged"]);
    }
  };

  // One-Click Action 2: Impute Missing Values
  const runImputeMissing = () => {
    const { rows, columns, fileName, fileSize, headers } = workingDataset;
    
    // Copy rows
    const updatedRows = rows.map(r => ({ ...r }));

    columns.forEach(col => {
      if (col.missingCount > 0) {
        // Calculate imputation replacement
        let replacement: any = "Unknown";
        if (col.type === 'numeric') {
          replacement = col.median !== undefined ? col.median : (col.mean !== undefined ? col.mean : 0);
        } else {
          // Find categorical mode or default
          const validVals = rows.map(r => r[col.name]).filter(v => v !== null && v !== undefined && String(v).trim() !== "");
          if (validVals.length > 0) {
            const counts: Record<string, number> = {};
            validVals.forEach(v => { counts[String(v)] = (counts[String(v)] || 0) + 1; });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            replacement = sorted[0] ? sorted[0][0] : "Unknown";
          }
        }

        // Fill missing values
        updatedRows.forEach(row => {
          const val = row[col.name];
          if (val === null || val === undefined || String(val).trim() === "") {
            row[col.name] = replacement;
          }
        });
      }
    });

    const outputDataset = analyzeRawData(fileName, fileSize, headers, updatedRows);
    setWorkingDataset(outputDataset);
    if (!appliedActions.includes("Missing Cells Imputed")) {
      setAppliedActions(prev => [...prev, "Missing Cells Imputed"]);
    }
  };

  // One-Click Action 3: Standardize Text Formatting
  const runStandardizeText = () => {
    const { rows, columns, fileName, fileSize, headers } = workingDataset;
    const updatedRows = rows.map(r => ({ ...r }));

    columns.forEach(col => {
      if (col.type === 'categorical') {
        updatedRows.forEach(row => {
          const val = row[col.name];
          if (typeof val === 'string') {
            // Trim leading/trailing and replace double whitespaces
            let cleaned = val.trim().replace(/\s+/g, ' ');
            row[col.name] = cleaned;
          }
        });
      }
    });

    const outputDataset = analyzeRawData(fileName, fileSize, headers, updatedRows);
    setWorkingDataset(outputDataset);
    if (!appliedActions.includes("Whitespace Formatting Standardized")) {
      setAppliedActions(prev => [...prev, "Whitespace Formatting Standardized"]);
    }
  };

  // One-Click Action 4: Drop Empty Columns
  const runDropEmptyColumns = () => {
    const { rows, columns, fileName, fileSize, headers } = workingDataset;
    
    // Find empty columns
    const emptyColumnNames = columns.filter(c => c.missingPercentage === 100).map(c => c.name);
    if (emptyColumnNames.length === 0) return;

    // Filter headers and row attributes
    const updatedHeaders = headers.filter(h => !emptyColumnNames.includes(h));
    const updatedRows = rows.map(r => {
      const newRow = { ...r };
      emptyColumnNames.forEach(col => {
        delete newRow[col];
      });
      return newRow;
    });

    const outputDataset = analyzeRawData(fileName, fileSize, updatedHeaders, updatedRows);
    setWorkingDataset(outputDataset);
    if (!appliedActions.includes(`Schema Purged Empty Columns (${emptyColumnNames.length})`)) {
      setAppliedActions(prev => [...prev, `Schema Purged Empty Columns (${emptyColumnNames.length})`]);
    }
  };

  // Run all diagnostics in a single flow
  const runFullAutoClean = () => {
    // 1. Remove duplicates
    let cleanRows = workingDataset.rows.map(r => ({ ...r }));
    const seen = new Set<string>();
    cleanRows = cleanRows.filter(row => {
      const str = JSON.stringify(row);
      if (!seen.has(str)) {
        seen.add(str);
        return true;
      }
      return false;
    });

    // 2. Drop empty columns
    const emptyColumnNames = workingDataset.columns.filter(c => c.missingPercentage === 100).map(c => c.name);
    const cleanHeaders = workingDataset.headers.filter(h => !emptyColumnNames.includes(h));
    cleanRows = cleanRows.map(row => {
      const newRow = { ...row };
      emptyColumnNames.forEach(col => {
        delete newRow[col];
      });
      return newRow;
    });

    // 3. Impute missing & text format standardize
    workingDataset.columns.forEach(col => {
      if (emptyColumnNames.includes(col.name)) return;

      // Impute calculation
      let replacement: any = "Unknown";
      if (col.type === 'numeric') {
        replacement = col.median !== undefined ? col.median : (col.mean !== undefined ? col.mean : 0);
      } else {
        const validVals = cleanRows.map(r => r[col.name]).filter(v => v !== null && v !== undefined && String(v).trim() !== "");
        if (validVals.length > 0) {
          const counts: Record<string, number> = {};
          validVals.forEach(v => { counts[String(v)] = (counts[String(v)] || 0) + 1; });
          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
          replacement = sorted[0] ? sorted[0][0] : "Unknown";
        }
      }

      cleanRows.forEach(row => {
        // Handle whitespace standard checks first if it exists
        const val = row[col.name];
        if (typeof val === 'string') {
          row[col.name] = val.trim().replace(/\s+/g, ' ');
        }
        
        // Handle imputation
        if (row[col.name] === null || row[col.name] === undefined || String(row[col.name]).trim() === "") {
          row[col.name] = replacement;
        }

        // Handle bad numerical formats
        if (col.type === 'numeric' && isNaN(Number(row[col.name]))) {
          row[col.name] = replacement;
        }
      });
    });

    const finalCleaned = analyzeRawData(workingDataset.fileName, workingDataset.fileSize, cleanHeaders, cleanRows);
    setWorkingDataset(finalCleaned);
    
    const actions = ["Duplicates Purged", "Missing Cells Imputed", "Whitespace Formatting Standardized"];
    if (emptyColumnNames.length > 0) {
      actions.push(`Schema Purged Empty Columns (${emptyColumnNames.length})`);
    }
    setAppliedActions(actions);
  };

  // Revert all local modifications back to original parent copy
  const handleRevert = () => {
    setWorkingDataset(dataset);
    setAppliedActions([]);
    setShowCommitSuccess(false);
  };

  // Commit cleansed dataset to the global React context workspace so all screens get updated
  const handleCommitToWorkspace = () => {
    onUpdateDataset(workingDataset);
    setLastCommittedDatasetId(JSON.stringify(workingDataset.rows));
    setShowCommitSuccess(true);
    setIsSuccessToastVisible(true);
    setTimeout(() => {
      setIsSuccessToastVisible(false);
    }, 4500);
  };

  // Determine if working copy differs from original parent dataset
  const hasUncommittedChanges = useMemo(() => {
    return JSON.stringify(workingDataset.rows) !== JSON.stringify(dataset.rows) || 
           workingDataset.headers.length !== dataset.headers.length;
  }, [workingDataset, dataset]);

  return (
    <div className="w-full flex flex-col space-y-8 font-sans animate-fade-in" id="ai-smart-cleaning-tab-view">
      
      {/* 1. Header Hero with Revert & Commit Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <span className="text-[9px] font-mono font-black text-blue-400 uppercase tracking-widest block mb-1">
            INTELLIGENT RESTRUCTURING & IMPUTATION
          </span>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">
            AI Smart Cleaning Suite
          </h2>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">
            Scanner diagnostics, one-click schema purges, non-destructive validation testing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {hasUncommittedChanges && (
            <button
              onClick={handleRevert}
              className="px-3.5 py-2 text-xs font-black uppercase tracking-wider bg-white/5 hover:bg-neutral-800 text-white/80 rounded-lg border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
              id="revert-cleaning-btn"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Revert Changes
            </button>
          )}

          <button
            onClick={handleCommitToWorkspace}
            disabled={!hasUncommittedChanges}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all outline-none ${
              hasUncommittedChanges 
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-lg shadow-blue-500/20 shadow-md border border-blue-500" 
                : "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"
            }`}
            id="commit-dataset-to-workspace-btn"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Commit to Workspace
          </button>
        </div>
      </div>

      {/* Success Notification Toast Feedback */}
      {isSuccessToastVisible && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-mono tracking-wide flex items-center justify-between shadow-xl animate-bounce">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>CLEANSED DATASET COMMITTED. All dashboard views, profiling reports, analytics and visual metrics updated.</span>
          </div>
        </div>
      )}

      {/* 2. Before vs After Quality Score & Applied KPI Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quality score comparison card */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden flex flex-col justify-between" id="cleaning-kpi-comparison-card">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/[0.03] rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest block mb-1">
              METRIC DELTA DIAGNOSTICS
            </span>
            <h3 className="text-md font-bold text-white uppercase tracking-tight">
              Before vs After Score
            </h3>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">
              Consolidated real-time algorithm assessing completeness ratios and format normalization vectors.
            </p>
          </div>

          <div className="my-6 grid grid-cols-2 gap-4 text-center items-center divide-x divide-white/5">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">BEFORE</span>
              <span className="text-4xl font-mono font-black text-white/40 mt-1">
                {originalScore}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest block">CURRENT PREVIEW</span>
              <span className="text-4xl font-mono font-black text-emerald-400 mt-1">
                {currentScore}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-white/40 uppercase tracking-widest text-[9px]">DIAL IMPROVEMENT</span>
            <span className={`font-black font-semibold uppercase px-2 py-0.5 rounded ${
              scoreImprovement > 0 ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/40"
            }`}>
              {scoreImprovement > 0 ? `+${scoreImprovement}% UPGRADE` : "NO DELTA APPLIED"}
            </span>
          </div>
        </div>

        {/* Cleaning suggestion scanner stats */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between" id="diagnostics-scanner-stats-card">
          <div>
            <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest block mb-1">
              SCANNER DIAGNOSTICS
            </span>
            <h3 className="text-md font-bold text-white uppercase tracking-tight">
              Scanner Diagnostics Report
            </h3>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">
              Comprehensive sweep of layout variables, missing density ratios, unique duplicates & outliers.
            </p>
          </div>

          <div className="my-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Total Diagnosed Issues</span>
              <span className="font-mono text-white font-bold">{detectedIssues.length} issues found</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Applied Fixing Phases</span>
              <span className="font-mono text-emerald-400 font-bold">{appliedActions.length} applied</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Remaining Warnings</span>
              <span className="font-mono text-amber-400 font-bold">{detectedIssues.length} unresolved</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <button
              onClick={runFullAutoClean}
              className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Run Full Auto-Clean
            </button>
          </div>
        </div>

        {/* Applied Cleans history card */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between" id="applied-diagnostics-history-card">
          <div>
            <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest block mb-1">
              ACTION TIMELINE
            </span>
            <h3 className="text-md font-bold text-white uppercase tracking-tight">
              Applied Cleaning History
            </h3>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">
              Non-destructive applied log tracks tracking structural dataframe shifts prior to commitment.
            </p>
          </div>

          <div className="flex-grow my-3 max-h-[105px] overflow-y-auto space-y-1.5 pr-2">
            {appliedActions.map((action, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-300 font-mono"
              >
                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{action.toUpperCase()}</span>
              </div>
            ))}

            {appliedActions.length === 0 && (
              <div className="text-center py-6 text-white/20 text-xs font-mono font-bold uppercase tracking-widest italic">
                No transformation applied yet.
              </div>
            )}
          </div>

          <div className="text-[9px] text-white/30 uppercase tracking-widest font-mono text-center pt-2.5 border-t border-white/5">
            COMMIT CHANGES TO PERSIST TO GLOBAL WORKSPACE
          </div>
        </div>

      </div>

      {/* 3. One Click Cleaning Tools Section */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 shadow-xl relative" id="one-click-cleaning-control-board">
        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-blue-400 shrink-0" />
          One-Click Smart Refinement Actions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <button
            onClick={runRemoveDuplicates}
            className="p-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/10 hover:shadow-lg transition-all text-left group flex flex-col justify-between h-32 cursor-pointer"
            title="Deduplicate entire rows based on matching structures"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-widest">
                  ACTION 01
                </span>
                <span className="text-xs font-mono text-white/30 group-hover:text-blue-400 transition-colors">DUP</span>
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest mt-1.5">
                Remove Duplicate Rows
              </h4>
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed font-sans block pt-1">
              Purges structurally identical observations from database copies safely.
            </p>
          </button>

          <button
            onClick={runImputeMissing}
            className="p-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/10 hover:shadow-lg transition-all text-left group flex flex-col justify-between h-32 cursor-pointer"
            title="Fills any empty matrix cells with computed mediums"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-widest">
                  ACTION 02
                </span>
                <span className="text-xs font-mono text-white/30 group-hover:text-blue-400 transition-colors">MISSING</span>
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest mt-1.5">
                Fill Missing Values
              </h4>
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed font-sans block pt-1">
              Fills gaps with column median outputs or tags of standard missing classes.
            </p>
          </button>

          <button
            onClick={runStandardizeText}
            className="p-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/10 hover:shadow-lg transition-all text-left group flex flex-col justify-between h-32 cursor-pointer"
            title="Standardize spacing gaps, remove multiple gaps"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-widest">
                  ACTION 03
                </span>
                <span className="text-xs font-mono text-white/30 group-hover:text-blue-400 transition-colors">SPACING</span>
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest mt-1.5">
                Standardize Text Spacing
              </h4>
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed font-sans block pt-1">
              Trims text cells, removes double blank spaces, and collapses noise.
            </p>
          </button>

          <button
            onClick={runDropEmptyColumns}
            className="p-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 hover:border-white/10 hover:shadow-lg transition-all text-left group flex flex-col justify-between h-32 cursor-pointer"
            title="Removes empty columns"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-widest">
                  ACTION 04
                </span>
                <span className="text-xs font-mono text-white/30 group-hover:text-blue-400 transition-colors">SCHEMA</span>
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest mt-1.5">
                Drop Empty Columns
              </h4>
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed font-sans block pt-1">
              Deletes dimensions matching 100% missing coefficients.
            </p>
          </button>

        </div>
      </div>

      {/* 4. Active Scan Issue Suggestions List */}
      <div className="flex flex-col space-y-4" id="diagonal-issues-sweep-table-section">
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-widest">
            Detailed Issue Suggestions & Remediation Matrix
          </h3>
          <p className="text-xs text-white/40 uppercase tracking-wider mt-0.5">
            Diagnostic matrix targeting formatting bugs, data holes, types, and mathematical outliers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {detectedIssues.map((issue, index) => (
              <motion.div 
                key={issue.id}
                layoutId={`issue-suggestion-block-${issue.id}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between hover:bg-white/[0.03] transition-colors shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${
                        issue.severity === 'High' ? "text-red-400 animate-pulse" :
                        issue.severity === 'Medium' ? "text-amber-400" : "text-blue-400"
                      }`} />
                      <span className="font-bold text-white text-xs uppercase tracking-wider truncate">
                        {issue.title}
                      </span>
                    </div>

                    <span className={`text-[8px] uppercase font-black tracking-widest px-2 py-0.5 rounded border shrink-0 ${
                      issue.severity === 'High' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                      issue.severity === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-white/40 text-[10px]">
                      <span>AFFECTED FIELD</span>
                      <strong className="text-white font-mono uppercase text-xs">{issue.column}</strong>
                    </div>

                    <div className="flex justify-between items-center text-white/40 text-[10px]">
                      <span>AFFECTED CELL COUNT</span>
                      <strong className="text-white font-mono">{issue.affectedCount}</strong>
                    </div>

                    <p className="text-[11px] text-white/50 leading-relaxed font-sans pt-1.5">
                      {issue.explanation}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-white/5 space-y-2">
                  <div className="bg-black/40 p-2.5 rounded border border-white/5">
                    <span className="text-[8px] text-blue-400 uppercase tracking-widest font-mono font-black block mb-0.5">
                      SUGGESTED CORRECTION
                    </span>
                    <p className="text-[10px] text-white/80 leading-relaxed font-sans font-medium">
                      {issue.suggestedFix}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            {detectedIssues.length === 0 && (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center space-y-3 bg-white/[0.01]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-widest">
                    DataFrame is Pristine & Cleansed
                  </h4>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">
                    Zero diagnostics anomalies, double redundant rows, text formatting flags, or cell gaps detected.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
