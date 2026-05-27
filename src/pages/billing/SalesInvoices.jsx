import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineArrowLeft,
  HiOutlineCog,
  HiOutlineX,
  HiOutlinePlus,
  HiOutlineQrcode,
  HiOutlineSearch,
  HiOutlineDocumentText,
  HiOutlineCash,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineXCircle,
  HiOutlineDotsVertical,
} from 'react-icons/hi';

// â”€â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function generateBillNo() {
  const { count } = await supabase.from('bills').select('id', { count: 'exact', head: true });
  return String((count || 0) + 1);
}

// â”€â”€â”€ Add Items Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AddItemsModal({ products, onAdd, onClose }) {
  const [search, setSearch] = useState('');
  const [selectedQtys, setSelectedQtys] = useState({});
  const [addedIds, setAddedIds] = useState({});

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
          <button onClick={onClose} className="text-surface-400 hover:text-surface-800">
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
                <th className="py-2.5 px-4">Purchase Price</th>
                <th className="py-2.5 px-4 text-right pr-6">Quantity</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-surface-400">No items found</td>
                </tr>
              ) : (
                filtered.map(p => (
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
                    <td className="py-3 px-4">₹ {Number(p.selling_price).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">₹ {Number(p.purchase_price || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right pr-3">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number" min="1"
                          value={selectedQtys[p.id] || 1}
                          onChange={e => setSelectedQtys(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAdd(p);
                          }}
                          className="w-16 border border-surface-200 rounded px-2 py-1 text-center text-[12px]"
                        />
                        {addedIds[p.id] ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAdd(p); }}
                            className="bg-[#e9d5ff] text-[#7c3aed] font-bold px-3 py-1 rounded text-[12px] min-w-[64px]"
                          >
                            Added âœ“
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
            <button onClick={onClose} className="px-4 py-1.5 border border-surface-200 rounded text-[13px] font-medium text-surface-600 bg-white hover:bg-surface-50">
              Cancel [ESC]
            </button>
            <button onClick={onClose} className="px-4 py-1.5 bg-[#7c3aed] text-white rounded text-[13px] font-bold hover:bg-[#6d28d9]">
              Add to Bill [F7]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Create Invoice Form (Full Page) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€// ðŸ¢ Create Invoice Form (Full Page) ðŸ¢
function CreateInvoiceForm({ onClose, onSaved, customers, products, carpenters }) {
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
  const [partySearch, setPartySearch] = useState('');

  // Computed totals
  const subtotal = items.reduce((s, i) => s + Number(i.total || 0), 0);
  const taxableAmount = subtotal + Number(additionalCharges);
  const grandTotalRaw = taxableAmount - Number(overallDiscount);
  const roundOffAmt = autoRoundOff ? Math.round(grandTotalRaw) - grandTotalRaw : 0;
  const grandTotal = grandTotalRaw + roundOffAmt;
  const effectiveReceived = isFullyPaid ? grandTotal : Number(amountReceived);
  const balanceDue = grandTotal - effectiveReceived;

  useEffect(() => {
    generateBillNo().then(setBillNo);
  }, []);

  useEffect(() => {
    if (date && paymentTerms) {
      const d = new Date(date);
      d.setDate(d.getDate() + Number(paymentTerms));
      setDueDate(d.toISOString().split('T')[0]);
    }
  }, [date, paymentTerms]);

  const handleAddItemFromModal = (product, qty) => {
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
      onSaved();
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === customerId);

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-16 bg-surface-50 min-h-screen">

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 text-surface-500 hover:bg-surface-100 hover:text-surface-800 rounded-full transition-colors">
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Create Sales Invoice</h1>
            <p className="text-sm text-surface-500 mt-1">Fill in the details below to generate an invoice</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-surface-200 rounded-xl text-surface-600 bg-white hover:bg-surface-50 shadow-sm transition-colors">
            <HiOutlineCog className="w-5 h-5" /> Settings
          </button>
          <button className="px-5 py-2.5 text-sm font-semibold border border-surface-200 rounded-xl text-surface-600 bg-white hover:bg-surface-50 shadow-sm transition-colors">
            Save &amp; New
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <span className="mt-0.5 text-red-400">âš </span>
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6 md:p-8">

        {/* Top: Party + Invoice Meta */}
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
              <div className="w-full min-h-[96px] border border-surface-200 rounded p-4 relative group">
                <div className="font-bold text-[15px] text-surface-800">{selectedCustomer.name}</div>
                {selectedCustomer.phone && (
                  <div className="text-[12px] text-surface-500">{selectedCustomer.phone}</div>
                )}
                <div className="text-[12px] text-surface-500 mt-1">
                  Balance: ₹ {selectedCustomer.balance}
                </div>
                <button
                  onClick={() => setCustomerId('')}
                  className="absolute top-2 right-2 text-surface-400 hover:text-red-500  transition-opacity"
                >
                  <HiOutlineX className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Party Search Dropdown */}
            {showPartyDropdown && !selectedCustomer && (
              <div className="absolute top-[56px] left-0 w-[380px] bg-white border-2 border-[#7c3aed] rounded shadow-2xl z-50">
                <div className="p-2 border-b border-surface-200">
                  <input
                    autoFocus
                    placeholder="Search party by name or number"
                    value={partySearch}
                    onChange={e => setPartySearch(e.target.value)}
                    className="w-full outline-none text-[13px] px-2 py-1"
                  />
                </div>
                <div className="flex justify-between px-4 py-1.5 bg-surface-50 text-[10px] font-bold text-surface-500 uppercase border-b">
                  <span>Party Name</span>
                  <span>Balance</span>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {customers
                    .filter(c => c.name.toLowerCase().includes(partySearch.toLowerCase()))
                    .map(c => (
                      <div
                        key={c.id}
                        onClick={() => { setCustomerId(c.id); setShowPartyDropdown(false); setPartySearch(''); }}
                        className="flex justify-between px-4 py-2.5 hover:bg-[#f5f3ff] cursor-pointer border-b border-surface-100 text-[13px]"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-surface-500">₹ {c.balance}</span>
                      </div>
                    ))}
                </div>
                <div className="m-2 p-2 border-2 border-dashed border-blue-300 bg-blue-50/30 rounded text-center text-blue-600 font-bold text-[13px] cursor-pointer hover:bg-blue-50">
                  + Create Party
                </div>
              </div>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="flex flex-col gap-4 bg-surface-50/50 p-4 rounded-xl border border-surface-100">
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1 uppercase tracking-wide">Invoice No:</label>
                <input
                  value={billNo}
                  onChange={e => setBillNo(e.target.value)}
                  className="w-32 px-3 py-2 border border-surface-200 rounded-lg text-sm bg-surface-50 focus:outline-none focus:border-[#4f46e5]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1 uppercase tracking-wide">Invoice Date:</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-40 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-[#4f46e5]"
                />
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1 uppercase tracking-wide">Payment Terms:</label>
                <div className="flex">
                  <input
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-16 px-3 py-2 border border-r-0 border-surface-200 rounded-l-lg text-sm text-right focus:outline-none focus:border-[#4f46e5]"
                  />
                  <span className="px-3 py-2 border border-surface-200 rounded-r-lg bg-surface-50 text-sm text-surface-500 font-medium">
                    days
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1 uppercase tracking-wide">Due Date:</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-40 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:border-[#4f46e5]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* â”€â”€ Referral Section â”€â”€ */}
        <div className="flex gap-6 mb-8 p-4 bg-[#f5f3ff] border border-surface-200 rounded">
          <div>
            <label className="block text-[11px] font-medium text-surface-500 mb-1">Referred By (Carpenter / Worker):</label>
            <select 
              value={carpenterId} 
              onChange={(e) => {
                setCarpenterId(e.target.value);
                const selected = carpenters.find(c => c.id === e.target.value);
                if (selected) setCommissionRate(selected.default_commission_rate);
              }}
              className="w-64 px-3 py-1.5 border border-surface-200 rounded text-[13px] bg-white outline-none focus:border-[#7c3aed]"
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
                className="w-32 px-3 py-1.5 border border-surface-200 rounded text-[13px] bg-white outline-none focus:border-[#7c3aed]"
              />
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="border border-surface-200 rounded mb-8">
          <table className="w-full text-left">
            <thead className="bg-[#f9fafb] border-b border-surface-200">
              <tr className="text-[11px] font-bold text-surface-500 uppercase">
                <th className="py-2.5 px-3 w-8">#</th>
                <th className="py-2.5 px-3">Items / Services</th>
                <th className="py-2.5 px-3 w-20">HSN/SAC</th>
                <th className="py-2.5 px-3 w-16 text-right">Qty</th>
                <th className="py-2.5 px-3 w-28 text-right">Price (₹)</th>
                <th className="py-2.5 px-3 w-20 text-right">Disc.</th>
                <th className="py-2.5 px-3 w-16 text-right">Tax%</th>
                <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-6 px-3 text-surface-400 text-center">
                    No items added yet. Click &quot;+ Add Item&quot; below.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
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
                    <td className="py-2 px-3">
                      <input
                        type="number" min="0"
                        value={item.qty}
                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-surface-200 focus:border-blue-400 outline-none text-right"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number" min="0"
                        value={item.price}
                        onChange={e => updateItem(idx, 'price', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-surface-200 focus:border-blue-400 outline-none text-right"
                      />
                    </td>
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
                    <td className="py-2 px-3">
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-surface-300 hover:text-red-500  transition-opacity"
                      >
                        <HiOutlineX className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
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

        {/* Bottom: Notes + Calculations */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Notes */}
          <div className="flex-1 space-y-4">
            <div className="text-blue-600 font-medium text-[13px] cursor-pointer hover:underline">+ Add Notes</div>
            <div>
              <label className="block text-[12px] font-bold text-surface-700 mb-1">Terms and Conditions</label>
              <textarea
                value={terms}
                onChange={e => setTerms(e.target.value)}
                rows={3}
                className="w-full bg-surface-100 rounded p-3 text-[12px] text-surface-700 resize-none outline-none focus:ring-1 focus:ring-surface-300"
              />
            </div>
            <div className="text-blue-600 font-medium text-[13px] cursor-pointer hover:underline">+ Add Bank Account</div>
            <div className="text-blue-600 font-medium text-[13px] cursor-pointer hover:underline">+ Add Payment QR</div>
          </div>

          {/* Calculations Panel */}
          <div className="w-full lg:w-[390px] border border-surface-200 rounded overflow-hidden text-[13px]">
            <div className="p-4 space-y-3">
              <div className="flex justify-between font-bold text-surface-800">
                <span>SUBTOTAL</span>
                <span>₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-600 font-medium">+ Add Additional Charges</span>
                <input
                  type="number"
                  value={additionalCharges || ''}
                  onChange={e => setAdditionalCharges(e.target.value)}
                  placeholder="0"
                  className="w-24 text-right border-b border-surface-200 outline-none text-surface-700 bg-transparent"
                />
              </div>
              <div className="flex justify-between font-bold text-surface-700">
                <span>Taxable Amount</span>
                <span>₹ {taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-600 font-medium">+ Add Discount</span>
                <input
                  type="number"
                  value={overallDiscount || ''}
                  onChange={e => setOverallDiscount(e.target.value)}
                  placeholder="0"
                  className="w-24 text-right border-b border-surface-200 outline-none text-surface-700 bg-transparent"
                />
              </div>
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRoundOff}
                    onChange={e => setAutoRoundOff(e.target.checked)}
                    className="rounded"
                  />
                  <span>Auto Round Off</span>
                </label>
                <span className="text-surface-600">
                  {autoRoundOff ? '₹ ' + roundOffAmt.toFixed(2) : '0'}
                </span>
              </div>
            </div>

            {/* Total Box */}
            <div className="bg-surface-100 px-4 py-3 border-y border-surface-200 flex justify-between items-center">
              <span className="font-bold text-[15px] text-surface-900">Total Amount</span>
              <span className="font-black text-[20px] text-surface-900">
                ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex justify-end">
                <label className="flex items-center gap-2 text-[12px] text-surface-600 cursor-pointer">
                  Mark as fully paid
                  <input
                    type="checkbox"
                    checked={isFullyPaid}
                    onChange={e => setIsFullyPaid(e.target.checked)}
                    className="rounded"
                  />
                </label>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-surface-700">Amount Received</span>
                <div className="flex border border-surface-200 rounded overflow-hidden w-36">
                  <span className="bg-surface-100 px-2 py-1.5 text-surface-500 text-[12px]">₹</span>
                  <input
                    type="number"
                    value={isFullyPaid ? grandTotal : amountReceived}
                    onChange={e => { setAmountReceived(e.target.value); setIsFullyPaid(false); }}
                    className="w-full text-right px-2 py-1.5 outline-none font-bold text-[13px]"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-surface-500">Balance Amount</span>
                <span className={'font-bold text-[15px] ' + (balanceDue > 0 ? 'text-red-600' : 'text-green-600')}>
                  ₹ {balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Items Modal */}
      {showItemModal && (
        <AddItemsModal
          products={products}
          onAdd={handleAddItemFromModal}
          onClose={() => setShowItemModal(false)}
        />
      )}
    </div>
  );
}

// â”€â”€â”€ Main: Sales Invoices List Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function SalesInvoices() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [carpenters, setCarpenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalUnpaid, setTotalUnpaid] = useState(0);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: billData }, { data: custData }, { data: prodData }, { data: carpData }] = await Promise.all([
        supabase
          .from('bills')
          .select('*')
          .order('date', { ascending: false }),
        supabase.from('parties').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
        supabase.from('carpenters').select('id, name, default_commission_rate').order('name'),
      ]);

      const processed = (billData || []).map(b => {
        const party = custData?.find(p => p.id === b.customer_id) || {};
        return {
          ...b,
          customers: { name: party.name || '-' },
          paid_amount: b.advance_paid || 0,
          due_amount: b.balance_due || 0,
          calculated_amount: Number(b.grand_total || (Number(b.balance_due) + Number(b.advance_paid))),
        };
      });

      setBills(processed);
      setCustomers(custData || []);
      setProducts(prodData || []);
      setCarpenters(carpData || []);

      let tS = 0, tP = 0, tU = 0;
      processed.forEach(b => {
        if (b.status !== 'cancelled') {
          tS += b.calculated_amount;
          tP += Number(b.advance_paid || 0);
          tU += Number(b.balance_due || 0);
        }
      });
      setTotalSales(tS);
      setTotalPaid(tP);
      setTotalUnpaid(tU);
    } catch (err) {
      setError(err.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(b =>
    b.bill_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const calcDueIn = (dueDate, isPaid) => {
    if (isPaid || !dueDate) return '-';
    const diff = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return diff < 0 ? 'Overdue' : diff + ' Days';
  };

  // If creating, render the full-page form instead of the list
  if (showForm) {
    return (
      <div className="bg-white overflow-y-auto animate-fade-in relative z-10">
        <CreateInvoiceForm
          customers={customers}
          products={products}
          carpenters={carpenters}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchAll(); }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-16 animate-fade-in bg-surface-50 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Sales Invoices</h1>
          <p className="text-sm text-surface-500 mt-1">Manage and track your sales invoices</p>
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
          <span className="mt-0.5 text-red-400">âš </span>
          <span>{error}</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e0e7ff] bg-[#f8f7ff] flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-[#7c3aed]">
            <HiOutlineCash className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Total Sales</span>
          </div>
          <div className="text-3xl font-black text-surface-900">
            ₹ {totalSales.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-surface-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-green-600">
            <HiOutlineCheckCircle className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Paid</span>
          </div>
          <div className="text-3xl font-black text-surface-900">
            ₹ {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-surface-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-red-600">
            <HiOutlineExclamationCircle className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Unpaid</span>
          </div>
          <div className="text-3xl font-black text-surface-900">
            ₹ {totalUnpaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-surface-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 text-surface-500">
            <HiOutlineXCircle className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Cancelled</span>
          </div>
          <div className="text-3xl font-black text-surface-900">-</div>
        </div>
      </div>

      {/* Filter + Action Bar */}
      <div className="bg-white p-4 rounded-t-2xl border border-surface-200 border-b-0 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]"
            />
          </div>
          <select className="px-3 py-2 text-sm border border-surface-200 rounded-xl bg-white text-surface-600 focus:outline-none focus:border-[#4f46e5]">
            <option>Last 365 Days</option>
            <option>This Month</option>
            <option>All Time</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-3 py-2 text-sm font-semibold border border-surface-200 rounded-xl bg-white text-surface-700 focus:outline-none focus:border-[#4f46e5]">
            <option>Bulk Actions</option>
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 text-sm font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl shadow-sm transition-colors"
          >
            + Create Invoice
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-surface-200 rounded-b-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f9fafb] border-y border-surface-200 text-[12px] font-bold text-surface-700">
              <tr>
                <th className="py-3 px-4 w-12 text-center">
                  <input type="checkbox" className="rounded border-surface-300" />
                </th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Invoice Number</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4">Due In</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="text-[13px] text-surface-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-surface-400">Loading invoices...</td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-surface-500">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mb-3">
                        <HiOutlineDocumentText className="w-8 h-8 text-surface-400" />
                      </div>
                      <p className="text-base font-semibold text-surface-700">No invoices yet</p>
                      <p className="text-sm mt-1 mb-4">Click below to create your first sales invoice.</p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700"
                      >
                        + Create Sales Invoice
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBills.map(b => {
                  const isPaid = Number(b.balance_due) <= 0;
                  const isCancelled = b.status === 'cancelled';
                  return (
                    <tr
                      key={b.id}
                      className="border-b border-surface-100 hover:bg-surface-50 group cursor-pointer"
                      onClick={() => navigate('/billing/' + b.id)}
                    >
                      <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-surface-300 " />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{formatDate(b.date)}</td>
                      <td className="py-3 px-4 text-surface-600">{b.bill_no.replace('BILL-', '')}</td>
                      <td className="py-3 px-4">{b.customers?.name || '-'}</td>
                      <td className="py-3 px-4">{calcDueIn(b.due_date, isPaid || isCancelled)}</td>
                      <td className="py-3 px-4">
                        <div>
                          ₹ {b.calculated_amount.toLocaleString('en-IN')}
                        </div>
                        {!isPaid && !isCancelled && Number(b.balance_due) > 0 && (
                          <div className="text-[11px] text-surface-500 mt-0.5">
                            (₹ {Number(b.balance_due).toLocaleString('en-IN')} unpaid)
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={
                          'inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase border ' +
                          (isCancelled
                            ? 'bg-surface-100 text-surface-500 border-surface-200'
                            : isPaid
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : (Number(b.advance_paid) > 0 && Number(b.balance_due) > 0)
                                ? 'bg-orange-100 text-orange-700 border-orange-200'
                                : 'bg-red-100 text-red-700 border-red-200')
                        }>
                          {isCancelled ? 'Cancelled' : isPaid ? 'Paid' : (Number(b.advance_paid) > 0 && Number(b.balance_due) > 0) ? 'Partial' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <button className="text-surface-400 hover:text-surface-800">
                          <HiOutlineDotsVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
