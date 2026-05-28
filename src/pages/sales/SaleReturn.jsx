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
function CreateReturnForm({ onClose, onSaved, customers, products, bills }) {
  const { user } = useAuth();
  const [returnNo, setReturnNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');
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
    const { count } = await supabase.from('sale_returns').select('id', { count: 'exact', head: true });
    setReturnNo(String((count || 0) + 1).padStart(3, '0'));
  };

  const handleBillSelect = (billId) => {
    setOriginalBillId(billId);
    if (!billId) return;
    const bill = bills.find(b => b.id === billId);
    if (bill) {
      if (!customerId) setCustomerId(bill.customer_id);
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
    if (!customerId) return setError('Please select a Party.');
    if (items.length === 0) return setError('Please add at least one item.');
    setSaving(true);
    try {
      const payload = {
        return_no: 'SR-' + returnNo,
        return_date: date,
        customer_id: customerId,
        original_bill_id: originalBillId || null,
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

      const { error: err } = await supabase.from('sale_returns').insert(payload);
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
        await supabase.from('bills').update({ status: isFullyReturned ? 'fully_returned' : 'partially_returned' }).eq('id', originalBillId);
      }

      // Update Party Balance
      const netDeduction = grandTotal - effectiveRefunded;
      if (netDeduction !== 0) {
        const { data: partyData } = await supabase.from('parties').select('current_balance').eq('id', customerId).single();
        if (partyData) {
          await supabase.from('parties').update({ current_balance: Number(partyData.current_balance || 0) - netDeduction }).eq('id', customerId);
        }
      }

      if (isSaveAndNew) {
        setItems([]);
        setCustomerId('');
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

  const selectedCustomer = customers.find(c => c.id === customerId);

  return (
    <div className="animate-fade-in w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 text-surface-500 hover:bg-surface-100 rounded-full transition-colors">
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-surface-900">Create Sales Return</h1>
            <p className="text-sm text-surface-500 mt-1">Fill in details for credit note / return</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-surface-200 rounded-xl text-surface-600 bg-white hover:bg-surface-50 shadow-sm transition-colors">
            <HiOutlineCog className="w-5 h-5" /> Settings
          </button>
          <button onClick={(e) => handleSave(e, true)} disabled={saving} className="px-5 py-2.5 text-sm font-semibold border border-surface-200 rounded-xl text-surface-600 bg-white hover:bg-surface-50 shadow-sm transition-colors disabled:opacity-50">
            Save &amp; New
          </button>
          <button onClick={(e) => handleSave(e, false)} disabled={saving} className="px-6 py-2.5 text-sm font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl shadow-sm transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6 md:p-8">
        
        {/* Top: Party + Return Meta */}
        <div className="flex flex-col lg:flex-row justify-between gap-8 mb-8">
          {/* Bill To */}
          <div className="w-full lg:w-[400px] relative">
            <label className="block text-sm font-bold text-surface-700 mb-2">Bill To</label>
            {!selectedCustomer ? (
              <div
                onClick={() => setShowPartyDropdown(true)}
                className="w-full h-28 border-2 border-dashed border-[#4f46e5]/40 bg-[#4f46e5]/5 rounded-xl flex items-center justify-center cursor-pointer hover:bg-[#4f46e5]/10 text-[#4f46e5] font-bold text-sm transition-colors"
              >
                + Add Party
              </div>
            ) : (
              <div className="w-full h-28 border border-surface-200 rounded-xl p-4 flex flex-col relative group">
                <div className="font-bold text-surface-900">{selectedCustomer.name}</div>
                {selectedCustomer.phone && <div className="text-sm text-surface-500 mt-1">{selectedCustomer.phone}</div>}
                <button
                  onClick={() => { setCustomerId(''); setShowPartyDropdown(true); }}
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
                      placeholder="Search party..."
                      value={partySearch}
                      onChange={e => setPartySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg outline-none focus:border-[#4f46e5]"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {customers.filter(c => c.name.toLowerCase().includes(partySearch.toLowerCase())).map(c => (
                    <div
                      key={c.id}
                      onClick={() => { setCustomerId(c.id); setShowPartyDropdown(false); setPartySearch(''); }}
                      className="px-4 py-3 hover:bg-surface-50 cursor-pointer border-b border-surface-100 last:border-0"
                    >
                      <div className="font-bold text-surface-900 text-sm">{c.name}</div>
                      {c.phone && <div className="text-xs text-surface-500 mt-0.5">{c.phone}</div>}
                    </div>
                  ))}
                  {customers.length === 0 && <div className="p-4 text-center text-sm text-surface-500">No parties found</div>}
                </div>
              </div>
            )}
          </div>

          {/* Meta Fields */}
          <div className="flex gap-6 w-full lg:w-auto flex-wrap lg:flex-nowrap">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">Sales Return No.</label>
                <input
                  type="text"
                  value={returnNo}
                  onChange={e => setReturnNo(e.target.value)}
                  className="w-32 px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm outline-none focus:border-[#4f46e5] font-semibold text-surface-900"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-40 px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm outline-none focus:border-[#4f46e5] font-medium text-surface-900"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 relative">
              <div>
                <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">Link to Invoice</label>
                <div
                  onClick={() => setShowBillDropdown(!showBillDropdown)}
                  className="w-48 px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm cursor-pointer flex justify-between items-center hover:border-[#4f46e5]"
                >
                  <span className="truncate">{originalBillId ? bills.find(b => b.id === originalBillId)?.bill_no : '-- Select --'}</span>
                  <span className="text-surface-400 text-xs">▼</span>
                </div>
                {showBillDropdown && (
                  <div className="absolute top-full left-0 w-64 mt-2 bg-white border border-surface-200 shadow-xl rounded-xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-surface-100 bg-surface-50">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search invoices..."
                        value={billSearch}
                        onChange={e => setBillSearch(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg outline-none focus:border-[#4f46e5]"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <div onClick={() => { handleBillSelect(''); setShowBillDropdown(false); }} className="px-4 py-2 hover:bg-surface-50 cursor-pointer text-sm text-surface-500">
                        -- Clear --
                      </div>
                      {bills.filter(b => b.bill_no.toLowerCase().includes(billSearch.toLowerCase())).map(b => (
                        <div
                          key={b.id}
                          onClick={() => { handleBillSelect(b.id); setShowBillDropdown(false); setBillSearch(''); }}
                          className="px-4 py-3 hover:bg-surface-50 cursor-pointer border-b border-surface-100 last:border-0"
                        >
                          <div className="font-bold text-surface-900 text-sm">{b.bill_no}</div>
                          <div className="text-xs text-surface-500 mt-0.5">₹ {b.grand_total} • {b.customers?.name || 'Unknown'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="flex bg-[#f8f9fa] border-y border-surface-200 text-[11px] font-bold text-surface-600 uppercase tracking-wider">
          <div className="w-12 py-3 text-center border-r border-surface-200">No</div>
          <div className="flex-1 py-3 px-4 border-r border-surface-200">Items / Services</div>
          <div className="w-24 py-3 px-3 border-r border-surface-200 text-right">HSN/SAC</div>
          <div className="w-24 py-3 px-3 border-r border-surface-200 text-right">Qty</div>
          <div className="w-32 py-3 px-3 border-r border-surface-200 text-right">Price/Item (₹)</div>
          <div className="w-24 py-3 px-3 border-r border-surface-200 text-right">Discount</div>
          <div className="w-24 py-3 px-3 border-r border-surface-200 text-right">Tax</div>
          <div className="w-32 py-3 px-4 text-right">Amount (₹)</div>
          <div className="w-12 py-3"></div>
        </div>

        {/* Items */}
        <div className="min-h-[120px]">
          {items.map((item, idx) => (
            <div key={idx} className="flex border-b border-surface-200 group hover:bg-surface-50 transition-colors">
              <div className="w-12 py-3 text-center text-sm text-surface-500 flex items-center justify-center font-medium border-r border-surface-200">
                {idx + 1}
              </div>
              <div className="flex-1 py-2 px-4 border-r border-surface-200">
                <input
                  type="text"
                  value={item.name}
                  onChange={e => updateItem(idx, 'name', e.target.value)}
                  placeholder="Item Name"
                  className="w-full text-sm font-semibold text-surface-900 bg-transparent outline-none placeholder:font-normal"
                />
              </div>
              <div className="w-24 py-2 px-3 border-r border-surface-200 flex items-center">
                <input type="text" value={item.hsn || ''} onChange={e => updateItem(idx, 'hsn', e.target.value)} className="w-full text-sm text-right bg-transparent outline-none" />
              </div>
              <div className="w-24 py-2 px-3 border-r border-surface-200 flex items-center">
                <input type="number" min="1" max={item.original_qty || 9999} value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} className="w-full text-sm text-right bg-transparent outline-none font-bold" />
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
          ))}

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
                placeholder="Return reason or remarks..."
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
                <div className="flex items-center gap-1 cursor-pointer"><HiOutlinePlus className="w-4 h-4" /> Add Additional Charges</div>
                <div className="flex items-center gap-1">
                  <span>₹</span>
                  <input type="number" value={additionalCharges} onChange={e => setAdditionalCharges(e.target.value)} className="w-20 border-b border-surface-300 bg-transparent text-right outline-none text-surface-900 font-bold focus:border-[#4f46e5]" />
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-[#4f46e5] font-medium">
                <div className="flex items-center gap-1 cursor-pointer"><HiOutlinePlus className="w-4 h-4" /> Add Discount</div>
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
                    Mark as fully refunded
                    <input type="checkbox" checked={isFullyRefunded} onChange={e => setIsFullyRefunded(e.target.checked)} className="rounded text-[#4f46e5] focus:ring-[#4f46e5]" />
                  </label>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-surface-700 mb-2">
                  <span>Amount Refunded</span>
                </div>
                <div className="flex bg-white border border-surface-200 rounded-xl overflow-hidden focus-within:border-[#4f46e5] transition-colors">
                  <span className="px-4 py-3 bg-surface-50 text-surface-500 font-bold border-r border-surface-200">₹</span>
                  <input
                    type="number"
                    disabled={isFullyRefunded}
                    value={effectiveRefunded}
                    onChange={e => setAmountRefunded(e.target.value)}
                    className="w-full px-4 py-3 outline-none font-bold text-surface-900 disabled:bg-surface-50"
                  />
                  <select className="px-3 border-l border-surface-200 bg-surface-50 text-surface-700 outline-none font-semibold text-sm cursor-pointer">
                    <option>Cash</option>
                    <option>UPI</option>
                  </select>
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
export default function SaleReturn() {
  const [returns, setReturns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
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
      const [retRes, custRes, billsRes, prodRes] = await Promise.all([
        supabase.from('sale_returns').select('*, parties(name)').order('created_at', { ascending: false }),
        supabase.from('parties').select('*').in('party_type', ['customer', 'both']).order('name'),
        supabase.from('bills').select('*, customers:parties(name)').order('date', { ascending: false }),
        supabase.from('products').select('*').order('name')
      ]);
      setReturns(retRes.data || []);
      setCustomers(custRes.data || []);
      setBills(billsRes.data || []);
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
            customers={customers}
            products={products}
            bills={bills}
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
          <h1 className="text-lg font-bold text-surface-900">Sales Returns</h1>
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
                        + Create Sales Return
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
