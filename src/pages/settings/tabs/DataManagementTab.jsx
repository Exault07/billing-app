import { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { HiOutlineDownload, HiOutlineUpload, HiOutlineExclamationTriangle } from 'react-icons/hi2';
import * as XLSX from 'xlsx';

export default function DataManagementTab() {
  const [exporting, setExporting] = useState('');
  const [importing, setImporting] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);

  // ── EXPORT LOGIC ──────────────────────────────────────────────────────────
  const exportData = async (tableName, fileName) => {
    try {
      setExporting(tableName);
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) throw error;
      
      if (!data || data.length === 0) {
        alert(`No data found in ${tableName} to export.`);
        return;
      }

      // Convert JSON to Excel worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      
      // Save file
      XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error(`Error exporting ${tableName}:`, err);
      alert(`Failed to export ${tableName}`);
    } finally {
      setExporting('');
    }
  };

  // ── IMPORT LOGIC ──────────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const templateData = [
      { name: "Sample Product", category: "Hardware", unit: "pcs", mrp: 100, selling_price: 90, stock_qty: 50, low_stock_alert_qty: 5, barcode: "123456789", godown_location: "A1" }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "products_import_template.xlsx");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert Excel rows to JSON array
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          alert('No data found in the Excel file.');
          return;
        }

        // Validate basic fields (name is required)
        const validProducts = jsonData.filter(p => p.name).map(p => ({
          name: p.name,
          category: p.category || '',
          unit: p.unit || 'pcs',
          mrp: Number(p.mrp) || 0,
          selling_price: Number(p.selling_price) || 0,
          stock_qty: Number(p.stock_qty) || 0,
          low_stock_alert_qty: Number(p.low_stock_alert_qty) || 0,
          barcode: p.barcode ? String(p.barcode) : null,
          godown_location: p.godown_location || ''
        }));

        if (validProducts.length === 0) {
          alert("No valid products found. Ensure there is a 'name' column.");
          return;
        }

        const { error } = await supabase.from('products').insert(validProducts);
        if (error) throw error;

        alert(`Successfully imported ${validProducts.length} products!`);
        e.target.value = null; // reset file input
      } catch (err) {
        console.error('Error importing file:', err);
        alert('Failed to import products. Check the file format matches the template.');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── CLEAR DATA LOGIC ──────────────────────────────────────────────────────
  const handleClearData = async () => {
    if (clearConfirmText !== 'DELETE') return;
    
    setClearing(true);
    try {
      // In a real production app, clearing all data would be an RPC function or edge function
      // because we cannot simply issue a DELETE without hitting RLS or foreign key constraints from the client.
      // We simulate calling a Postgres function here, or alert the user.
      const { error } = await supabase.rpc('admin_clear_all_data');
      
      if (error && error.code === '42883') {
        // Fallback warning since we didn't write a recursive delete RPC yet
        alert("CRITICAL WARNING: Direct frontend deletion of all relational tables is restricted due to Foreign Key constraints. To hard-reset the database, please use the Supabase SQL Editor and truncate tables manually, or contact support.");
        setClearConfirmText('');
      } else if (error) {
        throw error;
      } else {
        alert("All transactional data has been successfully cleared.");
        setClearConfirmText('');
      }
    } catch (err) {
      console.error('Error clearing data:', err);
      alert('Failed to clear data: ' + err.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      
      {/* EXPORT SECTION */}
      <div>
        <h2 className="text-xl font-bold text-surface-900 mb-6">Data Export</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <ExportCard title="Products" table="products" filename="products_export" onExport={exportData} exporting={exporting} />
          <ExportCard title="Sales Bills" table="bills" filename="sales_bills_export" onExport={exportData} exporting={exporting} />
          <ExportCard title="Purchases" table="purchase_invoices" filename="purchases_export" onExport={exportData} exporting={exporting} />
          <ExportCard title="Customers" table="customers" filename="customers_export" onExport={exportData} exporting={exporting} />
          <ExportCard title="Suppliers" table="suppliers" filename="suppliers_export" onExport={exportData} exporting={exporting} />
          <ExportCard title="Expenses" table="expenses" filename="expenses_export" onExport={exportData} exporting={exporting} />
        </div>
      </div>

      <hr className="border-surface-200" />

      {/* IMPORT SECTION */}
      <div>
        <h2 className="text-xl font-bold text-surface-900 mb-4">Import Products</h2>
        <div className="bg-surface-50 border border-surface-200 rounded-xl p-6">
          <p className="text-surface-600 mb-4 text-sm">You can bulk import inventory items using an Excel (.xlsx) file. Please download the template first to ensure your columns match exactly.</p>
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-white border border-surface-300 text-surface-700 font-medium rounded-lg hover:bg-surface-50 transition-colors flex items-center gap-2 text-sm"
            >
              <HiOutlineDownload className="w-5 h-5" /> Download Template
            </button>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={importing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <button
                disabled={importing}
                className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-70"
              >
                <HiOutlineUpload className="w-5 h-5" /> {importing ? 'Importing...' : 'Upload Excel File'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-surface-200" />

      {/* DANGER ZONE */}
      <div>
        <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
          <HiOutlineExclamationTriangle className="w-6 h-6" /> Danger Zone
        </h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="font-bold text-red-900 mb-2">Clear All Data</h3>
          <p className="text-red-700 text-sm mb-4">
            This action will permanently delete all Bills, Purchases, Products, Customers, Suppliers, and Expenses from your database. Your Shop Settings and Users will remain. <strong>This action cannot be undone.</strong>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="px-4 py-2 border border-red-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 bg-white"
            />
            <button
              onClick={handleClearData}
              disabled={clearConfirmText !== 'DELETE' || clearing}
              className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearing ? 'Clearing...' : 'Wipe Database'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

function ExportCard({ title, table, filename, onExport, exporting }) {
  const isExporting = exporting === table;
  
  return (
    <div className="bg-white border border-surface-200 p-4 rounded-xl flex items-center justify-between hover:shadow-sm transition-shadow">
      <span className="font-medium text-surface-900">{title}</span>
      <button
        onClick={() => onExport(table, filename)}
        disabled={!!exporting}
        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
        title={`Export ${title}`}
      >
        <HiOutlineDownload className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
      </button>
    </div>
  );
}
