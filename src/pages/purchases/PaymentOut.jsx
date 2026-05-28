import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
 HiOutlineCash,
 HiOutlinePlus,
 HiOutlineSearch,
 HiDotsVertical,
 HiOutlineArrowLeft
} from 'react-icons/hi';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function PaymentOut() {
 const { user } = useAuth();
 const [view, setView] = useState('list'); // 'list' | 'create'
 
 // List State
 const [payments, setPayments] = useState([]);
 const [loading, setLoading] = useState(true);
 const [summary, setSummary] = useState({ today: 0, month: 0, pending: 0 });
 const [dateFilter, setDateFilter] = useState('365');
 const [searchTerm, setSearchTerm] = useState('');
 
 // Form State
 const [parties, setParties] = useState([]);
 const [selectedPartyName, setSelectedPartyName] = useState('');
 const [selectedParty, setSelectedParty] = useState('');
 const [unpaidBills, setUnpaidBills] = useState([]);
 const [selectedBills, setSelectedBills] = useState([]);
 const [isAdvance, setIsAdvance] = useState(false);
 
 const [formData, setFormData] = useState({
 paymentNumber: '',
 date: new Date().toISOString().split('T')[0],
 amount: '',
 mode: 'Cash',
 notes: ''
 });
 
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState(null);

 // Fetch List Data
 const fetchListData = async () => {
 setLoading(true);
 try {
 const today = new Date().toISOString().split('T')[0];
 const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
 
 const [todayRes, monthRes, pendingRes] = await Promise.all([
 supabase.from('purchase_payments').select('amount').eq('date', today),
 supabase.from('purchase_payments').select('amount').gte('date', startOfMonth),
 supabase.from('purchase_invoices').select('balance_due').gt('balance_due', 0).neq('status', 'cancelled')
 ]);
 
 const todaySum = todayRes.data?.reduce((a, b) => a + Number(b.amount || 0), 0) || 0;
 const monthSum = monthRes.data?.reduce((a, b) => a + Number(b.amount || 0), 0) || 0;
 const pendingSum = pendingRes.data?.reduce((a, b) => a + Number(b.balance_due || 0), 0) || 0;
 
 setSummary({ today: todaySum, month: monthSum, pending: pendingSum });

 let query = supabase.from('purchase_payments').select(`
 *,
 parties ( name ),
 purchase_invoices ( bill_no )
 `).order('date', { ascending: false });
 
 if (dateFilter === 'month') {
 query = query.gte('date', startOfMonth);
 } else if (dateFilter === '365') {
 const start = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
 query = query.gte('date', start);
 }
 // Custom dates would go here if implemented, but 365 and month are standard
 
 const { data, error } = await query;
 if (error) throw error;
 
 // Group by payment_number
 const grouped = {};
 (data || []).forEach(p => {
 const key = p.payment_number || p.id;
 if (!grouped[key]) {
 grouped[key] = {
 id: key,
 payment_number: p.payment_number || 'Legacy',
 date: p.date,
 party_name: p.parties?.name || 'Unknown',
 total_settled: 0,
 total_received: 0,
 mode: p.payment_mode,
 purchase_invoices: []
 };
 }
 grouped[key].total_received += Number(p.amount || 0);
 if (!p.is_advance) {
 grouped[key].total_settled += Number(p.amount || 0);
 }
 });
 
 setPayments(Object.values(grouped));
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 if (view === 'list') {
 fetchListData();
 }
 }, [view, dateFilter]);
 
 useEffect(() => {
 if (view === 'create') {
 fetchParties();
 generatePaymentNo();
 }
 }, [view]);
 
 const fetchParties = async () => {
 const { data } = await supabase.from('parties').select('id, name').order('name');
 setParties(data || []);
 };
 
 const generatePaymentNo = async () => {
 const { data } = await supabase.from('purchase_payments')
 .select('payment_number')
 .ilike('payment_number', 'POUT-%')
 .order('created_at', { ascending: false })
 .limit(1);
 
 if (data && data.length > 0 && data[0].payment_number) {
 const lastNo = parseInt(data[0].payment_number.replace('POUT-', ''), 10);
 if (!isNaN(lastNo)) {
 setFormData(prev => ({ ...prev, paymentNumber: `POUT-${String(lastNo + 1).padStart(3, '0')}` }));
 return;
 }
 }
 setFormData(prev => ({ ...prev, paymentNumber: `POUT-001` }));
 };

 const handlePartySelect = async (pId) => {
 setSelectedParty(pId);
 setSelectedBills([]);
 if (!pId) {
 setUnpaidBills([]);
 return;
 }
 const { data } = await supabase.from('purchase_invoices')
 .select('*')
 .eq('supplier_id', pId)
 .gt('balance_due', 0)
 .neq('status', 'cancelled')
 .order('date', { ascending: true });
 
 setUnpaidBills(data || []);
 };

 const handleSave = async (e) => {
 e.preventDefault();
 setError(null);
 
 if (!selectedParty) return setError('Please select a party');
 const amtPaid = Number(formData.amount);
 if (amtPaid <= 0) return setError('Amount must be greater than 0');
 if (!isAdvance && selectedBills.length === 0) return setError('Please select at least one bill or check Advance Payment');
 
 setSaving(true);
 try {
 const paymentsToInsert = [];
 const purchase_invoicesToUpdate = [];
 let remaining = amtPaid;
 
 if (isAdvance) {
 paymentsToInsert.push({
 payment_number: formData.paymentNumber,
 party_id: selectedParty,
 bill_id: null,
 is_advance: true,
 amount: amtPaid,
 payment_mode: formData.mode,
 date: formData.date,
 notes: formData.notes,
 created_by: user?.id
 });
 } else {
 for (const billId of selectedBills) {
 if (remaining <= 0) break;
 const bill = unpaidBills.find(b => b.id === billId);
 if (!bill) continue;
 
 const applyAmount = Math.min(remaining, bill.balance_due);
 
 paymentsToInsert.push({
 payment_number: formData.paymentNumber,
 party_id: selectedParty,
 bill_id: bill.id,
 is_advance: false,
 amount: applyAmount,
 payment_mode: formData.mode,
 date: formData.date,
 notes: formData.notes,
 created_by: user?.id
 });
 
 purchase_invoicesToUpdate.push({
 id: bill.id,
 advance_paid: Number(bill.advance_paid || 0) + applyAmount,
 balance_due: Number(bill.balance_due) - applyAmount
 });
 
 remaining -= applyAmount;
 }
 
 if (remaining > 0) {
 paymentsToInsert.push({
 payment_number: formData.paymentNumber,
 party_id: selectedParty,
 bill_id: null,
 is_advance: true,
 amount: remaining,
 payment_mode: formData.mode,
 date: formData.date,
 notes: formData.notes,
 created_by: user?.id
 });
 }
 }
 
 const { error: insertErr } = await supabase.from('purchase_payments').insert(paymentsToInsert);
 if (insertErr) throw insertErr;
 
 for (const b of purchase_invoicesToUpdate) {
 const updateData = {
 advance_paid: b.advance_paid,
 balance_due: b.balance_due
 };
 if (b.balance_due <= 0) {
 updateData.status = 'paid';
 }
 await supabase.from('purchase_invoices').update(updateData).eq('id', b.id);
 }
 
 const { data: partyData } = await supabase.from('parties').select('current_balance').eq('id', selectedParty).single();
 if (partyData) {
 await supabase.from('parties').update({
 current_balance: Number(partyData.current_balance || 0) + amtPaid
 }).eq('id', selectedParty);
 }
 
 setSelectedParty('');
 setSelectedPartyName('');
 setUnpaidBills([]);
 setSelectedBills([]);
 setIsAdvance(false);
 setFormData({
 paymentNumber: '',
 date: new Date().toISOString().split('T')[0],
 amount: '',
 mode: 'Cash',
 notes: ''
 });
 setView('list');
 
 } catch (err) {
 setError(err.message || 'An error occurred while saving.');
 } finally {
 setSaving(false);
 }
 };

 const filteredPayments = payments.filter(p => {
 return p.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
 p.party_name.toLowerCase().includes(searchTerm.toLowerCase());
 });

 if (view === 'create') {
 return (
 <div className="animate-fade-in w-full">
 <div className="flex items-center gap-4 mb-8">
 <button onClick={() => setView('list')} className="p-2 hover:bg-surface-100 rounded-full transition-colors text-surface-500">
 <HiOutlineArrowLeft className="w-6 h-6" />
 </button>
 <h1 className="text-2xl font-bold text-surface-900">Create Payment Out</h1>
 </div>
 
 <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
 {error && (
 <div className="p-4 bg-red-50 border-b border-red-100 text-red-600 text-sm font-medium">
 {error}
 </div>
 )}
 <div className="p-6 space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1">Party Name *</label>
 <input
 list="parties-list"
 value={selectedPartyName}
 onChange={e => {
 const name = e.target.value;
 setSelectedPartyName(name);
 const party = parties.find(p => p.name === name);
 if (party) {
 handlePartySelect(party.id);
 } else {
 setSelectedParty('');
 setUnpaidBills([]);
 }
 }}
 placeholder="Type to search..."
 className="w-full border border-surface-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 px-4 py-2 outline-none"
 />
 <datalist id="parties-list">
 {parties.map(p => <option key={p.id} value={p.name} />)}
 </datalist>
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1">Payment Number</label>
 <input type="text" value={formData.paymentNumber} readOnly className="w-full bg-surface-50 border border-surface-200 rounded-lg shadow-sm px-4 py-2 outline-none text-surface-500" />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1">Date</label>
 <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border border-surface-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 px-4 py-2 outline-none" />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1">Amount Paid (₹) *</label>
 <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full border border-surface-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 px-4 py-2 outline-none text-lg font-semibold text-green-600" />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1">Payment Mode</label>
 <select value={formData.mode} onChange={e => setFormData({...formData, mode: e.target.value})} className="w-full border border-surface-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 px-4 py-2 outline-none bg-white">
 <option value="Cash">Cash</option>
 <option value="UPI">UPI</option>
 <option value="Bank Transfer">Bank Transfer</option>
 <option value="Cheque">Cheque</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1">Notes</label>
 <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-surface-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 px-4 py-2 outline-none resize-none" rows="1"></textarea>
 </div>
 </div>
 
 <div className="border-t border-surface-200 pt-6 mt-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-bold text-surface-900">Settle Bills</h3>
 <label className="flex items-center gap-2 cursor-pointer bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-200">
 <input type="checkbox" checked={isAdvance} onChange={e => setIsAdvance(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4" />
 <span className="text-sm font-medium text-surface-700">Advance Payment (No Bill)</span>
 </label>
 </div>
 
 {!isAdvance && selectedParty && (
 unpaidBills.length === 0 ? (
 <div className="text-center py-8 bg-surface-50 rounded-lg border border-dashed border-surface-200">
 <p className="text-surface-500 text-sm">No unpaid purchase_invoices found for this party.</p>
 </div>
 ) : (
 <div className="overflow-x-auto border border-surface-200 rounded-lg">
 <table className="w-full text-left text-sm whitespace-nowrap">
 <thead className="bg-surface-50 border-b border-surface-200">
 <tr>
 <th className="px-4 py-3 w-12 text-center"></th>
 <th className="px-4 py-3 font-semibold text-surface-700">Bill No</th>
 <th className="px-4 py-3 font-semibold text-surface-700">Date</th>
 <th className="px-4 py-3 font-semibold text-right text-surface-700">Total</th>
 <th className="px-4 py-3 font-semibold text-right text-surface-700">Already Paid</th>
 <th className="px-4 py-3 font-semibold text-right text-surface-700">Balance Due</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-surface-100">
 {unpaidBills.map(b => (
 <tr key={b.id} className={selectedBills.includes(b.id) ? 'bg-primary-50/30' : 'hover:bg-surface-50 transition-colors'}>
 <td className="px-4 py-3 text-center">
 <input 
 type="checkbox" 
 checked={selectedBills.includes(b.id)}
 onChange={e => {
 if (e.target.checked) setSelectedBills([...selectedBills, b.id]);
 else setSelectedBills(selectedBills.filter(id => id !== b.id));
 }}
 className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
 />
 </td>
 <td className="px-4 py-3 font-medium text-surface-900">{b.bill_no}</td>
 <td className="px-4 py-3 text-surface-600">{new Date(b.date).toLocaleDateString('en-GB')}</td>
 <td className="px-4 py-3 text-right">₹ {fmt(b.grand_total)}</td>
 <td className="px-4 py-3 text-right text-green-600">₹ {fmt(b.advance_paid)}</td>
 <td className="px-4 py-3 text-right font-bold text-red-600">₹ {fmt(b.balance_due)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )
 )}
 </div>
 
 <div className="flex justify-end gap-3 border-t border-surface-200 pt-6">
 <button onClick={() => setView('list')} className="px-6 py-2 border border-surface-300 text-surface-700 rounded-lg hover:bg-surface-50 font-medium transition-colors">Cancel</button>
 <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 transition-colors">
 {saving ? 'Saving...' : 'Save Payment'}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="animate-fade-in w-full">
   {/* Header */}
   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pt-2">
   <div>
   <h1 className="text-lg font-bold text-surface-900 flex items-center gap-2">
   <HiOutlineCash className="w-5 h-5 text-primary-600" />
   Payment Out
   </h1>
   </div>
   <button onClick={() => setView('create')} className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors text-sm">
   <HiOutlinePlus className="w-4 h-4"/>
   Create Payment Out
   </button>
   </div>
   {/* Summary Cards */}
   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
   <div className="bg-white rounded-xl shadow-sm border border-surface-200 py-3 px-4">
   <p className="text-xs font-bold text-surface-500 mb-1 uppercase tracking-wider">Total Paid Today</p>
   <h3 className="text-xl font-bold text-surface-900">₹ {fmt(summary.today)}</h3>
   </div>
   <div className="bg-white rounded-xl shadow-sm border border-surface-200 py-3 px-4">
   <p className="text-xs font-bold text-surface-500 mb-1 uppercase tracking-wider">Total Paid This Month</p>
   <h3 className="text-xl font-bold text-surface-900">₹ {fmt(summary.month)}</h3>
   </div>
   <div className="bg-white rounded-xl shadow-sm border border-surface-200 py-3 px-4">
   <p className="text-xs font-bold text-surface-500 mb-1 uppercase tracking-wider">Total Pending</p>
   <h3 className="text-xl font-bold text-orange-600">₹ {fmt(summary.pending)}</h3>
   </div>
   </div>
 
 {/* Table Area */}
 <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
 {/* Tabs & Filters */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-surface-200 gap-4">
 <div className="flex gap-4 border-b border-surface-200 w-full md:w-auto">
 <button className="text-primary-600 font-semibold border-b-2 border-primary-600 pb-2 px-1">Payment Paid</button>
 </div>
 <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
 <div className="relative w-full sm:w-auto">
 <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
 <input 
 type="text" 
 placeholder="Search payments..." 
 className="pl-9 pr-4 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 w-full"
 value={searchTerm}
 onChange={e => setSearchTerm(e.target.value)}
 />
 </div>
 <select 
 value={dateFilter}
 onChange={e => setDateFilter(e.target.value)}
 className="py-2 pl-3 pr-8 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white w-full sm:w-auto cursor-pointer"
 >
 <option value="month">This Month</option>
 <option value="365">Last 365 Days</option>
 <option value="custom">Custom</option>
 </select>
 </div>
 </div>
 
 {/* Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm whitespace-nowrap">
 <thead className="bg-surface-50 border-b border-surface-200 text-surface-600">
 <tr>
 <th className="px-6 py-4 font-semibold">Date</th>
 <th className="px-6 py-4 font-semibold">Payment Number</th>
 <th className="px-6 py-4 font-semibold">Party Name</th>
 <th className="px-6 py-4 font-semibold text-right">Total Amount Settled</th>
 <th className="px-6 py-4 font-semibold text-right">Amount Paid</th>
 <th className="px-6 py-4 font-semibold">Payment Mode</th>
 <th className="px-6 py-4 text-center">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-surface-100">
 {loading ? (
 [...Array(4)].map((_, i) => (
 <tr key={i} className="animate-pulse">
 <td className="px-6 py-4"><div className="h-4 bg-surface-200 rounded w-24"></div></td>
 <td className="px-6 py-4"><div className="h-4 bg-surface-200 rounded w-20"></div></td>
 <td className="px-6 py-4"><div className="h-4 bg-surface-200 rounded w-32"></div></td>
 <td className="px-6 py-4"><div className="h-4 bg-surface-200 rounded w-16 ml-auto"></div></td>
 <td className="px-6 py-4"><div className="h-4 bg-surface-200 rounded w-16 ml-auto"></div></td>
 <td className="px-6 py-4"><div className="h-4 bg-surface-200 rounded w-20"></div></td>
 <td className="px-6 py-4"><div className="h-4 bg-surface-200 rounded w-8 mx-auto"></div></td>
 </tr>
 ))
 ) : filteredPayments.length === 0 ? (
 <tr><td colSpan="7" className="px-6 py-12 text-center text-surface-500">No payments found.</td></tr>
 ) : (
 filteredPayments.map(p => (
 <tr key={p.id} className="hover:bg-surface-50 transition-colors">
 <td className="px-6 py-4 text-surface-600">{new Date(p.date).toLocaleDateString('en-GB')}</td>
 <td className="px-6 py-4 font-medium text-primary-600">{p.payment_number}</td>
 <td className="px-6 py-4 font-medium text-surface-900">{p.party_name}</td>
 <td className="px-6 py-4 text-right">₹ {fmt(p.total_settled)}</td>
 <td className="px-6 py-4 text-right font-bold text-green-600">₹ {fmt(p.total_received)}</td>
 <td className="px-6 py-4 capitalize text-surface-600">{p.mode}</td>
 <td className="px-6 py-4 text-center">
 <div className="relative group inline-block">
 <button className="p-2 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-200 transition-colors">
 <HiDotsVertical className="w-5 h-5" />
 </button>
 <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-surface-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 py-1">
 <button className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50">View</button>
 <button className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50">Edit</button>
 <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
 </div>
 </div>
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
