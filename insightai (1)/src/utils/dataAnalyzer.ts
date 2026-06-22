import { ColumnInfo, Dataset } from "../types";

// Helper to check if a string is a number
function isNumeric(val: any): boolean {
  if (val === null || val === undefined || val === '') return false;
  return !isNaN(Number(val));
}

// Helper to check if a value is likely a date
function isLikelyDate(val: any): boolean {
  if (typeof val !== 'string') return false;
  if (val.trim() === '') return false;
  const num = Number(val);
  if (!isNaN(num)) return false; // Is a number, not purely a date
  
  // Date pattern matcher: e.g. YYYY-MM-DD, MM/DD/YYYY, etc.
  const dateParts = val.match(/^(\d{1,4})[./\-](\d{1,2})[./\-](\d{1,4})$/);
  if (dateParts) {
    const d = new Date(val);
    return !isNaN(d.getTime());
  }
  
  // Also check standard ISO strings or common word-based dates
  if (val.length > 5 && isNaN(Number(val))) {
    const d = Date.parse(val);
    return !isNaN(d) && val.includes(':') || val.includes('-');
  }
  return false;
}

// Helper to check if a value is boolean
function isBooleanLike(val: any): boolean {
  if (typeof val === 'boolean') return true;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === 'false' || s === 'yes' || s === 'no' || s === '1' || s === '0';
  }
  if (typeof val === 'number') {
    return val === 0 || val === 1;
  }
  return false;
}

export function analyzeRawData(
  fileName: string,
  fileSize: number,
  headers: string[],
  rows: Record<string, any>[]
): Dataset {
  const rowCount = rows.length;
  const columnCount = headers.length;

  // Initialize columns metadata
  const columns: ColumnInfo[] = headers.map(header => {
    return {
      name: header,
      type: 'unknown',
      uniqueCount: 0,
      sampleValues: [],
      missingCount: 0,
      missingPercentage: 0
    };
  });

  let totalMissingCells = 0;
  
  // 1. Analyze each column's values
  columns.forEach((col, idx) => {
    const values = rows.map(row => row[col.name]);
    
    // Analyze missing status
    const nonMissingValues = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    const missingCount = rowCount - nonMissingValues.length;
    col.missingCount = missingCount;
    col.missingPercentage = rowCount > 0 ? Number(((missingCount / rowCount) * 100).toFixed(1)) : 0;
    totalMissingCells += missingCount;

    // Sample values (up to 10 unique non-empty ones)
    const uniqueValuesSet = new Set(nonMissingValues);
    col.uniqueCount = uniqueValuesSet.size;
    col.sampleValues = Array.from(uniqueValuesSet).slice(0, 8);

    // Infere data type
    if (nonMissingValues.length === 0) {
      col.type = 'unknown';
    } else {
      // Sample checking
      let numericVotes = 0;
      let dateVotes = 0;
      let booleanVotes = 0;
      
      const checkLimit = Math.min(nonMissingValues.length, 100);
      for (let i = 0; i < checkLimit; i++) {
        const val = nonMissingValues[i];
        if (isNumeric(val)) numericVotes++;
        if (isLikelyDate(val)) dateVotes++;
        if (isBooleanLike(val)) booleanVotes++;
      }

      const ratioNumeric = numericVotes / checkLimit;
      const ratioDate = dateVotes / checkLimit;
      const ratioBoolean = booleanVotes / checkLimit;

      if (ratioNumeric > 0.7) {
        col.type = 'numeric';
      } else if (ratioDate > 0.7) {
        col.type = 'date';
      } else if (ratioBoolean > 0.7) {
        col.type = 'boolean';
      } else {
        col.type = 'categorical';
      }
    }

    // Numerical calculations
    if (col.type === 'numeric') {
      const numVals = nonMissingValues.map(v => Number(v)).filter(n => !isNaN(n));
      if (numVals.length > 0) {
        numVals.sort((a, b) => a - b);
        const min = numVals[0];
        const max = numVals[numVals.length - 1];
        
        const sum = numVals.reduce((acc, curr) => acc + curr, 0);
        const mean = sum / numVals.length;

        // Median
        const mid = Math.floor(numVals.length / 2);
        const median = numVals.length % 2 !== 0 ? numVals[mid] : (numVals[mid - 1] + numVals[mid]) / 2;

        // Standard Deviation
        const sqDiffs = numVals.map(v => Math.pow(v - mean, 2));
        const variance = sqDiffs.reduce((acc, curr) => acc + curr, 0) / numVals.length;
        const stdDev = Math.sqrt(variance);

        col.min = Number(min.toFixed(3));
        col.max = Number(max.toFixed(3));
        col.mean = Number(mean.toFixed(3));
        col.median = Number(median.toFixed(3));
        col.stdDev = Number(stdDev.toFixed(3));
      }
    }
  });

  // 2. Detect duplicate rows
  // To avoid performance bottlenecks on massive datasets, stringify rows or use a combined key
  const seenRows = new Set<string>();
  let duplicateRowsCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowStr = JSON.stringify(rows[i]);
    if (seenRows.has(rowStr)) {
      duplicateRowsCount++;
    } else {
      seenRows.add(rowStr);
    }
  }

  const duplicatePercentage = rowCount > 0 ? Number(((duplicateRowsCount / rowCount) * 100).toFixed(1)) : 0;
  const totalCells = rowCount * columnCount;
  const overallCompleteness = totalCells > 0 ? Number((((totalCells - totalMissingCells) / totalCells) * 100).toFixed(1)) : 100;

  return {
    fileName,
    fileSize,
    rowCount,
    columnCount,
    headers,
    rows,
    columns,
    statistics: {
      duplicateRowsCount,
      duplicatePercentage,
      totalMissingCells,
      totalCells,
      overallCompleteness
    }
  };
}
