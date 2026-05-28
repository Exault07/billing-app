import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { 
 HiOutlineSearch, 
 HiOutlineCog,
 HiOutlineDocumentReport,
 HiDotsVertical,
 HiOutlineQuestionMarkCircle
} from 'react-icons/hi';

export default function PaymentOutList() {
 const navigate = useNavigate();
 const [payments, setPayments] = useState([]);
 const [searchQuery, setSearchQuery] = useState('');
 const [dateFilter, setDateFilter] = useState('365days');
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);

 useEffect(() => {
 fetchPayments();
 }, []);

 const fetchPayments = async () => {
 setLoading(true);
 try {
 const { data, error } = await supabase
 .from('purchase_payments')
 .select('*, suppliers(name)')
 .order('date', { ascending: false });
 
 if (!error && data) {
 setPayments(data);
 }
 } catch (err) {
 setError(err.message || 'Failed to fetch payments');
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

 const filteredPayments = payments.filter(item => 
 (item.id?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
 (item.suppliers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
 );

 return (
 <div className="min-h-screen bg-gray-50 flex flex-col">
 {/* Top Header */}
 <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
 <h1 className="text-xl font-bold text-gray-800">Payment Out</h1>
 
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
 {error && (
 <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in flex items-start gap-2">
 <span className="mt-0.5 text-red-400">⚠</span>
 <span>{error}</span>
 </div>
 )}
 {/* Controls Row */}
 <div className="flex justify-between items-center mb-6">
 <div className="flex items-center gap-3">
 <div className="relative">
 <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
 <input 
 type="text" 
 placeholder="Search payments..." 
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
 
 <button onClick={() => navigate('/purchases/payment-out/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors">
 Create Payment Out
 </button>
 </div>

 {/* Table Area */}
 <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex-1">
 {loading ? (
 <div className="p-8 text-center text-gray-500">Loading...</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead className="bg-[#f9fafb] border-b border-gray-200">
 <tr>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Date</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Number</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Party Name</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Total Amount Settled</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Amount Paid</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Payment Mode</th>
 <th className="px-4 py-3 w-12"></th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredPayments.map((pay, idx) => (
 <tr key={pay.id} className="hover:bg-gray-50/50">
 <td className="px-4 py-4 text-sm text-gray-600">{new Date(pay.date || pay.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
 <td className="px-4 py-4 text-sm text-gray-800">{String(filteredPayments.length - idx).padStart(3, '0')}</td>
 <td className="px-4 py-4 text-sm text-gray-800">{pay.suppliers?.name}</td>
 <td className="px-4 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(pay.amount)}</td>
 <td className="px-4 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(pay.amount)}</td>
 <td className="px-4 py-4 text-center">
 <span className="capitalize text-sm text-gray-700">{pay.payment_mode || 'Cash'}</span>
 </td>
 <td className="px-4 py-4 text-center text-gray-400">
 <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
 <HiDotsVertical className="w-5 h-5" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 
 {filteredPayments.length === 0 && !loading && (
 <div className="py-12 text-center text-gray-500 bg-white">No payment records found.</div>
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
