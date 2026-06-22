export interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'boolean' | 'unknown';
  uniqueCount: number;
  sampleValues: any[];
  missingCount: number;
  missingPercentage: number;
  // Numerical stats
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
}

export interface Dataset {
  fileName: string;
  fileSize: number; // in bytes
  rowCount: number;
  columnCount: number;
  headers: string[];
  rows: Record<string, any>[];
  columns: ColumnInfo[];
  statistics: {
    duplicateRowsCount: number;
    duplicatePercentage: number;
    totalMissingCells: number;
    totalCells: number;
    overallCompleteness: number; // percentage
  };
}

export interface AIReport {
  report: string; // Markdown formatted report matching step 1-14
  generatedAt: string;
}
