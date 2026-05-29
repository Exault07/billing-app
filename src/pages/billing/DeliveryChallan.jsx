import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { HiOutlineSave, HiOutlinePlus, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';

const emptyItem = () => ({ product_id: '', name: '', unit: '', qty: 1 });

export default function DeliveryChallan() {
 const { id } = useParams(); // bill_id if coming from a bill
 const navigate = useNavigate();
 const { user } = useAuth();

 const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
 const [customerId, setCustomerId] = useState('');
 const [billId, setBillId] = useState(id || '');
 const [items, setItems] = useState([emptyItem()]);
 const [notes, setNotes] = useState('');
 const [customers, setCustomers] = useState([]);
 const [products, setProducts] = useState([]);
 const [productSearch, setProductSearch] = useState({});
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');

 useEffect(() => {
 const fetchData = async () => {
 const [{ data: c }, { data: p }] = await Promise.all([
 supabase.from('parties').select('id, name, mobile').eq('party_type', 'customer').order('name'),
 supabase.from('products').select('id, name, unit').order('name'),
 ]);
 setCustomers(c || []);
 setProducts(p || []);
 };

 // If created from a bill, pre-fill from bill data
 const prefillFromBill = async () => {
 if (!id) return;
 const { data: bill } = await supabase.from('bills').select('customer_id, items, date').eq('id', id).single();
 if (bill) {
 setCustomerId(bill.customer_id || '');
 setDate(bill.date);
 setItems(bill.items?.map(i => ({ product_id: i.product_id, name: i.name, unit: i.unit, qty: i.qty })) || [emptyItem()]);
 }
 };

 fetchData();
 prefillFromBill();
 }, [id]);

 const updateItem = (index, field, value) => {
 setItems(prev => {
 const updated = [...prev];
 updated[index] = { ...updated[index], [field]: value };
 return updated;
 });
 };

 const selectProduct = (index, product) => {
 setItems(prev => {
 const updated = [...prev];
 updated[index] = { ...updated[index], product_id: product.id, name: product.name, unit: product.unit || '' };
 return updated;
 });
 setProductSearch(prev => ({ ...prev, [index]: '' }));
 };

 const handleSave = async () => {
 setError('');
 if (!customerId) { setError('Please select a customer.'); return; }
 setSaving(true);
 try {
 await supabase.from('delivery_challans').insert({
 bill_id: billId || null,
 customer_id: customerId,
 items: items.filter(i => i.product_id),
 date,
 notes,
 });
 navigate('/billing/history');
 } catch (err) {
 setError('Failed to save: ' + err.message);
 } finally {
 setSaving(false);
 }
 };

 return (
 <div className="animate-fade-in w-full">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
 <HiOutlineSave className="w-5 h-5 text-blue-600" />
 </div>
 <div>
 <h1 className="text-xl font-bold text-surface-800">Delivery Challan</h1>
 <p className="text-xs text-surface-400">Record goods dispatched to a customer.</p>
 </div>
 </div>
 <div className="flex gap-2">
 <Link to="/billing/history" className="px-4 py-2 text-sm rounded-xl border border-surface-200 text-surface-600 hover:bg-surface-50">Cancel</Link>
 <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
 <HiOutlineSave className="w-4 h-4" />{saving ? 'Saving...' : 'Save Challan'}
 </button>
 </div>
 </div>

 {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">⚠️ {error}</div>}

 <div className="bg-white rounded-2xl border border-surface-200 p-6 mb-4">
 <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide mb-4">Details</h2>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-surface-600 mb-1">Date</label>
 <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 <div>
 <label className="block text-xs font-medium text-surface-600 mb-1">Customer *</label>
 <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
 <option value="">-- Select Customer --</option>
 {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.mobile ? `(${c.mobile})` : ''}</option>)}
 </select>
 </div>
 </div>
 <div className="mt-4">
 <label className="block text-xs font-medium text-surface-600 mb-1">Linked Bill ID (optional)</label>
 <input value={billId} onChange={e => setBillId(e.target.value)} placeholder="Leave blank if standalone" className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 <div className="mt-4">
 <label className="block text-xs font-medium text-surface-600 mb-1">Notes</label>
 <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 </div>

 <div className="bg-white rounded-2xl border border-surface-200 p-6">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide">Items Dispatched</h2>
 <button onClick={() => setItems(prev => [...prev, emptyItem()])} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"><HiOutlinePlus className="w-4 h-4" /> Add Item</button>
 </div>
 <div className="space-y-3">
 {items.map((item, index) => {
 const search = productSearch[index] || '';
 const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
 return (
 <div key={index} className="flex items-center gap-3">
 <div className="flex-1 relative">
 {item.product_id ? (
 <div className="flex items-center gap-2 border border-surface-200 rounded-xl px-3 py-2">
 <span className="text-sm font-medium text-surface-800 flex-1">{item.name}</span>
 <span className="text-xs text-surface-400">{item.unit}</span>
 <button onClick={() => updateItem(index, 'product_id', '')} className="text-xs text-surface-400 hover:text-red-500">✕</button>
 </div>
 ) : (
 <div className="relative">
 <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input placeholder="Search product..." value={search} onChange={e => setProductSearch(prev => ({ ...prev, [index]: e.target.value }))} className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
 {search && filtered.length > 0 && (
 <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
 {filtered.map(p => <li key={p.id} onClick={() => selectProduct(index, p)} className="px-3 py-2 hover:bg-surface-50 cursor-pointer text-sm">{p.name}</li>)}
 </ul>
 )}
 </div>
 )}
 </div>
 <div className="w-24">
 <input type="number" min="1" value={item.qty} onChange={e => updateItem(index, 'qty', e.target.value)} placeholder="Qty" className="w-full text-right border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 <button onClick={() => setItems(prev => prev.length === 1 ? [emptyItem()] : prev.filter((_, i) => i !== index))} className="text-surface-400 hover:text-red-500 p-2">
 <HiOutlineTrash className="w-4 h-4" />
 </button>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
}
