import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Download, 
  Sparkles, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Bookmark, 
  Calendar, 
  Layers, 
  BookOpen, 
  Eye, 
  Building, 
  User, 
  ArrowUpRight,
  Sparkle,
  DollarSign,
  HelpCircle,
  Clock,
  Settings,
  Database,
  Shield,
  Activity,
  Award
} from "lucide-react";
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { Dataset, AIReport } from "../types";
import Markdown from "react-markdown";

interface ExecutiveReportProps {
  dataset: Dataset;
  aiReport: AIReport | null;
}

export default function ExecutiveReport({ dataset, aiReport }: ExecutiveReportProps) {
  // Styles for the Document Report Preview: 'dark' (Navy) or 'light' (Classic)
  const [reportTheme, setReportTheme] = useState<'dark' | 'light'>('dark');
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Helper: Format byte counts to human readable strings
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const generatedTime = useMemo(() => {
    return new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short"
    });
  }, []);

  // Compute key stats for dynamic analysis injection
  const numericColumns = useMemo(() => {
    return dataset.columns.filter(c => c.type === 'numeric');
  }, [dataset]);

  const categoricalColumns = useMemo(() => {
    return dataset.columns.filter(c => c.type === 'categorical');
  }, [dataset]);

  // Math 1: Data Quality Analysis Calculations
  const dataQualityDetails = useMemo(() => {
    const totalCells = dataset.rowCount * dataset.columnCount || 1;
    const missingValuePercentage = (dataset.statistics.totalMissingCells / totalCells) * 100;
    const duplicatePercentage = dataset.statistics.duplicatePercentage;
    const integrityScore = Math.max(
      0, 
      Math.round(
        dataset.statistics.overallCompleteness - (dataset.statistics.duplicatePercentage > 0 ? dataset.statistics.duplicatePercentage : 0)
      )
    );

    const cleaningRecommendations: string[] = [];
    if (dataset.statistics.duplicateRowsCount > 0) {
      cleaningRecommendations.push(
        `Remove the ${dataset.statistics.duplicateRowsCount} identical duplicate entries (${duplicatePercentage.toFixed(1)}% duplication matrix density) to recover data point independence.`
      );
    } else {
      cleaningRecommendations.push(
        `Row density is pristine with 0 duplicate records. No immediate database normalization overrides required.`
      );
    }

    if (dataset.statistics.totalMissingCells > 0) {
      cleaningRecommendations.push(
        `Deploy median-interpolation filters to fill the ${dataset.statistics.totalMissingCells} empty fields (${missingValuePercentage.toFixed(1)}% cell gap quotient) across sparse columns.`
      );
    } else {
      cleaningRecommendations.push(
        "Overall completeness is absolute (100.0%). All cellular coordinates fully accounted for and structured."
      );
    }

    numericColumns.forEach(c => {
      if (c.missingPercentage > 5) {
        cleaningRecommendations.push(
          `Imputing target: Column "${c.name}" registers a high ${c.missingPercentage}% missing ratio. Correct with backward-fill algorithms before compiling forecasts.`
        );
      }
    });

    return {
      missingValuePercentage,
      duplicatePercentage,
      integrityScore,
      cleaningRecommendations
    };
  }, [dataset, numericColumns]);

  // Math 2: Statistical Findings Calculations
  const statisticalFindings = useMemo(() => {
    let highestVarianceCol: { name: string; variance: number; stdDev: number } | null = null;
    let highestAverageCol: { name: string; mean: number } | null = null;
    let maxVar = -1;
    let maxMean = -Infinity;

    numericColumns.forEach(c => {
      if (c.stdDev !== undefined) {
        const v = c.stdDev * c.stdDev;
        if (v > maxVar) {
          maxVar = v;
          highestVarianceCol = { name: c.name, variance: Number(v.toFixed(3)), stdDev: c.stdDev };
        }
      }
      if (c.mean !== undefined) {
        if (c.mean > maxMean) {
          maxMean = c.mean;
          highestAverageCol = { name: c.name, mean: c.mean };
        }
      }
    });

    // Most frequent category
    let mostFrequentCat: { columnName: string; value: string; count: number; percentage: number } | null = null;
    if (dataset.rows.length > 0 && categoricalColumns.length > 0) {
      let topVal = "";
      let topCount = 0;
      let topCol = "";
      
      categoricalColumns.forEach(col => {
        const counts: Record<string, number> = {};
        dataset.rows.forEach(r => {
          const val = r[col.name];
          if (val !== null && val !== undefined && String(val).trim() !== "") {
            const s = String(val).trim();
            counts[s] = (counts[s] || 0) + 1;
          }
        });
        Object.entries(counts).forEach(([val, count]) => {
          if (count > topCount) {
            topCount = count;
            topVal = val;
            topCol = col.name;
          }
        });
      });
      if (topCount > 0) {
        mostFrequentCat = {
          columnName: topCol,
          value: topVal,
          count: topCount,
          percentage: Number(((topCount / dataset.rows.length) * 100).toFixed(1))
        };
      }
    }

    // Distribution observations (skewness metrics)
    const distributionObs: string[] = [];
    numericColumns.forEach(c => {
      if (c.mean !== undefined && c.median !== undefined && c.stdDev !== undefined) {
        const diff = c.mean - c.median;
        const relativeDiff = c.mean !== 0 ? Math.abs(diff / c.mean) : 0;
        
        let shape = "symmetric";
        if (relativeDiff > 0.05) {
          shape = diff > 0 ? "right-skewed (skewed positive, tail extending to high values)" : "left-skewed (skewed negative, bulk of values cluster at the top)";
        }
        distributionObs.push(
          `Column "${c.name}" exhibits a ${shape} distribution (Mean: ${c.mean}, Median: ${c.median}, Standard Deviation: ${c.stdDev}).`
        );
      }
    });

    if (distributionObs.length === 0) {
      distributionObs.push("No numeric attributes found. Distribution observations are blank.");
    }

    return {
      highestVarianceCol,
      highestAverageCol,
      mostFrequentCat,
      distributionObs
    };
  }, [numericColumns, categoricalColumns, dataset.rows]);

  // Math 3: Highly Tailored Trend Analysis Section Calculations
  const trendAnalysis = useMemo(() => {
    const list: string[] = [];

    // Pearson correlations
    const correlations: { colA: string; colB: string; r: number; absR: number }[] = [];
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
            let num = 0;
            let denA = 0;
            let denB = 0;

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
              correlations.push({ colA: colA.name, colB: colB.name, r: rCoeff, absR: Math.abs(rCoeff) });
            }
          }
        }
      }
    }

    if (correlations.length > 0) {
      correlations.sort((a, b) => b.absR - a.absR);
      correlations.slice(0, 3).forEach(c => {
        const strength = c.absR > 0.7 ? "high-strength" : c.absR > 0.4 ? "moderate" : "slight";
        const dir = c.r > 0 ? "positive linear trend" : "negative linear feedback cascade";
        list.push(
          `Linear dependency detected: Feature covariance shows a ${strength} ${dir} (Pearson coefficient value of ${c.r.toFixed(3)}) binding attribute keys "${c.colA}" and "${c.colB}" synchronously across all processed coordinate series.`
        );
      });
    }

    // Chronological Timeline Trends (if date column exists)
    const dateCol = dataset.columns.find(c => c.type === 'date');
    const numCol = numericColumns[0] || null;
    if (dateCol && numCol) {
      const points: { val: number; date: Date }[] = [];
      dataset.rows.forEach(r => {
        const dv = r[dateCol.name];
        const nv = Number(r[numCol.name]);
        if (dv && !isNaN(nv)) {
          const d = new Date(dv);
          if (!isNaN(d.getTime())) {
            points.push({ val: nv, date: d });
          }
        }
      });

      if (points.length >= 5) {
        points.sort((a, b) => a.date.getTime() - b.date.getTime());
        const mid = Math.floor(points.length / 2);
        const firstHalf = points.slice(0, mid);
        const secondHalf = points.slice(mid);
        const avg1 = firstHalf.reduce((s, cur) => s + cur.val, 0) / firstHalf.length;
        const avg2 = secondHalf.reduce((s, cur) => s + cur.val, 0) / secondHalf.length;
        const pctChange = avg1 !== 0 ? ((avg2 - avg1) / Math.abs(avg1)) * 100 : 0;
        const dirString = pctChange > 0 ? "chronological escalation" : "downward progression shift";
        list.push(
          `Temporal timeline scan: Chronological serialization across "${dateCol.name}" tracking "${numCol.name}" shows average metrics shift from the early period baseline of ${avg1.toFixed(2)} to ${avg2.toFixed(2)} in the latter half (a ${pctChange.toFixed(1)}% ${dirString} over elapsed cycles).`
        );
      }
    }

    // Categorical subgroup variance
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      const catCol = categoricalColumns[0].name;
      const numCol = numericColumns[0].name;
      
      const groups: Record<string, { sum: number; count: number }> = {};
      dataset.rows.forEach(row => {
        const cat = String(row[catCol] || "Unknown").trim();
        const val = Number(row[numCol]);
        if (!isNaN(val)) {
          if (!groups[cat]) groups[cat] = { sum: 0, count: 0 };
          groups[cat].sum += val;
          groups[cat].count += 1;
        }
      });
      
      const analyzed = Object.entries(groups)
        .map(([category, info]) => ({
          category,
          avg: info.sum / info.count,
          count: info.count
        }))
        .filter(g => g.count >= 2)
        .sort((a, b) => b.avg - a.avg);

      if (analyzed.length >= 2) {
        const topG = analyzed[0];
        const lowG = analyzed[analyzed.length - 1];
        const ratio = lowG.avg !== 0 ? (topG.avg / lowG.avg) : 1;
        list.push(
          `Subgroup performance mapping: Categorical classification under key "${catCol}" displays variance. The top cluster is "${topG.category}" yielding an average "${numCol}" of ${topG.avg.toFixed(2)} across ${topG.count} rows, which exceeds the bottom cluster "${lowG.category}" (average: ${lowG.avg.toFixed(2)} across ${lowG.count} rows) by a coefficient of ${ratio.toFixed(2)}x.`
        );
      }
    }

    // Mathematical spread profiling for the highest variance column
    let highestVarCol: string | null = null;
    let maxVar = -1;
    numericColumns.forEach(c => {
      if (c.stdDev !== undefined) {
        const v = c.stdDev * c.stdDev;
        if (v > maxVar) {
          maxVar = v;
          highestVarCol = c.name;
        }
      }
    });
    const maxVarColObj = numericColumns.find(c => c.name === highestVarCol);
    if (maxVarColObj && maxVarColObj.min !== undefined && maxVarColObj.max !== undefined && maxVarColObj.stdDev !== undefined) {
      list.push(
        `Mathematical dispersion telemetry: Attribute "${maxVarColObj.name}" manifests high internal variance (${maxVar.toFixed(2)}) across a bounds scale ranging from ${maxVarColObj.min} up to ${maxVarColObj.max} with standard deviation of ${maxVarColObj.stdDev.toFixed(2)}.`
      );
    }

    // Category cardinality diversity finding
    if (categoricalColumns.length > 0) {
      const topCat = categoricalColumns[0];
      const cardinalityPercent = (topCat.uniqueCount / dataset.rowCount) * 100;
      list.push(
        `Cardinality mapping: Categorical attribute "${topCat.name}" showcases ${topCat.uniqueCount} unique values across ${dataset.rowCount} entries (a cardinality density ratio of ${cardinalityPercent.toFixed(1)}%). First indices include: [${topCat.sampleValues.slice(0, 3).join(', ')}].`
      );
    }

    // Fallback if list has less than 3 trends
    if (list.length < 3) {
      list.push(
        `Structural coordinate profiling: The complete database grid features a width profile of ${dataset.columnCount} target features and depth profile of ${dataset.rowCount} rows, providing ${dataset.statistics.totalCells} discrete cells.`
      );
    }

    return list;
  }, [dataset, numericColumns, categoricalColumns]);

  // Compute summary of columns that are high-performing or underperforming based on gaps
  const diagnosticSummary = useMemo(() => {
    const missingCount = dataset.statistics.totalMissingCells || 0;
    const completeness = dataset.statistics.overallCompleteness || 100;
    const duplicateCount = dataset.statistics.duplicateRowsCount || 0;

    const issues: { title: string; severity: "Low" | "Medium" | "High"; desc: string }[] = [];

    if (duplicateCount > 0) {
      issues.push({
        title: "Row redundancy registry",
        severity: "Medium",
        desc: `Found ${duplicateCount} duplicate observations representing overlapping record signatures (${dataset.statistics.duplicatePercentage.toFixed(1)}%).`
      });
    }

    if (completeness < 95) {
      issues.push({
        title: "Matrix value gap",
        severity: "High",
        desc: `Overall dataset matrix completeness is at ${completeness.toFixed(1)}% with ${missingCount} cells missing.`
      });
    }

    dataset.columns.forEach(col => {
      if (col.missingPercentage > 25) {
        issues.push({
          title: `Sparse Column: ${col.name}`,
          severity: "High",
          desc: `The attribute has ${col.missingPercentage.toFixed(1)}% missing cells, generating extreme classification friction.`
        });
      }
    });

    return {
      missingCount,
      completeness,
      duplicateCount,
      issues
    };
  }, [dataset]);

  // Generate opportunities, risks, and recommendations dynamically from dataset shape
  const analysisOverview = useMemo(() => {
    const opportunities: string[] = [];
    const risks: string[] = [];
    const recommendations: string[] = [];
    const actionItems: { title: string; owner: string; urgency: string }[] = [];

    // Pearson correlations for opportunities
    let topCorr: { colA: string; colB: string; r: number } | null = null;
    let maxAbsR = -1;
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

    // 1. Opportunities & drivers
    if (topCorr && maxAbsR > 0.4) {
      opportunities.push(
        `Covariance forecasting model: Leverage the strong predictive dependency (Pearson R: ${topCorr.r.toFixed(3)}) between variables "${topCorr.colA}" and "${topCorr.colB}" to construct bivariate linear predictive modeling algorithms.`
      );
    } else if (numericColumns.length > 0) {
      const topNum = numericColumns[0];
      opportunities.push(
        `Dynamic statistical centering: Build standard automation models analyzing key feature variable "${topNum.name}" around its active mean baseline of ${topNum.mean?.toFixed(2)} to identify system deviations.`
      );
    } else {
      opportunities.push(
        `Matrix classification modeling: Convert the qualitative label attributes into scaled categorical matrices to extract regression structures.`
      );
    }

    // Let's check the most frequent category for opportunity
    let topCatSub: { col: string; val: string; pct: number } | null = null;
    if (dataset.rows.length > 0 && categoricalColumns.length > 0) {
      let topCount = 0;
      let topVal = "";
      let topCol = "";
      categoricalColumns.forEach(col => {
        const counts: Record<string, number> = {};
        dataset.rows.forEach(r => {
          const val = r[col.name];
          if (val !== null && val !== undefined && String(val).trim() !== "") {
            const s = String(val).trim();
            counts[s] = (counts[s] || 0) + 1;
          }
        });
        Object.entries(counts).forEach(([val, count]) => {
          if (count > topCount) {
            topCount = count;
            topVal = val;
            topCol = col.name;
          }
        });
      });
      if (topCount > 0) {
        topCatSub = { col: topCol, val: topVal, pct: (topCount / dataset.rows.length) * 100 };
      }
    }

    if (topCatSub && topCatSub.pct > 15) {
      opportunities.push(
        `Macro cohort target: Subgroup clusters under "${topCatSub.col}" are heavily anchored by category value "${topCatSub.val}", representing ${topCatSub.pct.toFixed(1)}% of all entries. Focus corporate resources to target this dominant cohort.`
      );
    } else {
      opportunities.push(
        `High dimension classification capability: Leverage a multi-dimensional array containing ${categoricalColumns.length} separate categories to construct rich segmentation schemas.`
      );
    }

    if (dataset.rowCount > 100) {
      opportunities.push(
        `Robust sample density scale: Deploy predictive modeling across the dataset's complete volume of ${dataset.rowCount} structured records, providing significant degrees of freedom for training validation.`
      );
    } else {
      opportunities.push(
        `Agile analytical cycle speed: The rapid execution profile of a concise ${dataset.rowCount}-row dataset minimizes computational overhead, allowing high-velocity scenario testing.`
      );
    }

    // 2. Calculated risks & threats
    let sparseCol: string | null = null;
    let maxMissingPct = -1;
    dataset.columns.forEach(c => {
      if (c.missingPercentage > maxMissingPct) {
        maxMissingPct = c.missingPercentage;
        sparseCol = c.name;
      }
    });

    if (sparseCol && maxMissingPct > 5) {
      risks.push(
        `Sparse dimension regression distortion: Attribute "${sparseCol}" is missing ${maxMissingPct.toFixed(1)}% of coordinate cells, threatening regression mapping calculations with high-bias omission errors.`
      );
    } else {
      risks.push(
        `Completeness bounds verification: Structural parameters are exceptionally pristine with overall completeness at ${dataset.statistics.overallCompleteness.toFixed(1)}%. Low immediate null-bias risk.`
      );
    }

    if (dataset.statistics.duplicatePercentage > 0) {
      risks.push(
        `Redundant coordinate density drift: Duplicate observations represent ${dataset.statistics.duplicatePercentage.toFixed(1)}% of database rows (${dataset.statistics.duplicateRowsCount} items), risking double-counting bias in downstream sum/average functions.`
      );
    } else {
      risks.push(
        `Absolute record unique guarantees: Duplicate density is verified at 0.0%. Low risk of measurement multiplication inflation.`
      );
    }

    let highestStdDevCol: string | null = null;
    let maxStdValue = -1;
    numericColumns.forEach(c => {
      if (c.stdDev !== undefined && c.stdDev > maxStdValue) {
        maxStdValue = c.stdDev;
        highestStdDevCol = c.name;
      }
    });
    const maxStdColObj = numericColumns.find(c => c.name === highestStdDevCol);
    if (maxStdColObj && maxStdColObj.stdDev !== undefined) {
      risks.push(
        `Extreme coordinate dispersion risk: Column "${maxStdColObj.name}" tracks a high standard deviation coefficient of ${maxStdValue.toFixed(2)} on a mean baseline of ${maxStdColObj.mean?.toFixed(2)}, increasing sensitivity to outliers.`
      );
    } else {
      risks.push(
        `Univariate scaling risk: Flat numeric variance or lack of robust numeric standard deviation prevents high-confidence anomaly filtering.`
      );
    }

    // 3. Recommendations & Remediation Actions
    if (dataset.statistics.duplicateRowsCount > 0) {
      recommendations.push(
        `Deduplicate row coordinates: Run script overlays to drop the ${dataset.statistics.duplicateRowsCount} duplicate records and recover pure observation uniqueness.`
      );
      actionItems.push({
        title: `Purge ${dataset.statistics.duplicateRowsCount} duplicate lines`,
        owner: "Data Quality Lead",
        urgency: "High"
      });
    } else {
      recommendations.push(
        "Establish downstream index constraint layers: Configure strict primary-key guards in source buffers to maintain verified 0.0% duplication rate."
      );
      actionItems.push({
        title: "Implement primary key validation",
        owner: "Database Architect",
        urgency: "Low"
      });
    }

    if (dataset.statistics.totalMissingCells > 0) {
      recommendations.push(
        `Conduct cellular interpolation: Implement imputation algorithms (backward-fill or median substitution) to safely patch the ${dataset.statistics.totalMissingCells} missing value gaps.`
      );
      actionItems.push({
        title: `Impute ${dataset.statistics.totalMissingCells} empty coordinates`,
        owner: "Senior Analytics Engineer",
        urgency: "Medium"
      });
    } else {
      recommendations.push(
        "Incorporate preventative schema validations: Lock cells to non-nullable datatypes to sustain 100% complete coordinates coverage."
      );
      actionItems.push({
        title: "Configure strict schema rules",
        owner: "DevOps Engineer",
        urgency: "Low"
      });
    }

    if (maxStdColObj && maxStdColObj.stdDev !== undefined && maxStdColObj.max !== undefined) {
      recommendations.push(
        `Implement numeric sigma thresholds: Filter out extreme value bounds past 3-sigma thresholds in column "${maxStdColObj.name}" (Maximum: ${maxStdColObj.max}) before training linear forecasts.`
      );
      actionItems.push({
        title: `Outlier filter on "${maxStdColObj.name}"`,
        owner: "Lead Data Scientist",
        urgency: "Medium"
      });
    } else {
      recommendations.push(
        "Construct standard scaling structures: Standardize numerical metrics using MinMax or Z-Score scalars to ensure unit consistency."
      );
      actionItems.push({
        title: "Apply Z-score distribution normalization",
        owner: "ML Engineer",
        urgency: "Medium"
      });
    }

    return {
      opportunities,
      risks,
      recommendations,
      actionItems
    };
  }, [dataset, numericColumns, categoricalColumns]);

  // Math 4: Detailed Executive Summary Report Data Generation
  const executiveSummary = useMemo(() => {
    const totalRows = dataset.rowCount;
    const totalCols = dataset.columnCount;
    const missingCells = dataset.statistics.totalMissingCells;
    const totalCells = totalRows * totalCols || 1;
    const missingPercentage = (missingCells / totalCells) * 100;
    const duplicateRows = dataset.statistics.duplicateRowsCount;
    const duplicatePercentage = dataset.statistics.duplicatePercentage;
    const completeness = dataset.statistics.overallCompleteness;
    const integrityScore = dataQualityDetails.integrityScore;

    // Build specific, precise, non-vague dataset metrics string
    const keyDatasetMetrics = `The dataset contains exactly ${totalRows} rows and ${totalCols} feature columns (comprising ${totalCells} digital cell coordinates). Data completeness stands at ${completeness.toFixed(1)}% with ${missingCells} missing cell gaps (${missingPercentage.toFixed(2)}% of the total matrix) and ${duplicateRows} identical duplicate rows (${duplicatePercentage.toFixed(2)}% replication rate). These features establish an overall Data Integrity rating of ${integrityScore}/100 PTS based on strict quality checks.`;

    const findings: string[] = [];

    // Find the category breakdown differences
    let topCatCol = "";
    let topCatCluster = "";
    let lowCatCluster = "";
    let maxClusterDiffRatio = -1;
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

    if (maxClusterDiffRatio > 1 && topCatCol) {
      findings.push(
        `Categorical Cohort Disparity: Cluster analysis under "${topCatCol}" of numeric key "${catNumCol}" reveals a major variance factor of ${maxClusterDiffRatio.toFixed(2)}x. The highest cluster is "${topCatCluster}" (averaging ${topCatAvg.toFixed(2)} over ${topCatCount} rows), exceeding the lowest cluster "${lowCatCluster}" (averaging ${lowCatAvg.toFixed(2)} over ${lowCatCount} rows).`
      );
    }

    // Pearson Correlation coefficient
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

    if (topCorr && maxAbsR > 0.3) {
      const strength = maxAbsR > 0.7 ? "high-strength" : "moderate-strength";
      const direct = topCorr.r > 0 ? "positive linear correlation" : "inverse linear correlation";
      findings.push(
        `Dynamic Bivariate Interdependency: Covariance scanning detected a ${strength} ${direct} (Pearson coefficient R: ${topCorr.r.toFixed(3)}) linking variables "${topCorr.colA}" and "${topCorr.colB}" synchronously.`
      );
    }

    // High Dispersion standard deviation
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

    if (maxDispCol && maxDispStd > 0) {
      findings.push(
        `Mathematical Dispersion: Attribute "${maxDispCol}" manifests volatile dispersion, recording a standard deviation of ${maxDispStd.toFixed(2)} on a baseline average of ${maxDispMean.toFixed(2)}, running up to a maximum boundary of ${maxDispMax}.`
      );
    }

    if (findings.length === 0) {
      findings.push(
        `Symmetric Coordinate Profile: The coordinate dimensions maintain complete equilibrium. Attribute averages represent symmetrical bells with standard deviations showing minimal localized drift.`
      );
    }

    // Major Risks
    const risks: string[] = [];
    if (duplicateRows > 0) {
      risks.push(
        `Row Redundancy Risk: Found ${duplicateRows} duplicate rows (${duplicatePercentage.toFixed(2)}% replication rate) that threaten to inflate frequency counts and bias sum or average metrics.`
      );
    } else {
      risks.push(
        `Duplication Safeguard: Verified duplication rate is at absolute 0.0% (${duplicateRows} rows duplicated), confirming no analytical inflation bias.`
      );
    }

    if (missingCells > 0) {
      risks.push(
        `Matrix Completeness Hole: Omission of ${missingCells} cells (${missingPercentage.toFixed(2)}% of matrix coordinates) reduces regression reliability and introduces sparse measurement instability.`
      );
    } else {
      risks.push(
        `Absolute Data Integrity: Completeness is verified at 100.0% across all ${totalCells} cells. No empty matrix bias threat identified.`
      );
    }

    let highestNullCol = "";
    let highestNullPct = -1;
    dataset.columns.forEach(c => {
      if (c.missingPercentage > highestNullPct) {
        highestNullPct = c.missingPercentage;
        highestNullCol = c.name;
      }
    });

    if (highestNullPct > 10) {
      risks.push(
        `Deep Omission Column Risk: Attribute "${highestNullCol}" has a high cell omission rating of ${highestNullPct.toFixed(1)}% missing values, making it highly unstable for standard forecasting.`
      );
    }

    // Recommended actions
    const recommendations: string[] = [];
    if (duplicateRows > 0) {
      recommendations.push(
        `Purge ${duplicateRows} duplicate rows: Execute deduplication script to drop redundant tuples and maintain unique record indexing.`
      );
    } else {
      recommendations.push(
        `Impose entry uniqueness guards: Configure explicit primary keys or unique index constraints inside source buffers to secure 0.0% duplication rate.`
      );
    }

    if (missingCells > 0) {
      recommendations.push(
        `Impute ${missingCells} cell gaps: Deploy median-substitution or predictive imputation to safely patch missing cells with minimum coordinate bias.`
      );
    } else {
      recommendations.push(
        `Enforce non-null constraints: Lock downstream schemas to strict non-nullable types to prevent cell omissions in ongoing data cycles.`
      );
    }

    if (maxDispCol && maxDispStd > 0) {
      recommendations.push(
        `Deploy three-sigma filters: Filter extreme coordinates past 3-sigma thresholds (mean ± 3 * std dev) on column "${maxDispCol}" to isolate outliers before model training.`
      );
    }

    const whyThisMatters: { title: string; finding: string; impact: string; recommendedAction: string }[] = [];

    // 1. Missing Values (Matrix Completeness)
    if (missingCells > 0) {
      whyThisMatters.push({
        title: "Missing Data Cells Detected",
        finding: `Detected exactly ${missingCells} missing cell values across features (${missingPercentage.toFixed(2)}% of dataset matrix coordinates), with the worst case in column "${highestNullCol}" at ${highestNullPct.toFixed(1)}% empty.`,
        impact: "Missing values introduce systematic measurement gaps, break continuous calculation models (like linear regressions), reduce overall predictive accuracy, and may indicate client/input logging fail points.",
        recommendedAction: `Deploy statistical imputation (such as median-imputation for numericals or modal-imputation for categorical properties) or execute row-wise deletion for records with complete feature omissions.`
      });
    }

    // 2. Duplicates
    if (duplicateRows > 0) {
      whyThisMatters.push({
        title: "Redundant Row Duplication",
        finding: `Detected ${duplicateRows} identical duplicate row instances (${duplicatePercentage.toFixed(2)}% record replication rate) across the dataset rows.`,
        impact: "Replicated observations artificially skew sample distributions, inflate frequency counts, bias statistical parameter estimations (like sample mean and variance), and lead to artificial metric inflation.",
        recommendedAction: "Execute complete database row deduplication to retain only unique tuple records, and establish upstream integrity constraint rules to reject duplicate ingest loops."
      });
    }

    // 3. Categorical Cohort Disparity
    if (maxClusterDiffRatio > 1 && topCatCol) {
      whyThisMatters.push({
        title: "Significant Group Performance Variance",
        finding: `Disparity analysis under column "${topCatCol}" of key feature "${catNumCol}" shows a ${maxClusterDiffRatio.toFixed(2)}x difference between the maximum cohort "${topCatCluster}" (averaging ${topCatAvg.toFixed(2)}) and minimum cohort "${lowCatCluster}" (averaging ${lowCatAvg.toFixed(2)}).`,
        impact: "Severe segment variance indicates highly non-uniform behavior profiles. Aggregating these groups together masks regional weaknesses and leads to sub-optimal, over-generalized corporate strategies.",
        recommendedAction: `Establish segregated, cohort-specific business/operational plans, or develop stratified predictive models that handle distinct properties of these subgroups individually.`
      });
    }

    // 4. Pearson Bivariate Interdependency
    if (topCorr && maxAbsR > 0.3) {
      const dirTxt = topCorr.r > 0 ? "positive linear correlation" : "inverse linear correlation";
      const strTxt = maxAbsR > 0.7 ? "high-strength" : "moderate-strength";
      whyThisMatters.push({
        title: "Strong Feature-to-Feature Trajectory Link",
        finding: `A ${strTxt} ${dirTxt} with a Pearson coefficient R = ${topCorr.r.toFixed(3)} binds the continuous columns "${topCorr.colA}" and "${topCorr.colB}".`,
        impact: "High linear association suggests that these variables share highly redundant information (collinearity) or point to a strong physical lock-step dependency. Leaving both in regression models can inflate standard errors of coefficients.",
        recommendedAction: "Use Pearson correlation variables as dual indicators of target events, or execute dimensionality reduction (PCA) / select a single optimal driver to eliminate colinear coefficient instability."
      });
    }

    // 5. High Standard Deviation & Outlier Variance
    if (maxDispCol && maxDispStd > 0) {
      whyThisMatters.push({
        title: "Extreme Dispersion & Statistical Volatility",
        finding: `The column "${maxDispCol}" exhibits wide statistical deviation (Std Dev = ${maxDispStd.toFixed(2)} on a baseline average of ${maxDispMean.toFixed(2)}), with numbers running up to a maximum boundary of ${maxDispMax}.`,
        impact: "Extreme dispersion represents highly volatile and less predictable attributes. Models trained on unscaled volatile inputs are highly susceptible to skewing from intense out-of-boundary outliers.",
        recommendedAction: `Apply a mathematical transformation (such as log scaling or MinMax rescaling) or utilize standard 3-Sigma threshold fences to cap or isolate extreme outliers before downstream analysis.`
      });
    }

    // Clear fallback if there are zero findings
    if (whyThisMatters.length === 0) {
      whyThisMatters.push({
        title: "Perfect Dataset Symmetry and Completeness",
        finding: `The dataset shows a fully complete (${completeness.toFixed(1)}%) robust coordinate state with no missing values and absolute 0.0% row replication.`,
        impact: "Standard deviations exhibit healthy baseline values with minimal noise. Implies highly stable parameters and maximum reliability across standard machine learning or aggregate models.",
        recommendedAction: "Directly apply downstream parametric algorithms and metrics estimation with complete data coverage integrity."
      });
    }

    return {
      keyDatasetMetrics,
      findings,
      risks,
      recommendations,
      whyThisMatters
    };
  }, [dataset, numericColumns, categoricalColumns, dataQualityDetails]);

  // Math 5: Visual Data Aggregations for robust chart generation
  const visualChartData = useMemo(() => {
    if (!dataset || dataset.rows.length === 0) return [];
    
    const numCol = numericColumns[0]?.name;
    const catCol = categoricalColumns[0]?.name || dataset.headers[0];

    try {
      if (numCol && catCol) {
        // Aggregate by first categorical column (up to top 10 categories)
        const counts: Record<string, { sum: number; count: number }> = {};
        dataset.rows.forEach(r => {
          const key = String(r[catCol] || "Unknown").trim();
          const val = Number(r[numCol]);
          if (key && !isNaN(val)) {
            if (!counts[key]) counts[key] = { sum: 0, count: 0 };
            counts[key].sum += val;
            counts[key].count += 1;
          }
        });

        return Object.entries(counts)
          .map(([name, stat]) => ({
            name: name.length > 15 ? name.substring(0, 12) + "..." : name,
            value: parseFloat((stat.sum / stat.count).toFixed(2)),
            count: stat.count
          }))
          .filter(item => item.name !== "")
          .slice(0, 8);
      } else if (numCol) {
        // Just take first 8 rows if no categories
        return dataset.rows.slice(0, 8).map((r, idx) => ({
          name: `Row ${idx + 1}`,
          value: Number(r[numCol]) || 0
        }));
      }
    } catch (e) {
      console.error("Error computing visualChartData", e);
    }
    
    return [];
  }, [dataset, numericColumns, categoricalColumns]);

  const distributionChartData = useMemo(() => {
    if (!dataset || dataset.rows.length === 0) return [];
    
    try {
      const catCol = categoricalColumns[0]?.name || dataset.headers[0];
      if (catCol) {
        const frequencies: Record<string, number> = {};
        dataset.rows.forEach(r => {
          const val = String(r[catCol] || "Unknown").trim();
          frequencies[val] = (frequencies[val] || 0) + 1;
        });

        return Object.entries(frequencies)
          .map(([name, count]) => ({
            name: name.length > 12 ? name.substring(0, 10) + "..." : name,
            value: count
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);
      }
    } catch (e) {
      console.error("Error computing distributionChartData", e);
    }
    return [];
  }, [dataset, categoricalColumns]);

  // SVG representation builder for high-fidelity downloadable HTML / PDF prints
  const generateHTMLBarChartSVG = () => {
    if (visualChartData.length === 0) {
      return `<div style="padding: 24px; text-align: center; color: #64748b; font-size: 11px; font-family: monospace; border: 1px dashed #1e293b; rounded: 8px;">NO NUMERICAL COORDINATE METRICS AVAILABLE FOR GRAPH RENDERING</div>`;
    }
    const maxVal = Math.max(...visualChartData.map(x => x.value)) || 1;
    const chartHeight = 130;
    const chartWidth = 520;
    const padding = 45;
    const barWidth = Math.floor((chartWidth - padding * 2) / visualChartData.length) - 8;
    
    let svgContent = `<svg viewBox="0 0 ${chartWidth} ${chartHeight + 40}" style="width: 100%; height: auto; display: block;">`;
    
    // Grid Lines and Labels
    for (let i = 0; i <= 3; i++) {
      const y = padding + (chartHeight / 3) * i;
      const label = (maxVal - (maxVal / 3) * i).toFixed(0);
      svgContent += `
        <line x1="${padding}" y1="${y}" x2="${chartWidth - padding}" y2="${y}" stroke="#1e293b" stroke-dasharray="3,3" stroke-width="0.5" />
        <text x="${padding - 8}" y="${y + 3}" font-family="monospace" font-size="7" fill="#64748b" text-anchor="end">${label}</text>
      `;
    }
    
    // Bars and Annotations
    visualChartData.forEach((d, i) => {
      const barHeight = (d.value / maxVal) * chartHeight;
      const x = padding + i * (barWidth + 8) + 4;
      const y = padding + chartHeight - barHeight;
      svgContent += `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#3b82f6" rx="2" />
        <text x="${x + barWidth / 2}" y="${y - 4}" font-family="monospace" font-size="7" font-weight="bold" fill="#3b82f6" text-anchor="middle">${d.value}</text>
        <text x="${x + barWidth / 2}" y="${padding + chartHeight + 12}" font-family="monospace" font-size="7" fill="#94a3b8" text-anchor="middle">${d.name}</text>
      `;
    });
    
    svgContent += `</svg>`;
    return svgContent;
  };

  const generateHTMLDistributionProgress = () => {
    if (distributionChartData.length === 0) {
      return `<div style="padding: 24px; text-align: center; color: #64748b; font-size: 11px; font-family: monospace; border: 1px dashed #1e293b; rounded: 8px;">NO CATEGORICAL RECORDBACK STATISTICS COMMITTED</div>`;
    }
    const maxVal = Math.max(...distributionChartData.map(x => x.value)) || 1;
    let listContent = `<div style="display: flex; flex-direction: column; gap: 10px;">`;
    
    distributionChartData.forEach((d, idx) => {
      const pct = (d.value / maxVal) * 100;
      listContent += `
        <div style="font-family: monospace; font-size: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <strong style="color: #cbd5e1;">${idx + 1}. "${d.name}"</strong>
            <span style="color: #10b981; font-weight: bold;">${d.value} occurrences</span>
          </div>
          <div style="height: 6px; background-color: #0c111d; border: 1px solid #1e293b; border-radius: 9999px; overflow: hidden;">
            <div style="height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981); border-radius: 9999px; width: ${pct}%;"></div>
          </div>
        </div>
      `;
    });
    
    listContent += `</div>`;
    return listContent;
  };

  // Unified section metadata rendering block
  const renderSectionMeta = (numberLabel: string) => {
    return (
      <div 
        className={`grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 p-2.5 rounded-xl text-[9px] font-mono mb-5 border select-none ${
          reportTheme === 'dark' 
            ? 'bg-black/40 border-white/5 text-slate-400' 
            : 'bg-neutral-50 border-neutral-200 text-neutral-500'
        }`}
      >
        <div>
          <span className="opacity-55 block text-[8px] uppercase tracking-wider">DATASET NAME:</span>
          <span className={`font-black truncate block max-w-[90px] ${reportTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} title={dataset.fileName}>
            {dataset.fileName}
          </span>
        </div>
        <div>
          <span className="opacity-55 block text-[8px] uppercase tracking-wider">TOTAL ROWS:</span>
          <span className={`font-black ${reportTheme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>{dataset.rowCount} Rows</span>
        </div>
        <div>
          <span className="opacity-55 block text-[8px] uppercase tracking-wider">TOTAL COLUMNS:</span>
          <span className={`font-black ${reportTheme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>{dataset.columnCount} Cols</span>
        </div>
        <div>
          <span className="opacity-55 block text-[8px] uppercase tracking-wider">DATA TYPES:</span>
          <span className={`font-black ${reportTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
            {numericColumns.length} Num / {categoricalColumns.length} Cat
          </span>
        </div>
        <div>
          <span className="opacity-55 block text-[8px] uppercase tracking-wider">MISSING CELLS:</span>
          <span className={`font-black ${dataset.statistics.totalMissingCells > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {dataset.statistics.totalMissingCells}
          </span>
        </div>
        <div>
          <span className="opacity-55 block text-[8px] uppercase tracking-wider">DUPLICATE ROWS:</span>
          <span className={`font-black ${dataset.statistics.duplicateRowsCount > 0 ? 'text-rose-400' : 'text-emerald-500'}`}>
            {dataset.statistics.duplicateRowsCount}
          </span>
        </div>
        <div>
          <span className="opacity-55 block text-[8px] uppercase tracking-wider">QUALITY SCORE:</span>
          <span className={`font-black ${dataQualityDetails.integrityScore > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
            {dataQualityDetails.integrityScore}/100 PTS
          </span>
        </div>
      </div>
    );
  };
  // Handles beautifully formatted and styled offline HTML export
  const handleDownloadHTML = () => {
    setIsDownloading(true);
    try {
      const isDark = reportTheme === 'dark';
      const bgColor = isDark ? "#090d16" : "#ffffff";
      const textColor = isDark ? "#cbd5e1" : "#171717";
      const textTitleColor = isDark ? "#ffffff" : "#0f172a";
      const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#cbd5e1";
      const pbgColor = isDark ? "rgba(255,255,255,0.02)" : "#f8fafc";
      const cardColor = isDark ? "#0e1320" : "#f1f5f9";
      const accentBlue = isDark ? "#60a5fa" : "#3b82f6";
      const accentEmerald = isDark ? "#10b981" : "#059669";
      const listMarker = isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0";

      const headerStyles = `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        body { 
          font-family: 'Plus Jakarta Sans', sans-serif; 
          background-color: ${bgColor}; 
          color: ${textColor}; 
          margin: 0; 
          padding: 0; 
          -webkit-print-color-adjust: exact !important; 
          print-color-adjust: exact !important; 
        }
        .page-sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 20mm 15mm;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-bottom: 1px solid ${borderColor};
          box-sizing: border-box;
          page-break-after: always;
          break-after: page;
        }
        .text-title { color: ${textTitleColor}; }
        .border-line { border-color: ${borderColor}; }
        .bg-card { background-color: ${cardColor}; }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid ${borderColor};
          padding-bottom: 8px;
          margin-bottom: 25px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #94a3b8;
        }
        .page-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid ${borderColor};
          padding-top: 10px;
          margin-top: 25px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #64748b;
        }
        .badge-formal {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          border: 1px solid ${borderColor};
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          font-size: 10px;
          margin-top: 10px;
        }
        th, td { 
          padding: 6px 10px; 
          text-align: left; 
          border-bottom: 1px solid ${borderColor}; 
        }
        th { 
          font-family: 'JetBrains Mono', monospace; 
          font-weight: 700; 
          color: #94a3b8; 
          font-size: 8px;
          text-transform: uppercase;
        }
        ul { margin: 0; padding-left: 20px; }
        li { margin-bottom: 6px; }
        
        @media print {
          body { background-color: transparent !important; }
          .page-sheet { 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 10mm 10mm !important; 
            border: none !important;
            height: 297mm !important;
          }
          @page { size: A4 portrait; margin: 0; }
        }
      `;

      // Render cover feature list (truncated nicely to first 12 columns to prevent overflow on cover/dataset summary page)
      const topColumns = dataset.columns.slice(0, 12);
      const remainingColsCount = dataset.columns.length - 12;

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Executive Diagnostics Brief - ${dataset.fileName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>${headerStyles}</style>
        </head>
        <body>

          <!-- PAGE 1: COVER PAGE & DATA OVERVIEW -->
          <div class="page-sheet">
            <div class="page-header">
              <span>InsightAI Corporate Brief &bull; Strictly Confidential</span>
              <span class="badge-formal" style="color: ${accentBlue}; background: rgba(59,130,246,0.06); border-color: ${borderColor};">EXECUTIVE REPORT</span>
            </div>

            <div class="my-auto space-y-6">
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <span style="width: 4px; height: 18px; background: ${accentBlue}; display: inline-block;"></span>
                  <span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; color: ${accentBlue}; letter-spacing: 0.2em; text-transform: uppercase;">DATA-DRIVEN TECHNICAL ANALYSIS REPORT</span>
                </div>
                <h1 class="text-3xl font-extrabold tracking-tight text-title text-white uppercase">${dataset.fileName.split('.')[0]} Insight Brief</h1>
                <p class="text-[11px] leading-relaxed max-w-xl" style="color: #94a3b8;">
                  Complete factual diagnostics audit mapping metadata typologies, computational dispersions, missing data anomalies, and strategic remediation milestones.
                </p>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-line border rounded-xl" style="background: ${pbgColor};">
                <div>
                  <span class="block text-[8px] font-mono tracking-widest text-slate-500 uppercase">Total Raw Rows</span>
                  <strong class="text-lg text-title font-mono block mt-1">${dataset.rowCount} Rows</strong>
                </div>
                <div>
                  <span class="block text-[8px] font-mono tracking-widest text-slate-500 uppercase">Total Column Features</span>
                  <strong class="text-lg text-title font-mono block mt-1">${dataset.columnCount} Cols</strong>
                </div>
                <div>
                  <span class="block text-[8px] font-mono tracking-widest text-slate-500 uppercase">Composite Quality Rate</span>
                  <strong class="text-lg font-mono block mt-1" style="color: ${accentEmerald};">${dataQualityDetails.integrityScore} / 100 PTS</strong>
                </div>
                <div>
                  <span class="block text-[8px] font-mono tracking-widest text-slate-500 uppercase">Missing Data cells</span>
                  <strong class="text-lg font-mono block mt-1" style="color: ${dataset.statistics.totalMissingCells > 0 ? '#f59e0b' : accentEmerald};">${dataset.statistics.totalMissingCells} Cells</strong>
                </div>
              </div>

              <div class="space-y-2.5">
                <h3 class="text-xs font-bold font-mono tracking-wider text-title text-white uppercase">Inferred Structural Feature Layout:</h3>
                <div class="overflow-hidden border border-line rounded-lg">
                  <table>
                    <thead>
                      <tr style="background: ${pbgColor};">
                        <th>Attribute Identifier</th>
                        <th>Type Representation</th>
                        <th>Missing Values %</th>
                        <th>Data Integrity Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${topColumns.map(col => `
                        <tr>
                          <td class="font-mono text-title font-bold text-white text-[9px]">${col.name}</td>
                          <td class="font-mono text-slate-400 text-[9px]">${col.type}</td>
                          <td class="font-mono text-[9px] ${col.missingPercentage > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}">${col.missingPercentage.toFixed(2)}%</td>
                          <td class="font-mono text-[9px] ${(100 - col.missingPercentage) > 80 ? 'text-emerald-400 font-bold' : 'text-amber-500'}">${(100 - col.missingPercentage).toFixed(0)}/100</td>
                        </tr>
                      `).join('')}
                      ${remainingColsCount > 0 ? `
                        <tr>
                          <td colspan="4" class="text-center text-slate-500 text-[9px] py-1 font-mono uppercase">
                            + ${remainingColsCount} more columns are excluded from this overview to satisfy strict page layouts.
                          </td>
                        </tr>
                      ` : ''}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="page-footer">
              <span>InsightAI Suite &bull; ${dataset.fileName}</span>
              <span>Compiled: ${generatedTime} &bull; Page 1 of 5</span>
            </div>
          </div>

          <!-- PAGE 2: QUALITY ANALYSIS & CORE STATISTICAL REPORT -->
          <div class="page-sheet">
            <div class="page-header">
              <span>Deep Technical Quality Assessment</span>
              <span class="badge-formal" style="color: ${accentBlue}; background: rgba(59,130,246,0.06);">DATA QUALITY DIAGNOSTICS</span>
            </div>

            <div class="my-auto space-y-6">
              <div class="space-y-4">
                <h3 class="text-xs font-black tracking-widest text-title text-white uppercase font-mono">I. DATA INTEGRITY PROFILE</h3>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div class="p-3 bg-card rounded-lg border border-line" style="background: ${cardColor};">
                    <span class="block text-[8px] font-mono text-slate-500 uppercase tracking-widest">Omitted Matrix cells</span>
                    <strong class="text-lg block mt-1 font-mono text-amber-500">${dataQualityDetails.missingValuePercentage.toFixed(2)}% omission</strong>
                  </div>
                  <div class="p-3 bg-card rounded-lg border border-line" style="background: ${cardColor};">
                    <span class="block text-[8px] font-mono text-slate-500 uppercase tracking-widest">Replicated Redundancies</span>
                    <strong class="text-lg block mt-1 font-mono text-rose-500">${dataQualityDetails.duplicatePercentage.toFixed(2)}% duplicates</strong>
                  </div>
                  <div class="p-3 bg-card rounded-lg border border-line" style="background: ${cardColor};">
                    <span class="block text-[8px] font-mono text-slate-500 uppercase tracking-widest">Composite Score</span>
                    <strong class="text-lg block mt-1 font-mono" style="color: ${accentEmerald};">${dataQualityDetails.integrityScore} / 100 PTS</strong>
                  </div>
                </div>
                
                <div class="p-4 rounded-lg border border-line space-y-2" style="background: ${pbgColor};">
                  <span class="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Quality Remediation Instructions:</span>
                  <ul class="text-[10px] text-slate-300 list-disc pl-5 space-y-1">
                    ${dataQualityDetails.cleaningRecommendations.map(rec => `<li>${rec}</li>`).join('')}
                  </ul>
                </div>
              </div>

              <div class="space-y-4 pt-4">
                <h3 class="text-xs font-black tracking-widest text-title text-white uppercase font-mono">II. MATHEMATICAL DISPERSIONS SUMMARY</h3>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div class="p-3 bg-card rounded-lg border border-line" style="background: ${cardColor};">
                    <span class="block text-[8px] font-mono text-slate-500 uppercase tracking-widest">Max Variance Attribute</span>
                    <strong class="text-[11px] text-white block mt-1 truncate">${statisticalFindings.highestVarianceCol ? statisticalFindings.highestVarianceCol.name : 'N/A'}</strong>
                    <span class="block text-[8px] font-mono text-slate-400 mt-1">Variance: ${statisticalFindings.highestVarianceCol ? statisticalFindings.highestVarianceCol.variance : 'N/A'}</span>
                  </div>
                  <div class="p-3 bg-card rounded-lg border border-line" style="background: ${cardColor};">
                    <span class="block text-[8px] font-mono text-slate-500 uppercase tracking-widest">Highest Average Element</span>
                    <strong class="text-[11px] text-white block mt-1 truncate">${statisticalFindings.highestAverageCol ? statisticalFindings.highestAverageCol.name : 'N/A'}</strong>
                    <span class="block text-[8px] font-mono text-slate-400 mt-1">Mean: ${statisticalFindings.highestAverageCol ? statisticalFindings.highestAverageCol.mean : 'N/A'}</span>
                  </div>
                  <div class="p-3 bg-card rounded-lg border border-line" style="background: ${cardColor};">
                    <span class="block text-[8px] font-mono text-slate-500 uppercase tracking-widest">Modal Categorical Key</span>
                    <strong class="text-[11px] text-white block mt-1 truncate">${statisticalFindings.mostFrequentCat ? `"${statisticalFindings.mostFrequentCat.value}"` : 'N/A'}</strong>
                    <span class="block text-[8px] font-mono text-slate-400 mt-1">Hits: ${statisticalFindings.mostFrequentCat ? `${statisticalFindings.mostFrequentCat.count} (${statisticalFindings.mostFrequentCat.percentage}%)` : 'N/A'}</span>
                  </div>
                </div>

                <div class="p-4 rounded-lg border border-line space-y-2" style="background: ${pbgColor};">
                  <span class="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Structural Distribution & Skew Observations:</span>
                  <ul class="text-[10px] text-slate-300 list-disc pl-5 space-y-1">
                    ${statisticalFindings.distributionObs.map(obs => `<li>${obs}</li>`).join('')}
                  </ul>
                </div>
              </div>
            </div>

            <div class="page-footer">
              <span>InsightAI Suite &bull; ${dataset.fileName}</span>
              <span>Compiled: ${generatedTime} &bull; Page 2 of 5</span>
            </div>
          </div>

          <!-- PAGE 3: DATA VISUALIZATIONS -->
          <div class="page-sheet">
            <div class="page-header">
              <span>Bivariate & Categorical Layout Charts</span>
              <span class="badge-formal" style="color: ${accentBlue}; background: rgba(59,130,246,0.06);">CORE VISUALIZATIONS</span>
            </div>

            <div class="my-auto space-y-6">
              <div class="space-y-2 text-center max-w-md mx-auto mb-4">
                <h3 class="text-xs font-black tracking-widest text-title text-white uppercase font-mono">III. DATASET ATTRIBUTE HIGHLIGHTS</h3>
                <p class="text-[10px] text-slate-500">Vector graphic configurations derived directly from coordinate measurements mapped to primary structures.</p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div class="p-4 border border-line rounded-xl" style="background: ${pbgColor};">
                  <span class="block text-[8px] font-mono text-slate-400 uppercase font-black tracking-widest mb-3" style="color: ${accentBlue};">Primary Attribute Means by Category</span>
                  <div class="w-full">
                    ${generateHTMLBarChartSVG()}
                  </div>
                </div>

                <div class="p-4 border border-line rounded-xl" style="background: ${pbgColor};">
                  <span class="block text-[8px] font-mono text-slate-400 uppercase font-black tracking-widest mb-3" style="color: ${accentEmerald};">Distribution Densities Profile</span>
                  <div class="w-full">
                    ${generateHTMLDistributionProgress()}
                  </div>
                </div>
              </div>
            </div>

            <div class="page-footer">
              <span>InsightAI Suite &bull; ${dataset.fileName}</span>
              <span>Compiled: ${generatedTime} &bull; Page 3 of 5</span>
            </div>
          </div>

          <!-- PAGE 4: COGNITIVE INTELLIGENCE MATRIX -->
          <div class="page-sheet">
            <div class="page-header">
              <span>Generative Contextual Synthesis</span>
              <span class="badge-formal" style="color: ${accentBlue}; background: rgba(59,130,246,0.06);">COGNITIVE INTEL</span>
            </div>

            <div class="my-auto space-y-5">
              <h3 class="text-xs font-black tracking-widest text-title text-white uppercase font-mono">IV. EXECUTIVE SUMMARY & COGNITIVE MODEL INSIGHTS</h3>
              
              <div class="p-4 border border-line rounded-xl space-y-2.5" style="background: ${pbgColor};">
                <strong class="text-[10px] font-mono uppercase font-bold text-white block">Composite Analytical Base Digest:</strong>
                <p class="text-[10px] leading-relaxed text-slate-300 font-medium">
                  ${executiveSummary.keyDatasetMetrics}
                </p>
              </div>

              <div class="p-4 border border-line rounded-xl space-y-3" style="background: ${pbgColor};">
                <strong class="text-[10px] font-mono uppercase font-bold text-white block" style="color: ${accentBlue};">Why This Matters (Major Observational Diagnostics):</strong>
                <div class="space-y-3">
                  ${executiveSummary.whyThisMatters.map(item => `
                    <div style="border-top: 1px dashed ${borderColor}; padding-top: 8px;">
                      <div class="flex justify-between" style="font-size: 9px; font-weight: bold; color: white; margin-bottom: 4px;">
                        <span>${item.title.toUpperCase()}</span>
                      </div>
                      <div style="font-size: 9px; line-height: 1.4; color: #cbd5e1; margin-bottom: 2.5px;">
                        <span style="color: #64748b; font-weight: bold;">FINDING:</span> ${item.finding}
                      </div>
                      <div style="font-size: 9px; line-height: 1.4; color: #fca5a5; margin-bottom: 2.5px;">
                        <span style="color: #f87171; font-weight: bold;">IMPACT:</span> ${item.impact}
                      </div>
                      <div style="font-size: 9px; line-height: 1.4; color: #cbd5e1;">
                        <span style="color: #4ade80; font-weight: bold;">RECOMMENDED ACTION:</span> ${item.recommendedAction}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="p-4 border border-line rounded-xl space-y-3" style="background: ${pbgColor}; max-height: 380px; overflow-y: auto;">
                <strong class="text-[10px] font-mono uppercase font-bold text-white block">Cognitive Diagnostic Narratological Output:</strong>
                
                ${aiReport ? `
                  <div class="text-[10px] leading-relaxed text-slate-300 space-y-2.5">
                    ${aiReport.report.split('\n').map(line => {
                      if (line.trim().startsWith('### ')) {
                        return `<h4 style="margin-top: 10px; font-weight: bold; color: white;" class="uppercase text-[9px] font-mono text-title">${line.replace('### ', '')}</h4>`;
                      }
                      if (line.trim().startsWith('## ')) {
                        return `<h3 style="margin-top: 14px; font-weight: bold; color: ${accentBlue};" class="uppercase text-[10px] font-mono text-title">${line.replace('## ', '')}</h3>`;
                      }
                      if (line.trim().startsWith('1.') || line.trim().startsWith('-')) {
                        return `<li class="ml-4 list-decimal" style="margin-bottom: 3px;">${line.replace(/^[0-9.-]+\s*/, '')}</li>`;
                      }
                      return `<p class="mt-1">${line}</p>`;
                    }).join('')}
                  </div>
                ` : `
                  <div class="text-center py-6 text-slate-400 font-mono text-[9px] uppercase space-y-1.5">
                    <p style="color: ${accentBlue}; font-weight: bold;">Deep Cognitive Matrix Model Standby</p>
                    <p class="max-w-xs mx-auto text-slate-500">To stream complete advanced LLM findings, please activate the AI processor module inside the main analyzer workspace dashboard.</p>
                  </div>
                `}
              </div>
            </div>

            <div class="page-footer">
              <span>InsightAI Suite &bull; ${dataset.fileName}</span>
              <span>Compiled: ${generatedTime} &bull; Page 4 of 5</span>
            </div>
          </div>

          <!-- PAGE 5: STRATEGIC FORECAST & REMEDIATION ACTION MATRIX -->
          <div class="page-sheet">
            <div class="page-header">
              <span>Vulnerability maps and Critical remedial Milestones</span>
              <span class="badge-formal" style="color: ${accentBlue}; background: rgba(59,130,246,0.06);">STRATEGIC REMEDIATION MATRICES</span>
            </div>

            <div class="my-auto space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="space-y-2.5">
                  <h3 class="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 border-b border-line pb-1.5 flex items-center">
                    CORE COOPERATIVE DRIVERS & OPPORTUNITIES:
                  </h3>
                  <ul class="text-[10px] text-slate-300 space-y-1.5 list-disc pl-5">
                    ${analysisOverview.opportunities.map(op => `<li>${op}</li>`).join('')}
                  </ul>
                </div>

                <div class="space-y-2.5">
                  <h3 class="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 border-b border-line pb-1.5 flex items-center">
                    IDENTIFIED CRITICAL THREATS & RISK METRICS:
                  </h3>
                  <ul class="text-[10px] text-slate-300 space-y-1.5 list-disc pl-5">
                    ${analysisOverview.risks.map(rk => `<li>${rk}</li>`).join('')}
                  </ul>
                </div>
              </div>

              <div class="space-y-2.5 pt-4">
                <h3 class="text-[10px] font-mono font-bold uppercase tracking-wider text-white">TACTICAL REMEDIATION ACTION ITEMS TIMELINE:</h3>
                <div class="overflow-hidden border border-line rounded-xl">
                  <table>
                    <thead>
                      <tr style="background: ${pbgColor};">
                        <th>CRITICAL OBJECTIVE ACTION TARGET</th>
                        <th>ACCOUNTABLE STEWARD GROUP</th>
                        <th>URGENCY RANK</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${analysisOverview.actionItems.map(item => `
                        <tr>
                          <td class="font-bold text-white text-[9px]">${item.title}</td>
                          <td class="text-slate-400 text-[9px] font-mono">${item.owner}</td>
                          <td>
                            <span class="font-mono font-black text-[8px] uppercase px-1.5 py-0.5 rounded" style="${
                              item.urgency === 'High' ? 'background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2);' :
                              item.urgency === 'Medium' ? 'background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2);' :
                              'background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2);'
                            }">
                              ${item.urgency}
                            </span>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="page-footer" style="padding-top: 15px; border-top: 1px solid ${borderColor}; margin-top: 30px;">
              <span>InsightAI Suite &bull; ${dataset.fileName}</span>
              <span>Compiled: ${generatedTime} &bull; Page 5 of 5</span>
            </div>
          </div>

        </body>
        </html>
      `;

      // Download file blob helper
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Executive_Intelligence_Report_${dataset.fileName.split('.')[0]}.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-8 font-sans animate-fade-in" id="executive-report-generator-view">
      
      {/* Tab Header Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <span className="text-[9px] font-mono font-black text-blue-400 uppercase tracking-widest block mb-1">
            CORPORATE DOCUMENT COMPILATION ENGINE
          </span>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">
            Executive Report Generator
          </h2>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">
            Consolidate statistical parameters, opportunities, and deep AI observations into professional-grade exports.
          </p>
        </div>

        {/* Action button groupings */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick theme toggler for previews */}
          <div className="p-1 rounded-lg bg-white/5 border border-white/5 flex items-center space-x-1.5 text-xs mr-2">
            <button
              onClick={() => setReportTheme('dark')}
              className={`px-3 py-1.5 rounded-md font-bold uppercase tracking-wider text-[9px] transition-all cursor-pointer ${
                reportTheme === 'dark' ? 'bg-blue-600 text-white shadow' : 'text-white/40 hover:text-white/80'
              }`}
            >
              Navy Corporate
            </button>
            <button
              onClick={() => setReportTheme('light')}
              className={`px-3 py-1.5 rounded-md font-bold uppercase tracking-wider text-[9px] transition-all cursor-pointer ${
                reportTheme === 'light' ? 'bg-white text-black shadow' : 'text-white/40 hover:text-white/85'
              }`}
            >
              Classic Light
            </button>
          </div>

          <button
            onClick={handleDownloadHTML}
            disabled={isDownloading}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-white/5 hover:bg-neutral-800 text-white rounded-lg border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            id="download-html-report-btn"
          >
            <Download className="w-4 h-4 text-blue-400 shrink-0" />
            Download HTML Report
          </button>
        </div>
      </div>

      {/* 2. Interactive Document Page Preview */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left pane: Quick jump sidebar indices */}
        <div className="lg:col-span-3 space-y-4 hidden lg:block">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
            <h4 className="text-[10px] font-mono font-black text-white/40 uppercase tracking-widest border-b border-white/5 pb-2">
              Report Section Navigation
            </h4>
            
            <div className="space-y-1.5">
              <a href="#preview-cover" className="flex items-center justify-between text-xs p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all uppercase tracking-wider font-mono">
                <span>01. Cover Page</span>
                <span className="text-[9px] text-blue-400 font-bold">PAGE 1</span>
              </a>
              <a href="#preview-summary" className="flex items-center justify-between text-xs p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all uppercase tracking-wider font-mono">
                <span>02. Executive Summary</span>
                <span className="text-[9px] text-blue-400 font-bold">PAGE 2</span>
              </a>
              <a href="#preview-profile" className="flex items-center justify-between text-xs p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all uppercase tracking-wider font-mono">
                <span>03. Structure Profile</span>
                <span className="text-[9px] text-blue-400 font-bold">PAGE 3</span>
              </a>
              <a href="#preview-compliance" className="flex items-center justify-between text-xs p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all uppercase tracking-wider font-mono">
                <span>04. Quality Analysis</span>
                <span className="text-[9px] text-blue-400 font-bold">PAGE 4</span>
              </a>
              <a href="#preview-statistical" className="flex items-center justify-between text-xs p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all uppercase tracking-wider font-mono">
                <span>05. Statistics Findings</span>
                <span className="text-[9px] text-blue-400 font-bold">PAGE 5</span>
              </a>
              <a href="#preview-trend" className="flex items-center justify-between text-xs p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all uppercase tracking-wider font-mono">
                <span>06. Trend Analysis</span>
                <span className="text-[9px] text-blue-400 font-bold">PAGE 6</span>
              </a>
              <a href="#preview-strategic" className="flex items-center justify-between text-xs p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all uppercase tracking-wider font-mono">
                <span>07. Strategic Forecast</span>
                <span className="text-[9px] text-blue-400 font-bold">PAGE 7</span>
              </a>
              <a href="#preview-ai" className="flex items-center justify-between text-xs p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all uppercase tracking-wider font-mono">
                <span>08. Cognitive AI</span>
                <span className="text-[9px] text-blue-400 font-bold">PAGE 8</span>
              </a>
            </div>

            <div className="pt-3 border-t border-white/5 bg-blue-500/5 p-3 rounded-lg border border-blue-500/10 space-y-0.5">
              <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest block">Pro-Tip:</span>
              <p className="text-[10px] text-white/60 leading-relaxed uppercase">
                The compiled offline HTML file is fully self-contained and loads instantly on any desktop or mobile browser.
              </p>
            </div>
          </div>
        </div>

        {/* Right pane: Beautiful interactive paper replica preview sheet */}
        <div className="lg:col-span-9 flex flex-col items-center">
          
          <div 
            ref={reportRef}
            className={`w-full max-w-4xl p-8 md:p-14 shadow-2xl rounded-2xl border transition-all duration-300 select-text ${
              reportTheme === 'dark'
                ? 'bg-[#0F172A] border-white/10 text-[#E2E8F0]'
                : 'bg-white border-neutral-300 text-neutral-800'
            }`}
            id="executive-formal-document-sheet"
          >
            
            {/* PAGE 1: COVER PAGE SECTION */}
            <div 
              id="preview-cover" 
              className="min-h-[70vh] flex flex-col justify-between border-b border-white/10 dark:border-neutral-800 pb-14 pt-4 page-break"
            >
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-mono tracking-widest uppercase ${
                  reportTheme === 'dark' ? 'text-slate-500' : 'text-neutral-400'
                }`}>
                  InsightAI Corporate Brief &bull; Strictly Confidential
                </span>
                <span className={`text-[9px] font-mono font-extrabold px-2.5 py-1 rounded border uppercase ${
                  reportTheme === 'dark' 
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                    : 'bg-blue-50/50 text-blue-600 border-blue-200'
                }`}>
                  EXECUTIVE BRIEF
                </span>
              </div>

              <div className="space-y-5 my-14">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded" />
                  <span className={`text-xs font-mono font-bold tracking-widest uppercase ${
                    reportTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    Automated Intelligence Report
                  </span>
                </div>
                
                <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-tight leading-none ${
                  reportTheme === 'dark' ? 'text-white' : 'text-neutral-900'
                }`}>
                  {dataset.fileName}
                </h1>

                <p className={`text-sm leading-relaxed max-w-xl ${
                  reportTheme === 'dark' ? 'text-slate-400' : 'text-neutral-500'
                }`}>
                  Rigorous data-driven parameters, complete diagnostic matrices, distribution observations, statistical variance benchmarks, and Pearson product-moment trend models.
                </p>
              </div>

              {/* Lower cover key statistics block */}
              <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-xl border ${
                reportTheme === 'dark' 
                  ? 'bg-black/20 border-white/5' 
                  : 'bg-neutral-50 border-neutral-200'
              }`}>
                <div>
                  <span className="block text-[8px] font-mono text-neutral-400 uppercase tracking-widest">
                    COMPILE TIME
                  </span>
                  <span className={`text-xs font-semibold ${
                    reportTheme === 'dark' ? 'text-slate-200' : 'text-neutral-700'
                  }`}>
                    {generatedTime}
                  </span>
                </div>

                <div>
                  <span className="block text-[8px] font-mono text-neutral-400 uppercase tracking-widest">
                    RECORD LIMIT
                  </span>
                  <span className={`text-xs font-semibold ${
                    reportTheme === 'dark' ? 'text-slate-200' : 'text-neutral-700'
                  }`}>
                    {dataset.rowCount} rows
                  </span>
                </div>

                <div>
                  <span className="block text-[8px] font-mono text-neutral-400 uppercase tracking-widest">
                    FEATURE KEYS
                  </span>
                  <span className={`text-xs font-semibold ${
                    reportTheme === 'dark' ? 'text-slate-200' : 'text-neutral-700'
                  }`}>
                    {dataset.columnCount} columns
                  </span>
                </div>

                <div>
                  <span className="block text-[8px] font-mono text-neutral-400 uppercase tracking-widest">
                    INTEGRITY RATING
                  </span>
                  <span className={`text-xs font-semibold uppercase truncate block ${
                    reportTheme === 'dark' ? 'text-emerald-400' : 'text-emerald-700 font-bold'
                  }`}>
                    {dataQualityDetails.integrityScore}/100 PTS
                  </span>
                </div>
              </div>
            </div>

            {/* PAGE 2: EXECUTIVE SUMMARY REPORT */}
            <div 
              id="preview-summary" 
              className="space-y-6 py-10 border-b border-white/10 dark:border-neutral-800 page-break"
            >
              <h3 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${
                reportTheme === 'dark' ? 'text-white' : 'text-neutral-900'
              }`}>
                <span className="text-xs font-mono text-blue-500">I.</span>
                Executive Summary Report
              </h3>

              {renderSectionMeta("I")}

              <p className={`text-xs leading-relaxed ${
                reportTheme === 'dark' ? 'text-slate-400' : 'text-neutral-500'
              }`}>
                Consolidation of dataset performance metrics, core diagnostic warnings, operational risks, and immediate corrective steps.
              </p>

              {/* Specific dataset metrics block */}
              <div className={`p-4 rounded-xl border ${
                reportTheme === 'dark' ? 'bg-[#020617] border-white/5' : 'bg-neutral-50 border-neutral-200'
              }`}>
                <h4 className="text-[10px] font-mono text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-bold">
                  <Database className="w-3.5 h-3.5" />
                  Key Dataset Metrics
                </h4>
                <p className={`text-xs leading-relaxed font-semibold ${
                  reportTheme === 'dark' ? 'text-slate-300' : 'text-neutral-700'
                }`}>
                  {executiveSummary.keyDatasetMetrics}
                </p>
              </div>

              {/* Two columns: Descriptive findings & risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Findings column */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  reportTheme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <div>
                    <h4 className="text-[10px] font-mono text-emerald-450 uppercase tracking-wider mb-3 flex items-center gap-1.5 font-bold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Data-Driven Findings
                    </h4>
                    <ul className="space-y-3.5">
                      {executiveSummary.findings.map((finding, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-[10px] text-emerald-450 font-mono mt-0.5">•</span>
                          <span className={`text-[11px] leading-relaxed ${
                            reportTheme === 'dark' ? 'text-slate-300' : 'text-neutral-650'
                          }`}>
                            {finding}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Risks column */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  reportTheme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <div>
                    <h4 className="text-[10px] font-mono text-rose-450 uppercase tracking-wider mb-3 flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Major Statistical Risks
                    </h4>
                    <ul className="space-y-3.5">
                      {executiveSummary.risks.map((risk, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-[10px] text-rose-450 font-mono mt-0.5">•</span>
                          <span className={`text-[11px] leading-relaxed ${
                            reportTheme === 'dark' ? 'text-slate-300' : 'text-neutral-650'
                          }`}>
                            {risk}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Why This Matters section */}
              <div className="space-y-4">
                <h4 className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 font-bold ${
                  reportTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  <HelpCircle className="w-3.5 h-3.5" />
                  Why This Matters
                </h4>
                
                <div className="grid grid-cols-1 gap-4">
                  {executiveSummary.whyThisMatters.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`p-5 rounded-xl border space-y-3.5 ${
                        reportTheme === 'dark' 
                          ? 'bg-white/[0.01] border-white/5' 
                          : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${
                          reportTheme === 'dark' ? 'text-white' : 'text-[#0f172a]'
                        }`}>
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">Observation 0{idx + 1}</span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-1 md:gap-x-4">
                          <span className="md:col-span-3 font-semibold text-slate-500 uppercase tracking-wider text-[9px] font-mono mt-0.5">Finding:</span>
                          <span className={`md:col-span-9 leading-relaxed ${reportTheme === 'dark' ? 'text-slate-200' : 'text-[#171717]'}`}>
                            {item.finding}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-1 md:gap-x-4 border-t border-dashed border-black/5 dark:border-white/5 pt-2.5">
                          <span className="md:col-span-3 font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wider text-[9px] font-mono mt-0.5">Impact:</span>
                          <span className={`md:col-span-9 leading-relaxed font-semibold ${reportTheme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}`}>
                            {item.impact}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-1 md:gap-x-4 border-t border-dashed border-black/5 dark:border-white/5 pt-2.5">
                          <span className="md:col-span-3 font-semibold text-emerald-600 dark:text-[#a3e635] uppercase tracking-wider text-[9px] font-mono mt-0.5">Recommended Action:</span>
                          <span className={`md:col-span-9 leading-relaxed ${reportTheme === 'dark' ? 'text-slate-300' : 'text-neutral-650'}`}>
                            {item.recommendedAction}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions section */}
              <div className={`p-4 rounded-xl border ${
                reportTheme === 'dark' ? 'bg-blue-950/20 border-blue-900/30' : 'bg-[#f0f9ff] border-blue-100'
              }`}>
                <h4 className="text-[10px] font-mono text-blue-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  Recommended Tactical Remediation Actions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {executiveSummary.recommendations.map((recommendation, idx) => (
                    <div key={idx} className="flex gap-2 bg-black/10 dark:bg-white/5 p-2.5 rounded-lg border border-black/5 dark:border-white/5">
                      <span className="text-xs font-mono font-black text-blue-500 shrink-0">0{idx + 1}.</span>
                      <p className={`text-[11px] leading-relaxed ${
                        reportTheme === 'dark' ? 'text-slate-300' : 'text-neutral-700'
                      }`}>
                        {recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PAGE 3: FIELD PROFILE LAYOUT */}
            <div 
              id="preview-profile" 
              className="space-y-6 py-10 border-b border-white/10 dark:border-neutral-800 page-break"
            >
              <h3 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${
                reportTheme === 'dark' ? 'text-white' : 'text-neutral-900'
              }`}>
                <span className="text-xs font-mono text-blue-500">II.</span>
                Dataset Structure & Profile
              </h3>
              
              {renderSectionMeta("II")}

              <p className={`text-xs leading-relaxed ${
                reportTheme === 'dark' ? 'text-slate-400' : 'text-neutral-500'
              }`}>
                Structured profile of features, unique value cardinality, coordinate records, and variable categories found within the spreadsheet source.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className={`p-4 rounded-xl border ${
                  reportTheme === 'dark' ? 'bg-white/[0.01] border-white/10' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <span className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                    Numeric Type Dimensions
                  </span>
                  <strong className={`block text-lg mt-1 ${
                    reportTheme === 'dark' ? 'text-white' : 'text-neutral-900'
                  }`}>
                    {numericColumns.length} dimension keys
                  </strong>
                  <p className="text-[10px] text-blue-500 mt-1 truncate">
                    {numericColumns.map(c => c.name).join(", ") || "No numeric variables found."}
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${
                  reportTheme === 'dark' ? 'bg-white/[0.01] border-white/10' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <span className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                    Categorical Type Dimensions
                  </span>
                  <strong className={`block text-lg mt-1 ${
                    reportTheme === 'dark' ? 'text-white' : 'text-neutral-900'
                  }`}>
                    {categoricalColumns.length} dimension keys
                  </strong>
                  <p className="text-[10px] text-blue-500 mt-1 truncate">
                    {categoricalColumns.map(c => c.name).join(", ") || "No categorical variables found."}
                  </p>
                </div>
              </div>

              {/* Table displaying individual column indicators */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className={`border-b ${
                      reportTheme === 'dark' ? 'border-white/10 text-slate-400' : 'border-neutral-200 text-neutral-500'
                    }`}>
                      <th className="py-2.5 font-bold font-mono">ATTRIBUTE KEY</th>
                      <th className="py-2.5 font-bold font-mono">TYPOLOGY</th>
                      <th className="py-2.5 font-bold font-mono">UNIQUE CARDINALITY</th>
                      <th className="py-2.5 font-bold font-mono">MISSING CELLS</th>
                      <th className="py-2.5 font-bold font-mono">IMPUTATION RATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 dark:divide-neutral-100">
                    {dataset.columns.map((col, idx) => (
                      <tr 
                        key={idx} 
                        className={`hover:bg-blue-500/[0.02] transition-colors ${
                          reportTheme === 'dark' ? 'text-slate-300' : 'text-neutral-700'
                        }`}
                      >
                        <td className="py-3.5 font-bold font-mono truncate max-w-[120px]">
                          {col.name}
                        </td>
                        <td className="py-3.5 font-mono text-[10px] text-blue-500">
                          {col.type.toUpperCase()}
                        </td>
                        <td className="py-3.5 font-mono">
                          {col.uniqueCount} values
                        </td>
                        <td className="py-3.5 font-mono text-slate-500">
                          {col.missingCount} cells
                        </td>
                        <td className="py-3.5 font-mono">
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                            col.missingPercentage === 0 
                              ? 'bg-emerald-500/10 text-emerald-550 dark:text-emerald-600' 
                              : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {(100 - col.missingPercentage).toFixed(1)}% Completeness
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PAGE 4: DATA QUALITY ANALYSIS */}
            <div 
              id="preview-compliance" 
              className="space-y-6 py-10 border-b border-white/10 dark:border-neutral-800 page-break"
            >
              <h3 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${
                reportTheme === 'dark' ? 'text-white' : 'text-neutral-900'
              }`}>
                <span className="text-xs font-mono text-blue-500">III.</span>
                Data Quality & Compliance Analysis
              </h3>

              {renderSectionMeta("III")}

              <p className={`text-xs leading-relaxed ${
                reportTheme === 'dark' ? 'text-slate-400' : 'text-neutral-500'
              }`}>
                Scientific evaluation of variables structure. Evaluates missing field concentrations, row duplication layers, format compliancy rating, and cleaning recommendations.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
                <div className={`p-4 rounded-xl border ${
                  reportTheme === 'dark' ? 'bg-[#020617] border-white/5' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <span className="block text-[9px] font-mono text-slate-500 uppercase">Missing Value Percentage</span>
                  <span className="block text-xl font-bold mt-1 font-mono text-amber-500">
                    {dataQualityDetails.missingValuePercentage.toFixed(2)}%
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">
                    ({dataset.statistics.totalMissingCells} empty segments)
                  </span>
                </div>

                <div className={`p-4 rounded-xl border ${
                  reportTheme === 'dark' ? 'bg-[#020617] border-white/5' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <span className="block text-[9px] font-mono text-slate-500 uppercase">Duplicate Rows Percentage</span>
                  <span className="block text-xl font-bold mt-1 font-mono text-rose-450 text-rose-500">
                    {dataQualityDetails.duplicatePercentage.toFixed(2)}%
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">
                    ({dataset.statistics.duplicateRowsCount} overlapping keys)
                  </span>
                </div>

                <div className={`p-4 rounded-xl border ${
                  reportTheme === 'dark' ? 'bg-[#020617] border-white/5' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <span className="block text-[9px] font-mono text-slate-500 uppercase">Data Integrity Score</span>
                  <span className="block text-xl font-bold mt-1 font-mono text-emerald-450 text-emerald-500">
                    {dataQualityDetails.integrityScore} / 100
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">
                    Completeness minus duplicates
                  </span>
                </div>
              </div>

              {/* Cleaning recommendations listing */}
              <div className={`p-5 rounded-2xl border space-y-3 ${
                reportTheme === 'dark' ? 'bg-black/30 border-white/5' : 'bg-neutral-50 border-neutral-200'
              }`}>
                <span className="text-[10px] font-mono font-black text-blue-500 dark:text-blue-600 uppercase tracking-widest block">
                  Data-Driven Cleaning Recommendations:
                </span>
                <ul className="space-y-2 list-disc pl-5 text-xs text-slate-400">
                  {dataQualityDetails.cleaningRecommendations.map((rec, idx) => (
                    <li key={idx} className={reportTheme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* PAGE 5: STATISTICAL FINDINGS */}
            <div 
              id="preview-statistical" 
              className="space-y-6 py-10 border-b border-white/10 dark:border-neutral-800 page-break"
            >
              <h3 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${
                reportTheme === 'dark' ? 'text-white' : 'text-neutral-900'
              }`}>
                <span className="text-xs font-mono text-blue-500">IV.</span>
                Core Statistical Findings
              </h3>

              {renderSectionMeta("IV")}

              <p className={`text-xs leading-relaxed ${
                reportTheme === 'dark' ? 'text-slate-400' : 'text-neutral-500'
              }`}>
                Deviations matrix check, identifying highest-variance keys, numeric mean centers, modal category items, and descriptive distribution shapes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
                <div className={`p-4 rounded-xl border ${
                  reportTheme === 'dark' ? 'bg-[#020617] border-white/5' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <span className="block text-[9px] font-mono text-slate-500 uppercase">Highest Variance Column</span>
                  <span className="block text-sm font-bold mt-1 text-white dark:text-neutral-900 truncate">
                    {statisticalFindings.highestVarianceCol ? statisticalFindings.highestVarianceCol.name : "N/A - No numeric column"}
                  </span>
                  {statisticalFindings.highestVarianceCol && (
                    <p className="text-[10px] mt-1 text-slate-400 font-mono">
                      Variance: <span className="text-blue-400 font-bold">{statisticalFindings.highestVarianceCol.variance}</span>
                    </p>
                  )}
                  {statisticalFindings.highestVarianceCol && (
                    <p className="text-[9px] text-slate-500 font-mono">
                      Std Dev: {statisticalFindings.highestVarianceCol.stdDev}
                    </p>
                  )}
                </div>

                <div className={`p-4 rounded-xl border ${
                  reportTheme === 'dark' ? 'bg-[#020617] border-white/5' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <span className="block text-[9px] font-mono text-slate-500 uppercase">Highest Average Numeric</span>
                  <span className="block text-sm font-bold mt-1 text-white dark:text-neutral-900 truncate">
                    {statisticalFindings.highestAverageCol ? statisticalFindings.highestAverageCol.name : "N/A - No numeric column"}
                  </span>
                  {statisticalFindings.highestAverageCol && (
                    <p className="text-[10px] mt-1 text-slate-400 font-mono">
                      Mean Center: <span className="text-blue-400 font-bold">{statisticalFindings.highestAverageCol.mean}</span>
                    </p>
                  )}
                </div>

                <div className={`p-4 rounded-xl border ${
                  reportTheme === 'dark' ? 'bg-[#020617] border-white/5' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <span className="block text-[9px] font-mono text-slate-500 uppercase">Most Frequent Category</span>
                  <span className="block text-sm font-bold mt-1 text-white dark:text-neutral-900 truncate" title={statisticalFindings.mostFrequentCat ? statisticalFindings.mostFrequentCat.value : ""}>
                    {statisticalFindings.mostFrequentCat ? `"${statisticalFindings.mostFrequentCat.value}"` : "N/A - No categorical features"}
                  </span>
                  {statisticalFindings.mostFrequentCat && (
                    <p className="text-[10px] mt-1 text-slate-400 font-mono">
                      In Col: <span className="text-blue-400 font-bold">{statisticalFindings.mostFrequentCat.columnName}</span>
                    </p>
                  )}
                  {statisticalFindings.mostFrequentCat && (
                    <p className="text-[9px] text-emerald-500 font-mono">
                      Hits: {statisticalFindings.mostFrequentCat.count} ({statisticalFindings.mostFrequentCat.percentage}%)
                    </p>
                  )}
                </div>
              </div>

              {/* Distribution checklist */}
              <div className={`p-5 rounded-2xl border space-y-3 ${
                reportTheme === 'dark' ? 'bg-black/30 border-white/5' : 'bg-neutral-50 border-neutral-200'
              }`}>
                <span className="text-[10px] font-mono font-black text-blue-500 dark:text-blue-600 uppercase tracking-widest block">
                  Attribute Distribution Characteristics:
                </span>
                <ul className="space-y-2 list-disc pl-5 text-xs text-slate-400">
                  {statisticalFindings.distributionObs.map((obs, idx) => (
                    <li key={idx} className={reportTheme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}>
                      {obs}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* PAGE 6: CORRELATION & TREND ANALYSIS */}
            <div 
              id="preview-trend" 
              className="space-y-6 py-10 border-b border-white/10 dark:border-neutral-800 page-break"
            >
              <h3 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${
                reportTheme === 'dark' ? 'text-white' : 'text-neutral-900'
              }`}>
                <span className="text-xs font-mono text-blue-500">V.</span>
                Correlation & Trend Analysis
              </h3>

              {renderSectionMeta("V")}

              <p className={`text-xs leading-relaxed ${
                reportTheme === 'dark' ? 'text-slate-400' : 'text-neutral-500'
              }`}>
                Factual insights map derived mathematically from Pearson linear coefficients, time serialization, and categorical subgroups variation. No corporate placeholder fillers.
              </p>

              <div className="space-y-3">
                {trendAnalysis.map((trendMsg, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-xl border flex items-start gap-4 ${
                      reportTheme === 'dark' ? 'bg-[#020617] border-white/5 text-slate-300' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div className="p-1 rounded bg-blue-500/10 text-blue-400 font-black text-xs shrink-0 select-none">
                      0{idx + 1}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-wider opacity-60 uppercase block text-blue-500">Verified Statistical Trend</span>
                      <p className={`text-xs ${reportTheme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}`}>{trendMsg}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PAGE 7: BUSINESS OPPORTUNITIES AND OPERATIONAL RISKS */}
            <div 
              id="preview-strategic" 
              className="space-y-6 py-10 border-b border-white/10 dark:border-neutral-800 page-break"
            >
              <h3 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${
                reportTheme === 'dark' ? 'text-white' : 'text-neutral-900'
              }`}>
                <span className="text-xs font-mono text-blue-500">VI.</span>
                Strategic Business Insights Mapping
              </h3>

              {renderSectionMeta("VI")}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Market Opportunities & Drivers
                  </h4>
                  <ul className="space-y-3 pl-4 list-disc text-xs text-slate-400">
                    {analysisOverview.opportunities.map((op, idx) => (
                      <li key={idx} className={reportTheme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}>
                        {op}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-rose-450 text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Structural Operational Risks
                  </h4>
                  <ul className="space-y-3 pl-4 list-disc text-xs text-slate-400">
                    {analysisOverview.risks.map((rk, idx) => (
                      <li key={idx} className={reportTheme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}>
                        {rk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Plan Remediation Steps */}
              <div className="space-y-4 pt-6">
                <h4 className={`text-xs font-black uppercase tracking-widest text-blue-500 ${
                  reportTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  Enterprise Remediation & Implementation Agenda
                </h4>
                
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className={`border-b ${
                        reportTheme === 'dark' ? 'border-white/10 text-slate-400' : 'border-neutral-200 text-neutral-500'
                      }`}>
                        <th className="py-2 font-bold font-mono">PROPOSED ACTION</th>
                        <th className="py-2 font-bold font-mono">OWNING STAKEHOLDER GROUP</th>
                        <th className="py-2 font-bold font-mono">PRIORITIZATION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 dark:divide-neutral-100">
                      {analysisOverview.actionItems.map((item, idx) => (
                        <tr key={idx} className={reportTheme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}>
                          <td className="py-3 font-semibold text-white dark:text-neutral-900 border-none">
                            {item.title}
                          </td>
                          <td className="py-3 font-mono text-neutral-400 border-none">
                            {item.owner}
                          </td>
                          <td className="py-3 border-none">
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] uppercase ${
                              item.urgency === 'High' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                              item.urgency === 'Medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-505/20' :
                              'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            }`}>
                              {item.urgency}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* PAGE 8: COGNITIVE AI INSIGHTS FROM ADORED RUNS */}
            <div 
              id="preview-ai" 
              className="py-10 space-y-6 page-break"
            >
              <h3 className={`text-lg font-black uppercase tracking-tight flex items-center gap-2 ${
                reportTheme === 'dark' ? 'text-white' : 'text-neutral-900'
              }`}>
                <span className="text-xs font-mono text-blue-500">VII.</span>
                Cognitive Intelligence Insights
              </h3>

              {renderSectionMeta("VII")}

              {aiReport ? (
                <div className={`p-6 rounded-2xl border leading-relaxed text-xs space-y-4 select-text max-h-[500px] overflow-y-auto ${
                  reportTheme === 'dark' ? 'bg-[#020617] border-white/10 text-slate-300 shadow-inner' : 'bg-neutral-50 border-neutral-300 text-neutral-700'
                }`}>
                  <div className="prose prose-invert max-w-none text-xs">
                    <Markdown>{aiReport.report}</Markdown>
                  </div>
                </div>
              ) : (
                <div className={`p-12 text-center rounded-2xl border border-dashed text-xs ${
                  reportTheme === 'dark' ? 'border-white/15 text-slate-400 bg-white/[0.01]' : 'border-neutral-300 text-neutral-500 bg-neutral-50'
                }`}>
                  <h4 className="font-bold text-white dark:text-neutral-800 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-1.5 text-xs">
                    <Sparkle className="w-4 h-4 text-amber-400 shrink-0" />
                    Deep Diagnostic Model Report Missing
                  </h4>
                  <p className="max-w-md mx-auto leading-relaxed uppercase [word-spacing:0.1em] text-[10px]">
                    To view comprehensive steps 1-14 intelligence inside this segment, please trigger the AI analytical compiler at the "AI Analysis" tab first.
                  </p>
                </div>
              )}
            </div>

            {/* Document formal closing signature letterhead */}
            <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between text-[10px] text-slate-450 font-mono tracking-wider dark:text-neutral-400 uppercase gap-4 border-t border-white/10 dark:border-neutral-200">
              <span className="font-semibold block text-[9px]">
                INSIGHTAI SYSTEM AUTOMATED CORPORATE SUMMARY
              </span>
              <span className="text-[9px] block">
                CONFIDENTIAL &bull; AUTHENTICATED INTEL REPORT
              </span>
            </div>

          </div>

          {/* Quick guide card under preview template */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-[10px] uppercase font-mono text-white/50 tracking-wide mt-6 flex items-center justify-between gap-3 w-full max-w-4xl">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping" />
              <span>Full Interactive Executive Document Preview Compiled Successfully</span>
            </div>
            
            <button
              onClick={handleDownloadHTML}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-black cursor-pointer font-bold inline-flex items-center gap-1 border-b border-transparent hover:border-blue-400 transition-all uppercase"
            >
              Export Archive Now &rarr;
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
