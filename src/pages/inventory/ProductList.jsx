import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { 
 HiOutlineSearch, 
 HiOutlineAdjustments,
 HiOutlineDotsVertical,
 HiOutlineDocumentText,
 HiOutlinePlus,
 HiOutlineTrash,
 HiOutlineDownload,
 HiOutlinePencilAlt,
 HiOutlineRefresh
} from 'react-icons/hi';
import ProductModal from '../../components/inventory/ProductModal';
import AdjustStockModal from '../../components/inventory/AdjustStockModal';
import { useAuth } from '../../context/AuthContext';

const RENDER_BATCH = 30; // items revealed per scroll trigger

export default function ProductList() {
 const { user } = useAuth();

 // All products from DB (full dataset)
 const [allProducts, setAllProducts] = useState([]);
 const [categories, setCategories] = useState([]);
 const [loading, setLoading] = useState(true);
 const [loadingMore, setLoadingMore] = useState(false);
 const [error, setError] = useState(null);

 // Filters
 const [searchTerm, setSearchTerm] = useState('');
 const [categoryFilter, setCategoryFilter] = useState('');
 const [showLowStockOnly, setShowLowStockOnly] = useState(false);

 // Sorting
 const [sortField, setSortField] = useState('name');
 const [sortDesc, setSortDesc] = useState(false);

 // Infinite scroll: how many items are currently rendered
 const [renderedCount, setRenderedCount] = useState(RENDER_BATCH);

 // Selection
 const [selectedIds, setSelectedIds] = useState(new Set());

 // Modals
 const [editingProduct, setEditingProduct] = useState(null);
 const [adjustingProduct, setAdjustingProduct] = useState(null);

 // Sentinel ref for IntersectionObserver
 const sentinelRef = useRef(null);
 const observerRef = useRef(null);

 // ─── Fetch ALL products (chunked to bypass Supabase 1000-row limit) ───────
 const fetchData = useCallback(async () => {
 setLoading(true);
 setError(null);
 try {
 // Fetch categories
 const { data: catData } = await supabase
 .from('item_categories')
 .select('*')
 .order('name');
 setCategories(catData || []);

      // Fetch units
      const { data: unitsData } = await supabase
        .from('units')
        .select('*')
        .order('name');
      const unitsList = unitsData || [];

      // Fetch products in chunks of 1000
      let allData = [];
      let from = 0;
      const chunkSize = 1000;

      while (true) {
        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*, units(name), item_categories(name)')
          .range(from, from + chunkSize - 1)
          .order('name');

        if (fetchError) throw fetchError;
        if (!data || data.length === 0) break;

        const mappedData = data.map(p => ({
          ...p,
          unit: p.units?.name || '',
          category: p.item_categories?.name || ''
        }));

        allData = [...allData, ...mappedData];
        if (data.length < chunkSize) break;
        from += chunkSize;
      }

      setAllProducts(allData);
 setSelectedIds(new Set());
 setRenderedCount(RENDER_BATCH); // reset scroll position
 } catch (err) {
 setError(err.message || 'Failed to load products');
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 fetchData();
 }, [fetchData]);

 // ─── Stats ───────────────────────────────────────────────────────────────
 const stats = useMemo(() => {
 let stockValue = 0;
 let lowStockCount = 0;
 allProducts.forEach(p => {
 stockValue += Number(p.stock_qty || 0) * Number(p.selling_price || 0);
 if (
 Number(p.low_stock_alert_qty || 0) > 0 &&
 Number(p.stock_qty || 0) <= Number(p.low_stock_alert_qty || 0)
 ) lowStockCount++;
 });
 return { stockValue, lowStockCount };
 }, [allProducts]);

 // ─── Filter + Sort (over full dataset) ───────────────────────────────────
 const filteredProducts = useMemo(() => {
 let result = allProducts;

 if (searchTerm) {
 const lower = searchTerm.toLowerCase();
 result = result.filter(p =>
 p.name?.toLowerCase().includes(lower) ||
 p.barcode?.toLowerCase().includes(lower)
 );
 }

 if (categoryFilter) {
 result = result.filter(p => p.category_id === categoryFilter);
 }

 if (showLowStockOnly) {
 result = result.filter(p =>
 Number(p.low_stock_alert_qty || 0) > 0 &&
 Number(p.stock_qty || 0) <= Number(p.low_stock_alert_qty || 0)
 );
 }

 result = [...result].sort((a, b) => {
 let valA, valB;
 if (sortField === 'name') {
 valA = a.name?.toLowerCase() || '';
 valB = b.name?.toLowerCase() || '';
 } else if (sortField === 'stock') {
 valA = Number(a.stock_qty || 0);
 valB = Number(b.stock_qty || 0);
 } else if (sortField === 'price') {
 valA = Number(a.selling_price || 0);
 valB = Number(b.selling_price || 0);
 }
 if (valA < valB) return sortDesc ? 1 : -1;
 if (valA > valB) return sortDesc ? -1 : 1;
 return 0;
 });

 return result;
 }, [allProducts, searchTerm, categoryFilter, showLowStockOnly, sortField, sortDesc]);

 // Reset rendered count when filters change
 useEffect(() => {
 setRenderedCount(RENDER_BATCH);
 }, [searchTerm, categoryFilter, showLowStockOnly, sortField, sortDesc]);

 // The slice actually shown in the DOM
 const visibleProducts = useMemo(
 () => filteredProducts.slice(0, renderedCount),
 [filteredProducts, renderedCount]
 );

 const hasMore = renderedCount < filteredProducts.length;

 // ─── IntersectionObserver ─────────────────────────────────────────────────
 useEffect(() => {
 if (observerRef.current) observerRef.current.disconnect();

 observerRef.current = new IntersectionObserver(
 (entries) => {
 if (entries[0].isIntersecting && hasMore && !loadingMore) {
 setLoadingMore(true);
 // Small delay for smooth feel
 setTimeout(() => {
 setRenderedCount(prev => Math.min(prev + RENDER_BATCH, filteredProducts.length));
 setLoadingMore(false);
 }, 200);
 }
 },
 { threshold: 0.1 }
 );

 if (sentinelRef.current) {
 observerRef.current.observe(sentinelRef.current);
 }

 return () => observerRef.current?.disconnect();
 }, [hasMore, loadingMore, filteredProducts.length]);

 // ─── Handlers ─────────────────────────────────────────────────────────────
 const handleSort = (field) => {
 if (sortField === field) setSortDesc(!sortDesc);
 else { setSortField(field); setSortDesc(false); }
 };

 const toggleSelectAll = () => {
 if (selectedIds.size === visibleProducts.length && visibleProducts.length > 0) {
 setSelectedIds(new Set());
 } else {
 setSelectedIds(new Set(visibleProducts.map(p => p.id)));
 }
 };

 const toggleSelect = (id) => {
 const next = new Set(selectedIds);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 setSelectedIds(next);
 };

 const handleBulkDelete = async () => {
 if (selectedIds.size === 0) return;
 if (!window.confirm(`Delete ${selectedIds.size} item(s)? This cannot be undone.`)) return;
 setLoading(true);
 try {
 const { error } = await supabase.from('products').delete().in('id', Array.from(selectedIds));
 if (error) throw error;
 await fetchData();
 } catch (err) {
 alert('Error deleting: ' + err.message);
 setLoading(false);
 }
 };

 const handleBulkExport = () => {
 if (selectedIds.size === 0) return alert('Select items to export');
 const items = allProducts.filter(p => selectedIds.has(p.id));
 const csv = 'data:text/csv;charset=utf-8,'
 + 'Item Name,Item Code,Category,Stock QTY,Unit,Selling Price,Purchase Price\n'
 + items.map(p =>
 `"${p.name || ''}","${p.barcode || ''}","${p.category || ''}","${p.stock_qty || 0}","${p.unit || ''}","${p.selling_price || 0}","${p.purchase_price || 0}"`
 ).join('\n');
 const link = document.createElement('a');
 link.setAttribute('href', encodeURI(csv));
 link.setAttribute('download', 'inventory_export.csv');
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 // ─── Render ───────────────────────────────────────────────────────────────
 return (
 <div className="animate-fade-in text-surface-900 flex flex-col flex-1 min-h-0">

 {/* Header */}
 <div className="flex items-center justify-between mb-6 pt-4">
 <div>
 <h1 className="text-xl font-bold text-surface-900">Inventory Management</h1>
 <p className="text-sm text-surface-500 mt-1">
 {loading ? 'Loading...' : `${filteredProducts.length.toLocaleString()} of ${allProducts.length.toLocaleString()} items`}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={fetchData}
 className="p-2.5 text-surface-500 hover:text-surface-800 hover:bg-surface-100 rounded-xl border border-surface-200 transition-colors"
 title="Refresh"
 >
 <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
 </button>
 <button
 onClick={() => setEditingProduct({})}
 className="px-5 py-2.5 text-sm font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl shadow-sm flex items-center gap-2 transition-colors"
 >
 <HiOutlinePlus className="w-4 h-4" /> Create Item
 </button>
 </div>
 </div>

 {error && (
 <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
 <span className="mt-0.5 text-red-400">⚠</span>
 <span>{error}</span>
 </div>
 )}

 {/* Summary Cards */}
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl py-3 px-4 shadow-sm border border-[#e0e7ff] bg-[#f8f7ff] flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1 text-[#7c3aed]">
            <HiOutlineAdjustments className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Stock Value</span>
          </div>
          <div className="text-xl font-bold text-surface-900">
            {loading
              ? <div className="h-6 w-24 bg-surface-200 animate-pulse rounded mt-1" />
              : `₹ ${stats.stockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </div>
        </div>

        <div
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`rounded-xl py-3 px-4 shadow-sm border cursor-pointer transition-colors flex flex-col justify-center ${
            showLowStockOnly ? 'bg-orange-50 border-orange-200' : 'bg-white border-surface-200 hover:border-orange-200'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1 text-orange-600">
             <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
             <span className="text-xs font-bold uppercase tracking-wider">Low Stock Items</span>
          </div>
          <div className="text-xl font-bold text-surface-900">
            {loading
              ? <div className="h-6 w-12 bg-surface-200 animate-pulse rounded mt-1" />
              : stats.lowStockCount}
          </div>
        </div>
      </div>

 {/* Filter Bar */}
 <div className="bg-white p-4 rounded-t-2xl border border-surface-200 border-b-0 flex flex-wrap gap-4 items-center justify-between">
 <div className="flex flex-wrap items-center gap-3 flex-1">
 <div className="relative w-72">
 <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input
 type="text"
 placeholder="Search by name or code..."
 value={searchTerm}
 onChange={e => setSearchTerm(e.target.value)}
 className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
 />
 </div>
 <select
 value={categoryFilter}
 onChange={e => setCategoryFilter(e.target.value)}
 className="px-3 py-2 text-sm border border-surface-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500"
 >
 <option value="">All Categories</option>
 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
 </select>
 <button
 onClick={() => setShowLowStockOnly(!showLowStockOnly)}
 className={`px-4 py-2 text-sm font-medium border rounded-xl flex items-center gap-2 transition-colors ${
 showLowStockOnly
 ? 'bg-orange-50 border-orange-200 text-orange-700'
 : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'
 }`}
 >
 <span className={`w-2 h-2 rounded-full ${showLowStockOnly ? 'bg-orange-500' : 'bg-surface-300'}`} />
 Low Stock
 </button>
 </div>

 <div className="flex items-center gap-2">
 {selectedIds.size > 0 && (
 <div className="flex items-center bg-surface-100 rounded-xl p-1 animate-fade-in">
 <span className="px-3 text-xs font-semibold text-surface-500 border-r border-surface-200">
 {selectedIds.size} selected
 </span>
 <button onClick={handleBulkExport} className="p-2 text-surface-600 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors" title="Export">
 <HiOutlineDownload className="w-4 h-4" />
 </button>
 <button onClick={handleBulkDelete} className="p-2 text-surface-600 hover:text-red-600 hover:bg-white rounded-lg transition-colors" title="Delete">
 <HiOutlineTrash className="w-4 h-4" />
 </button>
 </div>
 )}
 </div>
 </div>

 {/* Table */}
 <div className="bg-white border border-surface-200 rounded-b-2xl shadow-sm flex-1 flex flex-col min-h-0">
 <div className="overflow-auto flex-1 relative">
 <table className="w-full text-left border-collapse whitespace-nowrap">
 <thead className="bg-surface-50 border-b border-surface-200 sticky top-0 z-10">
 <tr className="text-[11px] uppercase tracking-wider font-bold text-surface-500">
 <th className="py-3 px-4 w-12 text-center">
 <input
 type="checkbox"
 onChange={toggleSelectAll}
 checked={visibleProducts.length > 0 && selectedIds.size === visibleProducts.length}
 className="rounded text-indigo-600 focus:ring-indigo-500 border-surface-300 cursor-pointer"
 />
 </th>
 <th className="py-3 px-4 cursor-pointer hover:text-surface-700" onClick={() => handleSort('name')}>
 Item Name {sortField === 'name' && (sortDesc ? '↓' : '↑')}
 </th>
 <th className="py-3 px-4">Item Code</th>
 <th className="py-3 px-4">Category</th>
 <th className="py-3 px-4 cursor-pointer hover:text-surface-700" onClick={() => handleSort('stock')}>
 Stock {sortField === 'stock' && (sortDesc ? '↓' : '↑')}
 </th>
 <th className="py-3 px-4 cursor-pointer hover:text-surface-700" onClick={() => handleSort('price')}>
 Selling Price {sortField === 'price' && (sortDesc ? '↓' : '↑')}
 </th>
 <th className="py-3 px-4">Purchase Price</th>
 <th className="py-3 px-4 w-12" />
 </tr>
 </thead>
 <tbody className="text-sm text-surface-700">
 {loading ? (
 Array(8).fill(0).map((_, i) => (
 <tr key={i} className="border-b border-surface-100">
 <td className="py-4 px-4 text-center"><div className="w-4 h-4 rounded bg-surface-200 animate-pulse mx-auto" /></td>
 <td className="py-4 px-4"><div className="h-4 w-48 bg-surface-200 animate-pulse rounded mb-1" /><div className="h-3 w-24 bg-surface-100 animate-pulse rounded" /></td>
 <td className="py-4 px-4"><div className="h-4 w-24 bg-surface-200 animate-pulse rounded" /></td>
 <td className="py-4 px-4"><div className="h-4 w-20 bg-surface-200 animate-pulse rounded" /></td>
 <td className="py-4 px-4"><div className="h-4 w-16 bg-surface-200 animate-pulse rounded" /></td>
 <td className="py-4 px-4"><div className="h-4 w-20 bg-surface-200 animate-pulse rounded" /></td>
 <td className="py-4 px-4"><div className="h-4 w-20 bg-surface-200 animate-pulse rounded" /></td>
 <td className="py-4 px-4"><div className="w-6 h-6 rounded bg-surface-200 animate-pulse" /></td>
 </tr>
 ))
 ) : visibleProducts.length === 0 ? (
 <tr>
 <td colSpan="8" className="py-20 text-center">
 <div className="flex flex-col items-center">
 <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mb-3">
 <HiOutlineDocumentText className="w-8 h-8 text-surface-400" />
 </div>
 <p className="text-base font-bold text-surface-900">No items found.</p>
 <p className="text-sm text-surface-500 mt-1 mb-4 max-w-sm">
 {searchTerm || categoryFilter || showLowStockOnly
 ? 'No items match your filters.'
 : 'Click + Create Item to add your first product.'}
 </p>
 {!searchTerm && !categoryFilter && !showLowStockOnly && (
 <button
 onClick={() => setEditingProduct({})}
 className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm transition-colors"
 >
 + Create Item
 </button>
 )}
 </div>
 </td>
 </tr>
 ) : (
 visibleProducts.map((p) => {
 const isLowStock =
 Number(p.low_stock_alert_qty || 0) > 0 &&
 Number(p.stock_qty || 0) <= Number(p.low_stock_alert_qty || 0);
 return (
 <tr key={p.id} className="border-b border-surface-100 hover:bg-surface-50 group transition-colors">
 <td className="py-3 px-4 text-center">
 <input
 type="checkbox"
 checked={selectedIds.has(p.id)}
 onChange={() => toggleSelect(p.id)}
 className="rounded text-indigo-600 focus:ring-indigo-500 border-surface-300 cursor-pointer"
 />
 </td>
 <td className="py-3 px-4">
 <div
 className="font-bold text-surface-900 cursor-pointer hover:text-indigo-600 transition-colors"
 onClick={() => setEditingProduct(p)}
 >
 {p.name}
 </div>
 </td>
 <td className="py-3 px-4 text-surface-500 font-mono text-xs">
 {p.barcode || '—'}
 </td>
 <td className="py-3 px-4">
 {p.category ? (
 <span className="inline-block px-2 py-0.5 bg-surface-100 text-[10px] font-bold text-surface-600 rounded uppercase tracking-wide">
 {p.category}
 </span>
 ) : (
 <span className="text-surface-300 text-xs">—</span>
 )}
 </td>
 <td className="py-3 px-4">
 <div className={`font-bold ${isLowStock ? 'text-orange-600' : p.stock_qty < 0 ? 'text-red-600' : 'text-surface-900'}`}>
 {Number(p.stock_qty || 0).toLocaleString('en-IN')}
 {p.unit && (
 <span className="ml-1 text-[10px] uppercase font-bold text-surface-400">{p.unit}</span>
 )}
 </div>
 {isLowStock && <p className="text-[10px] text-orange-500 font-medium mt-0.5">Low Stock</p>}
 {p.stock_qty < 0 && <p className="text-[10px] text-red-500 font-medium mt-0.5">Negative Stock</p>}
 </td>
 <td className="py-3 px-4 font-semibold">
 ₹ {Number(p.selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
 </td>
 <td className="py-3 px-4 text-surface-500">
 ₹ {Number(p.purchase_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
 </td>
 <td className="py-3 px-4">
 <div className="relative group/menu flex justify-end">
 <button className="p-1 text-surface-400 hover:text-surface-800 rounded hover:bg-surface-200 transition-colors">
 <HiOutlineDotsVertical className="w-5 h-5" />
 </button>
 <div className="absolute right-0 top-8 w-40 bg-white rounded-xl shadow-lg border border-surface-100 py-1 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20">
 <button
 onClick={() => setEditingProduct(p)}
 className="w-full text-left px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 hover:text-indigo-600 flex items-center gap-2"
 >
 <HiOutlinePencilAlt className="w-4 h-4" /> Edit Item
 </button>
 <button
 onClick={() => setAdjustingProduct(p)}
 className="w-full text-left px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 hover:text-indigo-600 flex items-center gap-2"
 >
 <HiOutlineAdjustments className="w-4 h-4" /> Adjust Stock
 </button>
 </div>
 </div>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>

 {/* Sentinel + loader */}
 {!loading && (
 <div ref={sentinelRef} className="py-4 flex flex-col items-center justify-center gap-2">
 {loadingMore && (
 <div className="flex items-center gap-2 text-sm text-surface-400">
 <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
 Loading more items...
 </div>
 )}
 {!hasMore && visibleProducts.length > 0 && (
 <p className="text-xs text-surface-400 font-medium">
 ✓ All {filteredProducts.length.toLocaleString()} items loaded
 </p>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Modals */}
 {editingProduct !== null && (
 <ProductModal
 item={Object.keys(editingProduct).length === 0 ? null : editingProduct}
 onClose={() => setEditingProduct(null)}
 onSaved={() => { setEditingProduct(null); fetchData(); }}
 />
 )}
 {adjustingProduct !== null && (
 <AdjustStockModal
 item={adjustingProduct}
 onClose={() => setAdjustingProduct(null)}
 onSaved={() => { setAdjustingProduct(null); fetchData(); }}
 />
 )}
 </div>
 );
}
