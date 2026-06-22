import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  LineChart as RechartsLineChart, 
  Line, 
  AreaChart,
  Area,
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  Activity, 
  Sliders, 
  Palette,
  Layers,
  HelpCircle
} from "lucide-react";
import { Dataset } from "../types";

interface VisualizationTabProps {
  dataset: Dataset;
}

type ChartType = 'bar' | 'line' | 'pie' | 'histogram';
type AggregationMethod = 'sum' | 'average' | 'count' | 'none';
type ThemeColor = 'teal' | 'indigo' | 'coral';

export default function VisualizationTab({ dataset }: VisualizationTabProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisKey, setXAxisKey] = useState<string>("");
  const [yAxisKey, setYAxisKey] = useState<string>("");
  const [aggMethod, setAggMethod] = useState<AggregationMethod>('sum');
  const [themeColor, setThemeColor] = useState<ThemeColor>('teal');

  // Colors dictionary mapping
  const themes = {
    teal: {
      primary: "#0ea5e9", // cyan
      secondary: "#10b981", // emerald
      gradient: ["#0284c7", "#0ea5e9", "#14b8a6", "#10b981", "#22c55e"],
      barBg: "rgba(14, 165, 233, 0.8)",
      areaBg: "rgba(14, 165, 233, 0.2)"
    },
    indigo: {
      primary: "#6366f1", // indigo
      secondary: "#a855f7", // purple
      gradient: ["#4f46e5", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899"],
      barBg: "rgba(99, 102, 241, 0.8)",
      areaBg: "rgba(99, 102, 241, 0.2)"
    },
    coral: {
      primary: "#f97316", // orange
      secondary: "#ef4444", // red
      gradient: ["#ea580c", "#f97316", "#f43f5e", "#ef4444", "#f43f5e"],
      barBg: "rgba(249, 115, 22, 0.8)",
      areaBg: "rgba(249, 115, 22, 0.2)"
    }
  };

  const selectedTheme = themes[themeColor];

  // Auto-select sensible defaults when dataset changes
  React.useEffect(() => {
    if (dataset) {
      // Find first categorical/string and numerical columns
      const catCol = dataset.columns.find(c => c.type === 'categorical' || c.type === 'date' || c.type === 'boolean')?.name || dataset.headers[0];
      const numCol = dataset.columns.find(c => c.type === 'numeric')?.name || dataset.headers[0];
      setXAxisKey(catCol);
      setYAxisKey(numCol);
    }
  }, [dataset]);

  // Compiled aggregated data
  const chartData = useMemo(() => {
    if (!dataset || !xAxisKey) return [];

    // Histogram flow: Bucket single continuous numerical target
    if (chartType === 'histogram') {
      const targetCol = dataset.columns.find(c => c.name === xAxisKey);
      const isNumericCol = targetCol && targetCol.type === 'numeric';
      
      const rawNumbers = dataset.rows
        .map(r => Number(r[xAxisKey]))
        .filter(n => !isNaN(n));

      if (rawNumbers.length === 0) return [];

      // Find bounds
      rawNumbers.sort((a,b)=>a-b);
      const min = rawNumbers[0];
      const max = rawNumbers[rawNumbers.length - 1];
      const diff = max - min;
      
      // Determine bin bounds
      const binCount = Math.min(12, rawNumbers.length);
      const binWidth = diff === 0 ? 1 : diff / binCount;
      const bins = Array.from({ length: binCount }, (_, i) => {
        const binMin = min + i * binWidth;
        const binMax = binMin + binWidth;
        return {
          label: `${binMin.toFixed(1)} - ${binMax.toFixed(1)}`,
          count: 0,
          rangeStart: binMin,
          rangeEnd: binMax
        };
      });

      rawNumbers.forEach(num => {
        let placed = false;
        for (let j = 0; j < bins.length; j++) {
          const bin = bins[j];
          if (num >= bin.rangeStart && num <= bin.rangeEnd) {
            bin.count++;
            placed = true;
            break;
          }
        }
        if (!placed && rawNumbers.length > 0) {
          // Put in last
          bins[bins.length - 1].count++;
        }
      });

      return bins.map(b => ({
        name: b.label,
        "Frequency Count": b.count
      }));
    }

    // Standard Aggregation Flows
    if (aggMethod === 'none') {
      // Return raw items (slice to prevent charting clutter on massive raw datasets)
      return dataset.rows.slice(0, 100).map(r => ({
        name: String(r[xAxisKey] || ""),
        [yAxisKey]: r[yAxisKey] !== undefined && !isNaN(Number(r[yAxisKey])) ? Number(r[yAxisKey]) : r[yAxisKey]
      }));
    }

    // Grouping by X key
    const groups: Record<string, { total: number; count: number }> = {};
    dataset.rows.forEach(row => {
      const xVal = String(row[xAxisKey] || "empty");
      let yVal = 0;
      if (yAxisKey) {
        yVal = Number(row[yAxisKey]);
        if (isNaN(yVal)) yVal = 0;
      }

      if (!groups[xVal]) {
        groups[xVal] = { total: 0, count: 0 };
      }
      groups[xVal].total += yVal;
      groups[xVal].count += 1;
    });

    const results = Object.entries(groups).map(([name, stats]) => {
      let finalVal = 0;
      if (aggMethod === 'sum') {
        finalVal = stats.total;
      } else if (aggMethod === 'average') {
        finalVal = stats.count > 0 ? Number((stats.total / stats.count).toFixed(3)) : 0;
      } else if (aggMethod === 'count') {
        finalVal = stats.count;
      }

      return {
        name,
        [yAxisKey || "Record Count"]: finalVal
      };
    });

    // Sort observations for legibility (limit to top 15 values to preserve layout beauty)
    results.sort((a, b) => {
      const valA = a[yAxisKey || "Record Count"];
      const valB = b[yAxisKey || "Record Count"];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return valB - valA; // Descending
      }
      return 0;
    });

    return results.slice(0, 15);
  }, [dataset, xAxisKey, yAxisKey, aggMethod, chartType]);

  const activeYLabel = chartType === 'histogram' 
    ? "Frequency Count" 
    : (yAxisKey || "Record Count");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* Control Panel Box */}
      <div className="lg:col-span-1 p-6 rounded-2xl bg-[#0A0A0B]/40 border border-white/10 flex flex-col space-y-5 shadow-sm h-fit">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5 border-b border-white/10 pb-3">
          <Sliders className="w-3.5 h-3.5" />
          Chart Configuration
        </h4>

        {/* 1. Chart Type selector */}
        <div className="space-y-1.5">
          <label className="block text-[9px] font-black text-white/50 uppercase tracking-widest font-mono">
            Chart Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onPointerDown={() => setChartType('bar')}
              className={`p-2 py-2.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'bar' 
                  ? "bg-white text-black" 
                  : "bg-black border border-white/10 text-white/40 hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Bar
            </button>
            <button
              onPointerDown={() => setChartType('line')}
              className={`p-2 py-2.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'line' 
                  ? "bg-white text-black" 
                  : "bg-black border border-white/10 text-white/40 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Area
            </button>
            <button
              onPointerDown={() => setChartType('pie')}
              className={`p-2 py-2.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'pie' 
                  ? "bg-white text-black" 
                  : "bg-black border border-white/10 text-white/40 hover:text-white"
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              Pie
            </button>
            <button
              onPointerDown={() => setChartType('histogram')}
              className={`p-2 py-2.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'histogram' 
                  ? "bg-white text-black" 
                  : "bg-black border border-white/10 text-white/40 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Dist
            </button>
          </div>
        </div>

        {/* 2. Dimension config (xAxis) */}
        <div className="space-y-1.5">
          <label className="block text-[9px] font-black text-white/50 uppercase tracking-widest font-mono">
            {chartType === 'histogram' ? "Target Numeric Variable" : "X Axis (Dimension)"}
          </label>
          <select
            value={xAxisKey}
            onChange={(e) => setXAxisKey(e.target.value)}
            id="chart-xaxis-select"
            className="w-full bg-black border border-white10 hover:border-white/20 rounded text-[10px] text-white/80 py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-white transition-all font-sans uppercase tracking-wider"
          >
            {chartType === 'histogram' ? (
              // Filter only numeric columns for histograms
              dataset.columns.filter(c => c.type === 'numeric').map((col, idx) => (
                <option key={idx} value={col.name}>{col.name.toUpperCase()}</option>
              ))
            ) : (
              // All columns as options for dimension
              dataset.headers.map((hdr, idx) => (
                <option key={idx} value={hdr}>{hdr.toUpperCase()}</option>
              ))
            )}
          </select>
        </div>

        {/* 3. Metric config (yAxis) */}
        {chartType !== 'histogram' && (
          <div className="space-y-1.5">
            <label className="block text-[9px] font-black text-white/50 uppercase tracking-widest font-mono">
              Y Axis (Value Metric)
            </label>
            <select
              value={yAxisKey}
              onChange={(e) => setYAxisKey(e.target.value)}
              id="chart-yaxis-select"
              className="w-full bg-black border border-white10 hover:border-white/20 rounded text-[10px] text-white/80 py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-white transition-all font-sans uppercase tracking-wider"
            >
              <option value="">[COUNT RECORD ENTRIES ONLY]</option>
              {dataset.columns.filter(c => c.type === 'numeric').map((col, idx) => (
                <option key={idx} value={col.name}>{col.name.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}

        {/* 4. Aggregation selection */}
        {chartType !== 'histogram' && yAxisKey && (
          <div className="space-y-1.5">
            <label className="block text-[9px] font-black text-white/50 uppercase tracking-widest font-mono">
              Aggregation Pipeline
            </label>
            <select
              value={aggMethod}
              onChange={(e) => setAggMethod(e.target.value as AggregationMethod)}
              id="chart-aggregation-select"
              className="w-full bg-black border border-white10 hover:border-white/20 rounded text-[10px] text-white/80 py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-white transition-all font-sans uppercase tracking-wider"
            >
              <option value="sum">Sum aggregates</option>
              <option value="average">Average numeric ratio</option>
              <option value="count">Count records</option>
              <option value="none">None (Plot raw top-100 rows)</option>
            </select>
          </div>
        )}

        {/* 5. Theme Palette selection */}
        <div className="space-y-1.5 border-t border-white/10 pt-4">
          <label className="text-[9px] font-black text-white/50 uppercase tracking-widest font-mono flex items-center gap-1 mb-2">
            <Palette className="w-3 h-3" />
            Vibrant Tint Accent
          </label>
          <div className="flex gap-2.5">
            <button
              onPointerDown={() => setThemeColor('teal')}
              className={`w-6 h-6 rounded-full bg-sky-400 border-2 transition-all ${
                themeColor === 'teal' ? "border-white scale-110" : "border-transparent"
              }`}
              title="Teal Aurora"
            />
            <button
              onPointerDown={() => setThemeColor('indigo')}
              className={`w-6 h-6 rounded-full bg-indigo-500 border-2 transition-all ${
                themeColor === 'indigo' ? "border-white scale-110" : "border-transparent"
              }`}
              title="Indigo Velvet"
            />
            <button
              onPointerDown={() => setThemeColor('coral')}
              className={`w-6 h-6 rounded-full bg-orange-500 border-2 transition-all ${
                themeColor === 'coral' ? "border-white scale-110" : "border-transparent"
              }`}
              title="Sunset Coral"
            />
          </div>
        </div>

      </div>

      {/* Main Canvas Display Panel */}
      <div className="lg:col-span-3 p-6 rounded-2xl bg-[#0A0A0B]/20 border border-white/10 shadow-xl flex flex-col justify-between min-h-[460px]">
        
        {/* Title indicators */}
        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-white font-sans">
              {chartType === 'histogram' 
                ? `Distribution Histogram: ${xAxisKey}` 
                : `${aggMethod !== 'none' ? 'Aggregated ' : 'Continuous '} ${chartType.toUpperCase()} Chart`}
            </h4>
            <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mt-1">
              Dimension: <strong className="text-white font-mono text-xs">{xAxisKey}</strong> 
              {chartType !== 'histogram' && (
                <>
                  {' '}• Metric: <strong className="text-white font-mono text-xs">{xAxisKey === yAxisKey ? 'None' : yAxisKey || "Count"}</strong>
                  {yAxisKey && <> • Pipeline: <strong className="text-white font-mono text-xs uppercase">{aggMethod}</strong></>}
                </>
              )}
            </p>
          </div>
          
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest font-mono bg-black border border-white/10 px-2.5 py-1 rounded">
            Interactive Container
          </span>
        </div>

        {/* The Recharts Canvas Box */}
        <div className="flex-1 w-full min-h-[320px] flex items-center justify-center">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              {chartType === 'bar' ? (
                <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="2 2" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255, 255, 255, 0.4)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="rgba(255, 255, 255, 0.4)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "4px", fontFamily: "sans-serif" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: "11px" }}
                    itemStyle={{ color: selectedTheme.primary, fontSize: "12px" }}
                  />
                  <Bar 
                    dataKey={activeYLabel} 
                    fill={selectedTheme.primary} 
                    maxBarSize={55}
                  />
                </RechartsBarChart>
              ) : chartType === 'line' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={selectedTheme.primary} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={selectedTheme.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="2 2" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255, 255, 255, 0.4)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="rgba(255, 255, 255, 0.4)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "4px", fontFamily: "sans-serif" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: "11px" }}
                    itemStyle={{ color: selectedTheme.primary, fontSize: "12px" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={activeYLabel} 
                    stroke={selectedTheme.primary} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorArea)" 
                  />
                </AreaChart>
              ) : chartType === 'pie' ? (
                <RechartsPieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "4px", fontFamily: "sans-serif" }}
                    itemStyle={{ fontSize: "12px", color: "#f8fafc" }}
                  />
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={105}
                    fill="#8884d8"
                    dataKey={activeYLabel}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={selectedTheme.gradient[index % selectedTheme.gradient.length]} 
                        stroke="#0a0a0b"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    iconSize={8}
                    formatter={(val) => <span className="text-[9px] text-white/50 uppercase tracking-widest font-mono font-black">{val}</span>}
                  />
                </RechartsPieChart>
              ) : (
                // Histograms represented by continuous bin bars
                <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="2 2" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255, 255, 255, 0.4)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="rgba(255, 255, 255, 0.4)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "4px", fontFamily: "sans-serif" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: "11px" }}
                    itemStyle={{ color: selectedTheme.secondary, fontSize: "12px" }}
                  />
                  <Bar 
                    dataKey="Frequency Count" 
                    fill={selectedTheme.secondary} 
                  />
                </RechartsBarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center text-center max-w-sm space-y-3">
              <HelpCircle className="w-10 h-10 text-white/20 animate-pulse" />
              <h4 className="text-xs font-black uppercase tracking-widest text-white/50">Unable to project metrics</h4>
              <p className="text-xs text-white/30 leading-relaxed font-sans uppercase tracking-wider">
                Make sure to select valid variables. A histogram expects continuous numeric ranges, while standard charts plot categories.
              </p>
            </div>
          )}
        </div>

        {/* Footer info details */}
        <div className="text-[9px] text-white/30 uppercase tracking-widest border-t border-white/10 pt-4 flex flex-col sm:flex-row justify-between gap-2 font-mono">
          <span>Displaying up to 15 key-sorted categorical buckets.</span>
          <span>Scroll mouse/hover on chart objects to audit exact quantities on-the-spot.</span>
        </div>

      </div>
    </div>
  );
}
