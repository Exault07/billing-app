import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { 
  HiOutlineSearch, 
  HiOutlineAdjustments,
  HiOutlineExternalLink,
  HiOutlineCog,
  HiOutlineDotsVertical
} from 'react-icons/hi';

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Stats
  const [stockValue, setStockValue] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setProducts(data || []);

      // Calculate stats
      const totalVal = (data || []).reduce((sum, p) => sum + (Number(p.stock_qty || 0) * Number(p.selling_price || 0)), 0);
      setStockValue(totalVal);
      
      const lowCount = (data || []).filter(p => Number(p.stock_qty || 0) <= Number(p.low_stock_alert_qty || 0)).length;
      setLowStockCount(lowCount);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLowStock = showLowStockOnly ? Number(p.stock_qty || 0) <= Number(p.low_stock_alert_qty || 0) : true;
    return matchesSearch && matchesLowStock;
  });

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-16 animate-fade-in text-surface-900 bg-surface-50 min-h-screen">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <h1 className="text-xl font-bold text-surface-800">Items</h1>
        <div className="flex items-center gap-2">
          <button className="px-4 py-1.5 text-[13px] font-semibold border border-[#e5e7eb] rounded text-[#4f46e5] flex items-center gap-1 hover:bg-surface-50">
            <HiOutlineAdjustments className="w-4 h-4" /> Manage Offer
          </button>
          <button className="px-4 py-1.5 text-[13px] font-semibold border border-[#e5e7eb] rounded text-blue-600 flex items-center gap-1 hover:bg-surface-50">
            <HiOutlineDocumentText className="w-4 h-4" /> Reports
          </button>
          <button className="p-1.5 border border-[#e5e7eb] rounded text-surface-500 hover:bg-surface-50">
            <HiOutlineCog className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Box */}
      <div className="bg-white rounded-md shadow-sm border border-surface-200 p-0 overflow-hidden">
        
        {/* Banner Mock */}
        <div className="bg-[#ffd280] px-4 py-3 flex items-center justify-between m-4 rounded-md">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-orange-900">Launch Offers on Your Items</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-white text-orange-600 px-4 py-1 rounded text-[13px] font-bold shadow-sm">Create Offer Now</button>
            <span className="text-orange-900 font-bold cursor-pointer text-lg leading-none">×</span>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 pb-4 border-b border-surface-200">
          <div className="border border-surface-200 rounded-md p-3 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1 mb-1 text-blue-600">
                <HiOutlineExternalLink className="w-3.5 h-3.5" />
                <span className="text-[12px] font-semibold">Stock Value <span className="text-surface-400">ⓘ</span></span>
              </div>
              <div className="text-[20px] font-bold text-surface-800">
                ₹ {stockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <HiOutlineExternalLink className="w-4 h-4 text-surface-400 cursor-pointer" />
          </div>
          
          <div className="border border-surface-200 rounded-md p-3 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1 mb-1 text-orange-600">
                <span className="text-[12px] font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span> Low Stock</span>
              </div>
              <div className="text-[20px] font-bold text-surface-800">
                {lowStockCount}
              </div>
            </div>
            <HiOutlineExternalLink className="w-4 h-4 text-surface-400 cursor-pointer" />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-3 flex flex-wrap gap-3 items-center justify-between bg-surface-50/30">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative w-64">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input 
                type="text" 
                placeholder="Search by Custom Fields" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-surface-200 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <select className="px-3 py-1.5 text-[13px] border border-surface-200 rounded bg-white text-surface-600 w-40">
              <option>Search Categories</option>
            </select>
            <button 
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`px-3 py-1.5 text-[13px] border rounded flex items-center gap-1 ${showLowStockOnly ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-surface-200 text-surface-600'}`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span> Low Stock
            </button>
          </div>
          <div className="flex items-center gap-3">
            <select className="px-3 py-1.5 text-[13px] font-semibold border border-surface-200 rounded bg-white text-surface-700">
              <option>Bulk Actions</option>
            </select>
            <button 
              onClick={() => navigate('/inventory/new')}
              className="px-5 py-1.5 text-[13px] font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded shadow-sm"
            >
              Create Item
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-[#f9fafb] border-y border-surface-200">
              <tr className="text-[12px] font-bold text-surface-700">
                <th className="py-3 px-4 w-12 text-center"><input type="checkbox" className="rounded border-surface-300" /></th>
                <th className="py-3 px-4">Item Name <span className="text-[10px] text-surface-400">↕</span></th>
                <th className="py-3 px-4">Item Code</th>
                <th className="py-3 px-4">Stock QTY <span className="text-[10px] text-surface-400">↕</span></th>
                <th className="py-3 px-4">Selling Price</th>
                <th className="py-3 px-4">Purchase Price</th>
                <th className="py-3 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="text-[13px] text-surface-800">
              {loading ? (
                <tr><td colSpan="7" className="py-10 text-center text-surface-400">Loading items...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan="7" className="py-10 text-center text-surface-400">No items found.</td></tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="border-b border-surface-100 hover:bg-surface-50 group">
                    <td className="py-3 px-4 text-center">
                      <input type="checkbox" className="rounded border-surface-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-surface-800 cursor-pointer hover:text-blue-600" onClick={() => navigate(`/inventory/${p.id}/edit`)}>
                        {p.name}
                      </div>
                      <div className="mt-1 inline-block px-1.5 py-0.5 bg-surface-100 text-[10px] font-medium text-surface-500 rounded border border-surface-200">
                        {p.category || 'Uncategorized'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-surface-600">{p.barcode || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold">{p.stock_qty}</span> <span className="text-[10px] text-surface-500 uppercase">{p.unit}</span>
                    </td>
                    <td className="py-3 px-4">₹ {Number(p.selling_price).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">₹ {Number(p.purchase_price || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-center">
                      <button className="text-surface-400 hover:text-surface-800">
                        <HiOutlineDotsVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Need to mock HiOutlineDocumentText in this file since it was used in header
function HiOutlineDocumentText(props) {
  return <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>;
}
