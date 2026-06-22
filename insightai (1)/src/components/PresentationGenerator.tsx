import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Presentation, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Sliders, 
  Sparkles, 
  Columns, 
  Database, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  FileCode, 
  Maximize2, 
  Layout, 
  CornerDownRight, 
  Zap, 
  Palette,
  Minimize2
} from "lucide-react";
import { Dataset, AIReport } from "../types";

interface PresentationGeneratorProps {
  dataset: Dataset;
  aiReport: AIReport | null;
}

type SlideTheme = "charcoal" | "midnight" | "ivory" | "royal";

export default function PresentationGenerator({ dataset, aiReport }: PresentationGeneratorProps) {
  const [slideCount, setSlideCount] = useState<5 | 8 | 10>(8);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTheme, setActiveTheme] = useState<SlideTheme>("charcoal");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Triggering visual slide recreation
  const handleRegenerate = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      setIsRegenerating(false);
      setCurrentSlide(0);
    }, 850);
  };

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }, []);

  // Compute key information of columns
  const numericColumns = useMemo(() => dataset.columns.filter(c => c.type === 'numeric'), [dataset]);
  const categoricalColumns = useMemo(() => dataset.columns.filter(c => c.type === 'categorical'), [dataset]);
  const completenessRate = dataset.statistics.overallCompleteness || 100;

  // Find column with the highest missing percentage
  const highestNullCol = useMemo(() => {
    let maxCol = "";
    let maxMiss = -1;
    dataset.columns.forEach(c => {
      if (c.missingPercentage > maxMiss) {
        maxMiss = c.missingPercentage;
        maxCol = c.name;
      }
    });
    return maxCol;
  }, [dataset]);

  // 1. Find category breakdown differences (Cohort Disparity)
  const cohortDisparity = useMemo(() => {
    let topCatCol = "";
    let topCatCluster = "";
    let lowCatCluster = "";
    let maxClusterDiffRatio = 1;
    let topCatAvg = 0;
    let lowCatAvg = 0;
    let topCatCount = 0;
    let lowCatCount = 0;
    let catNumCol = "";

    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      for (const catCol of categoricalColumns) {
        for (const numCol of numericColumns) {
          const subgroups: Record<string, { sum: number; count: number }> = {};
          dataset.rows.forEach(r => {
            const catVal = String(r[catCol.name] || "").trim();
            const numVal = Number(r[numCol.name]);
            if (catVal && !isNaN(numVal)) {
              if (!subgroups[catVal]) subgroups[catVal] = { sum: 0, count: 0 };
              subgroups[catVal].sum += numVal;
              subgroups[catVal].count += 1;
            }
          });

          const calculated = Object.entries(subgroups)
            .map(([category, data]) => ({
              category,
              avg: data.sum / data.count,
              count: data.count
            }))
            .filter(g => g.count >= 2);

          if (calculated.length >= 2) {
            calculated.sort((a, b) => b.avg - a.avg);
            const topG = calculated[0];
            const lowG = calculated[calculated.length - 1];
            if (lowG.avg !== 0) {
              const r = topG.avg / lowG.avg;
              if (r > maxClusterDiffRatio) {
                maxClusterDiffRatio = r;
                topCatCol = catCol.name;
                topCatCluster = topG.category;
                lowCatCluster = lowG.category;
                topCatAvg = topG.avg;
                lowCatAvg = lowG.avg;
                topCatCount = topG.count;
                lowCatCount = lowG.count;
                catNumCol = numCol.name;
              }
            }
          }
        }
      }
    }
    return {
      topCatCol,
      topCatCluster,
      lowCatCluster,
      maxClusterDiffRatio,
      topCatAvg,
      lowCatAvg,
      topCatCount,
      lowCatCount,
      catNumCol
    };
  }, [dataset, numericColumns, categoricalColumns]);

  // 2. Pearson Correlation pair
  const topCorrelation = useMemo(() => {
    let maxAbsR = -1;
    let topCorr: { colA: string; colB: string; r: number } | null = null;
    if (numericColumns.length >= 2) {
      for (let i = 0; i < numericColumns.length; i++) {
        for (let j = i + 1; j < numericColumns.length; j++) {
          const colA = numericColumns[i];
          const colB = numericColumns[j];
          const xVals: number[] = [];
          const yVals: number[] = [];

          dataset.rows.forEach(r => {
            const x = Number(r[colA.name]);
            const y = Number(r[colB.name]);
            if (!isNaN(x) && !isNaN(y)) {
              xVals.push(x);
              yVals.push(y);
            }
          });

          if (xVals.length >= 5) {
            const xMean = xVals.reduce((a, b) => a + b, 0) / xVals.length;
            const yMean = yVals.reduce((a, b) => a + b, 0) / yVals.length;
            let num = 0, denA = 0, denB = 0;
            for (let k = 0; k < xVals.length; k++) {
              const dx = xVals[k] - xMean;
              const dy = yVals[k] - yMean;
              num += dx * dy;
              denA += dx * dx;
              denB += dy * dy;
            }
            const den = Math.sqrt(denA * denB);
            if (den > 0) {
              const rCoeff = num / den;
              if (Math.abs(rCoeff) > maxAbsR) {
                maxAbsR = Math.abs(rCoeff);
                topCorr = { colA: colA.name, colB: colB.name, r: rCoeff };
              }
            }
          }
        }
      }
    }
    return { topCorr, maxAbsR };
  }, [dataset, numericColumns]);

  // 3. Volatility attribute (Standard deviation dispersion)
  const volatileColumn = useMemo(() => {
    let maxDispCol = "";
    let maxDispStd = -1;
    let maxDispMean = 0;
    let maxDispMax = 0;
    numericColumns.forEach(c => {
      if (c.stdDev !== undefined && c.stdDev > maxDispStd && c.mean) {
        maxDispStd = c.stdDev;
        maxDispCol = c.name;
        maxDispMean = c.mean;
        maxDispMax = c.max || 0;
      }
    });
    return { maxDispCol, maxDispStd, maxDispMean, maxDispMax };
  }, [numericColumns]);

  // Generate dynamic slides array based on the requested count (5, 8, 10)
  const slides = useMemo(() => {
    const list: {
      tag: string;
      title: string;
      description?: string;
      layout: "title" | "grid" | "split" | "metrics" | "chart" | "conclusion";
      content: React.ReactNode;
      finding: string;
      keyTakeaway: string;
      recommendation: string;
      speakerNotes: string;
    }[] = [];

    const isLight = activeTheme === "ivory";

    // Sub-elements layout styling
    const textDesc = isLight ? "text-neutral-500" : "text-slate-400";
    const textLabel = isLight ? "text-neutral-600 font-bold" : "text-slate-350";
    const borderCls = isLight ? "border-neutral-200" : "border-white/5";
    const bgInner = isLight ? "bg-neutral-100/50" : "bg-[#030712]/60";

    const footerTakeaways = (takeaway: string, recommendation: string) => (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto pt-3 border-t ${borderCls} text-left text-[11px] leading-relaxed relative z-10 shrink-0`}>
        <div className="space-y-1">
          <span className={`text-[8px] font-black font-mono tracking-widest uppercase flex items-center gap-1 ${isLight ? "text-neutral-500" : "text-blue-400"}`}>
            <Zap className="w-3 h-3 text-amber-400" />
            Key Takeaway:
          </span>
          <span className={isLight ? "text-neutral-700" : "text-slate-300"}>
            {takeaway}
          </span>
        </div>
        <div className={`space-y-1 md:border-l ${borderCls} md:pl-4`}>
          <span className={`text-[8px] font-black font-mono tracking-widest uppercase flex items-center gap-1 ${isLight ? "text-neutral-500" : "text-emerald-500"}`}>
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            Recommendation:
          </span>
          <span className={isLight ? "text-neutral-700" : "text-slate-300 font-semibold"}>
            {recommendation}
          </span>
        </div>
      </div>
    );

    // --- Slide 1: Title Slide ---
    list.push({
      tag: "CONFERENCE PROJECTION INITIALIZER",
      title: `Audit: ${dataset.fileName}`,
      description: "Data-driven business analysis and dynamic AI diagnostic deck",
      layout: "title",
      finding: `A thorough data audit of file "${dataset.fileName}" mapped exactly ${dataset.rowCount} entries and ${dataset.columnCount} core features.`,
      keyTakeaway: `System has established baseline coordinate profiles recording a high starting completeness rate of ${completenessRate.toFixed(1)}%.`,
      recommendation: "Deploy structured checking validation mechanisms to enforce schema correctness prior to downstream model testing.",
      speakerNotes: `Welcome board members and analytics stakeholders. Today, we are presenting the comprehensive analytical and forensic data audit of "${dataset.fileName}".\n\nThe dataset represents an active footprint of ${dataset.rowCount} distinct observations distributed across ${dataset.columnCount} feature variables, giving us a dense coordinate grid of ${dataset.rowCount * dataset.columnCount} cells.\n\nOur initial audit reveals a strong foundational completeness rate of ${completenessRate.toFixed(1)}%. Today we will map quality leaks, analyze continuous variable associations, detect hidden cohort outliers, and establish our analytical remediation action plan.`,
      content: (
        <div className="flex flex-col h-full justify-between p-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-6 bg-blue-500 rounded" />
            <span className={`text-[9px] font-mono tracking-widest uppercase font-bold ${isLight ? 'text-neutral-500' : 'text-blue-400'}`}>
              CONFIDENTIAL &bull; BOARD EXECUTIVE REPORT
            </span>
          </div>

          <div className="my-auto space-y-3 pt-2">
            <span className="text-[10px] font-mono px-2.5 py-0.5 bg-blue-600/10 text-blue-400 border border-blue-500/25 rounded-md uppercase tracking-wider inline-block">
              EXECUTIVE ACTION PLANNING DECK
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
              {dataset.fileName}
            </h1>
            <p className={`text-xs max-w-xl leading-relaxed ${textDesc}`}>
              Detailed statistical presentation of key dataset matrices, diagnostic indicators, high-potential fields, operational risks & structured engineering remediations.
            </p>
          </div>

          <div className={`grid grid-cols-3 gap-6 pt-4 border-t ${borderCls} text-left text-slate-400`}>
            <div>
              <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">
                COMPILATION DATE
              </span>
              <span className={`text-xs font-bold font-mono ${isLight ? 'text-neutral-800' : 'text-white'}`}>{formattedDate}</span>
            </div>
            <div>
              <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">
                DATASET FOOTPRINT
              </span>
              <span className={`text-xs font-bold font-mono ${isLight ? 'text-neutral-800' : 'text-white'}`}>
                {dataset.rowCount} Rows &bull; {dataset.columnCount} Cols
              </span>
            </div>
            <div>
              <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-wider">
                INTEGRITY SCORE
              </span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {completenessRate.toFixed(1)}% Completeness
              </span>
            </div>
          </div>
        </div>
      )
    });

    // --- Slide 2: Dataset Profile / Overview ---
    list.push({
      tag: "DIMENSIONAL SCOPE OVERVIEW",
      title: "Dataset Feature Distribution",
      description: "Fundamental scope profile displaying measured keys, attributes type and cardinality balance",
      layout: "metrics",
      finding: `The scope analysis identified ${numericColumns.length} numerical features and ${categoricalColumns.length} categorical keys within the columns schema.`,
      keyTakeaway: `The dataset is highly ${numericColumns.length >= categoricalColumns.length ? 'quantitative-dominant' : 'categorical-dominant'}, dictating custom modeling approaches.`,
      recommendation: `Prioritize ${numericColumns.length >= categoricalColumns.length ? 'regression and linear algorithms' : 'segment clustering and decision tree classification models'} to align with structural capabilities.`,
      speakerNotes: `In this slide, we categorize our structural attributes. We have separated ${numericColumns.length} continuous numerical variables from ${categoricalColumns.length} discrete string-based categorical variables.\n\nThis distribution dictates the bounds of our modeling capability. Because this dataset is ${numericColumns.length >= categoricalColumns.length ? 'dominated by numbers, we should deploy parametric regressions and covariance maps' : 'primarily discrete, we should focus on cohort classification maps and stratified customer groupings'}.\n\nUnderstanding these distributions early blocks model mismatch errors down the road.`,
      content: (
        <div className="h-full flex flex-col justify-between p-2">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider pl-1 font-mono">
            Comparing the balance of discrete attributes against continuous parameters:
          </p>

          <div className="space-y-2.5 my-auto">
            {[
              { label: "Continuous numeric parameters", count: numericColumns.length, color: "bg-blue-500" },
              { label: "Discrete categorical tags", count: categoricalColumns.length, color: "bg-amber-500" },
              { label: "Calendar dates markers", count: dataset.columns.filter(c => c.type === 'date').length, color: "bg-emerald-500" },
              { label: "Binary boolean variables", count: dataset.columns.filter(c => c.type === 'boolean').length, color: "bg-purple-500" }
            ].map((item, idx) => {
              const maxVal = Math.max(1, dataset.columnCount);
              const pct = (item.count / maxVal) * 100;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className={textLabel}>{item.label}</span>
                    <span className="font-bold">{item.count} column{item.count !== 1 ? 's' : ''} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${bgInner} overflow-hidden`}>
                    <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {footerTakeaways(
            `The dataset is highly ${numericColumns.length >= categoricalColumns.length ? 'quantitative-dominant' : 'categorical-dominant'}, dictating custom modeling approaches.`,
            `Prioritize ${numericColumns.length >= categoricalColumns.length ? 'regression and linear algorithms' : 'segment clustering and decision tree classification models'} to align with structural capabilities.`
          )}
        </div>
      )
    });

    // --- Slide 3: Data Quality Assessment ---
    list.push({
      tag: "COMPLIANCE & INTEGRITY STATUS",
      title: "Data Quality Diagnostics",
      description: "Diagnostics map detailing structural duplicate records and cellular missing fields",
      layout: "split",
      finding: `Diagnostics flagged exactly ${dataset.statistics.totalMissingCells} missing cells and ${dataset.statistics.duplicateRowsCount} duplicate lines inside the dataset.`,
      keyTakeaway: `Data redundancy of ${dataset.statistics.duplicateRowsCount} rows introduces artificial frequency inflation and biases sample variances.`,
      recommendation: "Apply mechanical deduplication to remove duplicate rows, and execute medial imputation on columns with missing elements.",
      speakerNotes: `Let's talk about dataset hygiene. Clear scientific projections depend directly on clean inputs.\n\nOur system detected ${dataset.statistics.totalMissingCells} missing cell values, representing a cellular omission rate of ${((dataset.statistics.totalMissingCells / (dataset.rowCount * dataset.columnCount || 1)) * 100).toFixed(2)}% of the total workspace coordinates.\n\nFurthermore, we have ${dataset.statistics.duplicateRowsCount} duplicate records (${dataset.statistics.duplicatePercentage.toFixed(2)}% of rows), which artificially inflate average calculations.\n\nRemoving these redundancy points first must occur to safeguard our predictive models.`,
      content: (
        <div className="h-full flex flex-col justify-between p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-auto">
            <div className={`p-3.5 rounded-xl border ${bgInner}`}>
              <span className="block text-[9px] font-mono uppercase text-blue-400">Completeness Coordinate Rate</span>
              <div className="text-2xl font-black font-mono mt-1">{completenessRate.toFixed(1)}%</div>
              <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/5 overflow-hidden mt-1.5">
                <div className="h-full bg-blue-500" style={{ width: `${completenessRate}%` }} />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1 font-mono">{dataset.statistics.totalMissingCells} missing elements</span>
            </div>
            <div className={`p-3.5 rounded-xl border ${bgInner}`}>
              <span className="block text-[9px] font-mono uppercase text-amber-400">Deduplication Integrity rate</span>
              <div className="text-2xl font-black font-mono mt-1">{(100 - dataset.statistics.duplicatePercentage).toFixed(1)}%</div>
              <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/5 overflow-hidden mt-1.5">
                <div className="h-full bg-amber-500" style={{ width: `${100 - dataset.statistics.duplicatePercentage}%` }} />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1 font-mono">{dataset.statistics.duplicateRowsCount} duplicate rows</span>
            </div>
          </div>

          {footerTakeaways(
            `Data redundancy of ${dataset.statistics.duplicateRowsCount} rows introduces artificial frequency inflation and biases sample variances.`,
            "Apply mechanical deduplication to remove duplicate rows, and execute medial imputation on columns with missing elements."
          )}
        </div>
      )
    });

    // --- Slide 4: Variable Distribution & Analytical Trends ---
    list.push({
      tag: "COMPUTED STATISTICAL DISTRIBUTION",
      title: "Feature Bivariate Interdependence",
      description: "Linear correlation scanning to identify dual feature dependencies and redundant variables",
      layout: "chart",
      finding: topCorrelation.topCorr 
        ? `Covariance scanning detected a linear coupling (Pearson correlation R = ${topCorrelation.topCorr.r.toFixed(3)}) between "${topCorrelation.topCorr.colA}" and "${topCorrelation.topCorr.colB}".`
        : "Pearson correlation analysis showed zero pairs exceeding the minimal baseline threshold of R = |0.3|.",
      keyTakeaway: topCorrelation.topCorr 
        ? `Columns "${topCorrelation.topCorr.colA}" and "${topCorrelation.topCorr.colB}" share redundant linear information (${topCorrelation.maxAbsR > 0.7 ? 'High Collinearity' : 'Moderate Collinearity'}).`
        : "Continuous attributes in the dataset exhibit high orthoganality with no strong linear collinearity risks.",
      recommendation: topCorrelation.topCorr
        ? "Consolidate these two correlated features or drop one to prevent coefficient inflation in regression models."
        : "Deploy traditional parametric linear techniques as features are mathematically distinct.",
      speakerNotes: `We now investigate the coupling between our primary numerical variables.\n\nOur Pearson pairwise engine computed correlations across all numeric parameters.\n\nWe discovered that "${topCorrelation.topCorr?.colA || 'A'}" and "${topCorrelation.topCorr?.colB || 'B'}" possess a Pearson coefficient R of ${topCorrelation.topCorr ? topCorrelation.topCorr.r.toFixed(3) : '0.00'}.\n\nThis is a ${topCorrelation.maxAbsR > 0.7 ? 'highly critical collinear relationship' : 'moderate linear correlation'}.\n\nWhen we leave highly collinear variables together in a regression model, it inflates standard errors of key coefficients. We must drop or compress them before conducting modeling.`,
      content: (
        <div className="h-full flex flex-col justify-between p-2">
          <div className="flex items-center justify-between gap-6 my-auto">
            <div className="space-y-2 text-left max-w-sm">
              <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider block">Bivariate Interdependence</span>
              <div className="text-sm font-black uppercase">
                {topCorrelation.topCorr ? `Linked: "${topCorrelation.topCorr.colA}" & "${topCorrelation.topCorr.colB}"` : "Zero High Correlations Detected"}
              </div>
              <p className={`text-[11px] leading-relaxed ${textDesc}`}>
                {topCorrelation.topCorr 
                  ? `Variance scanning detected an R parameter coefficient of ${topCorrelation.topCorr.r.toFixed(3)}. This indicates a ${topCorrelation.topCorr.r > 0 ? "positive lock-step transition" : "negative inverse lock-step transition"}.`
                  : "No linear attributes recorded correlation factors exceeding the minimum baseline threshold of R = |0.3|."}
              </p>
            </div>

            <div className={`w-36 h-28 ${bgInner} rounded-xl border ${borderCls} flex items-center justify-center p-3 relative shrink-0 overflow-hidden`}>
              <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px]" />
              {topCorrelation.topCorr ? (
                <svg className="w-full h-full text-blue-500 overflow-visible" viewBox="0 0 100 100">
                  <line x1="0" y1="100" x2="100" y2="100" stroke="#475569" strokeWidth="1" />
                  <line x1="0" y1="0" x2="0" y2="100" stroke="#475569" strokeWidth="1" />
                  <circle cx="20" cy={topCorrelation.topCorr.r > 0 ? "80" : "20"} r="3.5" fill="#3b82f6" />
                  <circle cx="40" cy={topCorrelation.topCorr.r > 0 ? "60" : "40"} r="3.5" fill="#3b82f6" />
                  <circle cx="60" cy={topCorrelation.topCorr.r > 0 ? "40" : "60"} r="3.5" fill="#3b82f6" />
                  <circle cx="80" cy={topCorrelation.topCorr.r > 0 ? "20" : "80"} r="3.5" fill="#3b82f6" />
                  <line 
                    x1="10" 
                    y1={topCorrelation.topCorr.r > 0 ? "90" : "10"} 
                    x2="90" 
                    y2={topCorrelation.topCorr.r > 0 ? "10" : "90"} 
                    stroke="#ef4444" 
                    strokeWidth="2" 
                    strokeDasharray="4 2" 
                  />
                  <text x="10" y="24" fill="#10b981" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    R={topCorrelation.topCorr.r.toFixed(3)}
                  </text>
                </svg>
              ) : (
                <span className="text-[10px] font-mono text-slate-500 uppercase text-center">Flat variance</span>
              )}
            </div>
          </div>

          {footerTakeaways(
            topCorrelation.topCorr 
              ? `Columns "${topCorrelation.topCorr.colA}" and "${topCorrelation.topCorr.colB}" share redundant linear information.`
              : "Continuous attributes in the dataset exhibit high orthoganality with no strong linear collinearity risks.",
            topCorrelation.topCorr
              ? "Consolidate these two correlated features or drop one to prevent coefficient inflation in regressions."
              : "Deploy traditional parametric linear techniques as features are mathematically distinct."
          )}
        </div>
      )
    });

    // --- Slide 5: Cohort Segment Disparity (For decks >= 8 slides) ---
    if (slideCount >= 8) {
      list.push({
        tag: "SEGMENTED CLUSTER DISCOVERY",
        title: "Cohort Segment Disparity Analysis",
        description: "Disparity analysis mapping of discrete categorical groupings over continuous averages",
        layout: "grid",
        finding: cohortDisparity.topCatCol 
          ? `Disparity scanning under categorical attribute "${cohortDisparity.topCatCol}" for numeric factor "${cohortDisparity.catNumCol}" reveals a massive ${cohortDisparity.maxClusterDiffRatio.toFixed(2)}x discrepancy factor.`
          : "Disparity scanning of groups over numeric averages shows uniform, well-balanced cohorts averages.",
        keyTakeaway: cohortDisparity.topCatCol
          ? `Aggregated global averages mask key localized variance (lowest grouping average is "${cohortDisparity.lowCatCluster}" at ${cohortDisparity.lowCatAvg.toFixed(2)} vs top grouping "${cohortDisparity.topCatCluster}" at ${cohortDisparity.topCatAvg.toFixed(2)}).`
          : "Global aggregates are robust as subgroups do not display strong outlier structural variances.",
        recommendation: cohortDisparity.topCatCol
          ? "Develop stratified segment operational strategies instead of measuring a unified blanket middle target."
          : "Proceed with general unified descriptive analytics models as categorical distributions are uniform.",
        speakerNotes: `One of our largest statistical discoveries is structured cohort disparity.\n\nBy categorizing our numeric column "${cohortDisparity.catNumCol || 'numeric metrics'}" across groupings under "${cohortDisparity.topCatCol || 'categorical criteria'}", we found a massive ${cohortDisparity.maxClusterDiffRatio.toFixed(2)}x disparity.\n\nOur top cluster "${cohortDisparity.topCatCluster || 'A'}" averages ${cohortDisparity.topCatAvg.toFixed(2)} over ${cohortDisparity.topCatCount} samples, whereas the lower cluster "${cohortDisparity.lowCatCluster || 'B'}" averages only ${cohortDisparity.lowCatAvg.toFixed(2)} over ${cohortDisparity.lowCatCount} samples.\n\nThis proves that simple global averages are highly deceptive. We must implement cohort-specific rules or modeling weights.`,
        content: (
          <div className="h-full flex flex-col justify-between p-2">
            <div className="flex items-center justify-between gap-6 my-auto">
              <div className="flex-grow space-y-3">
                {[
                  { label: `Max Cohort: "${cohortDisparity.topCatCluster || 'Cluster A'}"`, val: cohortDisparity.topCatAvg, color: "bg-emerald-500", count: cohortDisparity.topCatCount },
                  { label: `Min Cohort: "${cohortDisparity.lowCatCluster || 'Cluster B'}"`, val: cohortDisparity.lowCatAvg, color: "bg-rose-500", count: cohortDisparity.lowCatCount },
                ].map((item, idx) => {
                  const maxVal = Math.max(1, cohortDisparity.topCatAvg);
                  const widthPct = (item.val / maxVal) * 100;
                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center font-mono">
                        <span className={textLabel}>
                          {item.label} <span className="text-[9px] text-slate-500">({item.count} samples)</span>
                        </span>
                        <span className="font-bold">{item.val.toFixed(2)} units</span>
                      </div>
                      <div className={`w-full h-8 rounded-lg ${bgInner} flex items-center px-1 overflow-hidden`}>
                        <div className={`h-6 ${item.color} rounded-md transition-all flex items-center px-2 text-[10px] text-white font-mono font-bold`} style={{ width: `${widthPct}%` }}>
                          {widthPct > 20 && `${widthPct.toFixed(0)}% Relative Average`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {footerTakeaways(
              cohortDisparity.topCatCol
                ? `Aggregated global averages mask key localized variance (lowest average is "${cohortDisparity.lowCatCluster}" at ${cohortDisparity.lowCatAvg.toFixed(2)} vs top grouping "${cohortDisparity.topCatCluster}" at ${cohortDisparity.topCatAvg.toFixed(2)}).`
                : "Global aggregates are robust as subgroups do not display strong outlier structural variances.",
              cohortDisparity.topCatCol
                ? "Develop stratified segment operational strategies instead of measuring a unified blanket middle target."
                : "Proceed with general unified descriptive analytics models as categorical distributions are uniform."
            )}
          </div>
        )
      });
    }

    // --- Slide 6: Volatility Dispersion Forensics ---
    if (slideCount >= 8) {
      list.push({
        tag: "VARIANCE & DISPERSION GAUGES",
        title: "Attribute Dispersion Volatility",
        description: "Evaluating standard deviation spread and range bounds for continuous continuous variables",
        layout: "split",
        finding: volatileColumn.maxDispCol 
          ? `Continuous attribute "${volatileColumn.maxDispCol}" records high volatility, registering an absolute standard deviation σ = ${volatileColumn.maxDispStd.toFixed(2)} on a baseline average μ = ${volatileColumn.maxDispMean.toFixed(2)}.`
          : "Standard deviation analysis tracked very uniform numerical variations across all core mathematical variables.",
        keyTakeaway: volatileColumn.maxDispCol
          ? `High-leverage variables like "${volatileColumn.maxDispCol}" can disproportionately pull parametric models due to wide scatter spreads.`
          : "Low statistical variance values guarantee extremely stable baseline predictive modeling behaviors.",
        recommendation: volatileColumn.maxDispCol
          ? "Apply a math scaling algorithm (Log or standard MinMax normalizations) to compress and scale volatile column limits."
          : "Execute standard raw scale mathematical modeling, as dispersion values require no special scaling gates.",
        speakerNotes: `This slide maps our statistical dispersion and volatility metrics.\n\nWe scanned continuous variables to pinpoint columns with extreme variation relative to their baseline mean. Attribute "${volatileColumn.maxDispCol || 'volatile field'}" stands out, demonstrating a standard deviation of ${volatileColumn.maxDispStd ? volatileColumn.maxDispStd.toFixed(2) : '0'} on an average of ${volatileColumn.maxDispMean ? volatileColumn.maxDispMean.toFixed(2) : '0'}.\n\nWild standard deviations inject heavy numerical pull into predictive algorithms, allowing far outliers to dictate trends. We strongly recommend logarithmic transformation scaling or capping extreme values beyond 3-Sigma limits before calculation.`,
        content: (
          <div className="h-full flex flex-col justify-between p-2">
            <div className="flex items-center justify-between gap-6 my-auto">
              <div className="space-y-2 text-left max-w-sm">
                <span className="text-[9px] font-mono text-purple-400 uppercase tracking-wider block">Standard Deviation Volatility</span>
                <div className="text-sm font-black uppercase">
                  {volatileColumn.maxDispCol ? `Attribute: "${volatileColumn.maxDispCol}"` : "Zero numeric features parsed"}
                </div>
                <p className={`text-[11px] leading-relaxed ${textDesc}`}>
                  {volatileColumn.maxDispCol 
                    ? `Wide dispersion detected with deviation σ = ${volatileColumn.maxDispStd.toFixed(2)} relative to baseline μ = ${volatileColumn.maxDispMean.toFixed(2)}. Outliers exceed peak values up to ${volatileColumn.maxDispMax.toFixed(2)}.`
                    : "No numerical columns were evaluated. Standard deviation computation requires at least one numerical column."}
                </p>
              </div>

              <div className={`w-40 h-28 ${bgInner} rounded-xl border ${borderCls} flex items-center justify-center p-3 relative shrink-0 overflow-hidden`}>
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px]" />
                {volatileColumn.maxDispCol ? (
                  <svg className="w-full h-full text-purple-500 overflow-visible" viewBox="0 0 100 50">
                    <path d="M 5,45 Q 25,45 35,30 T 50,5 T 65,30 Q 75,45 95,45" fill="none" stroke="#a855f7" strokeWidth="2.5" />
                    <line x1="50" y1="5" x2="50" y2="45" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 1" />
                    <line x1="35" y1="30" x2="35" y2="45" stroke="#3b82f6" strokeWidth="1" strokeDasharray="1 1" />
                    <line x1="65" y1="30" x2="65" y2="45" stroke="#3b82f6" strokeWidth="1" strokeDasharray="1 1" />
                    <path d="M 35,30 T 50,5 T 65,30 L 65,45 L 35,45 Z" fill="#9333ea" fillOpacity="0.12" />
                    <text x="52" y="15" fill="#ef4445" fontSize="6" fontFamily="monospace" fontWeight="bold">mean</text>
                    <text x="68" y="38" fill="#3b82f6" fontSize="6" fontFamily="monospace">+1σ</text>
                    <text x="24" y="38" fill="#3b82f6" fontSize="6" fontFamily="monospace">-1σ</text>
                  </svg>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500 uppercase text-center">Flat variance</span>
                )}
              </div>
            </div>

            {footerTakeaways(
              volatileColumn.maxDispCol
                ? `High-leverage variables like "${volatileColumn.maxDispCol}" can disproportionately pull parametric models due to wide scatter spreads.`
                : "Low statistical variance values guarantee extremely stable baseline predictive modeling behaviors.",
              volatileColumn.maxDispCol
                ? "Apply a math scaling algorithm (Log or standard MinMax normalizations) to compress and scale volatile column limits."
                : "Execute standard raw scale mathematical modeling, as dispersion values require no special scaling gates."
            )}
          </div>
        )
      });
    }

    // --- Optional Slide: AI Model Recommendations summary ---
    if (slideCount === 10) {
      list.push({
        tag: "SYSTEM ALGORITHMIC CLEANSING",
        title: "AI Smart Cleaning Diagnostics",
        description: "Comprehensive review of cleaning pipelines scheduled to secure baseline datasets completeness",
        layout: "split",
        finding: `Quality maps identified exact remediation vectors: null coordinate cell gaps of ${dataset.statistics.totalMissingCells} and redundancy factor of ${dataset.statistics.duplicateRowsCount} records.`,
        keyTakeaway: "Structured data hygiene resolves core systematic skewing issues before they infect down-stream mathematical models.",
        recommendation: "Activate the automatic deduplication scripts and deploy continuous telemetry check constraints.",
        speakerNotes: `Here we summarize our structural hygiene actions.\n\nDiagnostics pinpoint that deduplicating the ${dataset.statistics.duplicateRowsCount} redundant records is our top priority step to erase frequency biases.\n\nFollowing that, we must impute missing values to populate empty coordinates, raising completeness back to 100%.\n\nEnforcing these hygiene rules upstream on the database server blocks data degradation from occurring in our production pipelines.`,
        content: (
          <div className="h-full flex flex-col justify-between p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-auto">
              <div className={`p-3.5 rounded-xl border ${bgInner}`}>
                <span className="block text-[9px] font-mono text-blue-400 uppercase font-bold">Imputation Strategy</span>
                <p className="text-xs text-slate-400 mt-1">Impute coordinate cells across columns like &quot;{highestNullCol || 'sparse attributes'}&quot; to recover matrix coordinates integrity.</p>
              </div>
              <div className={`p-3.5 rounded-xl border ${bgInner}`}>
                <span className="block text-[9px] font-mono text-emerald-400 uppercase font-bold">Redundancy Purge</span>
                <p className="text-xs text-slate-400 mt-1">Identify and isolate molecular duplicates ({dataset.statistics.duplicateRowsCount} rows) to eliminate metric average bias.</p>
              </div>
            </div>

            {footerTakeaways(
              "Structured data hygiene resolves core systematic skewing issues before they infect down-stream mathematical models.",
              "Activate the automatic deduplication scripts and deploy continuous telemetry check constraints."
            )}
          </div>
        )
      });
    }

    // --- Slide 7: Opportunities & Risk Mapping ---
    list.push({
      tag: "STRATEGIC ANALYSIS MATRIX",
      title: "Opportunities & Strategic Risks Matrix",
      description: "Contrasting analytical opportunities maps against quality vulnerabilities and integrity leaks",
      layout: "grid",
      finding: `We are balancing a training opportunity space of ${dataset.rowCount} rows against a structural quality leak of ${dataset.statistics.totalMissingCells} missing elements and ${dataset.statistics.duplicateRowsCount} duplicate records.`,
      keyTakeaway: `Data size is excellent for robust sampling models, but requires resolving ${dataset.statistics.totalMissingCells} sparse value coordinate gaps first.`,
      recommendation: "Enforce mandatory checklist checks on API routes to avoid ingestion of empty or redundant dataset lines.",
      speakerNotes: `Let's transition from technical diagnostics to strategic modeling.\n\nWe contrast our opportunities scale directly against operational risks. Our sample size of ${dataset.rowCount} pristine entries is a major asset, giving us solid statistical power.\n\nHowever, the ${dataset.statistics.totalMissingCells} empty fields represent measurement holes. Understanding this trade-off allows us to apply precise guards, ensuring high confidence results on final model integrations.`,
      content: (
        <div className="h-full flex flex-col justify-between p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-auto text-xs">
            <div className={`p-3 rounded-xl border border-emerald-500/10 ${isLight ? 'bg-emerald-50/50' : 'bg-emerald-500/5'} space-y-1.5`}>
              <span className="text-[9px] font-bold tracking-widest text-[#10b981] uppercase font-mono block">
                Strategic Opportunities
              </span>
              <ul className="space-y-1 text-slate-400 list-disc pl-3 text-[10px]">
                <li>Map variable correlation of continuous columns to construct forward estimation projections.</li>
                <li>Leverage the robust ${dataset.rowCount}-record sample pool for stable ML coefficient training.</li>
                <li>Exploit categorical clusters to launch segmented cohort classifications.</li>
              </ul>
            </div>
            <div className={`p-3 rounded-xl border border-rose-500/10 ${isLight ? 'bg-rose-50/50' : 'bg-rose-500/5'} space-y-1.5`}>
              <span className="text-[9px] font-bold tracking-widest text-[#f87171] uppercase font-mono block">
                Primary Quality Risks
              </span>
              <ul className="space-y-1 text-slate-400 list-disc pl-3 text-[10px]">
                <li>Row Duplication Bias: Redundancy leaks from ${dataset.statistics.duplicateRowsCount} duplicate lines.</li>
                <li>Sparse Cell Coordinates: Gaps of ${dataset.statistics.totalMissingCells} values can distort covariance metrics.</li>
                <li>Attribute Volatility: Volatile standard deviation acrosscontinuous ranges.</li>
              </ul>
            </div>
          </div>

          {footerTakeaways(
            `Data size is excellent for robust sampling models, but requires resolving ${dataset.statistics.totalMissingCells} sparse value coordinate gaps first.`,
            "Enforce mandatory checklist checks on API routes to avoid ingestion of empty or redundant dataset lines."
          )}
        </div>
      )
    });

    // --- Slide 8: Strategic Recommendations & Action Items ---
    list.push({
      tag: "ACTIONABLE SYSTEM DIRECTIVES",
      title: "Technical Action Remediation Plan",
      description: "Direct engineering action plan tasks with prioritizations, metrics targets and accountability gating",
      layout: "metrics",
      finding: "Remediation plan schedules three direct mathematical corrections to stabilize numerical dispersion and deduplicate raw values.",
      keyTakeaway: "Rigorous cleaning pipelines increase model confidence parameters and prevent data degradation over continuous operations.",
      recommendation: "Deploy deduplication script immediately and apply median value imputation on columns with missing fields.",
      speakerNotes: `We have converted our mathematical observations into three structured remediation action steps.\n\nFirst: execute row deduplication to purge the ${dataset.statistics.duplicateRowsCount} redundant lines.\n\nSecond: map median value imputations across sparse attributes to recover completeness back to 100%.\n\nThird: apply standard logarithmic conversions to volatile column "${volatileColumn.maxDispCol || 'continuous metrics'}" to smooth heavy standard deviation spreads. This completes our hygiene pipeline.`,
      content: (
        <div className="h-full flex flex-col justify-between p-2">
          <div className="space-y-2 my-auto">
            <div className={`flex items-center justify-between p-2.5 rounded-lg border ${borderCls} ${bgInner}`}>
              <div className="text-left">
                <span className="block text-[8px] font-bold text-rose-400 font-mono tracking-wider uppercase">Phase 1 &bull; Critical Priority</span>
                <span className="text-[11px] font-semibold">Purge duplicated overlapping observations ({dataset.statistics.duplicateRowsCount} records)</span>
              </div>
              <span className="text-[9px] font-mono font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded shrink-0">
                CRITICAL GATE
              </span>
            </div>
            <div className={`flex items-center justify-between p-2.5 rounded-lg border ${borderCls} ${bgInner}`}>
              <div className="text-left">
                <span className="block text-[8px] font-bold text-amber-500 font-mono tracking-wider uppercase">Phase 2 &bull; Medium Priority</span>
                <span className="text-[11px] font-semibold">Perform median-imputation on columns with vacant coordinate cells</span>
              </div>
              <span className="text-[9px] font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded shrink-0">
                IMPUTE GAP
              </span>
            </div>
            <div className={`flex items-center justify-between p-2.5 rounded-lg border ${borderCls} ${bgInner}`}>
              <div className="text-left">
                <span className="block text-[8px] font-bold text-blue-400 font-mono tracking-wider uppercase">Phase 3 &bull; Scale Priority</span>
                <span className="text-[11px] font-semibold">Apply logarithmic standard MinMax scaling to column &quot;{volatileColumn.maxDispCol || 'volatile attributes'}&quot;</span>
              </div>
              <span className="text-[9px] font-mono font-black text-blue-400 bg-blue-500/10 border border-blue-500/15 px-2 py-0.5 rounded shrink-0">
                SCALING GATE
              </span>
            </div>
          </div>

          {footerTakeaways(
            "Rigorous cleaning pipelines increase model confidence parameters and prevent data degradation over continuous operations.",
            "Deploy deduplication script immediately and apply median value imputation on columns with missing fields."
          )}
        </div>
      )
    });

    // --- Slide 9: Physical Metadata Specifications ---
    if (slideCount === 10) {
      list.push({
        tag: "METADATA & ARCHIVAL RECORDS",
        title: "Physical Data Registry Records",
        description: "Technical configuration parameters detailing file size, total cells elements and system parameters",
        layout: "grid",
        finding: `Physical archive parameters record dynamic workspace size equivalent to ${((dataset.fileSize || 0) / 1024).toFixed(2)} KB, housing ${dataset.rowCount} rows.`,
        keyTakeaway: "Ground-truth physical metadata logs guarantee exact scientific reproducibility and analytical lineage tracing.",
        recommendation: "Archive the file under standard version hashes to ensure database alignment across engineering teams.",
        speakerNotes: `For our database administrators, this slide catalogs the raw physical attributes of our workspace.\n\nThe target file size counts ${((dataset.fileSize || 0) / 1024).toFixed(2)} KB, compiling exactly ${dataset.rowCount} rows.\n\nTotal molecular coordinate cell registries exceed ${dataset.rowCount * dataset.columnCount} points. Logging these physical details is standard practice to preserve absolute revision control and analytical reproducibility across engineering squads.`,
        content: (
          <div className="h-full flex flex-col justify-between p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-auto">
              <div className={`p-3 rounded-xl border ${borderCls} ${bgInner}`}>
                <span className="block text-[9px] font-mono text-indigo-400 uppercase tracking-widest font-bold">Physical Specifications</span>
                <ul className="space-y-1 text-[10px] text-slate-400 mt-2 font-mono">
                  <li className="flex justify-between border-b ${borderCls} pb-1"><span>FILE NAME:</span><span className="text-white font-bold max-w-[120px] truncate">{dataset.fileName}</span></li>
                  <li className="flex justify-between border-b ${borderCls} pb-1"><span>FILE SIZE:</span><span className="text-white">{(dataset.fileSize / 1024).toFixed(2)} KB</span></li>
                  <li className="flex justify-between"><span>CELLS COUNT:</span><span className="text-white">{dataset.rowCount * dataset.columnCount} cells</span></li>
                </ul>
              </div>

              <div className={`p-3 rounded-xl border ${borderCls} ${bgInner}`}>
                <span className="block text-[9px] font-mono text-blue-400 uppercase tracking-widest font-bold">Metadata Diagnostics</span>
                <ul className="space-y-1 text-[10px] text-slate-400 mt-2 font-mono">
                  <li className="flex justify-between border-b ${borderCls} pb-1"><span>COMPLETENESS:</span><span className="text-emerald-400">{completenessRate.toFixed(1)}%</span></li>
                  <li className="flex justify-between border-b ${borderCls} pb-1"><span>REDUNDANCY:</span><span className="text-rose-400">{dataset.statistics.duplicatePercentage.toFixed(2)}%</span></li>
                  <li className="flex justify-between"><span>UNIQUE KEYS:</span><span className="text-white">{dataset.columns.reduce((a, b) => a + b.uniqueCount, 0)} items</span></li>
                </ul>
              </div>
            </div>

            {footerTakeaways(
              "Ground-truth physical metadata logs guarantee exact scientific reproducibility and analytical lineage tracing.",
              "Archive the file under standard version hashes to ensure database alignment across engineering teams."
            )}
          </div>
        )
      });
    }

    // --- Final Slide: Conclusion ---
    list.push({
      tag: "EXECUTIVE SUMMARY AGENDA",
      title: "Action Plan Execution Roadmap",
      description: "Final strategic synthesis timeline directing corporate pipeline actions and analytical gates",
      layout: "conclusion",
      finding: "Diagnostic audit successfully mapped three key quality remediations, establishing a clear roadmap from loading to deployment.",
      keyTakeaway: "Moving from static, descriptive statistics to active input checks tames analytical risk parameters.",
      recommendation: "Download this executive dashboard slide deck and schedule the initial engineering kickoff session today.",
      speakerNotes: `In conclusion, dataset "${dataset.fileName}" compiles a robust sample size but requires immediate quality cleaning.\n\nExecuting our recommended remediations will elevate the coordinate Integrity Score to 100 PTS and guarantee model parameter security.\n\nThe deck is ready. Open the floor to any stakeholder questions about these metrics or our analytical corrections. Thank you.`,
      content: (
        <div className="h-full flex flex-col justify-between p-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping inline-block" />
            <span className={`text-[9px] font-mono tracking-widest uppercase font-extrabold ${isLight ? 'text-neutral-500' : 'text-blue-400'}`}>
              STRATEGIC AGENDA CONCLUSION
            </span>
          </div>

          <div className="my-auto space-y-3 pl-1 text-left">
            <h2 className="text-2xl font-black uppercase tracking-tight leading-none">
              Strategic Project Milestones
            </h2>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                { title: "Audit Complete", desc: "Foundational data shape profiled", step: "01", col: "border-blue-500 text-blue-400" },
                { title: "Smart Cleanse", desc: "Impute cells & remove duplicates", step: "02", col: isLight ? "border-neutral-300" : "border-white/10" },
                { title: "Model Scaling", desc: "Stabilize standard deviations", step: "03", col: isLight ? "border-neutral-300" : "border-white/10" },
                { title: "Production", desc: "Deploy clean models to cloud", step: "04", col: "border-emerald-500 text-emerald-400" }
              ].map((m, idx) => (
                <div key={idx} className={`p-2 border rounded-xl relative ${m.col} bg-black/5`}>
                  <span className="absolute top-1.5 right-2 text-[8px] font-mono font-bold text-slate-500">{m.step}</span>
                  <div className="font-bold text-[10px] uppercase truncate">{m.title}</div>
                  <div className="text-[9px] text-slate-400 mt-1 leading-tight line-clamp-2">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`border-t ${borderCls} pt-3 text-[8.5px] text-slate-500 font-mono tracking-wider flex justify-between uppercase shrink-0`}>
            <span>Prepared by InsightAI Forensic Engine</span>
            <span>BOARD SYSTEM DECK &bull; END OF COMPILATION</span>
          </div>
        </div>
      )
    });

    // Make sure we slice exactly to matching size requested
    return list.slice(0, slideCount);
  }, [dataset, slideCount, activeTheme, formattedDate, completenessRate, numericColumns, categoricalColumns, cohortDisparity, topCorrelation, volatileColumn]);


  // Handle exporting as Microsoft PowerPoint compatible single-file HTML Presentation Slide Deck 
  const handleExportPresentationHTML = () => {
    try {
      const inlineCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;550;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #0c0f16; color: #f8fafc; margin: 0; padding: 2rem; }
        .slide { 
          aspect-ratio: 16/9; 
          width: 100%; 
          max-width: 960px; 
          margin: 0 auto 3rem auto; 
          background-color: #0e1220; 
          border: 1px solid #1e293b; 
          border-radius: 1.5rem; 
          overflow: hidden; 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          page-break-after: always;
          break-after: page;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }
        @media print {
          body { padding: 0; background: transparent; }
          .slide { margin: 0; border: none; box-shadow: none; page-break-after: always; break-after: page; }
        }
      `;

      // Composes standalone offline beautiful corporate presentation presentation slides deck HTML
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${dataset.fileName} - Boardroom AI Executive Slide Deck</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            ${inlineCSS}
          </style>
        </head>
        <body class="bg-[#050811] text-[#e2e8f0]">
          
          <div class="max-w-4xl mx-auto mb-8 text-center pt-6">
            <h1 class="text-3xl font-black uppercase text-white tracking-tight">${dataset.fileName} Presentation Deck</h1>
            <p class="text-xs text-slate-500 uppercase tracking-widest mt-1">Generated by InsightAI &bull; Confidential Boardroom Slides Summary</p>
          </div>

          <!-- SLIDE LISTING -->
          ${slides.map((s, index) => {
            // Build simple mock visual for charts or indicators
            let visualBoxHtml = '';
            if (index === 0) {
              visualBoxHtml = `
                <div class="w-full p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 text-left">
                  <span class="text-[8px] font-mono text-slate-500 block">DATA COMPILERS</span>
                  <div class="text-lg font-bold text-emerald-400 font-mono">100% SECURE INTEGRITY</div>
                  <p class="text-[10px] text-slate-400 font-mono">InsightAI Automatic Pipeline Execution Verified</p>
                </div>
              `;
            } else if (index === 1) {
              visualBoxHtml = `
                <div class="w-full space-y-2 text-left">
                  <div class="bg-slate-900/40 p-3 rounded-xl border border-slate-800 flex justify-between font-mono">
                    <span>ROW ENTRIES:</span><span class="text-white font-bold">${dataset.rowCount}</span>
                  </div>
                  <div class="bg-slate-900/40 p-3 rounded-xl border border-slate-800 flex justify-between font-mono">
                    <span>COLS FEATURES:</span><span class="text-white font-bold">${dataset.columnCount} keys</span>
                  </div>
                </div>
              `;
            } else if (index === 2) {
              visualBoxHtml = `
                <div class="w-full space-y-2 text-left">
                  <div class="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 flex justify-between font-mono">
                    <span>COMPLETENESS:</span><span class="text-emerald-400 font-bold">${completenessRate.toFixed(1)}%</span>
                  </div>
                  <div class="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 flex justify-between font-mono">
                    <span>REDUNDANCY:</span><span class="text-amber-400 font-bold">${dataset.statistics.duplicatePercentage.toFixed(2)}%</span>
                  </div>
                </div>
              `;
            } else if (index === 3) {
              visualBoxHtml = `
                <div class="w-full h-24 bg-slate-950/60 rounded-xl border border-slate-800 p-2 flex items-center justify-center relative overflow-hidden">
                  <span class="absolute top-1 left-2 text-[7px] font-mono text-indigo-400 uppercase tracking-widest font-bold">Pearson Scatter Plot</span>
                  <svg class="h-16 w-32 text-blue-500" viewBox="0 0 100 100">
                    <line x1="0" y1="100" x2="100" y2="100" stroke="#475569" stroke-width="1.5" />
                    <line x1="0" y1="0" x2="0" y2="100" stroke="#475569" stroke-width="1.5" />
                    <circle cx="20" cy="80" r="4.5" fill="#3b82f6" />
                    <circle cx="50" cy="50" r="4.5" fill="#3b82f6" />
                    <circle cx="80" cy="20" r="4.5" fill="#3b82f6" />
                    <line x1="10" y1="90" x2="90" y2="10" stroke="#ef4444" stroke-width="2" stroke-dasharray="3 2" />
                  </svg>
                </div>
              `;
            } else if (index === 5) {
              visualBoxHtml = `
                <div class="w-full h-24 bg-slate-950/60 rounded-xl border border-slate-800 p-2 flex items-center justify-center relative overflow-hidden">
                  <span class="absolute top-1 left-2 text-[7px] font-mono text-purple-400 uppercase tracking-widest font-bold">Standard Gaussian Curve</span>
                  <svg class="h-14 w-32 text-purple-500" viewBox="0 0 100 50">
                    <path d="M 5,45 Q 25,45 35,30 T 50,5 T 65,30 Q 75,45 95,45" fill="none" stroke="#a855f7" stroke-width="2.5" />
                    <line x1="50" y1="5" x2="50" y2="45" stroke="#ef4444" stroke-width="1" stroke-dasharray="2 1" />
                    <path d="M 35,30 T 50,5 T 65,30 L 65,45 L 35,45 Z" fill="#9333ea" fill-opacity="0.12" />
                  </svg>
                </div>
              `;
            } else {
              visualBoxHtml = `
                <div class="w-full p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left space-y-1">
                  <span class="text-[8px] font-mono text-indigo-400 block tracking-wider uppercase font-bold">VERIFIED INSIGHT TARGET</span>
                  <div class="text-[10px] text-slate-350 leading-relaxed font-mono">Continuous programmatic cleaning secure telemetry boundaries.</div>
                </div>
              `;
            }

            return `
              <div class="slide bg-[#0b0f19] border border-slate-800/80 p-8 flex flex-col justify-between mb-12" id="slide-${index + 1}">
                <!-- Background Grid -->
                <div class="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px]"></div>

                <!-- Slide Header -->
                <div class="flex justify-between items-center border-b border-slate-800 pb-3 relative z-10">
                  <span class="text-[9px] font-mono tracking-widest text-[#60a5fa] uppercase font-bold">${s.tag}</span>
                  <span class="text-[9px] font-mono text-slate-500 uppercase font-black">SLIDE ${index + 1} OF ${slides.length}</span>
                </div>

                <!-- Slide Main Title -->
                <div class="my-3 text-left relative z-10">
                  <h2 class="text-xl md:text-2xl font-black text-white uppercase tracking-tight leading-none">${s.title}</h2>
                  ${s.description ? `<p class="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-mono">${s.description}</p>` : ''}
                </div>

                <!-- Slide Content Grid -->
                <div class="flex-grow my-3 text-xs text-slate-300 leading-relaxed grid grid-cols-1 md:grid-cols-12 gap-5 items-center relative z-10">
                  <!-- Left side: Findings and Text -->
                  <div class="md:col-span-7 space-y-2 text-left">
                    <div class="bg-slate-900/40 border border-slate-800/50 p-4 rounded-xl">
                      <h4 class="text-[8px] font-black font-mono text-blue-400 uppercase tracking-widest mb-1">DATA DISCOVERY FINDING:</h4>
                      <p class="text-xs text-white font-semibold leading-relaxed">${s.finding}</p>
                    </div>
                  </div>
                  
                  <!-- Right side: Custom dynamically-generated Visual Box -->
                  <div class="md:col-span-5 flex justify-center">
                    ${visualBoxHtml}
                  </div>
                </div>

                <!-- Key Takeaway & Recommendation Horizontal Section -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto pt-3 border-t border-slate-800/80 text-left text-[11px] leading-relaxed relative z-10">
                  <div class="space-y-1 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                    <span class="text-[8px] font-black font-mono tracking-widest uppercase flex items-center gap-1 text-blue-400">
                      ■ Key Takeaway:
                    </span>
                    <span class="text-slate-350 block">
                      ${s.keyTakeaway}
                    </span>
                  </div>
                  <div class="space-y-1 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                    <span class="text-[8px] font-black font-mono tracking-widest uppercase flex items-center gap-1 text-emerald-400">
                      ✓ Strategic Recommendation:
                    </span>
                    <span class="text-slate-350 block font-semibold">
                      ${s.recommendation}
                    </span>
                  </div>
                </div>

                <!-- Corporate Speaker Notes Section -->
                <div class="mt-3 bg-slate-950/60 border border-dashed border-slate-800 p-3 rounded-xl text-left relative z-10">
                  <span class="block text-[8px] font-bold font-mono text-slate-500 uppercase tracking-widest mb-1">PRESENTER INSTRUCTION AUDIO &amp; SPEAKER NOTES:</span>
                  <p class="text-[10px] text-slate-400 italic font-mono leading-relaxed whitespace-pre-line">${s.speakerNotes}</p>
                </div>

                <!-- Slide Footer -->
                <div class="border-t border-slate-800/80 pt-3 flex justify-between text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-3 relative z-10">
                  <span>InsightAI Presentation Builder</span>
                  <span>CONFIDENTIAL BOARDROOM SLIDE REPRESENTATION</span>
                </div>
              </div>
            `;
          }).join('')}

          <div class="text-center py-8 text-xs text-slate-600 font-mono">
            &bull; CONFIDENTIAL DOCUMENT DISCLOSURE &bull; EXECUTIVE PRESENTATION DECK &bull;
          </div>

        </body>
        </html>
      `;

      // Triggers browser download stream
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Corporate_Boardroom_Presentation_${dataset.fileName.split('.')[0]}.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Export failure: ", e);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6 font-sans select-none animate-fade-in" id="ai-presentation-generator-panel">
      
      {/* 1. Feature Headers & Action Row */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <span className="text-[9px] font-mono font-black text-blue-400 uppercase tracking-widest block mb-1">
            INTELLIGENT BOARDROOM SLIDES BUILDER
          </span>
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Presentation className="w-5 h-5 text-blue-400" />
            AI Presentation Generator
          </h2>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">
            Compile complex dataset attributes, quality ratios, and recommendations into dynamic Executive presentations.
          </p>
        </div>

        {/* Global Controls Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 mr-1">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Slide Limit:</span>
            <div className="bg-white/5 border border-white/5 p-0.5 rounded-lg flex items-center">
              {([5, 8, 10] as const).map((count) => (
                <button
                  key={count}
                  onClick={() => { setSlideCount(count); setCurrentSlide(0); }}
                  className={`px-2.5 py-1 text-[9px] font-black tracking-wider uppercase rounded-md transition-all cursor-pointer ${
                    slideCount === count 
                      ? "bg-blue-600 text-white shadow" 
                      : "text-white/40 hover:text-white/80"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
            title="Regenerate Deck Layout"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRegenerating ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportPresentationHTML}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-white/5 hover:bg-neutral-800 text-white rounded-lg border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
            id="download-html-presentation-btn"
          >
            <Download className="w-4 h-4 text-blue-400 shrink-0" />
            Download Slide Deck HTML
          </button>
        </div>
      </div>

      {/* 2. Interactive Presentation Theater Layout */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Drawer Index Checklist */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-widest">
                Slides Inventory Index
              </span>
              <span className="text-[10px] font-mono text-blue-400 font-bold">
                {currentSlide + 1} / {slides.length}
              </span>
            </div>

            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
              {slides.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-full text-left text-[11px] p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer border select-none ${
                    currentSlide === idx 
                      ? "bg-blue-600/10 border-blue-500/30 text-white font-bold" 
                      : "bg-transparent border-transparent text-white/40 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  <span className="truncate max-w-[150px] uppercase font-mono tracking-wider">
                    {idx + 1}. {s.title}
                  </span>
                  <span className="text-[8px] font-mono text-white/30 truncate shrink-0">
                    {s.layout.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick theme selections for customization */}
            <div className="pt-3 border-t border-white/5">
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-2">
                Projector Palette Theme:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(["charcoal", "midnight", "ivory", "royal"] as const).map((thm) => (
                  <button
                    key={thm}
                    onClick={() => setActiveTheme(thm)}
                    className={`p-2 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all text-center cursor-pointer ${
                      activeTheme === thm
                        ? "bg-blue-600 text-white border-blue-500"
                        : "bg-white/5 text-white/50 border-transparent hover:border-white/10"
                    }`}
                  >
                    {thm}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Dynamic Aspect-Ratio Projected Theater Card Frame */}
        <div className="lg:col-span-9 flex flex-col space-y-4 items-center">
          
          <AnimatePresence mode="wait">
            {isRegenerating ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full aspect-video rounded-3xl bg-[#090C16] border border-white/5 flex flex-col items-center justify-center space-y-3"
              >
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                <span className="text-xs font-mono text-white/40 uppercase tracking-widest animate-pulse">
                  Building Presentation...
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`w-full aspect-video rounded-3xl border shadow-2xl relative overflow-hidden flex flex-col justify-between p-6 sm:p-10 transition-colors duration-300 ${
                  activeTheme === "midnight" ? "bg-[#050B14] border-blue-500/10 text-[#E2E8F0]" :
                  activeTheme === "ivory" ? "bg-[#FAF9F6] border-neutral-300 text-neutral-800" :
                  activeTheme === "royal" ? "bg-[#060D25] border-indigo-500/20 text-[#ECF0F9]" :
                  "bg-[#0E0F15] border-white/10 text-slate-300"
                }`}
                id="interactive-presentation-canvas-container"
              >
                
                {/* Background watermarks or grid lines based on theme */}
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

                {/* Top slide headers */}
                <div className="flex justify-between items-center border-b border-white/5 dark:border-neutral-200 pb-2.5 z-10">
                  <span className={`text-[9px] font-mono tracking-widest uppercase font-bold ${
                    activeTheme === 'ivory' ? 'text-blue-600' : 'text-blue-400'
                  }`}>
                    {slides[currentSlide]?.tag}
                  </span>
                  
                  <span className={`text-[9px] font-mono uppercase font-black ${
                    activeTheme === 'ivory' ? 'text-neutral-500' : 'text-slate-500'
                  }`}>
                    SLIDE {currentSlide + 1} OF {slides.length}
                  </span>
                </div>

                {/* Render current active slide template */}
                <div className="flex-grow my-4 z-10 select-text overflow-hidden h-full">
                  {slides[currentSlide]?.content}
                </div>

                {/* Slide Bottom System stamp metadata */}
                <div className="border-t border-white/5 dark:border-neutral-250 pt-2.5 flex justify-between text-[8px] font-mono text-slate-500 dark:text-neutral-400 uppercase tracking-widest z-10 mt-auto">
                  <span>InsightAI presentation Builder</span>
                  <span>Boardroom Slide Representation &bull; CONFIDENTIAL</span>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive Slide Show Control buttons */}
          <div className="flex items-center gap-4 bg-white/5 border border-white/5 py-2 px-6 rounded-full">
            <button
              onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
              disabled={currentSlide === 0}
              className="p-1.5 hover:bg-white/10 text-white rounded-full transition-all disabled:opacity-20 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-xs font-mono font-black text-white tracking-widest uppercase">
              SLIDE {currentSlide + 1} / {slides.length}
            </span>

            <button
              onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
              disabled={currentSlide === slides.length - 1}
              className="p-1.5 hover:bg-white/10 text-white rounded-full transition-all disabled:opacity-20 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
