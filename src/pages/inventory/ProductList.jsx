import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  HiOutlineSearch, 
  HiOutlineAdjustments,
  HiOutlineExternalLink,
  HiOutlineCog,
  HiOutlineDotsVertical,
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineDownload,
  HiOutlinePencilAlt
} from 'react-icons/hi';
import ProductModal from '../../components/inventory/ProductModal';
import AdjustStockModal from '../../components/inventory/AdjustStockModal';
import { useAuth } from '../../context/AuthContext';

export default function ProductList() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState('name');
  const [sortDesc, setSortDesc] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modals
  const [editingProduct, setEditingProduct] = useState(null); // null = closed, {} = new, {id...} = edit
  const [adjustingProduct, setAdjustingProduct] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: prodData, error: prodError }, { data: catData }] = await Promise.all([
        supabase.from('products').select('*, item_categories(name), units(name)'),
        supabase.from('item_categories').select('*').order('name')
      ]);
      
      if (prodError) throw prodError;
      
      setProducts(prodData || []);
      setCategories(catData || []);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    let stockValue = 0;
    let lowStockCount = 0;
    
    products.forEach(p => {
      stockValue += Number(p.stock_qty || 0) * Number(p.selling_price || 0);
      if (Number(p.stock_qty || 0) <= Number(p.low_stock_alert_qty || 0) && Number(p.low_stock_alert_qty || 0) > 0) {
        lowStockCount++;
      }
    });

    return { stockValue, lowStockCount };
  }, [products]);

  // Filtering, Sorting, Pagination
  const filteredAndSortedProducts = useMemo(() => {
    let result = products;

    // Filters
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.name?.toLowerCase().includes(lower)) || 
        (p.barcode?.toLowerCase().includes(lower))
      );
    }
    
    if (categoryFilter) {
      result = result.filter(p => p.category_id === categoryFilter);
    }

    if (showLowStockOnly) {
      result = result.filter(p => Number(p.stock_qty || 0) <= Number(p.low_stock_alert_qty || 0) && Number(p.low_stock_alert_qty || 0) > 0);
    }

    // Sorting
    result.sort((a, b) => {
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
  }, [products, searchTerm, categoryFilter, showLowStockOnly, sortField, sortDesc]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedProducts, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedProducts.length && paginatedProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedProducts.map(p => p.id)));
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
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('products').delete().in('id', Array.from(selectedIds));
      if (error) throw error;
      await fetchData();
    } catch (err) {
      alert("Error deleting items: " + err.message);
      setLoading(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.size === 0) return alert("Select items to export");
    const itemsToExport = products.filter(p => selectedIds.has(p.id));
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Item Name,Item Code,Category,Stock QTY,Unit,Selling Price,Purchase Price\n"
      + itemsToExport.map(p => {
          return `"${p.name || ''}","${p.barcode || ''}","${p.item_categories?.name || ''}","${p.stock_qty || 0}","${p.units?.name || ''}","${p.selling_price || 0}","${p.purchase_price || 0}"`;
        }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-16 animate-fade-in text-surface-900 bg-surface-50 min-h-screen">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Inventory Management</h1>
          <p className="text-sm text-surface-500 mt-1">Track and manage your products and services</p>
        </div>
        <button 
          onClick={() => setEditingProduct({})}
          className="px-5 py-2.5 text-sm font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl shadow-sm flex items-center gap-2 transition-colors"
        >
          <HiOutlinePlus className="w-4 h-4" /> Create Item
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <span className="mt-0.5 text-red-400">âš </span>
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-surface-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-indigo-600">
            <HiOutlineAdjustments className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Stock Value</span>
          </div>
          <div className="text-3xl font-black text-surface-900">
            {loading ? <div className="h-8 w-32 bg-surface-200 animate-pulse rounded mt-1"></div> : `₹ ${stats.stockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </div>
        </div>
        
        <div 
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`rounded-2xl p-5 shadow-sm border cursor-pointer transition-colors flex flex-col justify-center ${showLowStockOnly ? 'bg-orange-50 border-orange-200' : 'bg-white border-surface-200 hover:border-orange-200'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 mb-2 text-orange-600">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
              <span className="text-sm font-bold uppercase tracking-wider">Low Stock Items</span>
            </div>
          </div>
          <div className="text-3xl font-black text-surface-900">
            {loading ? <div className="h-8 w-16 bg-surface-200 animate-pulse rounded mt-1"></div> : stats.lowStockCount}
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
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select 
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-sm border border-surface-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.length === 0 && <option disabled>No categories yet</option>}
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button 
            onClick={() => { setShowLowStockOnly(!showLowStockOnly); setCurrentPage(1); }}
            className={`px-4 py-2 text-sm font-medium border rounded-xl flex items-center gap-2 transition-colors ${showLowStockOnly ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'}`}
          >
            <span className={`w-2 h-2 rounded-full ${showLowStockOnly ? 'bg-orange-500' : 'bg-surface-300'}`}></span> Low Stock
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <div className="flex items-center bg-surface-100 rounded-xl p-1 animate-fade-in">
              <span className="px-3 text-xs font-semibold text-surface-500 border-r border-surface-200">{selectedIds.size} selected</span>
              <button onClick={handleBulkExport} className="p-2 text-surface-600 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors" title="Export to Excel">
                <HiOutlineDownload className="w-4 h-4" />
              </button>
              <button onClick={handleBulkDelete} className="p-2 text-surface-600 hover:text-red-600 hover:bg-white rounded-lg transition-colors" title="Delete Selected">
                <HiOutlineTrash className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-surface-200 rounded-b-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr className="text-[11px] uppercase tracking-wider font-bold text-surface-500">
                <th className="py-3 px-4 w-12 text-center">
                  <input type="checkbox" onChange={toggleSelectAll} checked={paginatedProducts.length > 0 && selectedIds.size === paginatedProducts.length} className="rounded text-indigo-600 focus:ring-indigo-500 border-surface-300 cursor-pointer" />
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-surface-700" onClick={() => handleSort('name')}>
                  Item Name {sortField === 'name' && (sortDesc ? 'â†“' : 'â†‘')}
                </th>
                <th className="py-3 px-4">Item Code</th>
                <th className="py-3 px-4 cursor-pointer hover:text-surface-700" onClick={() => handleSort('stock')}>
                  Stock QTY {sortField === 'stock' && (sortDesc ? 'â†“' : 'â†‘')}
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-surface-700" onClick={() => handleSort('price')}>
                  Selling Price {sortField === 'price' && (sortDesc ? 'â†“' : 'â†‘')}
                </th>
                <th className="py-3 px-4">Purchase Price</th>
                <th className="py-3 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="text-sm text-surface-700">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-surface-100">
                    <td className="py-4 px-4 text-center"><div className="w-4 h-4 rounded bg-surface-200 animate-pulse mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-48 bg-surface-200 animate-pulse rounded mb-2"></div><div className="h-3 w-24 bg-surface-100 animate-pulse rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-surface-200 animate-pulse rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-surface-200 animate-pulse rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-surface-200 animate-pulse rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-surface-200 animate-pulse rounded"></div></td>
                    <td className="py-4 px-4"><div className="w-6 h-6 rounded bg-surface-200 animate-pulse"></div></td>
                  </tr>
                ))
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mb-3">
                        <HiOutlineDocumentText className="w-8 h-8 text-surface-400" />
                      </div>
                      <p className="text-base font-bold text-surface-900">No items found.</p>
                      <p className="text-sm text-surface-500 mt-1 mb-4 max-w-sm">There are no items matching your criteria. Click + Create Item to add your first product.</p>
                      <button onClick={() => setEditingProduct({})} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm transition-colors">
                        + Create Item
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const isLowStock = Number(p.stock_qty || 0) <= Number(p.low_stock_alert_qty || 0) && Number(p.low_stock_alert_qty || 0) > 0;
                  return (
                    <tr key={p.id} className="border-b border-surface-100 hover:bg-surface-50 group transition-colors">
                      <td className="py-3 px-4 text-center">
                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded text-indigo-600 focus:ring-indigo-500 border-surface-300 cursor-pointer  data-[checked=true]:opacity-100 transition-opacity" data-checked={selectedIds.has(p.id)} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-surface-900 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setEditingProduct(p)}>
                          {p.name}
                        </div>
                        <div className="mt-1 inline-block px-2 py-0.5 bg-surface-100 text-[10px] font-bold text-surface-600 rounded uppercase tracking-wide">
                          {p.item_categories?.name || 'Uncategorized'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-surface-600 font-medium">
                        {p.barcode || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className={`font-bold ${isLowStock ? 'text-orange-600' : 'text-surface-900'}`}>
                          {p.stock_qty} <span className="text-[10px] uppercase font-bold text-surface-400">{p.units?.name || 'PCS'}</span>
                        </div>
                        {isLowStock && <p className="text-[10px] text-orange-500 font-medium mt-0.5">Low Stock</p>}
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
                            <button onClick={() => setEditingProduct(p)} className="w-full text-left px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 hover:text-indigo-600 flex items-center gap-2">
                              <HiOutlinePencilAlt className="w-4 h-4" /> Edit Item
                            </button>
                            <button onClick={() => setAdjustingProduct(p)} className="w-full text-left px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 hover:text-indigo-600 flex items-center gap-2">
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
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-white border-t border-surface-200 flex items-center justify-between">
            <span className="text-sm text-surface-500 font-medium">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedProducts.length)} of {filteredAndSortedProducts.length} items
            </span>
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="px-3 py-1.5 border border-surface-200 rounded-lg text-sm font-semibold text-surface-600 hover:bg-surface-50 disabled:opacity-50">Prev</button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${currentPage === i + 1 ? 'bg-indigo-50 text-indigo-700' : 'text-surface-600 hover:bg-surface-50'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)} className="px-3 py-1.5 border border-surface-200 rounded-lg text-sm font-semibold text-surface-600 hover:bg-surface-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
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
