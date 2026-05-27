import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { 
  HiOutlineSearch, 
  HiOutlinePlus, 
  HiOutlineCog,
  HiOutlineDocumentReport,
  HiDotsVertical,
  HiOutlineQuestionMarkCircle
} from 'react-icons/hi';

const PurchaseList = ({ tab = 'invoices' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tab);
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('365days');
  const [loading, setLoading] = useState(true);

  // Summary Metrics (calculated from invoices)
  const [metrics, setMetrics] = useState({
    totalPurchases: 0,
    paid: 0,
    unpaid: 0
  });

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'invoices') {
        const { data, error } = await supabase
          .from('purchase_invoices')
          .select('*, suppliers(name)')
          .order('date', { ascending: false });
        
        if (!error && data) {
          setInvoices(data);
          
          // Calculate metrics
          let total = 0, paid = 0, unpaid = 0;
          data.forEach(inv => {
            total += Number(inv.total_amount || 0);
            paid += Number(inv.advance_paid || 0);
            unpaid += Number(inv.balance_due || 0);
          });
          setMetrics({ totalPurchases: total, paid, unpaid });
        }
      } else if (activeTab === 'orders') {
        const { data, error } = await supabase.from('purchase_orders').select('*, suppliers(name)').order('date', { ascending: false });
        if (!error && data) setOrders(data);
      } else if (activeTab === 'returns') {
        const { data, error } = await supabase.from('purchase_returns').select('*, suppliers(name), purchase_invoices(bill_no)').order('return_date', { ascending: false });
        if (!error && data) setReturns(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const getStatusPill = (inv) => {
    const balance = Number(inv.balance_due || 0);
    const total = Number(inv.total_amount || 0);
    
    if (balance <= 0 && total > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          Paid
        </span>
      );
    } else if (balance < total) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
          Partial
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          Unpaid
        </span>
      );
    }
  };

  const filteredInvoices = invoices.filter(item => 
    (item.bill_no?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (item.suppliers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-800">
          {activeTab === 'invoices' && 'Purchase Invoices'}
          {activeTab === 'orders' && 'Purchase Orders'}
          {activeTab === 'returns' && 'Purchase Returns'}
        </h1>
        
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors">
            <HiOutlineDocumentReport className="w-4 h-4 text-blue-600" />
            Reports
          </button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <HiOutlineCog className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <HiOutlineQuestionMarkCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6 flex-1 max-w-full overflow-hidden">

        {/* Summary Cards */}
        {activeTab === 'invoices' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#f5f3ff] border border-[#ddd6fe] rounded-lg p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-indigo-800 text-sm font-medium mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                Total Purchases
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalPurchases)}</div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Paid
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.paid)}</div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                Unpaid
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.unpaid)}</div>
            </div>
          </div>
        )}

        {/* Controls Row */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
              />
            </div>
            <select 
              className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="365days">Last 365 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
            </select>
          </div>
          
          {activeTab === 'invoices' && (
            <button onClick={() => navigate('/purchases/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors">
              Create Purchase Invoice
            </button>
          )}
          {activeTab === 'orders' && (
            <button onClick={() => navigate('/purchases/orders/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors">
              Create Purchase Order
            </button>
          )}
          {activeTab === 'returns' && (
            <button onClick={() => navigate('/purchases/returns/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors">
              Create Debit Note
            </button>
          )}
        </div>

        {/* Table Area */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex-1">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#f9fafb] border-b border-gray-200">
                  {activeTab === 'invoices' && (
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Purchase Invoice Number</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Party Name</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Due In</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Amount</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-28 text-center">Status</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  )}
                  {activeTab === 'orders' && (
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">PO Number</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Party Name</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Expected Delivery</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Total</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-28 text-center">Status</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  )}
                  {activeTab === 'returns' && (
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Debit Note Number</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Party Name</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Original Bill No</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Return Amount</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeTab === 'invoices' && filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/50 group">
                      <td className="px-4 py-4 text-sm text-gray-600">{new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="px-4 py-4 text-sm text-indigo-600 font-medium cursor-pointer" onClick={() => navigate(`/purchases/${inv.id}`)}>{inv.bill_no}</td>
                      <td className="px-4 py-4 text-sm text-gray-800">{inv.suppliers?.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-400">-</td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(inv.total_amount)}</div>
                        {Number(inv.balance_due) > 0 && (
                          <div className="text-xs text-gray-500 mt-0.5">({formatCurrency(inv.balance_due)} unpaid)</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {getStatusPill(inv)}
                      </td>
                      <td className="px-4 py-4 text-center text-gray-400">
                        <button className="p-1 hover:bg-gray-100 rounded-md transition-colors" onClick={(e) => { e.stopPropagation(); navigate(`/purchases/${inv.id}/edit`); }}>
                          <HiDotsVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {activeTab === 'orders' && orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-4 text-sm text-gray-600">{new Date(ord.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="px-4 py-4 text-sm text-indigo-600 font-medium cursor-pointer" onClick={() => navigate(`/purchases/orders/${ord.id}/edit`)}>{ord.po_no}</td>
                      <td className="px-4 py-4 text-sm text-gray-800">{ord.suppliers?.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{ord.expected_delivery ? new Date(ord.expected_delivery).toLocaleDateString('en-GB') : '-'}</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(ord.total)}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 capitalize">
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-gray-400">
                        <button className="p-1 hover:bg-gray-100 rounded-md transition-colors" onClick={() => navigate(`/purchases/orders/${ord.id}/edit`)}>
                          <HiDotsVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {activeTab === 'returns' && returns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-4 text-sm text-gray-600">{new Date(ret.return_date || ret.date || ret.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="px-4 py-4 text-sm text-gray-800 font-medium">{ret.return_no || ret.id.split('-')[0].toUpperCase()}</td>
                      <td className="px-4 py-4 text-sm text-gray-800">{ret.suppliers?.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{ret.purchase_invoices?.bill_no || '-'}</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(ret.total_return_amount)}</td>
                      <td className="px-4 py-4 text-center text-gray-400">
                        <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                          <HiDotsVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {activeTab === 'invoices' && filteredInvoices.length === 0 && !loading && (
                <div className="py-12 text-center text-gray-500 bg-white">No invoices found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseList;
