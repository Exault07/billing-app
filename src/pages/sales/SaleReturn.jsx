import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
 HiOutlineSearch,
 HiOutlinePlus,
 HiOutlineDocumentText,
 HiOutlineDotsVertical,
 HiOutlineTrash,
 HiOutlineArrowLeft
} from 'react-icons/hi';

export default function SaleReturn() {
 const [saleReturns, setSaleReturns] = useState([]);
 const [parties, setParties] = useState([]);
 const [bills, setBills] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);

 // Form State
 const [partyId, setPartyId] = useState('');
 const [returnNo, setReturnNo] = useState('');
 const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
 const [billId, setBillId] = useState('');
 const [items, setItems] = useState([]);
 const [additionalCharges, setAdditionalCharges] = useState('');
 const [discount, setDiscount] = useState('');
 const [refundMode, setRefundMode] = useState('Cash');
 const [amountRefunded, setAmountRefunded] = useState('');
 const [notes, setNotes] = useState('');
 const [saving, setSaving] = useState(false);

 // Dropdown States
 const [showPartyDropdown, setShowPartyDropdown] = useState(false);
 const [partySearch, setPartySearch] = useState('');
 const [showBillDropdown, setShowBillDropdown] = useState(false);
 const [billSearch, setBillSearch] = useState('');

 useEffect(() => {
 if (!showForm) {
 fetchAll();
 } else {
 generateReturnNo();
 }
 }, [showForm]);

 const fetchAll = async () => {
 setLoading(true);
 try {
 const [returnsRes, partiesRes, billsRes] = await Promise.all([
 supabase.from('sale_returns').select('*').order('return_date', { ascending: false }),
 supabase.from('parties').select('id, name').order('name'),
 supabase.from('bills').select('id, bill_no, customer_id, items, grand_total').order('date', { ascending: false })
 ]);
 setSaleReturns(returnsRes.data || []);
 setParties(partiesRes.data || []);
 setBills(billsRes.data || []);
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

 const generateReturnNo = async () => {
 const { count } = await supabase.from('sale_returns').select('id', { count: 'exact', head: true });
 setReturnNo(`SR-${String((count || 0) + 1).padStart(3, '0')}`);
 };

 const handleBillSelect = (selectedBillId) => {
 setBillId(selectedBillId);
 if (!selectedBillId) return;

 const bill = bills.find(b => b.id === selectedBillId);
 if (bill) {
 if (!partyId) setPartyId(bill.customer_id);
 const billItems = bill.items || [];
 setItems(billItems.map(i => ({
 name: i.name || '',
 product_id: i.product_id || null,
 original_qty: Number(i.qty || 1),
 qty: Number(i.qty || 1),
 unit: i.unit || 'pcs',
 rate: Number(i.price || 0),
 amount: Number(i.qty || 1) * Number(i.price || 0)
 })));
 }
 };

 const updateItem = (idx, field, value) => {
 setItems(prev => {
 const newItems = [...prev];
 newItems[idx] = { ...newItems[idx], [field]: value };
 if (field === 'qty' || field === 'rate') {
 let q = Number(newItems[idx].qty);
 let maxQ = Number(newItems[idx].original_qty);
 if (q > maxQ && maxQ > 0) q = maxQ;
 newItems[idx].qty = q;
 newItems[idx].amount = q * Number(newItems[idx].rate);
 }
 return newItems;
 });
 };

 const removeRow = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
 const addRow = () => setItems(prev => [...prev, { name: '', product_id: null, original_qty: 0, qty: 1, unit: 'pcs', rate: 0, amount: 0 }]);

 const subtotal = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.rate)), 0);
 const totalAmount = subtotal + Number(additionalCharges || 0) - Number(discount || 0);

 const handleSave = async (isSaveAndNew) => {
 setSaving(true);
 try {
 const payload = {
 return_no: returnNo,
 return_date: returnDate,
 customer_id: partyId,
 original_bill_id: billId || null,
 items,
 subtotal,
 additional_charges: Number(additionalCharges || 0),
 discount: Number(discount || 0),
 total_return_amount: totalAmount,
 reason: notes,
 refund_mode: refundMode,
 amount_refunded: Number(amountRefunded || 0),
 status: 'Completed'
 };

 const { error } = await supabase.from('sale_returns').insert([payload]);
 if (error) throw error;

 // Restore stock
 for (const item of items) {
 if (item.product_id && item.qty > 0) {
 const { data: pData } = await supabase.from('products').select('stock_qty').eq('id', item.product_id).single();
 if (pData) {
 await supabase.from('products').update({ stock_qty: Number(pData.stock_qty) + Number(item.qty) }).eq('id', item.product_id);
 }
 }
 }

 // Update original bill status
 if (billId) {
 const isFullyReturned = items.every(i => i.qty === i.original_qty);
 await supabase.from('bills').update({ status: isFullyReturned ? 'fully_returned' : 'partially_returned' }).eq('id', billId);
 }

 // Update party balance
 if (partyId) {
 const netDeduction = totalAmount - Number(amountRefunded || 0);
 if (netDeduction !== 0) {
 const { data: partyData } = await supabase.from('parties').select('current_balance').eq('id', partyId).single();
 if (partyData) {
 const newBalance = Number(partyData.current_balance || 0) - netDeduction;
 await supabase.from('parties').update({ current_balance: newBalance }).eq('id', partyId);
 }
 }
 }

 if (isSaveAndNew) {
 resetForm();
 generateReturnNo();
 } else {
 setShowForm(false);
 }
 } catch (err) {
 console.error('Error saving return:', err);
 alert('Error saving return. Please try again.');
 } finally {
 setSaving(false);
 }
 };

 const resetForm = () => {
 setPartyId('');
 setBillId('');
 setItems([]);
 setAdditionalCharges('');
 setDiscount('');
 setAmountRefunded('');
 setNotes('');
 setRefundMode('Cash');
 setReturnDate(new Date().toISOString().split('T')[0]);
 };

 // List view metrics
 const totalReturns = saleReturns.length;
 const totalReturnAmt = saleReturns.reduce((sum, sr) => sum + Number(sr.total_return_amount || 0), 0);
 const thisMonthReturns = saleReturns.filter(sr => {
 const d = new Date(sr.return_date);
 const now = new Date();
 return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
 }).length;

 const getPartyName = (customerId, sr) => {
 if (customerId) {
 const p = parties.find(p => p.id === customerId);
 return p ? p.name : '-';
 }
 if (sr && sr.original_bill_id) {
 const b = bills.find(b => b.id === sr.original_bill_id);
 if (b && b.customer_id) {
 const p = parties.find(p => p.id === b.customer_id);
 return p ? p.name : '-';
 }
 }
 return '-';
 };

 const getBillNo = (bId) => {
 if (!bId) return '-';
 const b = bills.find(b => b.id === bId);
 return b ? b.bill_no : '-';
 };

 const filteredBills = bills.filter(b => 
 (!partyId || b.customer_id === partyId) && 
 (b.bill_no.toLowerCase().includes(billSearch.toLowerCase()))
 );

 return (
 <div className="animate-fade-in w-full">
 {showForm ? (
 <div className="bg-white rounded-xl shadow-sm border border-surface-200">
 <div className="flex items-center justify-between p-5 border-b border-surface-200 bg-surface-50">
 <div className="flex items-center gap-3">
 <button onClick={() => setShowForm(false)} className="text-surface-500 hover:text-surface-800">
 <HiOutlineArrowLeft className="w-5 h-5" />
 </button>
 <h2 className="text-lg font-bold text-surface-900">Create Sale Return</h2>
 </div>
 <div className="flex gap-3">
 <button onClick={() => handleSave(true)} disabled={saving} className="px-4 py-2 border border-surface-200 rounded-lg text-sm font-bold text-surface-700 bg-white hover:bg-surface-50 disabled:opacity-50">
 Save & New
 </button>
 <button onClick={() => handleSave(false)} disabled={saving} className="px-6 py-2 bg-[#7c3aed] text-white rounded-lg text-sm font-bold hover:bg-[#6d28d9] disabled:opacity-50">
 {saving ? 'Saving...' : 'Save'}
 </button>
 </div>
 </div>

 <div className="p-6">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
 <div className="relative">
 <label className="block text-xs font-bold text-surface-600 mb-1">Party</label>
 <div 
 onClick={() => setShowPartyDropdown(!showPartyDropdown)}
 className="w-full px-3 py-2 border border-surface-200 rounded-lg bg-white cursor-pointer flex items-center justify-between text-sm hover:border-[#7c3aed]"
 >
 <span className="truncate">{partyId ? parties.find(p => p.id === partyId)?.name : '-- Select Party --'}</span>
 <span className="text-surface-400 text-xs">▼</span>
 </div>
 {showPartyDropdown && (
 <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-lg shadow-lg z-50">
 <div className="p-2 border-b border-surface-100">
 <input 
 autoFocus
 type="text" 
 placeholder="Search party..." 
 value={partySearch}
 onChange={e => setPartySearch(e.target.value)}
 className="w-full px-2 py-1 outline-none text-sm bg-surface-50 rounded"
 />
 </div>
 <div className="max-h-48 overflow-y-auto">
 <div 
 onClick={() => { setPartyId(''); setShowPartyDropdown(false); }}
 className="px-3 py-2 hover:bg-surface-50 cursor-pointer text-sm text-surface-500"
 >
 -- Select Party --
 </div>
 {parties.filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase())).map(p => (
 <div 
 key={p.id}
 onClick={() => { setPartyId(p.id); setShowPartyDropdown(false); setPartySearch(''); }}
 className="px-3 py-2 hover:bg-[#f5f3ff] cursor-pointer text-sm font-medium text-surface-800"
 >
 {p.name}
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 
 <div>
 <label className="block text-xs font-bold text-surface-600 mb-1">Sales Return No.</label>
 <input readOnly value={returnNo} className="w-full px-3 py-2 border border-surface-200 rounded-lg outline-none bg-surface-50 text-sm font-medium text-surface-700" />
 </div>
 
 <div>
 <label className="block text-xs font-bold text-surface-600 mb-1">Sales Return Date</label>
 <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="w-full px-3 py-2 border border-surface-200 rounded-lg outline-none focus:border-[#7c3aed] text-sm" />
 </div>
 
 <div className="relative">
 <label className="block text-xs font-bold text-surface-600 mb-1">Link to Invoice (Optional)</label>
 <div 
 onClick={() => setShowBillDropdown(!showBillDropdown)}
 className="w-full px-3 py-2 border border-surface-200 rounded-lg bg-white cursor-pointer flex items-center justify-between text-sm hover:border-[#7c3aed]"
 >
 <span className="truncate">{billId ? bills.find(b => b.id === billId)?.bill_no : '-- Select Invoice --'}</span>
 <span className="text-surface-400 text-xs">▼</span>
 </div>
 {showBillDropdown && (
 <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-lg shadow-lg z-50">
 <div className="p-2 border-b border-surface-100">
 <input 
 autoFocus
 type="text" 
 placeholder="Search invoice..." 
 value={billSearch}
 onChange={e => setBillSearch(e.target.value)}
 className="w-full px-2 py-1 outline-none text-sm bg-surface-50 rounded"
 />
 </div>
 <div className="max-h-48 overflow-y-auto">
 <div 
 onClick={() => { handleBillSelect(''); setShowBillDropdown(false); }}
 className="px-3 py-2 hover:bg-surface-50 cursor-pointer text-sm text-surface-500"
 >
 -- Select Invoice --
 </div>
 {filteredBills.map(b => (
 <div 
 key={b.id}
 onClick={() => { handleBillSelect(b.id); setShowBillDropdown(false); setBillSearch(''); }}
 className="px-3 py-2 hover:bg-[#f5f3ff] cursor-pointer text-sm font-medium text-surface-800"
 >
 {b.bill_no} <span className="text-surface-500 text-xs ml-1">(₹ {b.grand_total}) - {getPartyName(b.customer_id, {})}</span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>

 <div className="border border-surface-200 rounded-lg mb-8 overflow-hidden">
 <table className="w-full text-left">
 <thead className="bg-surface-50 border-b border-surface-200 text-xs uppercase text-surface-500 font-bold">
 <tr>
 <th className="py-3 px-4">Item Name</th>
 <th className="py-3 px-4 w-28">Qty</th>
 <th className="py-3 px-4 w-24">Unit</th>
 <th className="py-3 px-4 w-32">Rate (₹)</th>
 <th className="py-3 px-4 w-32 text-right">Amount (₹)</th>
 <th className="py-3 px-4 w-12 text-center"></th>
 </tr>
 </thead>
 <tbody className="divide-y divide-surface-100 text-sm">
 {items.map((item, idx) => (
 <tr key={idx} className="hover:bg-surface-50 transition-colors">
 <td className="py-2 px-4">
 <input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} placeholder="Item Name" className="w-full outline-none bg-transparent font-medium text-surface-800" />
 </td>
 <td className="py-2 px-4">
 <input type="number" min="1" max={item.original_qty || 9999} value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} className="w-full outline-none border border-surface-200 rounded px-2 py-1.5 text-center focus:border-[#7c3aed]" />
 </td>
 <td className="py-2 px-4">
 <input value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} className="w-full outline-none border border-surface-200 rounded px-2 py-1.5 text-center focus:border-[#7c3aed]" />
 </td>
 <td className="py-2 px-4">
 <input type="number" value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} className="w-full outline-none border border-surface-200 rounded px-2 py-1.5 focus:border-[#7c3aed]" />
 </td>
 <td className="py-2 px-4 text-right font-bold text-surface-800">
 {item.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
 </td>
 <td className="py-2 px-4 text-center">
 <button onClick={() => removeRow(idx)} className="text-surface-400 hover:text-red-500 transition-colors">
 <HiOutlineTrash className="w-4 h-4" />
 </button>
 </td>
 </tr>
 ))}
 {items.length === 0 && (
 <tr>
 <td colSpan="6" className="py-6 text-center text-surface-500 text-sm">No items added. Add a row or link an invoice.</td>
 </tr>
 )}
 </tbody>
 </table>
 <div className="p-3 bg-surface-50 border-t border-surface-200">
 <button onClick={addRow} className="text-[#7c3aed] text-sm font-bold flex items-center gap-1 hover:text-[#6d28d9] transition-colors">
 <HiOutlinePlus className="w-4 h-4" /> Add Row
 </button>
 </div>
 </div>

 <div className="flex flex-col md:flex-row justify-between gap-8">
 <div className="flex-1 space-y-5">
 <div>
 <label className="block text-xs font-bold text-surface-600 mb-1">Notes / Reason</label>
 <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border border-surface-200 rounded-lg outline-none focus:border-[#7c3aed] text-sm resize-none"></textarea>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-bold text-surface-600 mb-1">Refund Mode</label>
 <select value={refundMode} onChange={e => setRefundMode(e.target.value)} className="w-full px-3 py-2 border border-surface-200 rounded-lg outline-none focus:border-[#7c3aed] text-sm bg-white">
 <option value="Cash">Cash</option>
 <option value="UPI">UPI</option>
 <option value="Adjust in next bill">Adjust in next bill</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-bold text-surface-600 mb-1">Amount Refunded</label>
 <div className="flex items-center border border-surface-200 rounded-lg overflow-hidden focus-within:border-[#7c3aed]">
 <span className="px-3 py-2 bg-surface-50 text-surface-500 text-sm font-bold border-r border-surface-200">₹</span>
 <input type="number" value={amountRefunded} onChange={e => setAmountRefunded(e.target.value)} className="w-full px-3 py-2 outline-none text-sm font-medium" />
 </div>
 </div>
 </div>
 </div>

 <div className="w-full md:w-[350px] border border-surface-200 rounded-lg overflow-hidden bg-white">
 <div className="p-4 space-y-4 text-sm">
 <div className="flex justify-between font-bold text-surface-700">
 <span>Subtotal</span>
 <span>₹ {subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-surface-600 font-medium">Additional Charges</span>
 <input type="number" value={additionalCharges} onChange={e => setAdditionalCharges(e.target.value)} className="w-24 border-b border-surface-200 text-right outline-none bg-transparent focus:border-[#7c3aed] font-medium" placeholder="0" />
 </div>
 <div className="flex justify-between items-center">
 <span className="text-surface-600 font-medium">Discount</span>
 <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-24 border-b border-surface-200 text-right outline-none bg-transparent focus:border-[#7c3aed] font-medium" placeholder="0" />
 </div>
 </div>
 <div className="bg-surface-50 p-4 border-t border-surface-200 flex justify-between items-center">
 <span className="font-bold text-lg text-surface-900">Total</span>
 <span className="font-black text-xl text-[#7c3aed]">₹ {totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 ) : (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-[#f5f3ff] rounded-lg flex items-center justify-center border border-[#ede9fe]">
 <HiOutlineDocumentText className="w-6 h-6 text-[#7c3aed]" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-surface-900">Sale Returns</h1>
 <p className="text-sm text-surface-500">Manage returns and credit notes</p>
 </div>
 </div>
 <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-[#7c3aed] text-white rounded-lg text-sm font-bold hover:bg-[#6d28d9] flex items-center gap-2 shadow-sm transition-colors">
 <HiOutlinePlus className="w-4 h-4" /> Create Sale Return
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-5 flex flex-col justify-center">
 <h3 className="text-sm font-medium text-surface-500 mb-1">Total Returns</h3>
 {loading ? <div className="h-8 w-16 bg-surface-200 rounded animate-pulse"></div> : <p className="text-2xl font-bold text-surface-900">{totalReturns}</p>}
 </div>
 <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-5 flex flex-col justify-center">
 <h3 className="text-sm font-medium text-surface-500 mb-1">Total Return Amount</h3>
 {loading ? <div className="h-8 w-24 bg-surface-200 rounded animate-pulse"></div> : <p className="text-2xl font-bold text-[#7c3aed]">₹ {totalReturnAmt.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>}
 </div>
 <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-5 flex flex-col justify-center">
 <h3 className="text-sm font-medium text-surface-500 mb-1">This Month Returns</h3>
 {loading ? <div className="h-8 w-16 bg-surface-200 rounded animate-pulse"></div> : <p className="text-2xl font-bold text-surface-900">{thisMonthReturns}</p>}
 </div>
 </div>

 <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
 {loading ? (
 <div className="p-8 space-y-4">
 <div className="h-4 bg-surface-200 rounded w-1/4 animate-pulse"></div>
 <div className="h-10 bg-surface-200 rounded animate-pulse"></div>
 <div className="h-10 bg-surface-200 rounded animate-pulse"></div>
 <div className="h-10 bg-surface-200 rounded animate-pulse"></div>
 </div>
 ) : saleReturns.length === 0 ? (
 <div className="p-16 text-center">
 <div className="w-16 h-16 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-4">
 <HiOutlineDocumentText className="w-8 h-8 text-surface-400" />
 </div>
 <h3 className="text-lg font-bold text-surface-900 mb-1">No sale returns yet.</h3>
 <p className="text-surface-500 text-sm mb-6">Create your first sale return to get started.</p>
 <button onClick={() => setShowForm(true)} className="px-5 py-2.5 bg-[#7c3aed] text-white rounded-lg text-sm font-bold hover:bg-[#6d28d9] shadow-sm transition-colors">
 + Create Sale Return
 </button>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left whitespace-nowrap">
 <thead className="bg-surface-50 border-b border-surface-200 text-xs uppercase text-surface-500 font-bold">
 <tr>
 <th className="py-4 px-5">Date</th>
 <th className="py-4 px-5">Return No.</th>
 <th className="py-4 px-5">Linked Bill No.</th>
 <th className="py-4 px-5">Party Name</th>
 <th className="py-4 px-5 text-center">Items Count</th>
 <th className="py-4 px-5 text-right">Return Amount</th>
 <th className="py-4 px-5 text-center">Status</th>
 <th className="py-4 px-5 text-center"></th>
 </tr>
 </thead>
 <tbody className="divide-y divide-surface-100 text-sm">
 {saleReturns.map(sr => (
 <tr key={sr.id} className="hover:bg-surface-50 transition-colors group">
 <td className="py-4 px-5 text-surface-600">{new Date(sr.return_date).toLocaleDateString('en-GB')}</td>
 <td className="py-4 px-5 font-bold text-surface-900">{sr.return_no}</td>
 <td className="py-4 px-5 font-medium text-blue-600 cursor-pointer hover:underline">{getBillNo(sr.original_bill_id)}</td>
 <td className="py-4 px-5 font-medium text-surface-800">{getPartyName(sr.customer_id, sr)}</td>
 <td className="py-4 px-5 text-center text-surface-600">{sr.items ? sr.items.length : 0}</td>
 <td className="py-4 px-5 text-right font-bold text-[#7c3aed]">
 ₹ {Number(sr.total_return_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
 </td>
 <td className="py-4 px-5 text-center">
 <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold capitalize">
 {sr.status || 'Completed'}
 </span>
 </td>
 <td className="py-4 px-5 text-center">
 <button className="p-1.5 text-surface-400 hover:text-surface-800 hover:bg-surface-200 rounded transition-colors">
 <HiOutlineDotsVertical className="w-5 h-5" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
