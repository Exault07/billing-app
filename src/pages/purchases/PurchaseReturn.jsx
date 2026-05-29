import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineArrowLeft,
  HiOutlineCog,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineDotsVertical
} from 'react-icons/hi';

// Form Component
function CreateReturnForm({ onClose, onSaved, suppliers, products, purchase_invoices }) {
  const { user } = useAuth();
  const [returnNo, setReturnNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState('');
  const [originalBillId, setOriginalBillId] = useState('');
  const [items, setItems] = useState([]);
  
  const [notes, setNotes] = useState('');
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [autoRoundOff, setAutoRoundOff] = useState(false);
  const [amountRefunded, setAmountRefunded] = useState(0);
  const [isFullyRefunded, setIsFullyRefunded] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [partySearch, setPartySearch] = useState('');
  const [showBillDropdown, setShowBillDropdown] = useState(false);
  const [billSearch, setBillSearch] = useState('');

  // Computed totals
  const subtotal = items.reduce((s, i) => s + Number(i.total || 0), 0);
  const taxableAmount = subtotal + Number(additionalCharges);
  const grandTotalRaw = taxableAmount - Number(overallDiscount);
  const roundOffAmt = autoRoundOff ? Math.round(grandTotalRaw) - grandTotalRaw : 0;
  const grandTotal = grandTotalRaw + roundOffAmt;
  const effectiveRefunded = isFullyRefunded ? grandTotal : Number(amountRefunded);

  useEffect(() => {
    generateReturnNo();
  }, []);

  const generateReturnNo = async () => {
    const { count } = await supabase.from('purchase_returns').select('id', { count: 'exact', head: true });
    setReturnNo(String((count || 0) + 1).padStart(3, '0'));
  };

  const handleBillSelect = (billId) => {
    setOriginalBillId(billId);
    if (!billId) return;
    const bill = purchase_invoices.find(b => b.id === billId);
    if (bill) {
      if (!supplierId) setSupplierId(bill.supplier_id);
      const billItems = bill.items || [];
      setItems(billItems.map(i => ({
        name: i.name || '',
        product_id: i.product_id || null,
        qty: Number(i.qty || 1),
        original_qty: Number(i.qty || 1),
        price: Number(i.price || 0),
        discount: 0,
        tax: 0,
        total: Number(i.qty || 1) * Number(i.price || 0)
      })));
    }
  };

  const addItemRow = () => {
    setItems([...items, { name: '', product_id: null, qty: 1, original_qty: 0, price: 0, discount: 0, tax: 0, total: 0 }]);
  };

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = useCallback((idx, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'qty') {
        const maxQ = Number(updated[idx].original_qty);
        if (Number(value) > maxQ && maxQ > 0) updated[idx].qty = maxQ;
      }
      const q = Number(updated[idx].qty || 0);
      const p = Number(updated[idx].price || 0);
      const d = Number(updated[idx].discount || 0);
      const base = (q * p) - d;
      const taxAmt = base * (Number(updated[idx].tax || 0) / 100);
      updated[idx].total = base + taxAmt;
      return updated;
    });
  }, []);

  const handleSave = async (e, isSaveAndNew = false) => {
    if (e) e.preventDefault();
    setError('');
    if (!supplierId) return setError('Please select a Party.');
    if (items.length === 0) return setError('Please add at least one item.');
    setSaving(true);
    try {
      const payload = {
        return_no: 'PR-' + returnNo,
        return_date: date,
        supplier_id: supplierId,
        original_purchase_id: originalBillId || null,
        items,
        subtotal,
        discount: Number(overallDiscount),
        additional_charges: Number(additionalCharges),
        total_return_amount: grandTotal,
        reason: notes,
        refund_mode: isFullyRefunded ? 'Cash' : 'Mixed',
        amount_refunded: effectiveRefunded,
        status: 'Completed',
        created_by: user?.id
      };

      const { error: err } = await supabase.from('purchase_returns').insert(payload);
      if (err) throw err;

      // Restore Stock
      for (const item of items) {
        if (item.product_id && item.qty > 0) {
          const { data: pData } = await supabase.from('products').select('stock_qty').eq('id', item.product_id).single();
          if (pData) {
            await supabase.from('products').update({ stock_qty: Number(pData.stock_qty) + Number(item.qty) }).eq('id', item.product_id);
          }
        }
      }

      // Update Bill Status
      if (originalBillId) {
        const isFullyReturned = items.every(i => i.qty === i.original_qty);
        await supabase.from('purchase_invoices').update({ status: isFullyReturned ? 'fully_returned' : 'partially_returned' }).eq('id', originalBillId);
      }

      // Update Party Balance
      const netDeduction = grandTotal - effectiveRefunded;
      if (netDeduction !== 0) {
        const { data: partyData } = await supabase.from('parties').select('current_balance').eq('id', supplierId).single();
        if (partyData) {
          await supabase.from('parties').update({ current_balance: Number(partyData.current_balance || 0) - netDeduction }).eq('id', supplierId);
        }
      }

      if (isSaveAndNew) {
        setItems([]);
        setSupplierId('');
        setOriginalBillId('');
        setNotes('');
        setAdditionalCharges(0);
        setOverallDiscount(0);
        setAmountRefunded(0);
        setIsFullyRefunded(false);
        generateReturnNo();
      } else {
        onSaved();
      }
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedSupplier = suppliers.find(c => c.id === supplierId);

  return (
    <div className="max-w-[1400px] mx-auto min-h-[calc(100vh-6rem)] bg-white animate-fade-in shadow-sm rounded-2xl overflow-hidden mt-4">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-surface-50">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-surface-600 hover:text-surface-900 bg-white p-2 rounded-full border border-surface-200 shadow-sm transition-all hover:bg-surface-100">
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-[20px] font-bold text-surface-900 leading-tight">Create Purchase Return</h1>
            <p className="text-[12px] text-surface-500 font-medium">Record returned items and process refunds</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-[13px] font-bold text-surface-600 px-4 py-2 border border-surface-200 rounded-xl shadow-sm hover:bg-surface-50 bg-white transition-colors">
            <HiOutlineCog className="w-4 h-4" /> Settings
          </button>
          <button onClick={(e) => handleSave(e, true)} disabled={saving} className="text-[13px] font-bold text-surface-600 px-5 py-2 border border-surface-200 rounded-xl shadow-sm hover:bg-surface-50 bg-white disabled:opacity-50 transition-colors">
            Save & New
          </button>
          <button 
            onClick={(e) => handleSave(e, false)} 
            disabled={saving}
            className="text-[13px] font-bold text-white px-8 py-2 bg-[#4f46e5] hover:bg-[#4338ca] rounded-xl shadow-sm disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Return'}
          </button>
        </div>
      </div>

      {error && <div className="m-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-3"><span className="text-xl">⚠️</span><span className="mt-0.5">{error}</span></div>}

      <div className="p-8">
        {/* ── Top Section: Party & Meta ── */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-10 mb-10">
          
          {/* Bill To Box */}
          <div className="w-full lg:w-[420px] flex-shrink-0">
            <PartySelect
              label="Return From Party"
              partyType="supplier"
              parties={suppliers}
              selectedParty={selectedSupplier}
              onSelect={(p) => setSupplierId(p.id)}
              onClear={() => setSupplierId('')}
            />
          </div>

          {/* Right Meta Grid */}
          <div className="w-full lg:w-auto">
            <div className="flex flex-wrap gap-5 mb-5">
              <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
                <label className="block text-[11px] font-bold text-surface-500 mb-1.5 uppercase tracking-wide">Return No</label>
                <input 
                  value={returnNo} onChange={e => setReturnNo(e.target.value)}
                  className="w-32 px-3 py-1.5 border-b border-surface-300 outline-none text-[14px] font-bold text-surface-900 bg-transparent focus:border-[#4f46e5]"
                />
              </div>
              <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
                <label className="block text-[11px] font-bold text-surface-500 mb-1.5 uppercase tracking-wide">Return Date</label>
                <input 
                  type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-36 px-3 py-1.5 outline-none text-[14px] font-bold text-surface-900 bg-transparent cursor-pointer"
                />
              </div>
            </div>
            
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 relative">
              <label className="block text-[11px] font-bold text-blue-600 mb-2 uppercase tracking-wide flex items-center gap-2">
                <HiOutlineDocumentText className="w-4 h-4" /> Link to Original Invoice
              </label>
              <div
                onClick={() => setShowBillDropdown(!showBillDropdown)}
                className="w-full min-w-[300px] px-4 py-2.5 bg-white border border-blue-200 rounded-lg text-[13px] cursor-pointer flex justify-between items-center hover:border-blue-400 transition-colors shadow-sm font-medium text-surface-800"
              >
                <span className="truncate">{originalBillId ? purchase_invoices.find(b => b.id === originalBillId)?.invoice_number : '-- Select Original Invoice --'}</span>
                <span className="text-blue-500 text-[10px]">▼</span>
              </div>
              
              {showBillDropdown && (
                <div className="absolute top-full right-0 w-[400px] mt-2 bg-white border border-[#4f46e5]/20 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-surface-100 bg-surface-50">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search invoices by number or party..."
                      value={billSearch}
                      onChange={e => setBillSearch(e.target.value)}
                      className="w-full outline-none text-[13px] px-4 py-2 bg-white border border-surface-200 rounded-lg focus:border-[#4f46e5]"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <div onClick={() => { handleBillSelect(''); setShowBillDropdown(false); }} className="px-4 py-3 hover:bg-red-50 cursor-pointer text-[12px] font-bold text-red-500 border-b border-surface-100">
                      ✕ Clear Selection
                    </div>
                    {purchase_invoices.filter(b => b.invoice_number.toLowerCase().includes(billSearch.toLowerCase()) || (b.suppliers?.name || '').toLowerCase().includes(billSearch.toLowerCase())).map(b => (
                      <div
                        key={b.id}
                        onClick={() => { handleBillSelect(b.id); setShowBillDropdown(false); setBillSearch(''); }}
                        className="px-5 py-3 hover:bg-[#4f46e5]/5 cursor-pointer border-b border-surface-50 flex justify-between items-center group"
                      >
                        <div>
                          <div className="font-bold text-surface-900 text-[13px] group-hover:text-[#4f46e5]">{b.invoice_number}</div>
                          <div className="text-[11px] text-surface-500 mt-0.5">{b.suppliers?.name || 'Unknown'} • {new Date(b.date).toLocaleDateString()}</div>
                        </div>
                        <div className="font-black text-surface-800 text-[13px]">₹ {b.grand_total}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Middle Section: Items Table ── */}
        <div className="border border-surface-200 rounded-xl overflow-hidden mb-8 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-[#f8f9fa] border-b border-surface-200 text-[11px] font-black text-surface-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center border-r border-surface-200">No</th>
                  <th className="py-3.5 px-4 border-r border-surface-200">Items / Services</th>
                  <th className="py-3.5 px-4 w-28 border-r border-surface-200 text-center">HSN / SAC</th>
                  <th className="py-3.5 px-4 w-28 border-r border-surface-200 text-center">Return Qty</th>
                  <th className="py-3.5 px-4 w-32 border-r border-surface-200 text-right">Price / Item (₹)</th>
                  <th className="py-3.5 px-4 w-28 border-r border-surface-200 text-right">Discount</th>
                  <th className="py-3.5 px-4 w-24 border-r border-surface-200 text-right">Tax</th>
                  <th className="py-3.5 px-4 w-36 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-2 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#4f46e5]/[0.02] group transition-colors">
                    <td className="py-3 px-4 text-center text-[13px] font-bold text-surface-400 border-r border-surface-100">{idx + 1}</td>
                    <td className="py-3 px-4 relative border-r border-surface-100">
                      <input 
                        type="text" 
                        placeholder="Type item name..."
                        value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                        className="w-full bg-transparent text-[13px] outline-none font-bold text-surface-800 placeholder-surface-300"
                      />
                    </td>
                    <td className="py-3 px-4 border-r border-surface-100">
                      <input 
                        type="text" value={item.hsn || ''} onChange={e => updateItem(idx, 'hsn', e.target.value)}
                        className="w-full bg-transparent text-[13px] outline-none text-surface-800 text-center font-medium"
                      />
                    </td>
                    <td className="py-3 px-4 relative border-r border-surface-100 bg-red-50/30">
                      <input 
                        type="number" min="1" max={item.original_qty || 9999}
                        value={item.qty || ''} onChange={e => updateItem(idx, 'qty', e.target.value)}
                        className="w-full bg-transparent text-[14px] outline-none text-center font-black text-red-600"
                      />
                      {item.original_qty > 0 && <span className="absolute -bottom-1 left-0 right-0 text-center text-[10px] font-bold text-surface-400">Max: {item.original_qty}</span>}
                    </td>
                    <td className="py-3 px-4 border-r border-surface-100">
                      <input 
                        type="number" value={item.price || ''} onChange={e => updateItem(idx, 'price', e.target.value)}
                        className="w-full bg-transparent text-[13px] outline-none text-right font-medium text-surface-800"
                      />
                    </td>
                    <td className="py-3 px-4 border-r border-surface-100">
                      <input 
                        type="number" value={item.discount || ''} onChange={e => updateItem(idx, 'discount', e.target.value)}
                        className="w-full bg-transparent text-[13px] outline-none text-right font-medium text-surface-800"
                      />
                    </td>
                    <td className="py-3 px-4 border-r border-surface-100">
                      <div className="flex items-center justify-end">
                        <input 
                          type="number" value={item.tax || ''} onChange={e => updateItem(idx, 'tax', e.target.value)}
                          className="w-12 bg-transparent text-[13px] outline-none text-right font-medium text-surface-800"
                        />
                        <span className="text-[12px] font-bold text-surface-400 ml-1.5">%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-[14px] font-black text-surface-900">
                      {Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button 
                        onClick={() => removeItem(idx)} 
                        className="text-surface-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-50"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center p-3 bg-[#f8f9fa] border-t border-surface-200">
            <button 
              onClick={addItemRow}
              className="flex items-center gap-1.5 text-[12px] font-black tracking-wide text-[#4f46e5] px-4 py-2 hover:bg-[#4f46e5]/10 rounded-lg transition-colors border border-transparent hover:border-[#4f46e5]/20"
            >
              <HiOutlinePlus className="w-4 h-4" /> ADD ROW
            </button>
          </div>
        </div>

        {/* ── Bottom Section ── */}
        <div className="flex flex-col lg:flex-row justify-between gap-10">
          
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-[12px] font-bold text-surface-600 mb-2 flex items-center gap-1.5 cursor-pointer hover:text-surface-900 w-max uppercase tracking-wide">
                <HiOutlinePlus className="w-4 h-4" /> Add Notes / Reason
              </label>
              <textarea 
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Write the reason for returning these items..."
                className="w-full max-w-xl p-4 border border-surface-200 rounded-xl text-[13px] bg-surface-50 focus:bg-white outline-none focus:border-[#4f46e5] resize-none shadow-sm transition-all"
                rows="4"
              />
            </div>
          </div>

          <div className="w-full lg:w-[380px]">
            <div className="bg-[#f8f9fa] rounded-2xl border border-surface-200 p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-center text-[13px] text-surface-700 font-bold">
                <span>Subtotal</span>
                <span className="text-[15px]">₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="flex justify-between items-center text-[13px] text-[#4f46e5] group font-bold">
                <span className="flex items-center gap-1.5 cursor-pointer hover:underline"><HiOutlinePlus className="w-4 h-4" /> Additional Charges</span>
                <div className="flex items-center">
                  <span>₹</span>
                  <input 
                    type="number" value={additionalCharges} onChange={e => setAdditionalCharges(e.target.value)}
                    className="w-20 bg-transparent outline-none text-right border-b-2 border-transparent group-hover:border-[#4f46e5]/30 focus:border-[#4f46e5]"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[13px] text-[#4f46e5] group font-bold">
                <span className="flex items-center gap-1.5 cursor-pointer hover:underline"><HiOutlinePlus className="w-4 h-4" /> Discount</span>
                <div className="flex items-center">
                  <span>₹</span>
                  <input 
                    type="number" value={overallDiscount} onChange={e => setOverallDiscount(e.target.value)}
                    className="w-20 bg-transparent outline-none text-right border-b-2 border-transparent group-hover:border-[#4f46e5]/30 focus:border-[#4f46e5]"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[13px] font-bold">
                <label className="flex items-center gap-2 text-surface-600 cursor-pointer select-none">
                  <input type="checkbox" checked={autoRoundOff} onChange={e => setAutoRoundOff(e.target.checked)} className="rounded text-[#4f46e5] focus:ring-[#4f46e5]" />
                  Auto Round Off
                </label>
                <div className="text-surface-500">{roundOffAmt > 0 ? '+' : ''}{roundOffAmt.toFixed(2)}</div>
              </div>

              <div className="pt-4 border-t border-surface-200 flex justify-between items-center mt-2">
                <span className="text-[15px] font-black text-surface-800 uppercase tracking-wide">Total Return</span>
                <span className="text-[24px] font-black text-surface-900">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="pt-4 mt-2 border-t border-surface-200">
                <div className="flex justify-between items-center mb-3">
                  <label className="flex items-center gap-2 text-[12px] font-bold text-surface-600 cursor-pointer select-none hover:text-surface-900 bg-surface-100 px-3 py-1.5 rounded-lg">
                    <input type="checkbox" checked={isFullyRefunded} onChange={e => setIsFullyRefunded(e.target.checked)} className="rounded text-green-500 focus:ring-green-500" />
                    Mark fully refunded
                  </label>
                  <select className="bg-white border border-surface-200 rounded-lg px-2 py-1 text-[11px] font-bold text-surface-600 outline-none cursor-pointer hover:border-[#4f46e5]">
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Bank</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Amount Refunded</span>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 font-black text-[16px]">₹</span>
                    <input 
                      type="number" 
                      value={effectiveRefunded} onChange={e => setAmountRefunded(e.target.value)}
                      disabled={isFullyRefunded}
                      className="w-full pl-9 pr-4 py-3 bg-white border border-surface-200 rounded-xl text-[16px] font-black text-surface-900 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 disabled:opacity-50 disabled:bg-surface-100 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// List Component
export default function PurchaseReturn() {
  const [returns, setReturns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchase_invoices, setBills] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [retRes, custRes, purchase_invoicesRes, prodRes] = await Promise.all([
        supabase.from('purchase_returns').select('*, parties(name)').order('created_at', { ascending: false }),
        supabase.from('parties').select('*').order('name'),
        supabase.from('purchase_invoices').select('*, suppliers:parties(name)').order('date', { ascending: false }),
        supabase.from('products').select('*').order('name')
      ]);
      setReturns(retRes.data || []);
      setSuppliers(custRes.data || []);
      setBills(purchase_invoicesRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (showForm) {
    return (
      <div className="bg-surface-50 overflow-y-auto animate-fade-in relative z-10 w-full min-h-[calc(100vh-6rem)]">
        <div className="max-w-[1400px] mx-auto px-4 pb-16">
          <CreateReturnForm
            suppliers={suppliers}
            products={products}
            purchase_invoices={purchase_invoices}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); fetchAll(); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-16 animate-fade-in bg-surface-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-2">
        <div>
          <h1 className="text-lg font-bold text-surface-900">Purchase Returns</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2.5 text-sm font-semibold border border-surface-200 rounded-xl text-blue-600 flex items-center gap-2 hover:bg-surface-50 bg-white shadow-sm transition-colors">
            <HiOutlineDocumentText className="w-4 h-4" /> Reports
          </button>
          <button className="p-2.5 border border-surface-200 rounded-xl text-surface-500 hover:bg-surface-50 bg-white shadow-sm transition-colors">
            <HiOutlineCog className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full md:w-80">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search returns..."
            className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] bg-white shadow-sm transition-all"
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-full md:w-auto px-5 py-2.5 bg-[#4f46e5] text-white rounded-xl text-sm font-bold hover:bg-[#4338ca] shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <HiOutlinePlus className="w-4 h-4" />
          Create Return
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-surface-200 rounded-b-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f9fafb] border-y border-surface-200 text-[12px] font-bold text-surface-700">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Return Number</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="text-[13px] text-surface-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-surface-400">Loading...</td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-surface-500">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mb-3">
                        <HiOutlineDocumentText className="w-8 h-8 text-surface-400" />
                      </div>
                      <p className="text-base font-semibold text-surface-700">No returns yet</p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-4 px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm font-semibold hover:bg-[#4338ca]"
                      >
                        + Create Purchase Return
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                returns.map(r => (
                  <tr key={r.id} className="border-b border-surface-100 hover:bg-surface-50 group cursor-pointer">
                    <td className="py-3 px-4 whitespace-nowrap">{formatDate(r.return_date)}</td>
                    <td className="py-3 px-4 text-surface-600 font-bold">{r.return_no}</td>
                    <td className="py-3 px-4">{r.parties?.name || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold">
                      ₹ {Number(r.total_return_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase border bg-green-100 text-green-700 border-green-200">
                        {r.status || 'Completed'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button className="text-surface-400 hover:text-surface-800">
                        <HiOutlineDotsVertical className="w-5 h-5" />
                      </button>
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
