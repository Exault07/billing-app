import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { 
 HiOutlineSearch, 
 HiOutlineDocumentText,
 HiOutlineCog,
 HiOutlineDotsVertical,
 HiOutlineCash,
 HiOutlineCheckCircle,
 HiOutlineExclamationCircle,
 HiOutlineXCircle
} from 'react-icons/hi';

export default function BillsHistory() {
 const navigate = useNavigate();
 const [bills, setBills] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [searchTerm, setSearchTerm] = useState('');

 // Stats
 const [totalSales, setTotalSales] = useState(0);
 const [totalPaid, setTotalPaid] = useState(0);
 const [totalUnpaid, setTotalUnpaid] = useState(0);

 useEffect(() => {
 fetchBills();
 }, []);

 const fetchBills = async () => {
 setLoading(true);
 try {
 const { data, error } = await supabase
 .from('bills')
 .select(`
 *,
 customers (name)
 `)
 .order('date', { ascending: false });
 
 if (error) throw error;
 
 // Calculate totals, mapping legacy grand_total fallback logic if needed
 const processedBills = (data || []).map(b => {
 // Fallback if grand_total wasn't explicitly saved (from older versions)
 const amt = Number(b.grand_total || (Number(b.balance_due) + Number(b.advance_paid)));
 return { ...b, calculated_amount: amt };
 });

 setBills(processedBills);

 // Stats Calculation
 let tSales = 0, tPaid = 0, tUnpaid = 0;
 processedBills.forEach(b => {
 if (b.status !== 'cancelled') {
 tSales += b.calculated_amount;
 tPaid += Number(b.advance_paid || 0);
 tUnpaid += Number(b.balance_due || 0);
 }
 });
 
 setTotalSales(tSales);
 setTotalPaid(tPaid);
 setTotalUnpaid(tUnpaid);

 } catch (err) {
 setError(err.message || 'Failed to fetch bills');
 } finally {
 setLoading(false);
 }
 };

 const filteredBills = bills.filter(b => {
 const searchString = searchTerm.toLowerCase();
 return b.bill_no?.toLowerCase().includes(searchString) || 
 b.customers?.name?.toLowerCase().includes(searchString);
 });

 // Format date to"DD MMM YYYY"
 const formatDate = (dateString) => {
 if (!dateString) return '-';
 const d = new Date(dateString);
 return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
 };

 const calculateDueIn = (dueDate) => {
 if (!dueDate) return '-';
 const diffTime = new Date(dueDate) - new Date();
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 if (diffDays < 0) return 'Overdue';
 return `${diffDays} Days`;
 };

 return (
 <div className="animate-fade-in text-surface-900">
 
 {error && (
 <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in flex items-start gap-2 mt-4">
 <span className="mt-0.5 text-red-400">⚠️</span>
 <span>{error}</span>
 </div>
 )}

 {/* Top Header */}
 <div className="flex items-center justify-between mb-4 mt-2">
 <h1 className="text-xl font-bold text-surface-800">Sales Invoices</h1>
 <div className="flex items-center gap-2">
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
 
 {/* Top Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-b border-surface-200">
 
 <div className="border-2 border-[#e0e7ff] bg-[#f5f3ff] rounded-md p-3">
 <div className="flex items-center gap-1 mb-1 text-[#4f46e5]">
 <HiOutlineCash className="w-4 h-4" />
 <span className="text-[12px] font-semibold">Total Sales</span>
 </div>
 <div className="text-[20px] font-bold text-surface-900">
 ₹ {totalSales.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
 </div>
 </div>
 
 <div className="border border-surface-200 rounded-md p-3">
 <div className="flex items-center gap-1 mb-1 text-green-600">
 <HiOutlineCheckCircle className="w-4 h-4" />
 <span className="text-[12px] font-semibold">Paid</span>
 </div>
 <div className="text-[20px] font-bold text-surface-900">
 ₹ {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
 </div>
 </div>

 <div className="border border-surface-200 rounded-md p-3">
 <div className="flex items-center gap-1 mb-1 text-red-600">
 <HiOutlineExclamationCircle className="w-4 h-4" />
 <span className="text-[12px] font-semibold">Unpaid</span>
 </div>
 <div className="text-[20px] font-bold text-surface-900">
 ₹ {totalUnpaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
 </div>
 </div>

 <div className="border border-surface-200 rounded-md p-3">
 <div className="flex items-center gap-1 mb-1 text-surface-500">
 <HiOutlineXCircle className="w-4 h-4" />
 <span className="text-[12px] font-semibold">Cancelled</span>
 </div>
 <div className="text-[20px] font-bold text-surface-900">
 -
 </div>
 </div>

 </div>

 {/* Filter Bar */}
 <div className="px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
 <div className="flex items-center gap-3 flex-1">
 <div className="relative w-64">
 <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input 
 type="text" 
 placeholder="Search" 
 value={searchTerm}
 onChange={e => setSearchTerm(e.target.value)}
 className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-surface-200 rounded focus:outline-none focus:border-blue-500"
 />
 </div>
 <select className="px-3 py-1.5 text-[13px] border border-surface-200 rounded bg-white text-surface-600 w-40">
 <option>ðŸ“… Last 365 Days</option>
 </select>
 </div>
 <div className="flex items-center gap-3">
 <select className="px-3 py-1.5 text-[13px] font-semibold border border-surface-200 rounded bg-white text-surface-700">
 <option>Bulk Actions</option>
 </select>
 <button 
 onClick={() => navigate('/billing/new')}
 className="px-5 py-1.5 text-[13px] font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded shadow-sm"
 >
 Create Sales Invoice
 </button>
 </div>
 </div>

 {/* Data Table */}
 <div className="overflow-x-auto min-h-[500px]">
 <table className="w-full text-left border-collapse whitespace-nowrap">
 <thead className="bg-[#f9fafb] border-y border-surface-200">
 <tr className="text-[12px] font-bold text-surface-700">
 <th className="py-3 px-4 w-12 text-center"><input type="checkbox" className="rounded border-surface-300" /></th>
 <th className="py-3 px-4">
 Date <span className="text-[10px] text-surface-400">↕</span>
 </th>
 <th className="py-3 px-4">Invoice Number</th>
 <th className="py-3 px-4">Party Name</th>
 <th className="py-3 px-4">Due In</th>
 <th className="py-3 px-4">Amount</th>
 <th className="py-3 px-4">Status</th>
 <th className="py-3 px-4 w-12"></th>
 </tr>
 </thead>
 <tbody className="text-[13px] text-surface-800">
 {loading ? (
 <tr><td colSpan="8" className="py-10 text-center text-surface-400">Loading invoices...</td></tr>
 ) : filteredBills.length === 0 ? (
 <tr><td colSpan="8" className="py-10 text-center text-surface-400">No invoices found.</td></tr>
 ) : (
 filteredBills.map((b) => {
 const isPaid = Number(b.balance_due) <= 0;
 const isCancelled = b.status === 'cancelled';
 
 return (
 <tr key={b.id} className="border-b border-surface-100 hover:bg-surface-50 group cursor-pointer" onClick={() => navigate(`/billing/${b.id}`)}>
 <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
 <input type="checkbox" className="rounded border-surface-300 transition-opacity" />
 </td>
 <td className="py-3 px-4">{formatDate(b.date)}</td>
 <td className="py-3 px-4 text-surface-600">{b.bill_no.replace('BILL-', '')}</td>
 <td className="py-3 px-4">{b.customers?.name || '-'}</td>
 <td className="py-3 px-4">{isPaid || isCancelled ? '-' : calculateDueIn(b.due_date)}</td>
 
 <td className="py-3 px-4">
 <div className="font-semibold text-surface-800">
 ₹ {b.calculated_amount.toLocaleString('en-IN')}
 </div>
 {!isPaid && !isCancelled && (
 <div className="text-[11px] text-surface-500">
 (₹ {Number(b.balance_due).toLocaleString('en-IN')} unpaid)
 </div>
 )}
 </td>
 
 <td className="py-3 px-4">
 <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase
 ${isCancelled ? 'bg-surface-100 text-surface-500 border border-surface-200' :
 isPaid ? 'bg-[#e6f4ea] text-[#1e8e3e] border border-[#ceead6]' :
 'bg-[#fce8e6] text-[#d93025] border border-[#fad2cf]'
 }`}
 >
 {isCancelled ? 'Cancelled' : isPaid ? 'Paid' : 'Unpaid'}
 </span>
 </td>

 <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
 <button className="text-surface-400 hover:text-surface-800">
 <HiOutlineDotsVertical className="w-5 h-5" />
 </button>
 </td>
 </tr>
 )
 })
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
