import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineArrowLeft,
  HiOutlineCog,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineTrash,
} from 'react-icons/hi';

const emptyItem = () => ({
  product_id: '',
  name: '',
  unit: '',
  qty: 1,
  price: 0, 
  discount: 0,
  tax: 0,
  total: 0,
});

export default function PurchaseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = Boolean(id);

  // Form State
  const [billNo, setBillNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  
  const [notes, setNotes] = useState('');
  const [labourCharges, setLabourCharges] = useState(0);
  const [transportCharges, setTransportCharges] = useState(0);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [autoRoundOff, setAutoRoundOff] = useState(false);
  const [amountPaid, setAmountPaid] = useState(0);
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  
  const [status, setStatus] = useState('draft');

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  // Dropdowns
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [partySearch, setPartySearch] = useState('');
  const [productSearch, setProductSearch] = useState({});

  // Computed totals
  const subtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const additionalCharges = Number(labourCharges) + Number(transportCharges);
  const taxableAmount = subtotal + additionalCharges;
  const grandTotalRaw = taxableAmount - Number(overallDiscount);
  const roundOffAmt = autoRoundOff ? Math.round(grandTotalRaw) - grandTotalRaw : 0;
  const grandTotal = grandTotalRaw + roundOffAmt;
  const effectivePaid = isFullyPaid ? grandTotal : Number(amountPaid);
  const balanceDue = grandTotal - effectivePaid;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: supData }, { data: prodData }] = await Promise.all([
          supabase.from('parties').select('*').in('party_type', ['supplier', 'both']).order('name'),
          supabase.from('products').select('*').order('name'),
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
        
        setItems(data.items?.length ? data.items : [emptyItem()]);
        
        setOverallDiscount(data.discount || 0);
        setLabourCharges(data.labour_charges || 0);
        setTransportCharges(data.transport_charges || 0);
        setAutoRoundOff(Boolean(data.round_off));
        setAmountPaid(data.advance_paid || 0);
        setIsFullyPaid(Number(data.balance_due) <= 0 && Number(data.grand_total) > 0);
        
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

  const addItemRow = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems(prev => prev.length === 1 ? [emptyItem()] : prev.filter((_, i) => i !== idx));

  const updateItem = useCallback((idx, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      
      const q = Number(updated[idx].qty || 0);
      const p = Number(updated[idx].price || 0);
      const d = Number(updated[idx].discount || 0);
      const base = (q * p) - d;
      const taxAmt = base * (Number(updated[idx].tax || 0) / 100);
      updated[idx].total = base + taxAmt;
      
      return updated;
    });
  }, []);

  const selectProduct = (idx, product) => {
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        product_id: product.id,
        name: product.name,
        unit: product.unit || '',
        price: product.purchase_price || 0,
        total: Number(updated[idx].qty || 1) * Number(product.purchase_price || 0)
      };
      return updated;
    });
    setProductSearch(prev => ({ ...prev, [idx]: '' }));
  };

  const handleSave = async (saveStatus) => {
    setError('');
    if (!billNo.trim()) return setError('Please enter the Supplier Invoice Number.');
    if (!supplierId) return setError('Please select a supplier.');
    if (items.every(i => !i.product_id)) return setError('Please add at least one product.');

    setSaving(true);
    try {
      const payload = {
        bill_no: billNo,
        date,
        due_date: dueDate || null,
        supplier_id: supplierId,
        items: items.filter(i => i.product_id),
        subtotal,
        discount: Number(overallDiscount),
        labour_charges: Number(labourCharges),
        transport_charges: Number(transportCharges),
        round_off: roundOffAmt,
        advance_paid: effectivePaid,
        balance_due: balanceDue,
        grand_total: grandTotal,
        payment_mode: isFullyPaid ? 'Cash' : 'Mixed',
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

      // If saving as 'final' and not editing (or we can assume new inventory addition), 
      // Update product stock quantities
      if (saveStatus === 'final' && !isEditing) {
        const validItems = items.filter(i => i.product_id && i.qty);
        for (const item of validItems) {
          const { data: prod } = await supabase.from('products').select('stock_qty').eq('id', item.product_id).single();
          if (prod) {
            const newStock = Number(prod.stock_qty || 0) + Number(item.qty);
            await supabase.from('products').update({ stock_qty: newStock }).eq('id', item.product_id);
          }
        }
        
        // Update Party Balance
        if (balanceDue > 0) {
          const { data: partyData } = await supabase.from('parties').select('current_balance').eq('id', supplierId).single();
          if (partyData) {
            // Unpaid purchase means we owe the supplier more money (balance decreases negatively)
            await supabase.from('parties').update({ current_balance: Number(partyData.current_balance || 0) - balanceDue }).eq('id', supplierId);
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

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full max-w-[1400px] mx-auto px-4 pb-16 min-h-screen bg-surface-50">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/purchases')} className="p-2 text-surface-500 hover:bg-surface-100 hover:text-surface-800 rounded-full transition-colors">
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">{isEditing ? 'Edit Purchase Invoice' : 'Create Purchase Invoice'}</h1>
            <p className="text-sm text-surface-500 mt-1">Record purchases from your suppliers to add stock</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-surface-200 rounded-xl text-surface-600 bg-white hover:bg-surface-50 shadow-sm transition-colors">
            <HiOutlineCog className="w-5 h-5" /> Settings
          </button>
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold border border-surface-200 rounded-xl text-surface-600 bg-white hover:bg-surface-50 shadow-sm transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSave('final')}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Finalise (Add Stock)'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2 shadow-sm">
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6 md:p-8">
        
        {/* Top: Supplier + Meta */}
        <div className="flex flex-col lg:flex-row justify-between gap-8 mb-8">
          
          {/* Bill To */}
          <div className="w-full lg:w-[400px] relative">
            <label className="block text-sm font-bold text-surface-700 mb-2">Supplier</label>
            {!selectedSupplier ? (
              <div
                onClick={() => setShowPartyDropdown(true)}
                className="w-full h-28 border-2 border-dashed border-[#4f46e5]/40 bg-[#4f46e5]/5 rounded-xl flex items-center justify-center cursor-pointer hover:bg-[#4f46e5]/10 text-[#4f46e5] font-bold text-sm transition-colors"
              >
                + Add Supplier
              </div>
            ) : (
              <div className="w-full h-28 border border-surface-200 rounded-xl p-4 flex flex-col relative group">
                <div className="font-bold text-surface-900">{selectedSupplier.name}</div>
                {selectedSupplier.phone && <div className="text-sm text-surface-500 mt-1">{selectedSupplier.phone}</div>}
                <div className={`text-xs mt-auto font-medium ${Number(selectedSupplier.current_balance) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  Balance: ₹{selectedSupplier.current_balance || 0}
                </div>
                <button
                  onClick={() => { setSupplierId(''); setShowPartyDropdown(true); }}
                  className="absolute top-4 right-4 p-1.5 text-surface-400 hover:text-surface-800 bg-surface-100 hover:bg-surface-200 rounded opacity-0 group-hover:opacity-100 transition-all"
                >
                  Edit
                </button>
              </div>
            )}
            
            {showPartyDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 shadow-xl rounded-xl z-50 overflow-hidden">
                <div className="p-2 border-b border-surface-100 bg-surface-50">
                  <div className="relative">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search supplier..."
                      value={partySearch}
                      onChange={e => setPartySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg outline-none focus:border-[#4f46e5]"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {suppliers.filter(s => s.name.toLowerCase().includes(partySearch.toLowerCase())).map(s => (
                    <div
                      key={s.id}
                      onClick={() => { setSupplierId(s.id); setShowPartyDropdown(false); setPartySearch(''); }}
                      className="px-4 py-3 hover:bg-surface-50 cursor-pointer border-b border-surface-100 last:border-0"
                    >
                      <div className="font-bold text-surface-900 text-sm">{s.name}</div>
                      {s.phone && <div className="text-xs text-surface-500 mt-0.5">{s.phone}</div>}
                    </div>
                  ))}
                  {suppliers.length === 0 && <div className="p-4 text-center text-sm text-surface-500">No suppliers found</div>}
                </div>
              </div>
            )}
          </div>

          {/* Meta Fields */}
          <div className="flex gap-6 w-full lg:w-auto flex-wrap lg:flex-nowrap">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">Supplier Inv No. *</label>
                <input
                  type="text"
                  value={billNo}
                  onChange={e => setBillNo(e.target.value)}
                  className="w-36 px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm outline-none focus:border-[#4f46e5] font-semibold text-surface-900"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">Inv Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-36 px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm outline-none focus:border-[#4f46e5] font-medium text-surface-900"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-36 px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm outline-none focus:border-[#4f46e5] font-medium text-surface-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="flex bg-[#f8f9fa] border-y border-surface-200 text-[11px] font-bold text-surface-600 uppercase tracking-wider">
          <div className="w-12 py-3 text-center border-r border-surface-200">No</div>
          <div className="flex-1 py-3 px-4 border-r border-surface-200">Items / Services</div>
          <div className="w-24 py-3 px-3 border-r border-surface-200 text-right">Unit</div>
          <div className="w-24 py-3 px-3 border-r border-surface-200 text-right">Qty</div>
          <div className="w-32 py-3 px-3 border-r border-surface-200 text-right">Purch. Rate (₹)</div>
          <div className="w-24 py-3 px-3 border-r border-surface-200 text-right">Discount</div>
          <div className="w-24 py-3 px-3 border-r border-surface-200 text-right">Tax (%)</div>
          <div className="w-32 py-3 px-4 text-right">Amount (₹)</div>
          <div className="w-12 py-3"></div>
        </div>

        {/* Items */}
        <div className="min-h-[120px]">
          {items.map((item, idx) => {
            const search = productSearch[idx] !== undefined ? productSearch[idx] : (item.name || '');
            return (
              <div key={idx} className="flex border-b border-surface-200 group hover:bg-surface-50 transition-colors">
                <div className="w-12 py-3 text-center text-sm text-surface-500 flex items-center justify-center font-medium border-r border-surface-200">
                  {idx + 1}
                </div>
                
                <div className="flex-1 py-2 px-4 border-r border-surface-200 relative">
                  {item.product_id ? (
                    <div className="flex items-center justify-between h-full group/item">
                      <span className="font-semibold text-surface-900 text-sm">{item.name}</span>
                      <button onClick={() => updateItem(idx, 'product_id', '')} className="text-xs text-surface-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity">âœ•</button>
                    </div>
                  ) : (
                    <div className="relative h-full flex items-center">
                      <HiOutlineSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input
                        type="text"
                        placeholder="Search item..."
                        value={search}
                        onChange={e => setProductSearch(prev => ({ ...prev, [idx]: e.target.value }))}
                        className="w-full pl-8 py-1 text-sm bg-transparent outline-none font-medium text-surface-900"
                      />
                      {search && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-200 shadow-xl rounded-xl z-50 max-h-48 overflow-y-auto">
                          {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
                            <div
                              key={p.id}
                              onClick={() => selectProduct(idx, p)}
                              className="px-4 py-2 hover:bg-surface-50 cursor-pointer text-sm font-medium border-b border-surface-100 last:border-0"
                            >
                              {p.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="w-24 py-2 px-3 border-r border-surface-200 flex items-center">
                  <input type="text" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} className="w-full text-sm text-right bg-transparent outline-none" />
                </div>
                <div className="w-24 py-2 px-3 border-r border-surface-200 flex items-center">
                  <input type="number" min="1" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} className="w-full text-sm text-right bg-transparent outline-none font-bold" />
                </div>
                <div className="w-32 py-2 px-3 border-r border-surface-200 flex items-center">
                  <input type="number" value={item.price} onChange={e => updateItem(idx, 'price', e.target.value)} className="w-full text-sm text-right bg-transparent outline-none" />
                </div>
                <div className="w-24 py-2 px-3 border-r border-surface-200 flex items-center">
                  <input type="number" value={item.discount} onChange={e => updateItem(idx, 'discount', e.target.value)} className="w-full text-sm text-right bg-transparent outline-none" />
                </div>
                <div className="w-24 py-2 px-3 border-r border-surface-200 flex items-center">
                  <input type="number" value={item.tax} onChange={e => updateItem(idx, 'tax', e.target.value)} className="w-full text-sm text-right bg-transparent outline-none" />
                </div>
                <div className="w-32 py-3 px-4 text-right text-sm font-bold text-surface-900 flex items-center justify-end">
                  {Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="w-12 py-2 flex items-center justify-center">
                  <button onClick={() => removeItem(idx)} className="text-surface-300 hover:text-red-500 transition-colors">
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Item Row */}
          <div className="flex p-4 gap-4 bg-white border-b border-surface-200">
            <button
              onClick={addItemRow}
              className="flex-1 py-3 border-2 border-dashed border-[#4f46e5]/40 rounded-xl text-[#4f46e5] font-bold text-sm hover:bg-[#4f46e5]/5 transition-colors flex justify-center items-center gap-2"
            >
              <HiOutlinePlus className="w-4 h-4" /> Add Item
            </button>
            <button className="w-64 py-3 border border-surface-200 rounded-xl text-surface-700 font-bold text-sm hover:bg-surface-50 transition-colors flex justify-center items-center gap-2 shadow-sm">
              <HiOutlineSearch className="w-5 h-5" /> Scan Barcode
            </button>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col lg:flex-row mt-8 gap-8">
          <div className="flex-1 space-y-6">
            <div>
              <label className="text-sm font-bold text-[#4f46e5] flex items-center gap-1 cursor-pointer mb-2">
                <HiOutlinePlus className="w-4 h-4" /> Add Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Purchase notes or terms..."
                className="w-full border border-surface-200 rounded-xl px-4 py-3 text-sm focus:border-[#4f46e5] outline-none resize-none bg-surface-50"
                rows="3"
              ></textarea>
            </div>
          </div>

          <div className="w-full lg:w-[400px]">
            <div className="bg-[#f8f9fa] rounded-xl border border-surface-200 p-5 space-y-4">
              <div className="flex justify-between items-center text-sm font-bold text-surface-700">
                <span>Subtotal</span>
                <span>₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm text-[#4f46e5] font-medium">
                <div className="flex items-center gap-1 cursor-pointer"><HiOutlinePlus className="w-4 h-4" /> Transport Charges</div>
                <div className="flex items-center gap-1">
                  <span>₹</span>
                  <input type="number" value={transportCharges} onChange={e => setTransportCharges(e.target.value)} className="w-20 border-b border-surface-300 bg-transparent text-right outline-none text-surface-900 font-bold focus:border-[#4f46e5]" />
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-[#4f46e5] font-medium">
                <div className="flex items-center gap-1 cursor-pointer"><HiOutlinePlus className="w-4 h-4" /> Labour Charges</div>
                <div className="flex items-center gap-1">
                  <span>₹</span>
                  <input type="number" value={labourCharges} onChange={e => setLabourCharges(e.target.value)} className="w-20 border-b border-surface-300 bg-transparent text-right outline-none text-surface-900 font-bold focus:border-[#4f46e5]" />
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-[#4f46e5] font-medium">
                <div className="flex items-center gap-1 cursor-pointer"><HiOutlinePlus className="w-4 h-4" /> Discount Received</div>
                <div className="flex items-center gap-1">
                  <span>₹</span>
                  <input type="number" value={overallDiscount} onChange={e => setOverallDiscount(e.target.value)} className="w-20 border-b border-surface-300 bg-transparent text-right outline-none text-surface-900 font-bold focus:border-[#4f46e5]" />
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <label className="flex items-center gap-2 text-surface-700 cursor-pointer select-none">
                  <input type="checkbox" checked={autoRoundOff} onChange={e => setAutoRoundOff(e.target.checked)} className="rounded text-[#4f46e5] focus:ring-[#4f46e5]" />
                  Auto Round Off
                </label>
                <div className="text-surface-500 font-medium">{roundOffAmt > 0 ? '+' : ''}{roundOffAmt.toFixed(2)}</div>
              </div>

              <div className="pt-4 border-t border-surface-200 flex justify-between items-center">
                <span className="text-lg font-bold text-surface-900">Total Amount</span>
                <span className="text-2xl font-black text-[#4f46e5]">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="pt-4">
                <div className="flex justify-end mb-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-surface-600 cursor-pointer">
                    Mark as fully paid
                    <input type="checkbox" checked={isFullyPaid} onChange={e => setIsFullyPaid(e.target.checked)} className="rounded text-[#4f46e5] focus:ring-[#4f46e5]" />
                  </label>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-surface-700 mb-2">
                  <span>Amount Paid to Supplier</span>
                </div>
                <div className="flex bg-white border border-surface-200 rounded-xl overflow-hidden focus-within:border-[#4f46e5] transition-colors">
                  <span className="px-4 py-3 bg-surface-50 text-surface-500 font-bold border-r border-surface-200">₹</span>
                  <input
                    type="number"
                    disabled={isFullyPaid}
                    value={effectivePaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    className="w-full px-4 py-3 outline-none font-bold text-surface-900 disabled:bg-surface-50"
                  />
                  <select className="px-3 border-l border-surface-200 bg-surface-50 text-surface-700 outline-none font-semibold text-sm cursor-pointer">
                    <option>Cash</option>
                    <option>Bank</option>
                  </select>
                </div>
                
                {balanceDue > 0 && (
                  <div className="mt-3 flex justify-between text-sm font-bold text-red-600">
                    <span>Balance Due</span>
                    <span>₹ {balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
