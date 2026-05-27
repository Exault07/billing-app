import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineSave,
  HiOutlineSearch,
  HiOutlineDocumentText,
} from 'react-icons/hi';

// â”€â”€â”€ Empty line-item template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const emptyItem = () => ({
  product_id: '',
  name: '',
  category: '',
  unit: '',
  qty: 1,
  free_qty: 0,
  price: 0, // purchase rate
  total: 0,
});

export default function PurchaseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = Boolean(id);

  // â”€â”€ Form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [billNo, setBillNo] = useState(''); // Supplier Invoice No
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [ewayBillNumber, setEwayBillNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  
  const [items, setItems] = useState([emptyItem()]);
  
  const [discount, setDiscount] = useState(0);
  const [labourCharges, setLabourCharges] = useState(0);
  const [transportCharges, setTransportCharges] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [paymentInDiscount, setPaymentInDiscount] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0); // amount paid to supplier
  
  const [paymentMode, setPaymentMode] = useState('cash');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('draft');

  // â”€â”€ Data lists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState({});

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  // â”€â”€ Derived totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const subtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const grandTotal = subtotal - Number(discount) + Number(labourCharges) + Number(transportCharges) + Number(roundOff);
  const balanceDue = grandTotal - Number(advancePaid) - Number(paymentInDiscount);

  // â”€â”€ Load data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: supData }, { data: prodData }] = await Promise.all([
          supabase.from('parties').select('id, name, phone:mobile, balance:current_balance').in('party_type', ['supplier', 'both']).order('name'),
          supabase.from('products').select('id, name, category, unit, selling_price, stock_qty').order('name'),
        ]);
        setSuppliers(supData || []);
        setProducts(prodData || []);
      } catch (err) {
        setError('Failed to load data. ' + err.message);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // â”€â”€ Load existing bill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!isEditing) return;
    const fetchBill = async () => {
      setLoadingData(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('purchase_invoices')
          .select('*')
          .eq('id', id)
          .single();
        if (fetchError) throw fetchError;
        setBillNo(data.bill_no);
        setDate(data.date);
        setDueDate(data.due_date || '');
        setSupplierId(data.supplier_id || '');
        setPoNumber(data.po_number || '');
        setEwayBillNumber(data.eway_bill_number || '');
        setVehicleNumber(data.vehicle_number || '');
        
        setItems(data.items?.length ? data.items : [emptyItem()]);
        
        setDiscount(data.discount || 0);
        setLabourCharges(data.labour_charges || 0);
        setTransportCharges(data.transport_charges || 0);
        setRoundOff(data.round_off || 0);
        setPaymentInDiscount(data.payment_in_discount || 0);
        setAdvancePaid(data.advance_paid || 0);
        
        setPaymentMode(data.payment_mode || 'cash');
        setNotes(data.notes || '');
        setStatus(data.status || 'draft');
      } catch (err) {
        setError('Failed to load purchase invoice: ' + err.message);
      } finally {
        setLoadingData(false);
      }
    };
    fetchBill();
  }, [isEditing, id]);

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (index) => setItems(prev => prev.length === 1 ? [emptyItem()] : prev.filter((_, i) => i !== index));

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
      updated[index] = {
        ...updated[index],
        product_id: product.id,
        name: product.name,
        category: product.category || '',
        unit: product.unit || '',
        price: 0, // usually purchase rate needs to be entered manually
        total: 0,
      };
      return updated;
    });
    setProductSearch(prev => ({ ...prev, [index]: '' }));
  };

  const handleSave = async (saveStatus = status) => {
    setError('');
    if (!billNo.trim()) { setError('Please enter the Supplier Invoice Number.'); return; }
    if (!supplierId) { setError('Please select a supplier.'); return; }
    if (items.every(i => !i.product_id)) { setError('Please add at least one product.'); return; }

    setSaving(true);
    try {
      const payload = {
        bill_no: billNo, // usually Supplier's Invoice Number
        date,
        due_date: dueDate || null,
        supplier_id: supplierId,
        po_number: poNumber,
        eway_bill_number: ewayBillNumber,
        vehicle_number: vehicleNumber,
        items: items.filter(i => i.product_id),
        subtotal,
        discount: Number(discount),
        labour_charges: Number(labourCharges),
        transport_charges: Number(transportCharges),
        round_off: Number(roundOff),
        payment_in_discount: Number(paymentInDiscount),
        advance_paid: Number(advancePaid),
        balance_due: balanceDue,
        payment_mode: paymentMode,
        notes,
        status: saveStatus,
        created_by: user?.id,
      };

      if (isEditing) {
        const { error: updateErr } = await supabase.from('purchase_invoices').update(payload).eq('id', id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from('purchase_invoices').insert(payload);
        if (insertErr) throw insertErr;
      }

      // If saving as 'final', update product stock quantities
      if (saveStatus === 'final') {
        const validItems = items.filter(i => i.product_id && i.qty);
        for (const item of validItems) {
          // Get current stock
          const { data: prod } = await supabase.from('products').select('stock_qty').eq('id', item.product_id).single();
          if (prod) {
            const newStock = Number(prod.stock_qty || 0) + Number(item.qty);
            await supabase.from('products').update({ stock_qty: newStock }).eq('id', item.product_id);
          }
        }
      }

      navigate(`/purchases`);
    } catch (err) {
      setError('Failed to save purchase: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  return (
    <div className="max-w-6xl mx-auto pb-16">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <HiOutlineDocumentText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-800">
              {isEditing ? `Edit Purchase â€” ${billNo}` : 'Record Purchase Invoice'}
            </h1>
            <p className="text-xs text-surface-400">Stock will be automatically added upon saving as 'final'.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleSave('draft')} disabled={saving} className="px-4 py-2 text-sm rounded-xl border border-surface-300 text-surface-700 hover:bg-surface-50 transition-colors">
            Save as Draft
          </button>
          <button onClick={() => handleSave('final')} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <HiOutlineSave className="w-4 h-4" />
            {saving ? 'Processing...' : 'Finalise Purchase (Add Stock)'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">âš  {error}</div>}

      <div className="bg-white rounded-2xl border border-surface-200 p-6 mb-4 shadow-sm">
        <h2 className="text-sm font-semibold text-surface-600 mb-4 uppercase tracking-wide">Supplier Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Supplier Invoice Number *</label>
            <input value={billNo} onChange={e => setBillNo(e.target.value)} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Invoice Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Supplier *</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">â€” Select Supplier â€”</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.phone ? `(${s.phone})` : ''}</option>)}
            </select>
            {selectedSupplier && <p className={`text-xs mt-1 font-medium ${Number(selectedSupplier.balance) < 0 ? 'text-red-500' : 'text-green-600'}`}>Current Balance: ₹{selectedSupplier.balance}</p>}
          </div>
        </div>
      </div>

      {/* Items Table - Similar to Sales, but with Purchase Rate */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide">Purchase Items</h2>
          <button onClick={addItem} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"><HiOutlinePlus className="w-4 h-4" /> Add Item</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 text-[11px] text-surface-500 uppercase tracking-wide">
                <th className="text-left pb-3 pr-2 w-[35%]">Product</th>
                <th className="text-left pb-3 pr-2 w-16">Unit</th>
                <th className="text-right pb-3 pr-2 w-20">Qty</th>
                <th className="text-right pb-3 pr-2 w-24">Purch. Rate (₹)</th>
                <th className="text-right pb-3 pr-2 w-24">Total (₹)</th>
                <th className="pb-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {items.map((item, index) => {
                const search = productSearch[index] || '';
                const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
                return (
                  <tr key={index}>
                    <td className="py-2 pr-2 relative">
                      {item.product_id ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-surface-800">{item.name}</span>
                          <button onClick={() => updateItem(index, 'product_id', '')} className="text-xs text-surface-400 hover:text-red-500">âœ•</button>
                        </div>
                      ) : (
                        <div className="relative">
                          <HiOutlineSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
                          <input placeholder="Search..." value={search} onChange={e => setProductSearch(prev => ({ ...prev, [index]: e.target.value }))} className="w-full pl-8 pr-2 py-1.5 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                          {search && filtered.length > 0 && (
                            <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                              {filtered.map(p => <li key={p.id} onClick={() => selectProduct(index, p)} className="px-3 py-2 hover:bg-surface-50 cursor-pointer text-sm">{p.name}</li>)}
                            </ul>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-2"><span className="text-surface-500 text-xs">{item.unit}</span></td>
                    <td className="py-2 pr-2"><input type="number" min="0" step="0.01" value={item.qty} onChange={e => updateItem(index, 'qty', e.target.value)} className="w-full text-right border border-surface-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500" /></td>
                    <td className="py-2 pr-2"><input type="number" min="0" step="0.01" value={item.price} onChange={e => updateItem(index, 'price', e.target.value)} className="w-full text-right border border-surface-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500" /></td>
                    <td className="py-2 pr-2 text-right font-semibold text-surface-800">₹{Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 text-center"><button onClick={() => removeItem(index)} className="text-surface-400 hover:text-red-500 p-1"><HiOutlineTrash className="w-4 h-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Adjusments */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide mb-4">Calculations</h2>
          <div className="space-y-3">
            {[
              { label: 'Discount Received (₹)', value: discount, setter: setDiscount },
              { label: 'Labour / Service Charges (₹)', value: labourCharges, setter: setLabourCharges },
              { label: 'Transport / Shipping (₹)', value: transportCharges, setter: setTransportCharges },
              { label: 'Round Off (Â±₹)', value: roundOff, setter: setRoundOff },
              { label: 'Amount Paid to Supplier (₹)', value: advancePaid, setter: setAdvancePaid },
            ].map(({ label, value, setter }) => (
              <div key={label} className="flex items-center gap-3">
                <label className="flex-1 text-sm text-surface-600">{label}</label>
                <input type="number" step="0.01" value={value} onChange={e => setter(e.target.value)} className="w-32 text-right border border-surface-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-surface-200">
            <label className="block text-xs font-medium text-surface-600 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 flex flex-col justify-between shadow-sm">
          <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide mb-4">Total Amount</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-surface-600"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between font-bold text-lg text-surface-900 border-t border-surface-200 pt-3"><span>Total Invoice Amount</span><span>₹{grandTotal.toLocaleString('en-IN')}</span></div>
            <div className={`flex justify-between font-bold text-xl border-t border-surface-200 pt-3 ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}><span>Balance Due to Supplier</span><span>₹{balanceDue.toLocaleString('en-IN')}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
