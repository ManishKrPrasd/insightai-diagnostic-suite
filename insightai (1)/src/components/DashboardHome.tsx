import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { 
  Upload, 
  FileSpreadsheet, 
  BarChart, 
  Database, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Dataset } from "../types";
import { analyzeRawData } from "../utils/dataAnalyzer";

interface DashboardHomeProps {
  onDatasetLoaded: (dataset: Dataset) => void;
  dataset: Dataset | null;
  onReset: () => void;
}

export default function DashboardHome({ onDatasetLoaded, dataset, onReset }: DashboardHomeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV File helper
  const parseCSV = (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.errors.length > 0 && results.data.length === 0) {
            setErrorMessage(`Failed to parse CSV: ${results.errors[0].message}`);
            setIsProcessing(false);
            return;
          }
          const rows = results.data as Record<string, any>[];
          if (rows.length === 0) {
            setErrorMessage("The uploaded file is empty or formatted incorrectly.");
            setIsProcessing(false);
            return;
          }
          const headers = results.meta.fields || Object.keys(rows[0] || {});
          
          const analyzed = analyzeRawData(file.name, file.size, headers, rows);
          onDatasetLoaded(analyzed);
        } catch (err: any) {
          setErrorMessage(`Error analyzing data: ${err.message}`);
        } finally {
          setIsProcessing(false);
        }
      },
      error: (err) => {
        setErrorMessage(`CSV Parser failed: ${err.message}`);
        setIsProcessing(false);
      }
    });
  };

  // Parse Excel File helper
  const parseExcel = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const ab = e.target?.result;
          if (!ab) throw new Error("Could not read file binary stream.");
          
          const workbook = XLSX.read(ab, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Parse as JSON rows
          const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, any>[];
          
          if (rows.length === 0) {
            setErrorMessage("The uploaded spreadsheet contains no rows.");
            setIsProcessing(false);
            return;
          }
          
          // Get headers of first worksheet row
          const headers: string[] = [];
          const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: range.s.r, c: C });
            const cell = worksheet[address];
            if (cell && cell.v !== undefined) {
              headers.push(String(cell.v));
            } else {
              // Fallback column name
              headers.push(`Column_${C + 1}`);
            }
          }

          const finalRows = rows.map(row => {
            const rowCopy: Record<string, any> = {};
            // Map indexes back if they match
            headers.forEach((header, index) => {
              // Excel JSON conversion might output keys based on top row values
              const possibleKeys = [header, `Column_${index + 1}`];
              let foundVal = "";
              for (const pk of possibleKeys) {
                if (row[pk] !== undefined) {
                  foundVal = row[pk];
                  break;
                }
              }
              // If none match, look for actual key index match
              const rowKeys = Object.keys(row);
              if (row[header] === undefined && rowKeys[index] !== undefined) {
                foundVal = row[rowKeys[index]];
              }
              rowCopy[header] = foundVal;
            });
            return rowCopy;
          });

          const analyzed = analyzeRawData(file.name, file.size, headers, finalRows);
          onDatasetLoaded(analyzed);
        } catch (err: any) {
          setErrorMessage(`Failed parsing Excel workbook: ${err.message}`);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setErrorMessage(`Excel Reader failed: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === "csv") {
      parseCSV(file);
    } else if (["xlsx", "xls", "ods"].includes(extension || "")) {
      parseExcel(file);
    } else {
      setErrorMessage("Unsupported file type. Please upload a CSV, XLS, or XLSX spreadsheet.");
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Generate simulated demo datasets for instant triaging
  const loadDemoSalesData = () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setTimeout(() => {
      // Create high-quality Sales Performance Demo Dataset
      const headers = [
        "Order Date", "Product Code", "Region", "Category", 
        "Quantity", "Unit Price", "Sales Amount", "Rating", "Customer Group"
      ];
      
      const regions = ["North America", "Europe", "Asia-Pacific", "Latin America"];
      const categories = ["Hardware", "Software", "Cloud", "Support", "Subscriptions"];
      const custGroups = ["Enterprise", "Mid-Market", "SMB", "Consumer"];
      
      const demoRows: Record<string, any>[] = [];
      const baseProductCount = 50;
      
      // Let's create ~150 interesting records
      for (let i = 0; i < 150; i++) {
        const qty = Math.floor(Math.random() * 12) + 1;
        const price = Math.floor(Math.random() * 250) + 15;
        const amt = qty * price;
        const rating = Number((Math.random() * 2 + 3).toFixed(1)); // 3.0 to 5.0
        
        // Let's model dates around 2025/2026
        const daysAgo = Math.floor(Math.random() * 365);
        const refDate = new Date(2026, 5, 18); // Local date ref
        refDate.setDate(refDate.getDate() - daysAgo);
        const orderDateStr = refDate.toISOString().split("T")[0];

        // Introduce some missing values (e.g. key Rating sometimes left empty)
        const ratingVal = Math.random() < 0.08 ? "" : rating;
        
        demoRows.push({
          "Order Date": orderDateStr,
          "Product Code": `PRD-X${Math.floor(Math.random() * 12) + 100}`,
          "Region": regions[Math.floor(Math.random() * regions.length)],
          "Category": categories[Math.floor(Math.random() * categories.length)],
          "Quantity": qty,
          "Unit Price": price,
          "Sales Amount": amt,
          "Rating": ratingVal,
          "Customer Group": custGroups[Math.floor(Math.random() * custGroups.length)]
        });
      }

      // Add a couple of exact duplicate items to test validation checks
      demoRows.push({ ...demoRows[10] });
      demoRows.push({ ...demoRows[25] });

      const analyzed = analyzeRawData("global_sales_q2_2026.csv", 48200, headers, demoRows);
      onDatasetLoaded(analyzed);
      setIsProcessing(false);
    }, 400);
  };

  const loadDemoDeviceAnalytics = () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setTimeout(() => {
      // IoT Sensor / Web Performance logs
      const headers = [
        "Timestamp", "Device Hash", "Browser", "Country", 
        "Load Time (ms)", "Active Sessions", "CPU Usage %", "Status Code"
      ];
      
      const browsers = ["Chrome", "Firefox", "Safari", "Edge", "Brave"];
      const countries = ["USA", "Germany", "Japan", "India", "Canada", "UK"];
      const statuses = [200, 200, 200, 200, 404, 500, 200, 200, 301, 200];
      
      const demoRows: Record<string, any>[] = [];
      const now = new Date();

      for (let i = 0; i < 200; i++) {
        const timeOffset = i * 15; // 15-minute offsets
        const d = new Date(now.getTime() - timeOffset * 60 * 1000);
        const timestampStr = d.toISOString().replace("T", " ").slice(0, 19);
        
        const loadTime = Math.floor(Math.random() * 800) + 150;
        const cpu = Number((Math.random() * 45 + 5).toFixed(1));
        const active = Math.floor(Math.random() * 300) + 10;
        
        demoRows.push({
          "Timestamp": timestampStr,
          "Device Hash": `DEV-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          "Browser": browsers[Math.floor(Math.random() * browsers.length)],
          "Country": countries[Math.floor(Math.random() * countries.length)],
          "Load Time (ms)": loadTime,
          "Active Sessions": active,
          "CPU Usage %": cpu,
          "Status Code": statuses[Math.floor(Math.random() * statuses.length)]
        });
      }

      const analyzed = analyzeRawData("device_telemetry_logs.xlsx", 68500, headers, demoRows);
      onDatasetLoaded(analyzed);
      setIsProcessing(false);
    }, 400);
  };

  // Helper to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4">
      <AnimatePresence mode="wait">
        {!dataset ? (
          <motion.div
            key="upload-pantheon"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center"
          >
            {/* Main Upload Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full min-h-[360px] p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 relative ${
                isDragging 
                  ? "border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-500/15 scale-[1.01]" 
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700/80"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, .ods"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload-input"
              />

              {isProcessing ? (
                <div id="uploading-spinner-active" className="flex flex-col items-center space-y-4">
                  <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-blue-500 animate-spin" />
                  <p className="text-white/60 font-mono text-xs tracking-widest uppercase animate-pulse">
                    Ingesting, parsing and profiling tabular dataset...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center max-w-lg">
                  <div className="p-3 bg-blue-600/10 rounded border border-blue-500/20 mb-6 group-hover:scale-105 transition-all">
                    <FileSpreadsheet className="w-10 h-10 text-blue-500" />
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
                    Upload your spreadsheet dataset
                  </h2>
                  <p className="text-xs text-white/40 mb-6 uppercase tracking-widest leading-relaxed">
                    Drag and drop your file here, or <span className="text-blue-400 font-bold underline cursor-pointer hover:text-blue-300" onPointerDown={triggerFileSelect}>browse local folder</span>. <br />
                    Supports CSV or Excel files (<span className="font-mono text-[10px] text-white/30 lowercase">.csv, .xlsx, .xls</span>).
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onPointerDown={triggerFileSelect}
                      id="upload-dataset-trigger-btn"
                      className="inline-flex items-center gap-2 bg-white text-black hover:bg-blue-500 hover:text-white px-6 py-3 rounded text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      Select Spreadsheet
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded bg-red-950/20 border border-red-800/40 max-w-xl w-full flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-red-200">Processing Error</h4>
                  <p className="text-xs text-red-400/80 mt-1 font-mono">{errorMessage}</p>
                </div>
              </motion.div>
            )}

            {/* Quick Demo Preloads */}
            <div className="mt-14 text-center max-w-2xl w-full">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-5 font-mono">
                No CSV on hand? Load an Elite Demo Dataset
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <button
                  onPointerDown={loadDemoSalesData}
                  id="preload-sales-demo-btn"
                  className="p-5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 text-left hover:bg-white/5 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-white group-hover:text-blue-500 transition-colors">
                        Sales Transactions (Q2 2026)
                      </h4>
                      <p className="text-xs text-white/40 mt-1 font-sans">
                        Includes pricing factors, missing customer ratings, duplicate checkouts, categories, and dates.
                      </p>
                    </div>
                    <Sparkles className="w-4 h-4 text-blue-500 shrink-0 ml-2" />
                  </div>
                </button>

                <button
                  onPointerDown={loadDemoDeviceAnalytics}
                  id="preload-device-demo-btn"
                  className="p-5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 text-left hover:bg-white/5 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-white group-hover:text-blue-500 transition-colors">
                        IoT Device Telemetry
                      </h4>
                      <p className="text-xs text-white/40 mt-1 font-sans">
                        High frequency device telemetry log. Perfect for load-times, country breakdowns, and status errors.
                      </p>
                    </div>
                    <Sparkles className="w-4 h-4 text-blue-500 shrink-0 ml-2" />
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="profiled-dataset-overview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col space-y-6"
          >
            {/* Header info bar */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600/10 rounded border border-blue-500/20">
                  <FileSpreadsheet className="w-7 h-7 text-blue-500" />
                </div>
                <div>
                  <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest block mb-1">
                    PROFILED SPREADSHEET
                  </span>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight font-sans">
                    {dataset.fileName}
                  </h3>
                  <p className="text-xs text-white/50 font-mono mt-0.5">
                    File size: {formatBytes(dataset.fileSize)}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onPointerDown={onReset}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded transition-all cursor-pointer"
                >
                  Change Dataset
                </button>
              </div>
            </div>

            {/* In-Depth Core KPI Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col shadow-sm">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Total Records</span>
                <span className="text-3xl md:text-4xl font-black text-white font-sans tracking-tight">
                  {dataset.rowCount.toLocaleString()}
                </span>
                <span className="text-[10px] text-white/30 uppercase mt-2 font-mono">Data observations</span>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col shadow-sm">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Columns Found</span>
                <span className="text-3xl md:text-4xl font-black text-white font-sans tracking-tight">
                  {dataset.columnCount}
                </span>
                <span className="text-[10px] text-white/30 uppercase mt-2 font-mono">Header categories</span>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col shadow-sm">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Duplicate Rows</span>
                <span className={`text-3xl md:text-4xl font-black font-sans tracking-tight ${
                  dataset.statistics.duplicateRowsCount > 0 ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {dataset.statistics.duplicateRowsCount}
                </span>
                <span className="text-[10px] text-white/30 uppercase mt-2 font-mono">({dataset.statistics.duplicatePercentage}% ratio)</span>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col shadow-sm">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Completeness</span>
                <span className="text-3xl md:text-4xl font-black text-emerald-400 font-sans tracking-tight">
                  {dataset.statistics.overallCompleteness}%
                </span>
                <span className="text-[10px] text-white/30 uppercase mt-2 font-mono">
                  {dataset.statistics.totalMissingCells.toLocaleString()} missing cells
                </span>
              </div>
            </div>

            {/* Quick Insights Cards Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Dataset Completeness Ring Card */}
              <div className="md:col-span-1 p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">Density & Completeness</h4>
                  <p className="text-xs text-white/40 leading-relaxed mb-4">
                    Checks standard presence ratio across rows & columns. Higher ratios indicate clean data structure.
                  </p>
                </div>

                <div className="flex flex-col items-center py-4 bg-white/[0.01] rounded border border-white/5">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    {/* SVG circular progress ring */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#10b981"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 38}
                        strokeDashoffset={((100 - dataset.statistics.overallCompleteness) / 100) * (2 * Math.PI * 38)}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-xl font-bold font-sans text-white">
                        {dataset.statistics.overallCompleteness}%
                      </span>
                      <span className="text-[9px] uppercase tracking-widest text-white/40">Complete</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data quality status box */}
              <div className="md:col-span-2 p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4">Instant Validation Audits</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      {dataset.statistics.duplicateRowsCount > 0 ? (
                        <div className="p-1 rounded bg-amber-500/10 text-amber-400 mt-0.5 border border-amber-500/20">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 mt-0.5 border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-widest text-white">Duplicate Records Audit</h5>
                        <p className="text-xs text-white/45 mt-1 leading-relaxed font-sans">
                          {dataset.statistics.duplicateRowsCount > 0 
                            ? `Found ${dataset.statistics.duplicateRowsCount} duplicate records in your database file. We recommend de-duplicating this prior to visual charting mapping.`
                            : "Excellent! The uploaded dataset contains perfectly unique records throughout."
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      {dataset.statistics.totalMissingCells > 0 ? (
                        <div className="p-1 rounded bg-blue-500/[0.08] text-blue-400 mt-0.5 border border-blue-500/20">
                          <Info className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 mt-0.5 border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-widest text-white">Density Integrity Audit</h5>
                        <p className="text-xs text-white/45 mt-1 leading-relaxed font-sans">
                          {dataset.statistics.totalMissingCells > 0
                            ? `The parser observed empty cell spaces. A total of ${dataset.statistics.totalMissingCells} missing fields are present. You can view column distributions in the "Detailed Profiling" tab.`
                            : "Superb. Every metadata intersection point possesses distinct observations."
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest font-mono italic">
                    <span>Parsed successfully in-browser. All credentials stay local.</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
