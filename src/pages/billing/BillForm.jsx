import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import PartySelect from '../../components/shared/PartySelect';
import AddItemsModal from '../../components/shared/AddItemsModal';

import { useAuth } from '../../context/AuthContext';
import {
 HiOutlineArrowLeft,
 HiOutlineCog,
 HiOutlineX,
 HiOutlinePlus,
 HiOutlineQrcode
} from 'react-icons/hi';

// â”€â”€â”€ Helper: generate a sequential bill number â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function generateBillNo() {
 const today = new Date();
 const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
 const { count } = await supabase
 .from('bills')
 .select('id', { count: 'exact', head: true });
 const seq = String((count || 0) + 1).padStart(3, '0');
 return `BILL-${dateStr}-${seq}`;
}

// â”€â”€â”€ Empty line-item template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const emptyItem = () => ({
 product_id: '',
 name: '',
 hsn: '',
 qty: 1,
 price: 0,
 discount: 0,
 tax: 0,
 total: 0,
});

export default function BillForm() {
 const { id } = useParams();
 const navigate = useNavigate();
  const location = useLocation();
 const { user } = useAuth();
 const isEditing = Boolean(id);
 const searchParams = new URLSearchParams(location.search);
 const [billType, setBillType] = useState(searchParams.get('type') || 'invoice');

 // â”€â”€ Form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 const [billNo, setBillNo] = useState('');
 const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
 const [paymentTerms, setPaymentTerms] = useState('30');
 const [dueDate, setDueDate] = useState('');
 const [customerId, setCustomerId] = useState('');
 const [carpenterId, setCarpenterId] = useState('');
 const [commissionRate, setCommissionRate] = useState(0);
 
 const [items, setItems] = useState([emptyItem()]);
 
 const [notes, setNotes] = useState('');
 const [terms, setTerms] = useState('1. GST will be charged additionally as applicable.');
 
 const [additionalCharges, setAdditionalCharges] = useState(0);
 const [overallDiscount, setOverallDiscount] = useState(0);
 const [autoRoundOff, setAutoRoundOff] = useState(false);
 const [amountReceived, setAmountReceived] = useState(0);
 const [isFullyPaid, setIsFullyPaid] = useState(false);

 // â”€â”€ Data lists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 const [customers, setCustomers] = useState([]);
 const [products, setProducts] = useState([]);
 const [carpenters, setCarpenters] = useState([]);

 // â”€â”€ UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 const [saving, setSaving] = useState(false);
 const [loadingData, setLoadingData] = useState(true);
 const [error, setError] = useState('');
 
 // Custom dropdown states
   const [productSearch, setProductSearch] = useState({});
    
    
  useEffect(() => {
    const handleProductClickOutside = (event) => {
      if (!event.target.closest('.item-row')) {
        setProductSearch({});
      }
    };
    document.addEventListener('mousedown', handleProductClickOutside);
    return () => document.removeEventListener('mousedown', handleProductClickOutside);
  }, []);

 // Quick Create / Barcode state
    const [newPartyAddress, setNewPartyAddress] = useState('');
   
 const [showBarcodeModal, setShowBarcodeModal] = useState(false);
 const [manualBarcode, setManualBarcode] = useState('');

 // â”€â”€ Derived totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 const subtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
 const taxableAmount = subtotal + Number(additionalCharges);
 let grandTotalRaw = taxableAmount - Number(overallDiscount);
 const roundOffAmt = autoRoundOff ? (Math.round(grandTotalRaw) - grandTotalRaw) : 0;
 const grandTotal = grandTotalRaw + roundOffAmt;
 
 // If fully paid checkbox is checked, lock amount received to grand total
 useEffect(() => {
 if (isFullyPaid) setAmountReceived(grandTotal);
 }, [isFullyPaid, grandTotal]);

 const balanceDue = grandTotal - Number(amountReceived);

 // Due Date calculation
 useEffect(() => {
 if (date && paymentTerms) {
 const d = new Date(date);
 d.setDate(d.getDate() + Number(paymentTerms));
 setDueDate(d.toISOString().split('T')[0]);
 }
 }, [date, paymentTerms]);


 // â”€â”€ Load customers. and products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 useEffect(() => {
 const fetchData = async () => {
 try {
 const [{ data: custData }, { data: prodData }, { data: carpData }] = await Promise.all([
 supabase.from('parties').select('id, name, phone:mobile, balance:current_balance').in('party_type', ['customer', 'both']).order('name'),
 supabase.from('products').select('id, name, category, unit, selling_price, stock_qty').order('name'),
 supabase.from('carpenters').select('id, name, default_commission_rate').order('name')
 ]);
 setCustomers(custData || []);
 setProducts(prodData || []);
 setCarpenters(carpData || []);

 if (!isEditing) {
 const bn = await generateBillNo();
 setBillNo(bn.replace('BILL-', '')); // UI shows without prefix
 }
 } catch (err) {
 setError('Failed to load data. ' + err.message);
 } finally {
 setLoadingData(false);
 }
 };
 fetchData();
 }, [isEditing]);

 // â”€â”€ Load existing bill when editing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 useEffect(() => {
 if (!isEditing) return;
 const fetchBill = async () => {
 setLoadingData(true);
 try {
 const { data, error: fetchError } = await supabase.from('bills').select('*').eq('id', id).single();
 if (fetchError) throw fetchError;
 
 setBillNo(data.bill_no.replace('BILL-', ''));
 setDate(data.date);
 setDueDate(data.due_date || '');
 setCustomerId(data.customer_id || '');
 setCarpenterId(data.carpenter_id || '');
 setCommissionRate(data.commission_rate || 0);
 if (data.bill_type) setBillType(data.bill_type);
 
 // Map old items format to new format
 const loadedItems = (data.items || []).map(i => ({
 product_id: i.product_id,
 name: i.name,
 hsn: i.hsn || '',
 qty: i.qty,
 price: i.price,
 discount: i.discount || 0,
 tax: i.tax || 0,
 total: i.total
 }));
 setItems(loadedItems.length ? loadedItems : [emptyItem()]);
 
 setOverallDiscount(data.discount || 0);
 setAdditionalCharges((data.labour_charges || 0) + (data.transport_charges || 0));
 setAutoRoundOff(Boolean(data.round_off));
 setAmountReceived(data.advance_paid || 0);
 
 setNotes(data.notes || '');
 if (data.advance_paid >= data.grand_total && data.grand_total > 0) setIsFullyPaid(true);
 } catch (err) {
 setError('Failed to load bill: ' + err.message);
 } finally {
 setLoadingData(false);
 }
 };
 fetchBill();
 }, [isEditing, id]);

 // ── Handle Duplicate ────────────────────────────────────────────────────────────────
 useEffect(() => {
   if (location.state?.duplicateFrom) {
     const fetchDuplicate = async () => {
       setLoadingData(true);
       try {
         const { data, error } = await supabase.from('bills').select('*').eq('id', location.state.duplicateFrom).single();
         if (error) throw error;
         
         setCustomerId(data.customer_id || '');
         setCarpenterId(data.carpenter_id || '');
         setCommissionRate(data.commission_rate || 0);
         
         const loadedItems = (data.items || []).map(i => ({
           product_id: i.product_id,
           name: i.name,
           hsn: i.hsn || '',
           qty: i.qty,
           price: i.price,
           discount: i.discount || 0,
           tax: i.tax || 0,
           total: i.total
         }));
         setItems(loadedItems.length ? loadedItems : [emptyItem()]);
         
         setOverallDiscount(data.discount || 0);
         setAdditionalCharges((data.labour_charges || 0) + (data.transport_charges || 0));
         setAutoRoundOff(Boolean(data.round_off));
         
         setNotes(data.notes || '');
         
       } catch (err) {
         setError('Failed to load duplicate bill: ' + err.message);
       } finally {
         setLoadingData(false);
       }
     };
     fetchDuplicate();
   }
 }, [location.state?.duplicateFrom]);

 // ——— Item helpers ———————————————————————————————————————————————————————————————————————
 const addItem = () => setItems(prev => [...prev, emptyItem()]);

 const removeItem = (index) =>
 setItems(prev => prev.length === 1 ? [emptyItem()] : prev.filter((_, i) => i !== index));

 const updateItem = useCallback((index, field, value) => {
 setItems(prev => {
 const updated = [...prev];
 updated[index] = { ...updated[index], [field]: value };
 
 // Calculate total: (Qty * Price) - Discount + Tax%
 if (['qty', 'price', 'discount', 'tax'].includes(field)) {
 const q = Number(updated[index].qty || 0);
 const p = Number(updated[index].price || 0);
 const d = Number(updated[index].discount || 0);
 const base = (q * p) - d;
 const taxAmt = base * (Number(updated[index].tax || 0) / 100);
 updated[index].total = base + taxAmt;
 }
 return updated;
 });
 }, []);

 const selectProduct = (index, product) => {
 setItems(prev => {
 const updated = [...prev];
 const q = Number(updated[index].qty || 1);
 const p = Number(product.selling_price || 0);
 updated[index] = {
 ...updated[index],
 product_id: product.id,
 name: product.name,
 hsn: product.hsn || '',
 price: p,
 total: q * p,
 };
 return updated;
 });
 setProductSearch(prev => ({ ...prev, [index]: '' }));
 };

 // â”€â”€ Save handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   const handleSave = async (e) => {
    e?.preventDefault();
    setError('');
    if (!customerId) return setError('Please select a Party.');
    const validItems = items.filter(i => i.product_id);
    if (validItems.length === 0) return setError('Please add at least one item.');

    setSaving(true);
    try {
      const payload = {
        bill_no: `BILL-${billNo}`,
        date: date || new Date().toISOString().split('T')[0],
        due_date: dueDate || null,
        customer_id: customerId || null,
        items: validItems,
        subtotal,
        discount: Number(overallDiscount),
        labour_charges: Number(additionalCharges),
        round_off: roundOffAmt,
        advance_paid: Number(amountReceived),
        balance_due: balanceDue,
        grand_total: grandTotal,
        notes: `${notes}\n\nTerms:\n${terms}`,
        status: balanceDue <= 0 ? 'paid' : 'final',
        bill_type: billType,
        created_by: user?.id,
        carpenter_id: carpenterId || null,
        commission_rate: Number(commissionRate) || 0,
      };

      if (isEditing) {
 // Fetch old bill to adjust balance difference
 const { data: oldBill } = await supabase.from('bills').select('balance_due').eq('id', id).single();
 const oldBalance = Number(oldBill?.balance_due || 0);
 const diff = balanceDue - oldBalance;
 
 const { error: updateErr } = await supabase.from('bills').update(payload).eq('id', id);
 if (updateErr) throw updateErr;

 if (diff !== 0) {
 const { data: pData } = await supabase.from('parties').select('current_balance').eq('id', customerId).single();
 if (pData) {
 await supabase.from('parties').update({ current_balance: Number(pData.current_balance || 0) + diff }).eq('id', customerId);
 }
 }
 } else {
 const { error: insertErr } = await supabase.from('bills').insert(payload);
 if (insertErr) throw insertErr;

 if (balanceDue > 0) {
 const { data: pData } = await supabase.from('parties').select('current_balance').eq('id', customerId).single();
 if (pData) {
 await supabase.from('parties').update({ current_balance: Number(pData.current_balance || 0) + balanceDue }).eq('id', customerId);
 }
 }
 }
 navigate('/billing/history');
 } catch (err) {
 setError('Failed to save invoice: ' + err.message);
 } finally {
 setSaving(false);
 }
 };

 // ——— Barcode Scanning & Creation ———
 const handleBarcodeScanned = (scannedCode) => {
 const p = products.find(prod => (prod.barcode && prod.barcode.toLowerCase() === scannedCode.toLowerCase()) || (prod.item_code && prod.item_code.toLowerCase() === scannedCode.toLowerCase()));
 if (p) {
 // Find empty slot or add new
 let emptyIdx = items.findIndex(i => !i.product_id);
 if (emptyIdx === -1) {
 setItems(prev => [...prev, {
 product_id: p.id,
 name: p.name,
 hsn: '',
 qty: 1,
 price: p.selling_price || 0,
 discount: 0,
 tax: 0,
 total: p.selling_price || 0
 }]);
 } else {
 updateItem(emptyIdx, 'product_id', p.id);
 updateItem(emptyIdx, 'name', p.name);
 updateItem(emptyIdx, 'price', p.selling_price || 0);
 updateItem(emptyIdx, 'qty', 1);
 }
 } else {
 if (window.confirm(`Product not found for barcode: ${scannedCode}. Create new item?`)) {
 navigate('/inventory/new');
 }
 }
 setManualBarcode('');
 setShowBarcodeModal(false);
 };

 useEffect(() => {
 let barcode = '';
 let timeout = null;
 const handleKeyDown = (e) => {
 if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
 if (e.key === 'Enter' && barcode.length > 2) {
 handleBarcodeScanned(barcode);
 barcode = '';
 return;
 }
 if (e.key.length === 1) {
 barcode += e.key;
 clearTimeout(timeout);
 timeout = setTimeout(() => { barcode = ''; }, 100);
 }
 };
 document.addEventListener('keydown', handleKeyDown);
 return () => document.removeEventListener('keydown', handleKeyDown);
 }, [products, items]);

  
 const selectedCustomer = customers.find(c => c.id === customerId);

 if (loadingData) return <div className="p-10 text-center text-surface-500">Loading invoice...</div>;

 return (
 <div className="max-w-[1400px] mx-auto min-h-screen bg-white">
 
 {/* â”€â”€ Header â”€â”€ */}
 <div className="flex items-center justify-between px-6 py-3 border-b border-surface-200">
 <div className="flex items-center gap-4">
 <button onClick={() => navigate(-1)} className="text-surface-600 hover:text-surface-900">
 <HiOutlineArrowLeft className="w-5 h-5" />
 </button>
 <h1 className="text-[18px] font-bold text-surface-800">
 {isEditing ? `Edit ${billType === 'proforma' ? 'Proforma Invoice' : 'Sales Invoice'}` : `Create ${billType === 'proforma' ? 'Proforma Invoice' : 'Sales Invoice'}`}
 </h1>
 </div>
 <div className="flex items-center gap-3">
 <button className="flex items-center gap-1 text-[13px] font-bold text-surface-600 px-3 py-1.5 border border-surface-200 rounded shadow-sm hover:bg-surface-50">
 <HiOutlineCog className="w-4 h-4" /> Settings
 </button>
 <button className="text-[13px] font-bold text-surface-600 px-4 py-1.5 border border-surface-200 rounded shadow-sm hover:bg-surface-50">
 Save & New
 </button>
 <button 
 onClick={handleSave} 
 disabled={saving}
 className="text-[13px] font-bold text-white px-6 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] rounded shadow-sm disabled:opacity-50"
 >
 {saving ? 'Saving...' : 'Save'}
 </button>
 </div>
 </div>

 {error && <div className="m-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>}

 <div className="p-6">
 {/* â”€â”€ Top Section: Party & Meta â”€â”€ */}
 <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-8">
 
 {/* Bill To Box */}
 <div className="w-full lg:w-96 relative">
 <label className="block text-[13px] font-bold text-surface-700 mb-2">Bill To</label>
 {!selectedCustomer ? (
 <div 
 onClick={() => setShowPartyDropdown(true)}
 className="w-full h-24 border-2 border-dashed border-blue-300 bg-blue-50/50 rounded flex items-center justify-center cursor-pointer hover:bg-blue-50 text-blue-600 font-bold text-[14px]"
 >
 + Add Party
 </div>
 ) : (
 <div className="w-full min-h-[96px] border border-surface-200 rounded p-4 relative group">
 <div className="font-bold text-[15px] text-surface-800">{selectedCustomer.name}</div>
 <div className="text-[12px] text-surface-500 mt-1">Balance: ₹ {selectedCustomer.balance}</div>
 <button 
 onClick={() => setCustomerId('')}
 className="absolute top-2 right-2 text-surface-400 hover:text-red-500 transition-opacity"
 >
 <HiOutlineX className="w-4 h-4" />
 </button>
 </div>
 )}

 {/* Custom Party Dropdown */}
 {showPartyDropdown && !selectedCustomer && (
  <div ref={partyDropdownRef} className="absolute top-[30px] left-0 w-[400px] bg-white border border-[#8b5cf6] rounded-md shadow-2xl z-50 overflow-hidden">
 <div className="p-2 border-b border-[#8b5cf6]">
 <input 
 type="text" 
 autoFocus
 placeholder="Search party by name or number" 
 value={partySearch}
 onChange={e => setPartySearch(e.target.value)}
 className="w-full outline-none text-[13px] p-1"
 />
 </div>
 <div className="max-h-64 overflow-y-auto">
 <div className="flex justify-between px-4 py-1.5 bg-surface-50 text-[10px] font-bold text-surface-500">
 <span>Party Name</span>
 <span>Balance</span>
 </div>
 {customers.filter(c => c.name.toLowerCase().includes(partySearch.toLowerCase())).slice(0, 50).map(c => (
 <div 
 key={c.id} 
 onClick={() => { setCustomerId(c.id); setShowPartyDropdown(false); }}
 className="flex justify-between px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-surface-100 text-[13px]"
 >
 <span className="font-medium text-surface-800">{c.name}</span>
 <span className="text-surface-500">₹ {c.balance}</span>
 </div>
 ))}
 </div>
 <div 
 onClick={() => { setShowPartyDropdown(false); setShowQuickPartyModal(true); }}
 className="p-3 border-t border-surface-200 bg-surface-50 cursor-pointer hover:bg-surface-100 text-center border-dashed border-2 m-2 rounded text-blue-600 font-bold text-[13px]"
 >
 + Create Party
 </div>
 </div>
 )}
 </div>

 {/* Right Meta Grid */}
 <div className="w-full lg:w-auto">
 <div className="flex gap-4 mb-4">
 <div>
 <label className="block text-[11px] font-medium text-surface-500 mb-1">{billType === 'proforma' ? 'Proforma' : 'Sales Invoice'} No:</label>
 <input 
 value={billNo} onChange={e => setBillNo(e.target.value)}
 className="w-32 px-3 py-1.5 border border-surface-200 rounded text-[13px] bg-surface-50"
 />
 </div>
 <div>
 <label className="block text-[11px] font-medium text-surface-500 mb-1">{billType === 'proforma' ? 'Proforma' : 'Sales Invoice'} Date:</label>
 <input 
 type="date" value={date} onChange={e => setDate(e.target.value)}
 className="w-36 px-3 py-1.5 border border-surface-200 rounded text-[13px]"
 />
 </div>
 </div>
 <div className="flex gap-4">
 <div className="relative">
 <label className="block text-[11px] font-medium text-surface-500 mb-1">Payment Terms:</label>
 <div className="flex items-center">
 <input 
 value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
 className="w-16 px-3 py-1.5 border border-r-0 border-surface-200 rounded-l text-[13px] text-right"
 />
 <span className="px-2 py-1.5 border border-surface-200 rounded-r bg-surface-50 text-[12px] text-surface-500">days</span>
 </div>
 </div>
 <div>
 <label className="block text-[11px] font-medium text-surface-500 mb-1">Due Date:</label>
 <input 
 type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
 className="w-36 px-3 py-1.5 border border-surface-200 rounded text-[13px]"
 />
 </div>
 </div>
 </div>
 </div>

 {/* â”€â”€ Referral Section â”€â”€ */}
 <div className="flex gap-6 mb-8 p-4 bg-purple-50/30 border border-purple-100 rounded-lg">
 <div>
 <label className="block text-[11px] font-medium text-surface-500 mb-1">Referred By (Carpenter / Worker):</label>
 <select 
 value={carpenterId} 
 onChange={(e) => {
 setCarpenterId(e.target.value);
 const selected = carpenters.find(c => c.id === e.target.value);
 if (selected) setCommissionRate(selected.default_commission_rate);
 }}
 className="w-64 px-3 py-1.5 border border-surface-200 rounded text-[13px] bg-white focus:outline-none focus:border-purple-300"
 >
 <option value="">-- No Referrer --</option>
 {carpenters.map(c => (
 <option key={c.id} value={c.id}>{c.name}</option>
 ))}
 </select>
 </div>
 {carpenterId && (
 <div>
 <label className="block text-[11px] font-medium text-surface-500 mb-1">Commission Rate (%):</label>
 <input 
 type="number"
 min="0"
 step="0.1"
 value={commissionRate} 
 onChange={e => setCommissionRate(e.target.value)}
 className="w-32 px-3 py-1.5 border border-surface-200 rounded text-[13px] bg-white focus:outline-none focus:border-purple-300"
 />
 </div>
 )}
 </div>

 {/* â”€â”€ Middle Section: Items Table â”€â”€ */}
 <div className="border border-surface-200 rounded mb-8">
 <table className="w-full text-left">
 <thead className="bg-[#f9fafb] border-b border-surface-200 text-[11px] font-bold text-surface-500">
 <tr>
 <th className="py-2.5 px-3 w-10 text-center">NO</th>
 <th className="py-2.5 px-3">ITEMS/ SERVICES</th>
 <th className="py-2.5 px-3 w-24">HSN/ SAC</th>
 <th className="py-2.5 px-3 w-20 text-right">QTY</th>
 <th className="py-2.5 px-3 w-28 text-right">PRICE/ ITEM (₹)</th>
 <th className="py-2.5 px-3 w-24 text-right">DISCOUNT</th>
 <th className="py-2.5 px-3 w-24 text-right">TAX</th>
 <th className="py-2.5 px-3 w-28 text-right">AMOUNT (₹)</th>
 <th className="py-2.5 px-3 w-12 text-center"></th>
 </tr>
 </thead>
 <tbody className="text-[13px]">
 {items.map((item, idx) => (
 <tr key={idx} className="border-b border-surface-100 group item-row">
 <td className="py-2 px-3 text-center text-surface-400">{idx + 1}</td>
 <td className="py-2 px-3 relative">
 <input 
 placeholder="Type item name"
 value={item.name}
 onChange={e => {
 updateItem(idx, 'name', e.target.value);
 setProductSearch(prev => ({ ...prev, [idx]: e.target.value }));
 }}
 className="w-full px-2 py-1.5 border-b border-transparent focus:border-blue-500 outline-none"
 />
 {/* Auto-suggest */}
 {productSearch[idx] && (
 <div className="absolute z-10 top-full left-0 w-[300px] bg-white border border-surface-200 shadow-xl rounded max-h-48 overflow-y-auto">
 {products.filter(p => p.name.toLowerCase().includes(productSearch[idx].toLowerCase())).slice(0, 50).map(p => (
 <div 
 key={p.id} onClick={() => selectProduct(idx, p)}
 className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-surface-100 flex justify-between"
 >
 <span>{p.name}</span>
 <span className="font-bold">₹{p.selling_price}</span>
 </div>
 ))}
 </div>
 )}
 </td>
 <td className="py-2 px-3"><input value={item.hsn} onChange={e => updateItem(idx, 'hsn', e.target.value)} className="w-full bg-transparent outline-none text-surface-600" /></td>
 <td className="py-2 px-3"><input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} className="w-full bg-transparent outline-none text-right font-medium" /></td>
 <td className="py-2 px-3"><input type="number" value={item.price} onChange={e => updateItem(idx, 'price', e.target.value)} className="w-full bg-transparent outline-none text-right" /></td>
 <td className="py-2 px-3"><input type="number" value={item.discount} onChange={e => updateItem(idx, 'discount', e.target.value)} className="w-full bg-transparent outline-none text-right" placeholder="0" /></td>
 <td className="py-2 px-3"><input type="number" value={item.tax} onChange={e => updateItem(idx, 'tax', e.target.value)} className="w-full bg-transparent outline-none text-right" placeholder="0%" /></td>
 <td className="py-2 px-3 text-right font-bold text-surface-800">{Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
 <td className="py-2 px-3 text-center">
 <button onClick={() => removeItem(idx)} className="text-surface-300 hover:text-red-500 transition-opacity">
 <HiOutlineX className="w-4 h-4" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>

 {/* Add Item Row & Barcode */}
 <div className="flex">
 <div 
 onClick={addItem}
 className="flex-1 m-2 border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-600 font-bold text-[13px] py-3 flex items-center justify-center cursor-pointer rounded"
 >
 + Add Item
 </div>
 <div 
 onClick={() => setShowBarcodeModal(true)}
 className="w-64 border-l border-surface-200 bg-surface-50 flex items-center justify-center cursor-pointer hover:bg-surface-100 transition-colors"
 >
 <div className="flex items-center gap-2 font-bold text-[14px] text-surface-800">
 <HiOutlineQrcode className="w-6 h-6 text-surface-600" /> Scan Barcode
 </div>
 </div>
 </div>
 </div>

 {/* â”€â”€ Bottom Section: Notes & Calculations â”€â”€ */}
 <div className="flex flex-col lg:flex-row gap-8">
 
 {/* Left: Notes & Terms */}
 <div className="flex-1 space-y-4">
 <div className="text-blue-600 font-medium text-[13px] cursor-pointer hover:underline">+ Add Notes</div>
 
 <div className="relative">
 <div className="flex items-center justify-between mb-1">
 <label className="text-[12px] font-bold text-surface-700">Terms and Conditions</label>
 <HiOutlineX className="w-3 h-3 text-surface-400 cursor-pointer" />
 </div>
 <textarea 
 value={terms}
 onChange={e => setTerms(e.target.value)}
 className="w-full h-20 bg-surface-100 border-none rounded p-3 text-[12px] text-surface-700 resize-none focus:ring-1 focus:ring-surface-300 outline-none"
 />
 </div>
 
 <div className="text-blue-600 font-medium text-[13px] cursor-pointer hover:underline">+ Add Bank Account</div>
 <div className="text-blue-600 font-medium text-[13px] cursor-pointer hover:underline">+ Add Payment QR</div>
 </div>

 {/* Right: Calculations */}
 <div className="w-full lg:w-[400px] border border-surface-200 rounded p-0 text-[13px]">
 
 <div className="p-4 space-y-3">
 <div className="flex justify-between items-center font-bold text-surface-800">
 <span>SUBTOTAL</span>
 <span>₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
 </div>
 
 <div className="flex justify-between items-center text-blue-600 font-medium cursor-pointer">
 <span>+ Add Additional Charges</span>
 <input 
 type="number" value={additionalCharges || ''} onChange={e => setAdditionalCharges(e.target.value)} 
 className="w-24 text-right border-b border-blue-300 outline-none bg-transparent text-surface-800" placeholder="0"
 />
 </div>

 <div className="flex justify-between items-center font-bold text-surface-700">
 <span>Taxable Amount</span>
 <span>₹ {taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
 </div>

 <div className="flex justify-between items-center text-blue-600 font-medium cursor-pointer">
 <span>+ Add Discount</span>
 <input 
 type="number" value={overallDiscount || ''} onChange={e => setOverallDiscount(e.target.value)} 
 className="w-24 text-right border-b border-blue-300 outline-none bg-transparent text-surface-800" placeholder="0"
 />
 </div>

 <div className="flex justify-between items-center">
 <label className="flex items-center gap-2 cursor-pointer select-none text-surface-700">
 <input type="checkbox" checked={autoRoundOff} onChange={e => setAutoRoundOff(e.target.checked)} className="rounded text-blue-600" />
 Auto Round Off
 </label>
 <span className="text-surface-700">{autoRoundOff ? `₹ ${roundOffAmt.toFixed(2)}` : '0'}</span>
 </div>
 </div>

 {/* Total Box */}
 <div className="bg-surface-100 p-4 border-y border-surface-200">
 <div className="flex justify-between items-center">
 <span className="font-bold text-[16px] text-surface-900">Total Amount</span>
 <span className="font-black text-[22px] text-surface-900">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
 </div>
 </div>

 {/* Payment Reception */}
 <div className="p-4 space-y-4">
 <div className="flex justify-end">
 <label className="flex items-center gap-2 text-[12px] text-surface-600 cursor-pointer">
 Mark as fully paid
 <input type="checkbox" checked={isFullyPaid} onChange={e => setIsFullyPaid(e.target.checked)} className="rounded" />
 </label>
 </div>

 <div className="flex justify-between items-center">
 <span className="font-bold text-surface-700">Amount Received</span>
 <div className="flex border border-surface-300 rounded overflow-hidden w-40">
 <span className="bg-surface-100 px-2 py-1.5 text-surface-500">₹</span>
 <input 
 type="number" 
 value={amountReceived} 
 onChange={e => { setAmountReceived(e.target.value); setIsFullyPaid(false); }}
 className="w-full text-right px-2 py-1.5 outline-none font-bold"
 />
 </div>
 </div>

 <div className="flex justify-between items-center pt-2 text-[15px]">
 <span className="font-bold text-surface-500">Balance Amount</span>
 <span className={`font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
 ₹ {balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
 </span>
 </div>
 </div>

 </div>
 </div>

 </div>

 {/* Quick Party Create Modal */}
 {showQuickPartyModal && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-fade-in">
 <div className="bg-white rounded-xl shadow-xl w-[400px] overflow-hidden">
 <div className="px-6 py-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
 <h2 className="font-bold text-surface-800">Quick Create Party</h2>
 <button onClick={() => setShowQuickPartyModal(false)} className="text-surface-400 hover:text-surface-600">
 <HiOutlineX className="w-5 h-5" />
 </button>
 </div>
 <div className="p-6 space-y-4">
 <div>
 <label className="block text-[13px] font-bold text-surface-700 mb-1">Party Name <span className="text-red-500">*</span></label>
 <input 
 autoFocus
 type="text" 
 value={newPartyName} 
 onChange={e => setNewPartyName(e.target.value)}
 className="w-full px-3 py-2 border border-surface-200 rounded focus:border-blue-500 outline-none"
 />
 </div>
 <div>
 <label className="block text-[13px] font-bold text-surface-700 mb-1">Mobile</label>
 <input 
 type="text" 
 value={newPartyMobile} 
 onChange={e => setNewPartyMobile(e.target.value)}
 className="w-full px-3 py-2 border border-surface-200 rounded focus:border-blue-500 outline-none"
 />
 </div>
 <div>
 <label className="block text-[13px] font-bold text-surface-700 mb-1">Party Type</label>
 <select 
 value={newPartyType} 
 onChange={e => setNewPartyType(e.target.value)}
 className="w-full px-3 py-2 border border-surface-200 rounded focus:border-blue-500 outline-none bg-white"
 >
 <option value="customer">Customer</option>
 <option value="supplier">Supplier</option>
 <option value="both">Both</option>
 </select>
 </div>
 <div className="pt-4 flex justify-end gap-2">
 <button onClick={() => setShowQuickPartyModal(false)} className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 hover:bg-surface-200 rounded">Cancel</button>
 <button onClick={handleCreateParty} disabled={savingParty} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50">
 {savingParty ? 'Saving...' : 'Save Party'}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Manual Barcode Modal */}
 {showBarcodeModal && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-fade-in">
 <div className="bg-white rounded-xl shadow-xl w-[400px] overflow-hidden">
 <div className="px-6 py-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
 <h2 className="font-bold text-surface-800">Scan / Enter Barcode</h2>
 <button onClick={() => setShowBarcodeModal(false)} className="text-surface-400 hover:text-surface-600">
 <HiOutlineX className="w-5 h-5" />
 </button>
 </div>
 <div className="p-6">
 <p className="text-sm text-surface-500 mb-4">Focus this input and scan, or type manually and press Enter.</p>
 <input 
 autoFocus
 type="text" 
 value={manualBarcode} 
 onChange={e => setManualBarcode(e.target.value)}
 onKeyDown={e => {
 if (e.key === 'Enter') handleBarcodeScanned(manualBarcode);
 }}
 className="w-full px-3 py-3 border border-surface-200 rounded focus:border-blue-500 outline-none text-lg text-center tracking-widest font-mono"
 placeholder="|| |||| | ||"
 />
 <button 
 onClick={() => handleBarcodeScanned(manualBarcode)}
 className="mt-4 w-full py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
 >
 Submit
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
