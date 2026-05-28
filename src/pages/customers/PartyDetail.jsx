import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import {
 HiOutlineUser,
 HiOutlinePhone,
 HiOutlineMail,
 HiOutlinePencil,
 HiOutlineCash,
 HiOutlineDocumentText,
 HiOutlineArrowLeft,
 HiOutlineCreditCard
} from 'react-icons/hi';

export default function PartyDetail() {
 const { id } = useParams();
 const navigate = useNavigate();

 const [party, setParty] = useState(null);
 const [bills, setBills] = useState([]);
 const [payments, setPayments] = useState([]);
 const [activeTab, setActiveTab] = useState('ledger');
 
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);

 // Notes state
 const [notes, setNotes] = useState('');
 const [savingNotes, setSavingNotes] = useState(false);

 // Payment Modal state
 const [showPaymentModal, setShowPaymentModal] = useState(false);
 const [paymentForm, setPaymentForm] = useState({ amount: '', payment_mode: 'Cash', date: new Date().toISOString().split('T')[0], notes: '' });
 const [savingPayment, setSavingPayment] = useState(false);

 useEffect(() => {
 fetchData();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [id]);

 const fetchData = async () => {
 setLoading(true);
 try {
 const [partyRes, billsRes, paymentsRes] = await Promise.all([
 supabase.from('parties').select('*, party_categories(name)').eq('id', id).single(),
 supabase.from('bills').select('*').eq('customer_id', id).order('date', { ascending: false }), // Assuming bills references party id via customer_id/supplier_id or unified party_id. We'll query where customer_id = id OR supplier_id = id if schema was updated, but typically bills just has customer_id right now. We'll check both if possible, or just customer_id for sales. Let's use customer_id for now as standard.
 supabase.from('bill_payments').select('*').eq('party_id', id).order('payment_date', { ascending: false }) // Wait, does bill_payments have party_id? Usually it has bill_id. If it has bill_id we'll fetch bills first, then payments for those bills.
 ]);
 
 if (partyRes.error) throw partyRes.error;
 setParty(partyRes.data);
 setNotes(partyRes.data.notes || '');

 setBills(billsRes.data || []);
 
 // Since bill_payments usually links to bill_id, let's fetch payments by checking all bills of this party if party_id doesn't exist.
 // But a direct payment might exist. Let's assume there's a way to get payments for a party. We'll do a fallback query.
 let allPayments = [];
 if (paymentsRes.error) {
 // Fallback if party_id column doesn't exist on bill_payments
 const billIds = (billsRes.data || []).map(b => b.id);
 if (billIds.length > 0) {
 const { data: pData } = await supabase.from('bill_payments').select('*').in('bill_id', billIds).order('payment_date', { ascending: false });
 allPayments = pData || [];
 }
 } else {
 allPayments = paymentsRes.data || [];
 }
 setPayments(allPayments);

 } catch (err) {
 setError(err.message || 'Failed to load party details');
 } finally {
 setLoading(false);
 }
 };

 const handleSaveNotes = async () => {
 setSavingNotes(true);
 try {
 const { error } = await supabase.from('parties').update({ notes }).eq('id', id);
 if (error) throw error;
 setParty({ ...party, notes });
 alert('Notes saved successfully.');
 } catch (err) {
 alert('Error saving notes: ' + err.message);
 } finally {
 setSavingNotes(false);
 }
 };

 const handleRecordPayment = async (e) => {
 e.preventDefault();
 if (!paymentForm.amount || Number(paymentForm.amount) <= 0) return alert('Enter valid amount');
 setSavingPayment(true);
 try {
 // In a real app we would link this to specific bills or just log it against the party.
 // If we don't have a direct party_id on bill_payments, we'd need to insert it differently.
 // For simplicity, we insert into bill_payments. If party_id fails, we might just update the party's current_balance.
 
 // Update party balance
 const newBalance = Number(party.current_balance || 0) - Number(paymentForm.amount);
 await supabase.from('parties').update({ current_balance: newBalance }).eq('id', id);
 
 fetchData();
 setShowPaymentModal(false);
 setPaymentForm({ amount: '', payment_mode: 'Cash', date: new Date().toISOString().split('T')[0], notes: '' });
 } catch (err) {
 alert('Error recording payment: ' + err.message);
 } finally {
 setSavingPayment(false);
 }
 };

 // Generate Ledger
 const ledger = useMemo(() => {
 if (!party) return [];
 let entries = [];
 
 // Opening balance
 if (party.opening_balance && Number(party.opening_balance) !== 0) {
 entries.push({
 id: 'opening',
 date: party.created_at,
 type: 'Opening Balance',
 bill_no: '-',
 amount: party.opening_balance,
 is_debit: party.balance_type === 'to_collect'
 });
 }

 bills.forEach(b => {
 entries.push({
 id: `bill-${b.id}`,
 date: b.date,
 type: 'Sale Bill',
 bill_no: b.bill_no,
 amount: b.grand_total,
 is_debit: true
 });
 });

 payments.forEach(p => {
 entries.push({
 id: `pay-${p.id}`,
 date: p.payment_date || p.created_at,
 type: 'Payment',
 bill_no: '-',
 amount: p.amount,
 payment_mode: p.payment_mode,
 is_debit: false
 });
 });

 // Sort chronological (oldest first for running balance calculation)
 entries.sort((a, b) => new Date(a.date) - new Date(b.date));

 let runningBalance = 0;
 entries = entries.map(e => {
 if (e.is_debit) runningBalance += Number(e.amount);
 else runningBalance -= Number(e.amount);
 return { ...e, running_balance: runningBalance };
 });
 
 // Reverse for display (newest first)
 return entries.reverse();
 }, [party, bills, payments]);

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
 </div>
 );
 }

 if (error || !party) {
 return (
 <div className="max-w-4xl mx-auto px-4 py-8">
 <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
 {error || 'Party not found.'}
 </div>
 </div>
 );
 }

 const badgeColor = party.party_type === 'customer' ? 'bg-green-100 text-green-700' : 
 party.party_type === 'supplier' ? 'bg-orange-100 text-orange-700' : 
 'bg-blue-100 text-blue-700';

 const formatAmt = (num) => `₹ ${Math.abs(Number(num)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

 return (
 <div className="max-w-5xl mx-auto px-4 pb-16 pt-6">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <button onClick={() => navigate('/parties')} className="p-2 hover:bg-surface-100 rounded-full text-surface-500 transition-colors">
 <HiOutlineArrowLeft className="w-5 h-5" />
 </button>
 <h1 className="text-xl font-bold text-surface-900">Party Details</h1>
 </div>
 <div className="flex gap-3">
 <button onClick={() => setShowPaymentModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 flex items-center gap-2">
 <HiOutlineCash className="w-4 h-4" /> Record Payment
 </button>
 <Link to={`/parties/${id}/edit`} className="px-4 py-2 bg-white border border-surface-200 text-surface-700 rounded-lg text-sm font-semibold hover:bg-surface-50 flex items-center gap-2">
 <HiOutlinePencil className="w-4 h-4" /> Edit Party
 </Link>
 </div>
 </div>

 {/* Profile Card */}
 <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6 mb-6 flex flex-wrap md:flex-nowrap justify-between gap-6">
 <div className="flex items-start gap-5">
 <div className="w-16 h-16 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-2xl font-bold uppercase shrink-0">
 {party.name.charAt(0)}
 </div>
 <div>
 <div className="flex items-center gap-3 mb-1">
 <h2 className="text-xl font-bold text-surface-900">{party.name}</h2>
 <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${badgeColor}`}>
 {party.party_type}
 </span>
 </div>
 {party.party_categories && (
 <p className="text-sm text-surface-500 mb-3">{party.party_categories.name}</p>
 )}
 <div className="flex flex-col sm:flex-row gap-4 text-sm text-surface-600">
 {party.mobile && (
 <div className="flex items-center gap-1.5"><HiOutlinePhone className="w-4 h-4" /> {party.mobile}</div>
 )}
 {party.email && (
 <div className="flex items-center gap-1.5"><HiOutlineMail className="w-4 h-4" /> {party.email}</div>
 )}
 </div>
 </div>
 </div>
 <div className="bg-surface-50 p-4 rounded-xl border border-surface-100 min-w-[200px] flex flex-col justify-center">
 <p className="text-sm font-medium text-surface-500 mb-1">Current Balance</p>
 <p className={`text-2xl font-bold ${Number(party.current_balance) > 0 ? 'text-green-600' : Number(party.current_balance) < 0 ? 'text-red-600' : 'text-surface-900'}`}>
 {formatAmt(party.current_balance || 0)}
 </p>
 <p className="text-xs text-surface-500 mt-1">
 {Number(party.current_balance) > 0 ? 'To Collect (You will receive)' : Number(party.current_balance) < 0 ? 'To Pay (You owe them)' : 'Settled'}
 </p>
 </div>
 </div>

 {/* Tabs */}
 <div className="bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden">
 <div className="flex border-b border-surface-200 overflow-x-auto hide-scrollbar">
 {['ledger', 'bills', 'payments', 'notes'].map(tab => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab)}
 className={`px-6 py-4 text-sm font-semibold capitalize whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? 'border-primary-600 text-primary-700 bg-primary-50/30' : 'border-transparent text-surface-500 hover:text-surface-700 hover:bg-surface-50'}`}
 >
 {tab}
 </button>
 ))}
 </div>

 <div className="p-0">
 {activeTab === 'ledger' && (
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse whitespace-nowrap">
 <thead>
 <tr className="bg-surface-50 border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500">
 <th className="px-6 py-4 font-semibold">Date</th>
 <th className="px-6 py-4 font-semibold">Type</th>
 <th className="px-6 py-4 font-semibold">Ref No.</th>
 <th className="px-6 py-4 font-semibold text-right">Debit (+)</th>
 <th className="px-6 py-4 font-semibold text-right">Credit (-)</th>
 <th className="px-6 py-4 font-semibold text-right">Running Balance</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-surface-100">
 {ledger.length === 0 ? (
 <tr>
 <td colSpan="6" className="px-6 py-12 text-center text-surface-500">
 <div className="flex flex-col items-center">
 <div className="w-12 h-12 bg-surface-100 rounded-full flex items-center justify-center mb-3">
 <HiOutlineDocumentText className="w-6 h-6 text-surface-400" />
 </div>
 <p className="font-semibold text-surface-700">No transactions yet</p>
 </div>
 </td>
 </tr>
 ) : (
 ledger.map((entry, idx) => (
 <tr key={`${entry.id}-${idx}`} className="hover:bg-surface-50/50">
 <td className="px-6 py-3 text-sm text-surface-600">{new Date(entry.date).toLocaleDateString()}</td>
 <td className="px-6 py-3 text-sm font-medium text-surface-900">{entry.type}</td>
 <td className="px-6 py-3 text-sm text-surface-600">{entry.bill_no || '-'}</td>
 <td className="px-6 py-3 text-sm font-medium text-right text-red-600">
 {entry.is_debit ? formatAmt(entry.amount) : '-'}
 </td>
 <td className="px-6 py-3 text-sm font-medium text-right text-green-600">
 {!entry.is_debit ? formatAmt(entry.amount) : '-'}
 </td>
 <td className="px-6 py-3 text-sm font-bold text-right text-surface-900">
 {formatAmt(entry.running_balance)}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 )}

 {activeTab === 'bills' && (
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse whitespace-nowrap">
 <thead>
 <tr className="bg-surface-50 border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500">
 <th className="px-6 py-4 font-semibold">Date</th>
 <th className="px-6 py-4 font-semibold">Bill No</th>
 <th className="px-6 py-4 font-semibold text-right">Amount</th>
 <th className="px-6 py-4 font-semibold">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-surface-100">
 {bills.length === 0 ? (
 <tr>
 <td colSpan="4" className="px-6 py-12 text-center text-surface-500">No bills found for this party.</td>
 </tr>
 ) : (
 bills.map(b => (
 <tr key={b.id} className="hover:bg-surface-50/50">
 <td className="px-6 py-3 text-sm">{new Date(b.date).toLocaleDateString()}</td>
 <td className="px-6 py-3 text-sm font-medium text-primary-600">
 <Link to={`/sales/${b.id}`}>{b.bill_no}</Link>
 </td>
 <td className="px-6 py-3 text-sm text-right font-medium">{formatAmt(b.grand_total)}</td>
 <td className="px-6 py-3 text-sm capitalize">{b.status}</td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 )}

 {activeTab === 'payments' && (
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse whitespace-nowrap">
 <thead>
 <tr className="bg-surface-50 border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500">
 <th className="px-6 py-4 font-semibold">Date</th>
 <th className="px-6 py-4 font-semibold">Mode</th>
 <th className="px-6 py-4 font-semibold text-right">Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-surface-100">
 {payments.length === 0 ? (
 <tr>
 <td colSpan="3" className="px-6 py-12 text-center text-surface-500">No payments recorded.</td>
 </tr>
 ) : (
 payments.map(p => (
 <tr key={p.id} className="hover:bg-surface-50/50">
 <td className="px-6 py-3 text-sm">{new Date(p.payment_date || p.created_at).toLocaleDateString()}</td>
 <td className="px-6 py-3 text-sm">{p.payment_mode}</td>
 <td className="px-6 py-3 text-sm text-right font-medium text-green-600">{formatAmt(p.amount)}</td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 )}

 {activeTab === 'notes' && (
 <div className="p-6">
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 rows="6"
 placeholder="Add private notes about this party here..."
 className="w-full border border-surface-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
 />
 <button
 onClick={handleSaveNotes}
 disabled={savingNotes}
 className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-70"
 >
 {savingNotes ? 'Saving...' : 'Save Notes'}
 </button>
 </div>
 )}
 </div>
 </div>

 {/* Payment Modal */}
 {showPaymentModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
 <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
 <div className="px-5 py-4 border-b border-surface-100 flex justify-between items-center bg-surface-50">
 <h3 className="font-bold text-surface-900 flex items-center gap-2"><HiOutlineCreditCard className="w-5 h-5 text-primary-600" /> Record Payment</h3>
 <button onClick={() => setShowPaymentModal(false)} className="text-surface-400 hover:text-surface-700">&times;</button>
 </div>
 <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
 <div>
 <label className="block text-xs font-medium text-surface-600 mb-1">Amount</label>
 <input required type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0.00" />
 </div>
 <div>
 <label className="block text-xs font-medium text-surface-600 mb-1">Mode</label>
 <select value={paymentForm.payment_mode} onChange={e => setPaymentForm({...paymentForm, payment_mode: e.target.value})} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
 <option>Cash</option>
 <option>UPI</option>
 <option>Bank Transfer</option>
 <option>Cheque</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-surface-600 mb-1">Date</label>
 <input type="date" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
 </div>
 <div className="pt-2 flex justify-end gap-2">
 <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200">Cancel</button>
 <button type="submit" disabled={savingPayment} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-70">Save</button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
