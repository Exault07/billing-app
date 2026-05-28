import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineSave, HiOutlineSearch, HiOutlineDocumentText } from 'react-icons/hi';

async function generateQuotationNo() {
 const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
 const { count } = await supabase.from('quotations').select('id', { count: 'exact', head: true });
 return `QUOT-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;
}

const emptyItem = () => ({ product_id: '', name: '', unit: '', qty: 1, price: 0, total: 0 });

export default function QuotationForm() {
 const { id } = useParams();
 const navigate = useNavigate();
 const { user } = useAuth();
 const isEditing = Boolean(id);

 const [billNo, setBillNo] = useState('');
 const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
 const [customerId, setCustomerId] = useState('');
 const [items, setItems] = useState([emptyItem()]);
 const [discount, setDiscount] = useState(0);
 const [labourCharges, setLabourCharges] = useState(0);
 const [transportCharges, setTransportCharges] = useState(0);
 const [advancePaid, setAdvancePaid] = useState(0);
 const [paymentMode, setPaymentMode] = useState('cash');
 const [notes, setNotes] = useState('');
 const [customers, setCustomers] = useState([]);
 const [products, setProducts] = useState([]);
 const [productSearch, setProductSearch] = useState({});
 const [saving, setSaving] = useState(false);
 const [converting, setConverting] = useState(false);
 const [loadingData, setLoadingData] = useState(true);
 const [error, setError] = useState('');

 const subtotal = items.reduce((sum, i) => sum + Number(i.total || 0), 0);
 const grandTotal = subtotal - Number(discount) + Number(labourCharges) + Number(transportCharges);
 const balanceDue = grandTotal - Number(advancePaid);

 useEffect(() => {
 const fetchData = async () => {
 const [{ data: c }, { data: p }] = await Promise.all([
 supabase.from('parties').select('id, name, mobile').eq('party_type', 'customer').order('name'),
 supabase.from('products').select('id, name, unit, selling_price').order('name'),
 ]);
 setCustomers(c || []);
 setProducts(p || []);
 if (!isEditing) setBillNo(await generateQuotationNo());
 setLoadingData(false);
 };
 fetchData();
 }, [isEditing]);

 useEffect(() => {
 if (!isEditing) return;
 supabase.from('quotations').select('*').eq('id', id).single().then(({ data }) => {
 if (!data) return;
 setBillNo(data.bill_no); setDate(data.date); setCustomerId(data.customer_id || '');
 setItems(data.items?.length ? data.items : [emptyItem()]);
 setDiscount(data.discount || 0); setLabourCharges(data.labour_charges || 0);
 setTransportCharges(data.transport_charges || 0); setAdvancePaid(data.advance_paid || 0);
 setPaymentMode(data.payment_mode || 'cash'); setNotes(data.notes || '');
 setLoadingData(false);
 });
 }, [isEditing, id]);

 const updateItem = useCallback((index, field, value) => {
 setItems(prev => {
 const updated = [...prev];
 updated[index] = { ...updated[index], [field]: value };
 if (field === 'qty' || field === 'price') {
 updated[index].total = Number(updated[index].qty || 0) * Number(updated[index].price || 0);
 }
 return updated;
 });
 }, []);

 const selectProduct = (index, product) => {
 setItems(prev => {
 const updated = [...prev];
 updated[index] = { ...updated[index], product_id: product.id, name: product.name, unit: product.unit || '', price: Number(product.selling_price || 0), total: Number(updated[index].qty || 1) * Number(product.selling_price || 0) };
 return updated;
 });
 setProductSearch(prev => ({ ...prev, [index]: '' }));
 };

 const handleSave = async () => {
 setError('');
 if (!customerId) { setError('Please select a customer.'); return; }
 setSaving(true);
 try {
 const payload = { bill_no: billNo, date, customer_id: customerId, items: items.filter(i => i.product_id), subtotal, discount: Number(discount), labour_charges: Number(labourCharges), transport_charges: Number(transportCharges), advance_paid: Number(advancePaid), balance_due: balanceDue, payment_mode: paymentMode, notes, status: 'draft', created_by: user?.id };
 if (isEditing) {
 await supabase.from('quotations').update(payload).eq('id', id);
 navigate(`/quotations/${id}`);
 } else {
 const { data } = await supabase.from('quotations').insert(payload).select().single();
 navigate(`/quotations/${data.id}`);
 }
 } catch (err) { setError('Failed to save: ' + err.message); }
 finally { setSaving(false); }
 };

 const handleConvertToBill = async () => {
 if (!id) return;
 setConverting(true);
 try {
 const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
 const { count } = await supabase.from('bills').select('id', { count: 'exact', head: true });
 const newBillNo = `BILL-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;
 const { data: newBill } = await supabase.from('bills').insert({ bill_no: newBillNo, date, customer_id: customerId, items: items.filter(i => i.product_id), subtotal, discount: Number(discount), labour_charges: Number(labourCharges), transport_charges: Number(transportCharges), advance_paid: Number(advancePaid), balance_due: balanceDue, payment_mode: paymentMode, notes, status: 'draft', created_by: user?.id }).select().single();
 await supabase.from('quotations').update({ converted_to_bill_id: newBill.id, status: 'final' }).eq('id', id);
 navigate(`/billing/${newBill.id}`);
 } catch (err) { setError('Conversion failed: ' + err.message); }
 finally { setConverting(false); }
 };

 if (loadingData) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

 return (
 <div className="max-w-5xl mx-auto">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
 <HiOutlineDocumentText className="w-5 h-5 text-amber-600" />
 </div>
 <div>
 <h1 className="text-xl font-bold text-surface-800">{isEditing ? `Edit Quotation â€” ${billNo}` : 'Create Quotation'}</h1>
 <p className="text-xs text-surface-400">Quotations can be converted to bills later.</p>
 </div>
 </div>
 <div className="flex gap-2">
 {isEditing && (
 <button onClick={handleConvertToBill} disabled={converting} className="px-4 py-2 text-sm rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50">
 {converting ? 'Converting...' : 'â†’ Convert to Bill'}
 </button>
 )}
 <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50">
 <HiOutlineSave className="w-4 h-4" />{saving ? 'Saving...' : 'Save Quotation'}
 </button>
 </div>
 </div>

 {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">⚠️ {error}</div>}

 <div className="bg-white rounded-2xl border border-surface-200 p-6 mb-4">
 <h2 className="text-sm font-semibold text-surface-600 mb-4 uppercase tracking-wide">Details</h2>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div><label className="block text-xs font-medium text-surface-600 mb-1">Quotation No.</label><input value={billNo} onChange={e => setBillNo(e.target.value)} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></div>
 <div><label className="block text-xs font-medium text-surface-600 mb-1">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></div>
 <div><label className="block text-xs font-medium text-surface-600 mb-1">Payment Mode</label>
 <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
 <option value="cash">Cash</option><option value="upi">UPI</option><option value="credit">Credit</option>
 </select>
 </div>
 </div>
 <div className="mt-4"><label className="block text-xs font-medium text-surface-600 mb-1">Customer *</label>
 <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
 <option value="">â€” Select Customer â€”</option>
 {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.mobile ? `(${c.mobile})` : ''}</option>)}
 </select>
 </div>
 </div>

 <div className="bg-white rounded-2xl border border-surface-200 p-6 mb-4">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide">Items</h2>
 <button onClick={() => setItems(prev => [...prev, emptyItem()])} className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"><HiOutlinePlus className="w-4 h-4" /> Add Item</button>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead><tr className="border-b border-surface-200 text-xs text-surface-500 uppercase tracking-wide">
 <th className="text-left pb-3 pr-3 w-2/5">Product</th><th className="text-left pb-3 pr-3 w-16">Unit</th>
 <th className="text-right pb-3 pr-3 w-20">Qty</th><th className="text-right pb-3 pr-3 w-28">Price (₹)</th>
 <th className="text-right pb-3 pr-3 w-28">Total (₹)</th><th className="pb-3 w-10"></th>
 </tr></thead>
 <tbody className="divide-y divide-surface-100">
 {items.map((item, index) => {
 const search = productSearch[index] || '';
 const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
 return (
 <tr key={index}>
 <td className="py-2 pr-3 relative">
 {item.product_id ? (
 <div className="flex items-center gap-2"><span className="font-medium text-surface-800">{item.name}</span><button onClick={() => updateItem(index, 'product_id', '')} className="text-xs text-surface-400 hover:text-red-500">âœ•</button></div>
 ) : (
 <div className="relative">
 <div className="relative"><HiOutlineSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
 <input placeholder="Search product..." value={search} onChange={e => setProductSearch(prev => ({ ...prev, [index]: e.target.value }))} className="w-full pl-8 pr-3 py-1.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
 </div>
 {search && filtered.length > 0 && <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
 {filtered.map(p => <li key={p.id} onClick={() => selectProduct(index, p)} className="flex items-center justify-between px-3 py-2 hover:bg-surface-50 cursor-pointer"><span className="text-sm">{p.name}</span><span className="text-xs text-surface-400">₹{p.selling_price}</span></li>)}
 </ul>}
 </div>
 )}
 </td>
 <td className="py-2 pr-3"><span className="text-surface-500 text-xs">{item.unit}</span></td>
 <td className="py-2 pr-3"><input type="number" min="0.01" step="0.01" value={item.qty} onChange={e => updateItem(index, 'qty', e.target.value)} className="w-full text-right border border-surface-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></td>
 <td className="py-2 pr-3"><input type="number" min="0" step="0.01" value={item.price} onChange={e => updateItem(index, 'price', e.target.value)} className="w-full text-right border border-surface-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></td>
 <td className="py-2 pr-3 text-right font-semibold text-surface-800">₹{Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
 <td className="py-2 text-center"><button onClick={() => setItems(prev => prev.length === 1 ? [emptyItem()] : prev.filter((_, i) => i !== index))} className="text-surface-400 hover:text-red-500 p-1"><HiOutlineTrash className="w-4 h-4" /></button></td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="bg-white rounded-2xl border border-surface-200 p-6">
 <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide mb-4">Adjustments</h2>
 <div className="space-y-3">
 {[['Discount (₹)', discount, setDiscount], ['Labour Charges (₹)', labourCharges, setLabourCharges], ['Transport Charges (₹)', transportCharges, setTransportCharges], ['Advance Paid (₹)', advancePaid, setAdvancePaid]].map(([label, value, setter]) => (
 <div key={label} className="flex items-center gap-3">
 <label className="flex-1 text-sm text-surface-600">{label}</label>
 <input type="number" min="0" step="0.01" value={value} onChange={e => setter(e.target.value)} className="w-36 text-right border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
 </div>
 ))}
 </div>
 <div className="mt-4"><label className="block text-xs font-medium text-surface-600 mb-1">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500" /></div>
 </div>
 <div className="bg-white rounded-2xl border border-surface-200 p-6">
 <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide mb-4">Summary</h2>
 <div className="space-y-3 text-sm">
 <div className="flex justify-between text-surface-600"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
 <div className="flex justify-between text-red-600"><span>Discount</span><span>âˆ’ ₹{Number(discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
 <div className="flex justify-between text-surface-600"><span>Labour</span><span>+ ₹{Number(labourCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
 <div className="flex justify-between text-surface-600"><span>Transport</span><span>+ ₹{Number(transportCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
 <div className="flex justify-between font-semibold text-surface-800 border-t border-surface-200 pt-3"><span>Grand Total</span><span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
 <div className="flex justify-between text-green-700"><span>Advance Paid</span><span>âˆ’ ₹{Number(advancePaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
 <div className={`flex justify-between font-bold text-lg border-t border-surface-200 pt-3 ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}><span>Balance Due</span><span>₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
 </div>
 </div>
 </div>
 </div>
 );
}
