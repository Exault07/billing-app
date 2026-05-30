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
async function generateQuotationNo() {
 const today = new Date();
 const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
 const { count } = await supabase
 .from('quotations')
 .select('id', { count: 'exact', head: true });
 const seq = String((count || 0) + 1).padStart(3, '0');
 return `QUOT-${dateStr}-${seq}`;
}

// â”€â”€â”€ Empty line-item template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const emptyItem = () => ({
  product_id: '',
  name: '',
  hsn: '',
  qty: 1,
  price: 0,
  discount: 0,
  discount_type: '₹',
  tax: 0,
  total: 0,
});

export default function QuotationForm() {
 const { id } = useParams();
 const navigate = useNavigate();
  const location = useLocation();
 const { user } = useAuth();
 const isEditing = Boolean(id);
 

 // â”€â”€ Form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 const [billNo, setBillNo] = useState('');
 const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
 const [paymentTerms, setPaymentTerms] = useState('30');
 const [dueDate, setDueDate] = useState('');
 const [customerId, setCustomerId] = useState('');
 
 const [items, setItems] = useState([emptyItem()]);
 
 const [notes, setNotes] = useState('');
 const [terms, setTerms] = useState('1. GST will be charged additionally as applicable.');
 
 const [additionalCharges, setAdditionalCharges] = useState(0);
 const [overallDiscount, setOverallDiscount] = useState(0);
 const [autoRoundOff, setAutoRoundOff] = useState(false);
 const [amountReceived, setAmountReceived] = useState(0);
 const [isFullyPaid, setIsFullyPaid] = useState(false);

 const [showNotes, setShowNotes] = useState(false);
 const [showTerms, setShowTerms] = useState(true);
 const [showBankAccount, setShowBankAccount] = useState(false);
 const [showPaymentQr, setShowPaymentQr] = useState(false);
 const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);
 const [showOverallDiscount, setShowOverallDiscount] = useState(false);
 const [showItemModal, setShowItemModal] = useState(false);

 // â”€â”€ Data lists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 const [customers, setCustomers] = useState([]);
 const [products, setProducts] = useState([]);

 // â”€â”€ UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 const [saving, setSaving] = useState(false);
 const [loadingData, setLoadingData] = useState(true);
 const [error, setError] = useState('');
 
 // Custom dropdown states
   const [productSearch, setProductSearch] = useState({});

 // Quick Create / Barcode state
       
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


 // ——— Load customers and products —————————————————————————————————————
 useEffect(() => {
 const fetchData = async () => {
 try {
   const { data: customersData } = await supabase.from('parties').select('*').order('name');
   setCustomers(customersData || []);
   
   const { data: productsData } = await supabase.from('products').select('*').order('name');
   setProducts(productsData || []);

 if (!isEditing) {
 const bn = await generateQuotationNo();
 setBillNo(bn.replace('QUOT-', '')); // UI shows without prefix
 }
 } catch (err) {
 setError('Failed to load data. ' + err.message);
 } finally {
 setLoadingData(false);
 }
 };
 fetchData();
 }, [isEditing]);

 // ——— Load existing bill when editing —————————————————————————————————
 useEffect(() => {
 if (!isEditing) return;
 const fetchBill = async () => {
 setLoadingData(true);
 try {
 const { data, error: fetchError } = await supabase.from('quotations').select('*').eq('id', id).single();
 if (fetchError) throw fetchError;
 
 setBillNo(data.bill_no.replace('QUOT-', ''));
 setDate(data.date);
 setDueDate(data.due_date || '');
 setCustomerId(data.customer_id || '');
 
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
         const { data, error } = await supabase.from('quotations').select('*').eq('id', location.state.duplicateFrom).single();
         if (error) throw error;
         
         setCustomerId(data.customer_id || '');
         
         const loadedItems = (data.items || []).map(i => ({
           product_id: i.product_id,
           name: i.name,
           hsn: i.hsn || '',
           qty: i.qty,
           price: i.price,
           discount: i.discount || 0,
           discount_type: i.discount_type || '₹',
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
 if (['qty', 'price', 'discount', 'discount_type', 'tax'].includes(field)) {
   const q = Number(updated[index].qty || 0);
   const p = Number(updated[index].price || 0);
   
   let dAmt = 0;
   if (updated[index].discount_type === '%') {
     dAmt = (q * p) * (Number(updated[index].discount || 0) / 100);
   } else {
     dAmt = Number(updated[index].discount || 0);
   }
   
   const base = (q * p) - dAmt;
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

 // ——— Save handler —————————————————————————————————————————————————————————————————————
   const handleSave = async (e) => {
    e?.preventDefault();
    setError('');
    if (!customerId) return setError('Please select a Party.');
    const validItems = items.filter(i => i.product_id);
    if (validItems.length === 0) return setError('Please add at least one item.');

    setSaving(true);
    try {
      const payload = {
        bill_no: `QUOT-${billNo}`,
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
        notes: `${showNotes ? notes : ''}\n\nTerms:\n${showTerms ? terms : ''}`,
        status: 'draft',
        
        created_by: user?.id,
      };

      if (isEditing) {
 // Fetch old bill to adjust balance difference
 const { data: oldBill } = await supabase.from('quotations').select('balance_due').eq('id', id).single();
 const oldBalance = Number(oldBill?.balance_due || 0);
 const diff = balanceDue - oldBalance;
 
 const { error: updateErr } = await supabase.from('quotations').update(payload).eq('id', id);
 if (updateErr) throw updateErr;

 if (diff !== 0) {
 const { data: pData } = await supabase.from('parties').select('current_balance').eq('id', customerId).single();
 if (pData) {
 await supabase.from('parties').update({ current_balance: Number(pData.current_balance || 0) + diff }).eq('id', customerId);
 }
 }
 } else {
 const { error: insertErr } = await supabase.from('quotations').insert(payload);
 if (insertErr) throw insertErr;

 if (balanceDue > 0) {
 const { data: pData } = await supabase.from('parties').select('current_balance').eq('id', customerId).single();
 if (pData) {
 await supabase.from('parties').update({ current_balance: Number(pData.current_balance || 0) + balanceDue }).eq('id', customerId);
 }
 }
 }
 navigate('/billing/quotations');
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
 
 {/* ——— Header ——— */}
 <div className="flex items-center justify-between px-6 py-3 border-b border-surface-200">
 <div className="flex items-center gap-4">
 <button onClick={() => navigate(-1)} className="text-surface-600 hover:text-surface-900">
 <HiOutlineArrowLeft className="w-5 h-5" />
 </button>
 <h1 className="text-[18px] font-bold text-surface-800">
 {isEditing ? `Edit Quotation` : `Create Quotation`}
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
 {/* ——— Top Section: Party & Meta ——— */}
 <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-8">
 
 {/* Bill To Box */}
 <div className="w-full lg:w-96 flex-shrink-0">
        <PartySelect 
          label="Bill To" 
          partyType="both"
          parties={customers} 
          selectedParty={customers.find(c => c.id === customerId)}
          onSelect={(party) => setCustomerId(party.id)}
          onClear={() => setCustomerId('')}
          onPartyCreated={async () => {
            const { data } = await supabase.from('parties').select('*').order('name');
            setCustomers(data || []);
          }}
        />
 </div>

 {/* Right Meta Grid */}
 <div className="w-full lg:w-auto">
 <div className="flex gap-4 mb-4">
 <div>
 <label className="block text-[11px] font-medium text-surface-500 mb-1">Quotation No:</label>
 <input 
 value={billNo} onChange={e => setBillNo(e.target.value)}
 className="w-32 px-3 py-1.5 border border-surface-200 rounded text-[13px] bg-surface-50"
 />
 </div>
 <div>
 <label className="block text-[11px] font-medium text-surface-500 mb-1">'Quotation' Date:</label>
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
 <th className="py-2.5 px-3 w-32 text-right">DISCOUNT</th>
 <th className="py-2.5 px-3 w-24 text-right">TAX</th>
 <th className="py-2.5 px-3 w-28 text-right">AMOUNT (₹)</th>
 <th className="py-2.5 px-3 w-12 text-center"></th>
 </tr>
 </thead>
 <tbody className="text-[13px]">
 {items.map((item, idx) => (
 <tr key={idx} className="border-b border-surface-100 group">
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
 {products.filter(p => p.name.toLowerCase().includes(productSearch[idx].toLowerCase())).map(p => (
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
 <td className="py-2 px-3">
   <div className="flex items-center justify-end bg-white border border-surface-200 rounded px-2">
     <input type="number" value={item.discount || ''} onChange={e => updateItem(idx, 'discount', e.target.value)} className="w-16 bg-transparent outline-none text-right py-1.5" placeholder="0" />
     <select
       value={item.discount_type || '₹'}
       onChange={e => updateItem(idx, 'discount_type', e.target.value)}
       className="bg-transparent text-surface-500 outline-none ml-1 text-[11px] font-bold cursor-pointer"
     >
       <option value="₹">₹</option>
       <option value="%">%</option>
     </select>
   </div>
 </td>
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
  onClick={() => setShowItemModal(true)}
  className="flex-1 m-2 border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-600 font-bold text-[13px] py-3 flex items-center justify-center cursor-pointer rounded"
  >
  + Add Item
  </div>

 </div>
 </div>

 {/* â”€â”€ Bottom Section: Notes & Calculations â”€â”€ */}
 <div className="flex flex-col lg:flex-row gap-8">
 
 {/* Left: Notes & Terms */}
 <div className="flex-1 space-y-4">
   {!showNotes ? (
     <div onClick={() => setShowNotes(true)} className="text-blue-600 font-medium text-[13px] cursor-pointer hover:underline inline-block">+ Add Notes</div>
   ) : (
     <div className="relative">
       <div className="flex items-center justify-between mb-1">
         <label className="text-[12px] font-bold text-surface-700">Notes</label>
         <HiOutlineX className="w-3 h-3 text-surface-400 cursor-pointer" onClick={() => setShowNotes(false)} />
       </div>
       <textarea 
         value={notes}
         onChange={e => setNotes(e.target.value)}
         className="w-full h-20 bg-surface-50 border border-surface-200 rounded p-3 text-[12px] text-surface-600 resize-none outline-none focus:ring-1 focus:ring-surface-300"
       />
     </div>
   )}
   
   {!showTerms ? (
     <div onClick={() => setShowTerms(true)} className="text-blue-600 font-medium text-[13px] cursor-pointer hover:underline inline-block">+ Add Terms</div>
   ) : (
     <div className="relative">
       <div className="flex items-center justify-between mb-1">
         <label className="text-[12px] font-bold text-surface-700">Terms and Conditions</label>
         <HiOutlineX className="w-3 h-3 text-surface-400 cursor-pointer" onClick={() => setShowTerms(false)} />
       </div>
       <textarea 
         value={terms}
         onChange={e => setTerms(e.target.value)}
         className="w-full h-20 bg-surface-50 border border-surface-200 rounded p-3 text-[12px] text-surface-600 resize-none outline-none focus:ring-1 focus:ring-surface-300"
       />
     </div>
   )}

   {!showBankAccount ? (
     <div onClick={() => setShowBankAccount(true)} className="text-blue-600 font-medium text-[13px] cursor-pointer hover:underline block">+ Add Bank Account</div>
   ) : (
     <div className="bg-white border border-surface-200 rounded p-4 relative group">
       <button onClick={() => setShowBankAccount(false)} className="absolute top-2 right-2 text-surface-400 hover:text-red-500 hidden group-hover:block"><HiOutlineX className="w-4 h-4" /></button>
       <div className="text-[11px] font-bold text-surface-500 mb-2 uppercase tracking-wide">Bank Details</div>
       <div className="text-surface-500 text-[12px]">Bank will be printed. Configure in Settings.</div>
     </div>
   )}

   {!showPaymentQr ? (
     <div onClick={() => setShowPaymentQr(true)} className="text-blue-600 font-medium text-[13px] cursor-pointer hover:underline block">+ Add Payment QR</div>
   ) : (
     <div className="bg-white border border-surface-200 rounded p-4 relative group w-max">
       <button onClick={() => setShowPaymentQr(false)} className="absolute top-2 right-2 text-surface-400 hover:text-red-500 hidden group-hover:block"><HiOutlineX className="w-4 h-4" /></button>
       <div className="text-[11px] font-bold text-surface-500 mb-2 uppercase tracking-wide text-center">Scan to Pay</div>
       <div className="text-surface-500 text-[12px]">QR will be printed. Configure in Settings.</div>
     </div>
   )}
 </div>

 {/* Right: Calculations */}
 <div className="w-full lg:w-[400px] border border-surface-200 rounded p-0 text-[13px]">
 
 <div className="p-4 space-y-3">
 <div className="flex justify-between items-center font-bold text-surface-800">
 <span>SUBTOTAL</span>
 <span>₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
 </div>
 
 {!showAdditionalCharges ? (
   <div onClick={() => setShowAdditionalCharges(true)} className="flex justify-between items-center text-blue-600 font-medium cursor-pointer hover:underline">
     <span>+ Add Additional Charges</span>
   </div>
 ) : (
   <div className="flex justify-between items-center text-blue-600 font-medium relative group">
     <span className="flex items-center gap-1">Additional Charges <HiOutlineX className="w-3 h-3 text-surface-400 cursor-pointer hidden group-hover:block" onClick={() => { setShowAdditionalCharges(false); setAdditionalCharges(0); }} /></span>
     <input 
     type="number" value={additionalCharges || ''} onChange={e => setAdditionalCharges(e.target.value)} 
     className="w-24 text-right border-b border-blue-300 outline-none bg-transparent text-surface-800" placeholder="0"
     />
   </div>
 )}

 <div className="flex justify-between items-center font-bold text-surface-700">
 <span>Taxable Amount</span>
 <span>₹ {taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
 </div>

 {!showOverallDiscount ? (
   <div onClick={() => setShowOverallDiscount(true)} className="flex justify-between items-center text-blue-600 font-medium cursor-pointer hover:underline">
     <span>+ Add Discount</span>
   </div>
 ) : (
   <div className="flex justify-between items-center text-blue-600 font-medium relative group">
     <span className="flex items-center gap-1">Discount <HiOutlineX className="w-3 h-3 text-surface-400 cursor-pointer hidden group-hover:block" onClick={() => { setShowOverallDiscount(false); setOverallDiscount(0); }} /></span>
     <input 
     type="number" value={overallDiscount || ''} onChange={e => setOverallDiscount(e.target.value)} 
     className="w-24 text-right border-b border-blue-300 outline-none bg-transparent text-surface-800" placeholder="0"
     />
   </div>
 )}

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

  {/* Payment Reception (Removed for Quotations) */}

 </div>
 </div>

 </div>



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
      {showItemModal && (
        <AddItemsModal
          products={products}
          onAdd={(product, qty) => {
            const q = Number(qty || 1);
            const p = Number(product.selling_price || 0);
            setItems(prev => {
              const existing = prev.findIndex(i => i.product_id === product.id);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = {
                  ...updated[existing],
                  qty: Number(updated[existing].qty) + q,
                  total: (Number(updated[existing].qty) + q) * updated[existing].price,
                };
                return updated;
              }
              return [...prev, {
                product_id: product.id,
                name: product.name,
                hsn: product.hsn || '',
                unit: product.unit || 'PCS',
                qty: q, price: p, discount: 0, discount_type: '₹', tax: 0,
                total: q * p,
              }];
            });
          }}
          onClose={() => setShowItemModal(false)}
          customerId={customerId}
          onProductCreated={async () => {
            const { data } = await supabase.from('products').select('*').order('name');
            setProducts(data || []);
          }}
        />
      )}
 </div>
 );
}
