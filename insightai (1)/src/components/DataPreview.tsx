import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  SlidersHorizontal,
  Hash,
  Type as FontIcon,
  Calendar,
  Layers,
  HelpCircle
} from "lucide-react";
import { Dataset, ColumnInfo } from "../types";

interface DataPreviewProps {
  dataset: Dataset;
}

export default function DataPreview({ dataset }: DataPreviewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Helper to render type badge
  const renderTypeBadge = (type: ColumnInfo['type']) => {
    switch (type) {
      case 'numeric':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/25">
            <Hash className="w-2.5 h-2.5" />
            NUM
          </span>
        );
      case 'categorical':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-white/5 text-white/70 border border-white/10">
            <FontIcon className="w-2.5 h-2.5" />
            TXT
          </span>
        );
      case 'date':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Calendar className="w-2.5 h-2.5" />
            DATE
          </span>
        );
      case 'boolean':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Layers className="w-2.5 h-2.5" />
            BOOL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">
            <HelpCircle className="w-2.5 h-2.5" />
            UNK
          </span>
        );
    }
  };

  // 1. Sort rows helper
  const handleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      // Toggle direction
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null); // Clear sort
      }
    } else {
      setSortColumn(columnName);
      setSortDirection('asc');
    }
    setCurrentPage(1); // reset page
  };

  // 2. Filter & Sort the original rows
  const preparedRows = useMemo(() => {
    let output = [...dataset.rows];

    // Apply global text searching
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      output = output.filter(row => {
        return Object.values(row).some(val => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // Apply targeted sorting
    if (sortColumn) {
      output.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (valA === undefined || valA === null || valA === "") return 1;
        if (valB === undefined || valB === null || valB === "") return -1;

        const isNumVal = !isNaN(Number(valA)) && !isNaN(Number(valB));
        if (isNumVal) {
          return sortDirection === 'asc' 
            ? Number(valA) - Number(valB) 
            : Number(valB) - Number(valA);
        }

        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return output;
  }, [dataset.rows, searchTerm, sortColumn, sortDirection]);

  // 3. Paginated output
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return preparedRows.slice(start, start + pageSize);
  }, [preparedRows, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(preparedRows.length / pageSize));

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Filtering Utility Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10 font-sans">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-white/40" />
          <input
            type="text"
            placeholder="Search records across all dimensions..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            id="preview-search-input"
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-black/60 border border-white/10 hover:border-white/20 focus:border-blue-500 rounded text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-sans uppercase tracking-widest"
          />
        </div>

        {/* Page size controller */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <SlidersHorizontal className="w-3.5 h-3.5 text-white/40" />
          <span className="text-[10px] uppercase font-black tracking-widest text-white/50">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            id="preview-pagesize-select"
            className="bg-black/60 border border-white/10 hover:border-white/20 rounded text-xs text-white/80 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans cursor-pointer uppercase tracking-wider"
          >
            <option value={10}>10 Records</option>
            <option value={25}>25 Records</option>
            <option value={50}>50 Records</option>
            <option value={100}>100 Records</option>
          </select>
        </div>
      </div>

      {/* Main Table Viewer */}
      <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-black/10 shadow-xl">
        <table className="w-full border-collapse text-left text-xs text-white/80">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/10">
              {dataset.columns.map((col, idx) => (
                <th
                  key={idx}
                  onPointerDown={() => handleSort(col.name)}
                  className="px-6 py-4 font-black text-[10px] tracking-widest uppercase font-mono text-white/70 cursor-pointer hover:bg-white/5 transition-colors select-none group whitespace-nowrap min-w-[140px]"
                >
                  <div className="flex items-center gap-2">
                    <span>{col.name}</span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {renderTypeBadge(col.type)}
                      {sortColumn === col.name ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-[#0A0A0B]/20">
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  {dataset.columns.map((col, colIdx) => {
                    const cellVal = row[col.name];
                    const isBlank = cellVal === null || cellVal === undefined || String(cellVal).trim() === "";
                    return (
                      <td 
                        key={colIdx} 
                        className="px-6 py-3.5 font-sans whitespace-nowrap overflow-hidden text-ellipsis max-w-xs text-xs"
                      >
                        {isBlank ? (
                          <span className="text-[10px] text-red-500 font-bold font-mono uppercase tracking-widest select-none">
                            [empty]
                          </span>
                        ) : (
                          <span className={`${col.type === 'numeric' ? 'font-mono text-blue-400 font-bold' : 'text-white/80'}`}>
                            {String(cellVal)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={dataset.columnCount} 
                  className="text-center py-12 text-white/30 font-black uppercase tracking-widest font-mono italic"
                >
                  No matching elements found in dataset preview.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Command Rail */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10">
        <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
          Showing <span className="font-extrabold text-white">{Math.min(preparedRows.length, (currentPage - 1) * pageSize + 1)}</span> to{" "}
          <span className="font-extrabold text-white">{Math.min(preparedRows.length, currentPage * pageSize)}</span> of{" "}
          <span className="font-extrabold text-white">{preparedRows.length.toLocaleString()}</span> entries{" "}
          {searchTerm.trim() !== "" && "(filtered)"}
        </span>

        <div className="flex items-center gap-2">
          <button
            onPointerDown={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            id="preview-prev-btn"
            className="p-1.5 text-white/60 bg-black/65 border border-white/15 hover:bg-white/5 disabled:opacity-40 rounded transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-[10px] font-black text-white font-mono uppercase tracking-widest px-3 select-none">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onPointerDown={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            id="preview-next-btn"
            className="p-1.5 text-white/60 bg-black/65 border border-white/15 hover:bg-white/5 disabled:opacity-40 rounded transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
