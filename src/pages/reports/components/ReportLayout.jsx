import React from 'react';
import { HiOutlineDownload, HiOutlineDocumentReport, HiOutlinePrinter, HiOutlineDocumentText } from 'react-icons/hi';
import { exportToPDF, exportToExcel, printReport } from '../ExportUtils';

export default function ReportLayout({ 
  title, 
  data, 
  columns, 
  loading, 
  summaryData, // Array of { label, value }
  renderRow, // Function to render a row tr
  renderHeader // Function to render thead tr
}) {
  const handleExportPDF = () => exportToPDF(title, columns.map(c => c.header), data.map(row => {
    let out = {};
    columns.forEach(c => out[c.header] = c.accessor(row));
    return out;
  }));

  const handleExportExcel = () => {
    const formattedData = data.map(row => {
      let out = {};
      columns.forEach(c => out[c.header] = c.accessor(row));
      return out;
    });
    exportToExcel(title, formattedData);
  };

  const handlePrint = () => {
    const formattedData = data.map(row => {
      let out = {};
      columns.forEach(c => out[c.header] = c.accessor(row));
      return out;
    });
    printReport(title, columns.map(c => c.header), formattedData);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Top Bar */}
      <div className="p-4 border-b border-surface-200 flex items-center justify-between bg-surface-50">
        <h2 className="text-lg font-bold text-surface-900">{title}</h2>
        
        <div className="flex gap-2">
          <button 
            onClick={handleExportPDF} disabled={loading || data.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <HiOutlineDocumentReport className="w-4 h-4" /> PDF
          </button>
          <button 
            onClick={handleExportExcel} disabled={loading || data.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <HiOutlineDownload className="w-4 h-4" /> Excel
          </button>
          <button 
            onClick={handlePrint} disabled={loading || data.length === 0}
            className="px-3 py-1.5 text-xs font-semibold text-surface-600 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <HiOutlinePrinter className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Summary Row */}
      {summaryData && summaryData.length > 0 && (
        <div className="p-4 border-b border-surface-100 bg-white flex flex-wrap gap-4">
          {summaryData.map((stat, idx) => (
            <div key={idx} className="bg-surface-50 px-4 py-2 rounded-xl border border-surface-200 min-w-[150px]">
              <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-lg font-black text-indigo-600">
                {loading ? <span className="animate-pulse bg-surface-200 h-6 w-16 block rounded mt-1"></span> : stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Table Area */}
      <div className="flex-1 overflow-auto bg-white p-0">
        <table className="w-full text-left whitespace-nowrap text-sm border-collapse">
          <thead className="bg-surface-50 sticky top-0 border-y border-surface-200 z-10 shadow-sm shadow-surface-100">
            {renderHeader ? renderHeader() : (
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="px-4 py-3 font-bold text-surface-600 uppercase text-[11px] tracking-wider">
                    {col.header}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-surface-100">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-4"><div className="h-4 bg-surface-200 animate-pulse rounded w-3/4"></div></td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mb-3">
                      <HiOutlineDocumentText className="w-8 h-8 text-surface-400" />
                    </div>
                    <p className="font-bold text-surface-900">No data found</p>
                    <p className="text-sm text-surface-500 mt-1">There is no data for the selected period.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, i) => renderRow ? renderRow(row, i) : (
                <tr key={i} className="hover:bg-surface-50 transition-colors">
                  {columns.map((col, j) => (
                    <td key={j} className={`px-4 py-3 text-surface-700 ${col.className || ''}`}>
                      {col.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
