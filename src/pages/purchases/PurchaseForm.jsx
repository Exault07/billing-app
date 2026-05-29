import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineArrowLeft,
  HiOutlineCog,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineX,
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
  const location = useLocation();
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

  const [showItemModal, setShowItemModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [colVisibility, setColVisibility] = useState({ qty: true, price: true, image: false, code: false });
  const [paymentTerms, setPaymentTerms] = useState('30');


  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  // Dropdowns
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const supplierDropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
        setShowPartyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
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
        const [partiesRes, productsRes] = await Promise.all([
          supabase.from('parties').select('id, name, current_balance, party_type').in('party_type', ['supplier', 'both']).order('name'),
          supabase.from('products').select('*, units(name)').order('name'),
        ]);
        setSuppliers(partiesRes.data || []);
        setProducts((productsRes.data || []).map(p => ({ ...p, unit: p.units?.name || '' })));
      } catch (err) {
        setError('Failed to load data. ' + err.message);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  
  useEffect(() => {
    if (location.state?.duplicateFrom) {
      const fetchDuplicate = async () => {
        setLoadingData(true);
        try {
          const { data, error } = await supabase.from('purchase_invoices').select('*').eq('id', location.state.duplicateFrom).single();
          if (error) throw error;
          
          setSupplierId(data.supplier_id);
          if (data.items) setItems(data.items);
          setSubtotal(data.subtotal || 0);
          setDiscount(data.discount || 0);
          setAdditionalCharges(data.additional_charges || 0);
          setGrandTotal(data.total_amount || 0);
          setNotes(data.notes || '');
          
          setDate(new Date().toISOString().split('T')[0]);
          // keep invoice_no empty so user can fill it
          setInvoiceNo('');
        } catch (err) {
          console.error('Error duplicating purchase bill', err);
        } finally {
          setLoadingData(false);
        }
      };
      fetchDuplicate();
    }
  }, [location.state?.duplicateFrom]);

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

  
  const handleAddItemFromModal = (product, qty) => {
    const q = Number(qty || 1);
    const p = Number(product.purchase_price || 0);
    setItems(prev => {
      let current = prev;
      if (current.length === 1 && !current[0].product_id) current = [];
      const existing = current.findIndex(i => i.product_id === product.id);
      if (existing >= 0) {
        const updated = [...current];
        updated[existing] = {
          ...updated[existing],
          qty: Number(updated[existing].qty) + q,
          total: (Number(updated[existing].qty) + q) * updated[existing].price,
        };
        return updated;
      }
      return [...current, {
        product_id: product.id,
        name: product.name,
        hsn: product.hsn || '',
        unit: product.unit || 'PCS',
        qty: q, price: p, discount: 0, tax: 0,
        total: q * p,
      }];
    });
  };

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
        supplier_id: supplierId || null,
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
        const { data: oldInv } = await supabase.from('purchase_invoices').select('balance_due').eq('id', id).single();
        const oldBalance = Number(oldInv?.balance_due || 0);
        const diff = balanceDue - oldBalance;
        
        const { error: updateErr } = await supabase.from('purchase_invoices').update(payload).eq('id', id);
        if (updateErr) throw updateErr;

        if (diff !== 0 && saveStatus === 'final') {
          const { data: partyData } = await supabase.from('parties').select('current_balance').eq('id', supplierId).single();
          if (partyData) {
            await supabase.from('parties').update({ current_balance: Number(partyData.current_balance || 0) - diff }).eq('id', supplierId);
          }
        }
      } else {
        const { error: insertErr } = await supabase.from('purchase_invoices').insert(payload);
        if (insertErr) throw insertErr;

        if (balanceDue > 0 && saveStatus === 'final') {
          const { data: partyData } = await supabase.from('parties').select('current_balance').eq('id', supplierId).single();
          if (partyData) {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-surface-50 animate-fade-in">
      {/* Top Bar */}
      <div className="bg-white border-b border-surface-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/purchases')} className="text-surface-400 hover:text-surface-800 transition-colors">
            <HiOutlineX className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-[16px] font-bold text-surface-800">{isEditing ? 'Edit Purchase Invoice' : 'Create Purchase Invoice'}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave('draft')} disabled={saving} className="px-3 py-1.5 text-[12px] font-semibold border border-surface-200 rounded-lg text-surface-600 bg-white hover:bg-surface-50 shadow-sm transition-colors">
            Save as Draft
          </button>
          <button onClick={() => handleSave('final')} disabled={saving} className="px-4 py-1.5 text-[12px] font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg shadow-sm transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Purchase'}
          </button>
        </div>
      </div>

      {error && (
        <div className="m-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32">
        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-4 md:p-6 max-w-6xl mx-auto">

          {/* Top: Supplier + Meta */}
          <div className="flex flex-col lg:flex-row items-start gap-4 mb-4">
            {/* Bill To */}
            <div className="w-full lg:w-[280px] relative flex-shrink-0">
              <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wide mb-1">Supplier</label>
              {!selectedSupplier ? (
                <div onClick={() => setShowPartyDropdown(true)} className="w-full h-16 border-2 border-dashed border-[#4f46e5]/40 bg-[#4f46e5]/5 rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#4f46e5]/10 text-[#4f46e5] font-bold text-sm transition-colors">
                  + Add Supplier
                </div>
              ) : (
                <div className="w-full border border-surface-200 rounded-lg p-3 relative">
                  <div className="font-bold text-[13px] text-surface-800">{selectedSupplier.name}</div>
                  {selectedSupplier.phone && <div className="text-[11px] text-surface-500">{selectedSupplier.phone}</div>}
                  <div className="text-[11px] text-surface-400">Bal: ₹ {selectedSupplier.current_balance || 0}</div>
                  <button onClick={() => setSupplierId('')} className="absolute top-1.5 right-1.5 text-surface-300 hover:text-red-500">
                    <HiOutlineX className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {showPartyDropdown && !selectedSupplier && (
<div ref={supplierDropdownRef} className="absolute top-[52px] left-0 w-[320px] bg-white border-2 border-[#7c3aed] rounded shadow-2xl z-50">
                  <div className="p-2 border-b border-surface-200">
                    <input autoFocus placeholder="Search supplier..." value={partySearch} onChange={e => setPartySearch(e.target.value)} className="w-full outline-none text-[13px] px-2 py-1" />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {suppliers.filter(c => c.name.toLowerCase().includes(partySearch.toLowerCase())).slice(0, 50).map(c => (
                      <div key={c.id} onClick={() => { setSupplierId(c.id); setShowPartyDropdown(false); setPartySearch(''); }} className="flex justify-between px-3 py-2 hover:bg-[#f5f3ff] cursor-pointer border-b border-surface-100 text-[13px]">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-surface-500">₹ {c.current_balance || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 flex-shrink-0"></div>

            {/* Invoice Meta */}
            <div className="flex-shrink-0">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wide mb-1">Supplier Inv No:</label>
                  <input value={billNo} onChange={e => setBillNo(e.target.value)} className="w-28 px-2 py-1.5 border border-surface-200 rounded-lg text-[13px] bg-surface-50 focus:outline-none focus:border-[#4f46e5]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wide mb-1">Inv Date:</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-36 px-2 py-1.5 border border-surface-200 rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wide mb-1">Payment Terms:</label>
                  <div className="flex">
                    <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="w-12 px-2 py-1.5 border border-r-0 border-surface-200 rounded-l-lg text-[13px] text-right focus:outline-none focus:border-[#4f46e5]" />
                    <span className="px-2 py-1.5 border border-surface-200 rounded-r-lg bg-surface-50 text-[12px] text-surface-500 font-medium">days</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wide mb-1">Due Date:</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-36 px-2 py-1.5 border border-surface-200 rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5]" />
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-surface-200 rounded mb-8">
            <table className="w-full text-left">
              <thead className="bg-[#f9fafb] border-b border-surface-200">
                <tr className="text-[11px] font-bold text-surface-500 uppercase">
                  <th className="py-2.5 px-3 w-8">#</th>
                  {colVisibility.image && <th className="py-2.5 px-3 w-12 text-center">Img</th>}
                  {colVisibility.code && <th className="py-2.5 px-3 w-20">Code</th>}
                  <th className="py-2.5 px-3">Items / Services</th>
                  <th className="py-2.5 px-3 w-20">HSN/SAC</th>
                  {colVisibility.qty && <th className="py-2.5 px-3 w-16 text-right">Qty</th>}
                  {colVisibility.price && <th className="py-2.5 px-3 w-28 text-right">Purch (₹)</th>}
                  <th className="py-2.5 px-3 w-20 text-right">Disc.</th>
                  <th className="py-2.5 px-3 w-16 text-right">Tax%</th>
                  <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <button onClick={() => setShowColumnsModal(true)} className="p-1 rounded-full bg-[#f1f5f9] text-surface-500 hover:bg-[#e2e8f0] transition-colors" title="Show/Hide Columns">
                      <HiOutlinePlus className="w-4 h-4" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {items.length === 0 || (items.length === 1 && !items[0].product_id) ? null : items.map((item, idx) => (
                  <tr key={idx} className="border-b border-surface-100 group">
                    <td className="py-2 px-3 text-surface-400 text-[12px]">{idx + 1}</td>
                    {colVisibility.image && (
                      <td className="py-2 px-3 text-center">
                         <div className="w-8 h-8 bg-surface-100 rounded mx-auto flex items-center justify-center text-[10px] text-surface-400">Img</div>
                      </td>
                    )}
                    {colVisibility.code && (
                      <td className="py-2 px-3">
                         <div className="text-[12px] text-surface-500 font-mono">{item.barcode || '-'}</div>
                      </td>
                    )}
                    <td className="py-2 px-3">
                      <div className="font-medium text-surface-800">{item.name}</div>
                    </td>
                    <td className="py-2 px-3">
                      <input value={item.hsn} onChange={e => updateItem(idx, 'hsn', e.target.value)} className="w-full bg-transparent outline-none text-surface-600 text-[12px]" />
                    </td>
                    {colVisibility.qty && (
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1 justify-end">
                          <input type="number" min="0" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} className="w-16 bg-transparent border-b border-transparent hover:border-surface-200 focus:border-blue-400 outline-none text-right" />
                          <span className="text-[10px] text-surface-500 font-bold uppercase">{item.unit || 'PCS'}</span>
                        </div>
                      </td>
                    )}
                    {colVisibility.price && (
                      <td className="py-2 px-3">
                        <input type="number" min="0" value={item.price} onChange={e => updateItem(idx, 'price', e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-surface-200 focus:border-blue-400 outline-none text-right" />
                      </td>
                    )}
                    <td className="py-2 px-3">
                      <input type="number" min="0" value={item.discount} onChange={e => updateItem(idx, 'discount', e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-surface-200 focus:border-blue-400 outline-none text-right" />
                    </td>
                    <td className="py-2 px-3">
                      <input type="number" min="0" value={item.tax} onChange={e => updateItem(idx, 'tax', e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-surface-200 focus:border-blue-400 outline-none text-right" />
                    </td>
                    <td className="py-2 px-3 text-right font-bold">
                      {Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button onClick={() => removeItem(idx)} className="text-surface-300 hover:text-red-500 transition-opacity">
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add Item Row */}
            <div className="flex border-t border-surface-200">
              <button onClick={() => setShowItemModal(true)} className="flex-1 m-2 py-3 border-2 border-dashed border-blue-300 bg-blue-50/30 hover:bg-blue-50 rounded text-blue-600 font-bold text-[13px] flex items-center justify-center gap-2 transition-colors">
                <HiOutlinePlus className="w-4 h-4" /> Add Item
              </button>
            </div>
          </div>

          {/* Bottom: Notes + Calculations */}
          <div className="flex flex-col lg:flex-row gap-8 mb-8">
            {/* Notes & Terms */}
            <div className="flex-1 space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wide mb-2">Notes</label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full bg-[#f9fafb] border border-surface-200 rounded-lg p-3 text-[13px] outline-none focus:border-[#4f46e5] resize-none h-24"
                  placeholder="Add any notes here..."
                />
              </div>
            </div>

            {/* Calculations */}
            <div className="w-full lg:w-[380px] bg-[#f9fafb] rounded-xl border border-surface-200 p-5 shadow-sm">
              <div className="space-y-3">
                <div className="flex justify-between text-[13px] text-surface-600 font-medium">
                  <span>Sub Total</span>
                  <span>₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-[13px] text-surface-600 font-medium">
                  <span>Discount</span>
                  <input type="number" value={overallDiscount} onChange={e => setOverallDiscount(e.target.value)}
                    className="w-24 text-right px-2 py-1 bg-white border border-surface-200 rounded outline-none" />
                </div>
                <div className="flex justify-between items-center text-[13px] text-surface-600 font-medium">
                  <span>Transport Charges</span>
                  <input type="number" value={transportCharges} onChange={e => setTransportCharges(e.target.value)}
                    className="w-24 text-right px-2 py-1 bg-white border border-surface-200 rounded outline-none" />
                </div>
                <div className="flex justify-between items-center text-[13px] text-surface-600 font-medium">
                  <span>Labour Charges</span>
                  <input type="number" value={labourCharges} onChange={e => setLabourCharges(e.target.value)}
                    className="w-24 text-right px-2 py-1 bg-white border border-surface-200 rounded outline-none" />
                </div>
                <div className="flex justify-between items-center text-[13px] text-surface-600 font-medium">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={autoRoundOff} onChange={e => setAutoRoundOff(e.target.checked)} className="rounded" />
                    Auto Round Off
                  </label>
                  <span>{roundOffAmt > 0 ? '+' : ''}{roundOffAmt.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="border-t border-surface-200 mt-4 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[15px] font-bold text-surface-800">Grand Total</span>
                  <span className="text-xl font-bold text-[#4f46e5]">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-surface-200 space-y-3">
                  <label className="flex items-center gap-2 text-[12px] font-bold text-surface-600 cursor-pointer">
                    <input type="checkbox" checked={isFullyPaid} onChange={e => setIsFullyPaid(e.target.checked)} className="rounded" />
                    Mark as Fully Paid
                  </label>
                  <div className="flex items-center justify-between text-[13px] font-medium text-surface-600">
                    <span>Amount Paid</span>
                    <input
                      type="number" disabled={isFullyPaid}
                      value={effectivePaid} onChange={e => setAmountPaid(e.target.value)}
                      className="w-32 text-right px-2 py-1 bg-white border border-surface-200 rounded outline-none disabled:bg-surface-50 font-bold text-surface-800"
                    />
                  </div>
                  {balanceDue > 0 && (
                    <div className="flex items-center justify-between text-[13px] font-bold text-red-500 pt-2 border-t border-surface-100">
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
      {showItemModal && (
        <AddItemsModal 
          products={products} 
          onClose={() => setShowItemModal(false)} 
          onAdd={handleAddItemFromModal} 
        />
      )}
      {showColumnsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowColumnsModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <h3 className="text-[15px] font-bold text-surface-800">Show/Hide Columns in Invoice</h3>
              <button onClick={() => setShowColumnsModal(false)} className="text-surface-400 hover:text-surface-700">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-2">
              <div className="flex items-center justify-between py-4 border-b border-surface-100">
                <span className="text-[13px] font-medium text-surface-800">Quantity</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={colVisibility.qty} onChange={e => setColVisibility(p => ({ ...p, qty: e.target.checked }))} className="sr-only peer" />
                  <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4f46e5]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between py-4 border-b border-surface-200">
                <span className="text-[13px] font-medium text-surface-800">Price/Item (₹)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={colVisibility.price} onChange={e => setColVisibility(p => ({ ...p, price: e.target.checked }))} className="sr-only peer" />
                  <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4f46e5]"></div>
                </label>
              </div>
            </div>
            
              <div className="flex items-center justify-between py-4 border-b border-surface-200">
                <span className="text-[13px] font-medium text-surface-800">Item Image</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={colVisibility.image} onChange={e => setColVisibility(p => ({ ...p, image: e.target.checked }))} className="sr-only peer" />
                  <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4f46e5]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between py-4 border-b border-surface-200">
                <span className="text-[13px] font-medium text-surface-800">Item Code</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={colVisibility.code} onChange={e => setColVisibility(p => ({ ...p, code: e.target.checked }))} className="sr-only peer" />
                  <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4f46e5]"></div>
                </label>
              </div>
  
            <div className="flex gap-4 px-6 py-4 border-t border-surface-200 mt-2">
              <button onClick={() => setShowColumnsModal(false)} className="flex-1 px-4 py-2 bg-[#ede9fe] text-[#4f46e5] rounded-lg text-[13px] font-bold transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}

function AddItemsModal({ products, onAdd, onClose, invoiceSettings = {}, customerId }) {
  const [search, setSearch] = useState('');
  const [selectedQtys, setSelectedQtys] = useState({});
  const [addedIds, setAddedIds] = useState({});
  const [priceHistory, setPriceHistory] = useState({});
  const showPurchasePriceCol = invoiceSettings.showPurchasePrice !== false;
  const showPriceHistory = invoiceSettings.priceHistory !== false;

  useEffect(() => {
    if (showPriceHistory && customerId) {
      // Fetch last 5 sale prices per product for this customer from bills
      supabase
        .from('bills')
        .select('items, date')
        .eq('customer_id', customerId)
        .order('date', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          if (!data) return;
          const history = {};
          data.forEach(bill => {
            (bill.items || []).forEach(item => {
              if (!history[item.product_id]) history[item.product_id] = [];
              if (history[item.product_id].length < 5) {
                history[item.product_id].push({ price: item.price, date: bill.date });
              }
            });
          });
          setPriceHistory(history);
        });
    }
  }, [customerId, showPriceHistory]);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (product) => {
    const qty = Number(selectedQtys[product.id] || 1);
    onAdd(product, qty);
    setAddedIds(prev => ({ ...prev, [product.id]: true }));
  };

  const addedCount = Object.keys(addedIds).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <h2 className="text-[17px] font-bold text-surface-800">Add Items to Bill</h2>
          <button onClick={() => navigate(-1)} className="text-surface-400 hover:text-surface-800">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <div className="flex-1 flex items-center border-2 border-[#7c3aed] rounded px-3 py-2 gap-2">
            <HiOutlineSearch className="w-4 h-4 text-[#7c3aed]" />
            <input
              autoFocus
              type="text"
              placeholder="Search by Item / Serial no. / HSN code / SKU / Custom Field / Category"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 text-[13px] outline-none"
            />
          </div>
          <select className="border border-surface-200 rounded px-3 py-2 text-[13px] text-surface-600 bg-white w-40">
            <option>Select Category</option>
          </select>
          <button
            onClick={() => window.open('/inventory/new', '_blank')}
            className="px-4 py-2 bg-[#7c3aed] text-white text-[13px] font-bold rounded whitespace-nowrap hover:bg-[#6d28d9]"
          >
            Create New Item
          </button>
        </div>

        {/* Items Table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white border-b border-surface-200 text-[12px] font-bold text-surface-600">
              <tr>
                <th className="py-2.5 px-4">Item Name</th>
                <th className="py-2.5 px-4">Item Code</th>
                <th className="py-2.5 px-4">Stock</th>
                <th className="py-2.5 px-4">Sales Price</th>
                {showPurchasePriceCol && <th className="py-2.5 px-4">Purchase Price</th>}
                {showPriceHistory && customerId && <th className="py-2.5 px-4">Last Price</th>}
                <th className="py-2.5 px-4 text-right pr-6">Quantity</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4 + (showPurchasePriceCol ? 1 : 0) + (showPriceHistory && customerId ? 1 : 0) + 1} className="py-12 text-center text-surface-400">No items found</td>
                </tr>
              ) : (
                filtered.slice(0, 50).map(p => (
                  <tr
                    key={p.id}
                    className="border-b border-surface-100 hover:bg-[#f5f3ff] transition-colors cursor-pointer"
                    onClick={(e) => {
                      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                        handleAdd(p);
                      }
                    }}
                  >
                    <td className="py-3 px-4 font-medium text-surface-800">{p.name}</td>
                    <td className="py-3 px-4 text-surface-500">{p.barcode || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={Number(p.stock_qty) <= 0 ? 'text-red-500 font-medium' : 'text-surface-700'}>
                        {p.stock_qty} {p.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4">₹ {Number(p.purchase_price).toLocaleString('en-IN')}</td>
                    {showPurchasePriceCol && (
                      <td className="py-3 px-4 text-surface-500">₹ {Number(p.purchase_price || 0).toLocaleString('en-IN')}</td>
                    )}
                    {showPriceHistory && customerId && (
                      <td className="py-3 px-4">
                        {priceHistory[p.id] && priceHistory[p.id].length > 0 ? (
                          <div className="text-[11px]">
                            <div className="font-bold text-indigo-600">₹ {Number(priceHistory[p.id][0].price).toLocaleString('en-IN')}</div>
                            <div className="text-surface-400">{new Date(priceHistory[p.id][0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                          </div>
                        ) : <span className="text-surface-400 text-[11px]">—</span>}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right pr-3">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number" min="1"
                          value={selectedQtys[p.id] || 1}
                          onChange={e => setSelectedQtys(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleAdd(p); }}
                          className="w-16 border border-surface-200 rounded px-2 py-1 text-center text-[12px]"
                        />
                        {addedIds[p.id] ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAdd(p); }}
                            className="bg-[#e9d5ff] text-[#7c3aed] font-bold px-3 py-1 rounded text-[12px] min-w-[64px]"
                          >
                            Added ✓
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAdd(p); }}
                            className="border border-[#7c3aed] text-[#7c3aed] font-bold px-3 py-1 rounded text-[12px] hover:bg-[#7c3aed] hover:text-white transition-colors min-w-[64px]"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-200 bg-surface-50">
          <div className="text-[12px] text-surface-500 hidden md:flex items-center gap-2">
            <span>Keyboard Shortcuts:</span>
            <kbd className="bg-white border border-surface-200 rounded px-1.5 py-0.5 text-[11px]">Enter</kbd>
            <kbd className="bg-white border border-surface-200 rounded px-1.5 py-0.5 text-[11px]">+ / -</kbd>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-blue-600 text-[13px] font-medium underline cursor-pointer">
              Show {addedCount} Item(s) Selected
            </span>
            <button onClick={() => navigate(-1)} className="px-4 py-1.5 border border-surface-200 rounded text-[13px] font-medium text-surface-600 bg-white hover:bg-surface-50">
              Cancel [ESC]
            </button>
            <button onClick={() => navigate(-1)} className="px-4 py-1.5 bg-[#7c3aed] text-white rounded text-[13px] font-bold hover:bg-[#6d28d9]">
              Add to Bill [F7]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Invoice Form (Full Page) ────────────────────────────────────────
function CreateInvoiceForm({ onClose, onSaved, customers, products, carpenters, invoiceSettings = {}, onOpenSettings }) {
  const { user } = useAuth();

  const [billNo, setBillNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState('30');
  const [dueDate, setDueDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [carpenterId, setCarpenterId] = useState('');
  const [commissionRate, setCommissionRate] = useState(0);
  const [items, setItems] = useState([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [colVisibility, setColVisibility] = useState({ qty: true, price: true, image: false, code: false });
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('1. GST will be charged additionally as applicable.');
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [autoRoundOff, setAutoRoundOff] = useState(false);
  const [amountReceived, setAmountReceived] = useState(0);
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const supplierDropdownRef2 = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supplierDropdownRef2.current && !supplierDropdownRef2.current.contains(event.target)) {
        setShowPartyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [partySearch, setPartySearch] = useState('');

  const subtotal = items.reduce((s, i) => s + Number(i.total || 0), 0);
  const taxableAmount = subtotal + Number(additionalCharges);
  const grandTotalRaw = taxableAmount - Number(overallDiscount);
  const roundOffAmt = autoRoundOff ? Math.round(grandTotalRaw) - grandTotalRaw : 0;
  const grandTotal = grandTotalRaw + roundOffAmt;
  const effectiveReceived = isFullyPaid ? grandTotal : Number(amountReceived);
  const balanceDue = grandTotal - effectiveReceived;

  useEffect(() => { generateBillNo().then(setBillNo); }, []);

  useEffect(() => {
    if (date && paymentTerms) {
      const d = new Date(date);
      d.setDate(d.getDate() + Number(paymentTerms));
      setDueDate(d.toISOString().split('T')[0]);
    }
  }, [date, paymentTerms]);

  const handleAddItemFromModal = (product, qty) => {
    const q = Number(qty || 1);
    const p = Number(product.purchase_price || 0);
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
        qty: q, price: p, discount: 0, tax: 0,
        total: q * p,
      }];
    });
  };

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

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

  const handleSave = async () => {
    setError('');
    if (!customerId) return setError('Please select a Party.');
    if (items.length === 0) return setError('Please add at least one item.');
    setSaving(true);
    try {
      const received = isFullyPaid ? grandTotal : Number(amountReceived);
      const payload = {
        bill_no: 'BILL-' + billNo,
        date: date || new Date().toISOString().split('T')[0],
        due_date: dueDate || null,
        customer_id: customerId,
        items,
        subtotal,
        discount: Number(overallDiscount),
        labour_charges: Number(additionalCharges),
        round_off: roundOffAmt,
        advance_paid: received,
        balance_due: grandTotal - received,
        grand_total: grandTotal,
        notes,
        status: (grandTotal - received) <= 0 ? 'final' : 'draft',
        created_by: user?.id,
        carpenter_id: carpenterId || null,
        commission_rate: Number(commissionRate) || 0,
      };
      const { error: err } = await supabase.from('bills').insert(payload);
      if (err) throw err;
      navigate(-1);
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === customerId);

  return (
    <div className="animate-fade-in w-full">

      {/* Page Header */}
      <div className="flex items-center justify-between mb-3 pt-2">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-800 rounded-full transition-colors">
            <HiOutlineArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-[15px] font-bold text-surface-900">Create Purchase Invoice</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenSettings && onOpenSettings()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold border border-surface-200 rounded-lg text-surface-600 bg-white hover:bg-surface-50 shadow-sm transition-colors"
          >
            <HiOutlineCog className="w-4 h-4" /> Settings
          </button>
          <button className="px-3 py-1.5 text-[12px] font-semibold border border-surface-200 rounded-lg text-surface-600 bg-white hover:bg-surface-50 shadow-sm transition-colors">
            Save &amp; New
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-[12px] font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <span className="mt-0.5 text-red-400">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-4 md:p-6">

        {/* Top: Party + Referred By + Invoice Meta — all in one row */}
        <div className="flex flex-col lg:flex-row items-start gap-4 mb-4">

          {/* Bill To */}
          <div className="w-full lg:w-[240px] relative flex-shrink-0">
            <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wide mb-1">Bill To</label>
            {!selectedCustomer ? (
              <div
                onClick={() => setShowPartyDropdown(true)}
                className="w-full h-16 border-2 border-dashed border-[#4f46e5]/40 bg-[#4f46e5]/5 rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#4f46e5]/10 text-[#4f46e5] font-bold text-sm transition-colors"
              >
                + Add Party
              </div>
            ) : (
              <div className="w-full border border-surface-200 rounded-lg p-3 relative">
                <div className="font-bold text-[13px] text-surface-800">{selectedCustomer.name}</div>
                {selectedCustomer.mobile && <div className="text-[11px] text-surface-500">{selectedCustomer.mobile}</div>}
                <div className="text-[11px] text-surface-400">Bal: ₹ {selectedCustomer.current_balance || 0}</div>
                <button onClick={() => setCustomerId('')} className="absolute top-1.5 right-1.5 text-surface-300 hover:text-red-500">
                  <HiOutlineX className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Party Search Dropdown */}
            {showPartyDropdown && !selectedCustomer && (
              <div className="absolute top-[52px] left-0 w-[320px] bg-white border-2 border-[#7c3aed] rounded shadow-2xl z-50">
                <div className="p-2 border-b border-surface-200">
                  <input
                    autoFocus
                    placeholder="Search party by name or number"
                    value={partySearch}
                    onChange={e => setPartySearch(e.target.value)}
                    className="w-full outline-none text-[13px] px-2 py-1"
                  />
                </div>
                <div className="flex justify-between px-3 py-1.5 bg-surface-50 text-[10px] font-bold text-surface-500 uppercase border-b">
                  <span>Party Name</span><span>Balance</span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {customers.filter(c => c.name.toLowerCase().includes(partySearch.toLowerCase())).map(c => (
                    <div key={c.id} onClick={() => { setCustomerId(c.id); setShowPartyDropdown(false); setPartySearch(''); }}
                      className="flex justify-between px-3 py-2 hover:bg-[#f5f3ff] cursor-pointer border-b border-surface-100 text-[13px]">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-surface-500">₹ {c.current_balance || 0}</span>
                    </div>
                  ))}
                </div>
                <div className="m-2 p-1.5 border-2 border-dashed border-blue-300 bg-blue-50/30 rounded text-center text-blue-600 font-bold text-[12px] cursor-pointer hover:bg-blue-50">
                  + Create Party
                </div>
              </div>
            )}
          </div>

          {/* Referred By — inline between party and meta */}
          <div className="flex-1 flex-shrink-0">
            <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wide mb-1">Referred By (Carpenter / Worker)</label>
            <select
              value={carpenterId}
              onChange={(e) => {
                setCarpenterId(e.target.value);
                const selected = carpenters.find(c => c.id === e.target.value);
                if (selected) setCommissionRate(selected.default_commission_rate);
              }}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-[13px] bg-white outline-none focus:border-[#7c3aed]"
            >
              <option value="">-- No Referrer --</option>
              {carpenters.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            {carpenterId && (
              <div className="mt-2">
                <label className="block text-[11px] font-medium text-surface-500 mb-1">Commission Rate (%)</label>
                <input type="number" min="0" step="0.1" value={commissionRate}
                  onChange={e => setCommissionRate(e.target.value)}
                  className="w-28 px-3 py-1.5 border border-surface-200 rounded text-[13px] bg-white outline-none focus:border-[#7c3aed]" />
              </div>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="flex-shrink-0">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wide mb-1">Invoice No:</label>
                <input value={billNo} onChange={e => setBillNo(e.target.value)}
                  className="w-28 px-2 py-1.5 border border-surface-200 rounded-lg text-[13px] bg-surface-50 focus:outline-none focus:border-[#4f46e5]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wide mb-1">Invoice Date:</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-36 px-2 py-1.5 border border-surface-200 rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wide mb-1">Payment Terms:</label>
                <div className="flex">
                  <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
                    className="w-12 px-2 py-1.5 border border-r-0 border-surface-200 rounded-l-lg text-[13px] text-right focus:outline-none focus:border-[#4f46e5]" />
                  <span className="px-2 py-1.5 border border-surface-200 rounded-r-lg bg-surface-50 text-[12px] text-surface-500 font-medium">days</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wide mb-1">Due Date:</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-36 px-2 py-1.5 border border-surface-200 rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5]" />
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border border-surface-200 rounded mb-8">
          <table className="w-full text-left">
            <thead className="bg-[#f9fafb] border-b border-surface-200">
              <tr className="text-[11px] font-bold text-surface-500 uppercase">
                <th className="py-2.5 px-3 w-8">#</th>
                <th className="py-2.5 px-3">Items / Services</th>
                <th className="py-2.5 px-3 w-20">HSN/SAC</th>
                {colVisibility.qty && <th className="py-2.5 px-3 w-16 text-right">Qty</th>}
                {colVisibility.price && <th className="py-2.5 px-3 w-28 text-right">Price (₹)</th>}
                <th className="py-2.5 px-3 w-20 text-right">Disc.</th>
                <th className="py-2.5 px-3 w-16 text-right">Tax%</th>
                <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3 w-10 text-center">
                  <button onClick={() => setShowColumnsModal(true)} className="p-1 rounded-full bg-[#f1f5f9] text-surface-500 hover:bg-[#e2e8f0] transition-colors" title="Show/Hide Columns">
                    <HiOutlinePlus className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-surface-100 group">
                  <td className="py-2 px-3 text-surface-400 text-[12px]">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <div className="font-medium text-surface-800">{item.name}</div>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      value={item.hsn}
                      onChange={e => updateItem(idx, 'hsn', e.target.value)}
                      className="w-full bg-transparent outline-none text-surface-600 text-[12px]"
                    />
                  </td>
                  {colVisibility.qty && (
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1 justify-end">
                        <input
                          type="number" min="0"
                          value={item.qty}
                          onChange={e => updateItem(idx, 'qty', e.target.value)}
                          className="w-16 bg-transparent border-b border-transparent hover:border-surface-200 focus:border-blue-400 outline-none text-right"
                        />
                        <span className="text-[10px] text-surface-500 font-bold uppercase">{item.unit || 'PCS'}</span>
                      </div>
                    </td>
                  )}
                  {colVisibility.price && (
                    <td className="py-2 px-3">
                      <input
                        type="number" min="0"
                        value={item.price}
                        onChange={e => updateItem(idx, 'price', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-surface-200 focus:border-blue-400 outline-none text-right"
                      />
                    </td>
                  )}
                  <td className="py-2 px-3">
                    <input
                      type="number" min="0"
                      value={item.discount}
                      onChange={e => updateItem(idx, 'discount', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-surface-200 focus:border-blue-400 outline-none text-right"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number" min="0"
                      value={item.tax}
                      onChange={e => updateItem(idx, 'tax', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-surface-200 focus:border-blue-400 outline-none text-right"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-bold">
                    {Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-surface-300 hover:text-red-500 transition-opacity"
                    >
                      <HiOutlineX className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add Item Row */}
          <div className="flex border-t border-surface-200">
            <button
              onClick={() => setShowItemModal(true)}
              className="flex-1 m-2 py-3 border-2 border-dashed border-blue-300 bg-blue-50/30 hover:bg-blue-50 rounded text-blue-600 font-bold text-[13px] flex items-center justify-center gap-2 transition-colors"
            >
              <HiOutlinePlus className="w-4 h-4" /> Add Item
            </button>
            <div className="w-48 border-l border-surface-200 bg-surface-50 flex items-center justify-center cursor-pointer hover:bg-surface-100 transition-colors">
              <div className="flex items-center gap-2 font-bold text-[13px] text-surface-700">
                <HiOutlineQrcode className="w-5 h-5 text-surface-500" /> Scan Barcode
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Notes + Calculations — mybillbook layout */}
        <div className="flex flex-col lg:flex-row gap-0 mt-2">

          {/* LEFT: Notes, Terms, Bank, QR */}
          <div className="flex-1 pr-0 lg:pr-8 space-y-3 pt-4">
            <div className="text-blue-600 font-medium text-[13px] cursor-pointer hover:underline">+ Add Notes</div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[12px] font-semibold text-surface-700">Terms and Conditions</label>
                <button className="text-surface-400 hover:text-surface-600"><HiOutlineCog className="w-3.5 h-3.5" /></button>
              </div>
              <textarea
                value={terms}
                onChange={e => setTerms(e.target.value)}
                rows={4}
                className="w-full bg-surface-50 border border-surface-200 rounded p-3 text-[12px] text-surface-600 resize-none outline-none focus:ring-1 focus:ring-surface-300"
              />
            </div>
            <div className="text-blue-600 font-medium text-[13px] cursor-pointer hover:underline">+ Add Bank Account</div>
            <div className="text-blue-600 font-medium text-[13px] cursor-pointer hover:underline">+ Add Payment QR</div>
          </div>

          {/* RIGHT: Charges + Total + Payment */}
          <div className="w-full lg:w-[420px] text-[13px] pt-4">

            {/* Additional Charges */}
            <div className="flex items-center justify-between py-2.5 border-b border-surface-100">
              <span className="text-blue-600 font-medium cursor-pointer hover:underline">+ Add Additional Charges</span>
              <div className="flex items-center gap-1">
                <span className="text-surface-500 text-[12px]">₹</span>
                <input
                  type="number"
                  value={additionalCharges || ''}
                  onChange={e => setAdditionalCharges(e.target.value)}
                  placeholder="0"
                  className="w-20 text-right outline-none text-surface-700 bg-transparent text-[13px]"
                />
              </div>
            </div>

            {/* Taxable Amount */}
            <div className="flex items-center justify-between py-2.5 border-b border-surface-100">
              <span className="font-semibold text-surface-700">Taxable Amount</span>
              <span className="text-surface-700">₹ {taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between py-2.5 border-b border-surface-100">
              <span className="text-blue-600 font-medium cursor-pointer hover:underline">+ Add Discount</span>
              <div className="flex items-center gap-1">
                <span className="text-surface-500 text-[12px]">₹</span>
                <input
                  type="number"
                  value={overallDiscount || ''}
                  onChange={e => setOverallDiscount(e.target.value)}
                  placeholder="0"
                  className="w-20 text-right outline-none text-surface-700 bg-transparent text-[13px]"
                />
              </div>
            </div>

            {/* Auto Round Off */}
            <div className="flex items-center justify-between py-2.5 border-b border-surface-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRoundOff}
                  onChange={e => setAutoRoundOff(e.target.checked)}
                  className="rounded accent-indigo-600"
                />
                <span className="text-surface-700">Auto Round Off</span>
              </label>
              <div className="flex items-center gap-1.5">
                <select className="border border-surface-200 rounded px-1.5 py-1 text-[12px] text-surface-600 bg-white">
                  <option>+ Add</option>
                  <option>- Less</option>
                </select>
                <span className="text-surface-500 text-[12px]">₹</span>
                <input
                  type="number"
                  readOnly
                  value={autoRoundOff ? roundOffAmt.toFixed(2) : 0}
                  className="w-14 text-right border border-surface-200 rounded px-1.5 py-1 text-[12px] bg-surface-50"
                />
              </div>
            </div>

            {/* Total Amount */}
            <div className="flex items-center justify-between py-3 border-b border-surface-200">
              <span className="font-black text-[16px] text-surface-900">Total Amount</span>
              <div className="flex items-center gap-3">
                {grandTotal === 0 ? (
                  <button
                    className="px-4 py-1.5 border border-surface-300 rounded text-[13px] text-surface-500 bg-surface-50 hover:bg-surface-100 transition-colors"
                    onClick={() => setAmountReceived(grandTotal)}
                  >
                    Enter Payment amount
                  </button>
                ) : (
                  <span className="font-black text-[18px] text-surface-900">
                    ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            {/* Mark as fully paid */}
            <div className="flex items-center justify-end gap-2 py-2">
              <label className="flex items-center gap-1.5 text-[12px] text-surface-600 cursor-pointer select-none">
                Mark as fully paid
                <span className="w-4 h-4 rounded-full border border-surface-400 flex items-center justify-center text-[9px] text-surface-500 font-bold cursor-help" title="Mark invoice as fully paid (balance will become 0)">?</span>
                <input
                  type="checkbox"
                  checked={isFullyPaid}
                  onChange={e => setIsFullyPaid(e.target.checked)}
                  className="rounded accent-indigo-600"
                />
              </label>
            </div>

            {/* Amount Received */}
            <div className="flex items-center justify-between py-2 border-t border-surface-200">
              <span className="font-semibold text-surface-700">Amount Received</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-surface-300 rounded overflow-hidden">
                  <span className="px-2.5 py-1.5 bg-surface-50 border-r border-surface-200 text-surface-600 text-[13px] font-medium">₹</span>
                  <input
                    type="number"
                    value={isFullyPaid ? grandTotal : (amountReceived || '')}
                    onChange={e => { setAmountReceived(e.target.value); setIsFullyPaid(false); }}
                    placeholder="0"
                    className="w-24 px-2 py-1.5 outline-none text-[13px] font-bold text-right"
                  />
                </div>
                <select className="border border-surface-300 rounded px-2 py-1.5 text-[13px] text-surface-700 bg-white outline-none">
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                </select>
              </div>
            </div>

            {/* Balance Due */}
            {(Number(amountReceived) > 0 || isFullyPaid) && (
              <div className="flex items-center justify-between py-2 border-t border-surface-100">
                <span className="font-semibold text-surface-500">Balance Amount</span>
                <span className={'font-bold text-[15px] ' + (balanceDue > 0 ? 'text-red-600' : 'text-green-600')}>
                  ₹ {balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Add Items Modal */}
      {showItemModal && (
        <AddItemsModal
          products={products}
          onAdd={handleAddItemFromModal}
          onClose={() => setShowItemModal(false)}
          invoiceSettings={invoiceSettings}
          customerId={customerId}
        />
      )}

      {/* Show/Hide Columns Modal */}
      {showColumnsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowColumnsModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <h3 className="text-[15px] font-bold text-surface-800">Show/Hide Columns in Invoice</h3>
              <button onClick={() => setShowColumnsModal(false)} className="text-surface-400 hover:text-surface-700">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-2">
              <div className="flex items-center justify-between py-4 border-b border-surface-100">
                <span className="text-[13px] font-medium text-surface-800">Quantity</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={colVisibility.qty} onChange={e => setColVisibility(p => ({ ...p, qty: e.target.checked }))} className="sr-only peer" />
                  <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4f46e5]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between py-4 border-b border-surface-200">
                <span className="text-[13px] font-medium text-surface-800">Price/Item (₹)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={colVisibility.price} onChange={e => setColVisibility(p => ({ ...p, price: e.target.checked }))} className="sr-only peer" />
                  <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4f46e5]"></div>
                </label>
              </div>
              
              <div className="pt-6 pb-2">
                <h4 className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-6">Custom Column</h4>
                
                <div className="text-center py-6">
                  <div className="text-[#4f46e5] text-[13px] font-medium mb-1">No Custom Columns added</div>
                  <div className="text-surface-500 text-[12px] mb-6">Any custom column such as Batch # &amp; Expiry Date can be added</div>
                  
                  <div className="bg-[#fffbeb] text-amber-800 p-3 rounded-lg text-[12px]">
                    To add Custom Item Columns - Go to <strong>Item settings</strong> from <span className="text-[#4f46e5] cursor-pointer hover:underline">Items page (click here)</span>
                  </div>
                </div>
              </div>
            </div>

            
              <div className="flex items-center justify-between py-4 border-b border-surface-200">
                <span className="text-[13px] font-medium text-surface-800">Item Image</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={colVisibility.image} onChange={e => setColVisibility(p => ({ ...p, image: e.target.checked }))} className="sr-only peer" />
                  <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4f46e5]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between py-4 border-b border-surface-200">
                <span className="text-[13px] font-medium text-surface-800">Item Code</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={colVisibility.code} onChange={e => setColVisibility(p => ({ ...p, code: e.target.checked }))} className="sr-only peer" />
                  <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4f46e5]"></div>
                </label>
              </div>
  
            <div className="flex gap-4 px-6 py-4 border-t border-surface-200 mt-2">
              <button onClick={() => setShowColumnsModal(false)} className="flex-1 px-4 py-2 border border-surface-200 rounded-lg text-[13px] font-bold text-surface-600 hover:bg-surface-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => setShowColumnsModal(false)} className="flex-1 px-4 py-2 bg-[#ede9fe] text-[#4f46e5] hover:bg-[#ddd6fe] rounded-lg text-[13px] font-bold transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main SalesInvoices Component ────────────────────────────────────────────
