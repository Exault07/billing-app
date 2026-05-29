import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import PartySelect from '../../components/shared/PartySelect';
import AddItemsModal from '../../components/shared/AddItemsModal';

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
  HiOutlinePencilAlt,
  HiOutlineDocumentDuplicate,
  HiOutlineReceiptRefund,
  HiOutlineBan,
  HiOutlineTrash,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineTrendingUp,
  HiOutlineCalendar
} from 'react-icons/hi';
import ActionMenu from '../../components/ActionMenu';

// ─── Helper ─────────────────────────────────────────────────────────────────
async function generateBillNo() {
  const { count } = await supabase.from('bills').select('id', { count: 'exact', head: true });
  return String((count || 0) + 1);
}

// ─── Add Items Modal ────────────────────────────────────────────────────────


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
    <div className="animate-fade-in w-full">

      {/* Page Header */}
      <div className="flex items-center justify-between mb-3 pt-2">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-800 rounded-full transition-colors">
            <HiOutlineArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-[15px] font-bold text-surface-900">Create Sales Invoice</h1>
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
          <div className="w-full lg:w-[240px] flex-shrink-0">
            <PartySelect
              label="Bill To"
              partyType="customer"
              parties={customers}
              selectedParty={selectedCustomer}
              onSelect={(p) => setCustomerId(p.id)}
              onClear={() => setCustomerId('')}
            />
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
                  {colVisibility.image && <th className="py-2.5 px-3 w-12 text-center">Img</th>}
                  {colVisibility.code && <th className="py-2.5 px-3 w-20">Code</th>}
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
export default function SalesInvoices() {
  const navigate = useNavigate();

  const handleCancelBill = async (bill) => {
    if (bill.status === 'cancelled') return alert('Already cancelled.');
    if (!window.confirm('Are you sure you want to cancel Invoice ' + bill.bill_no + '?')) return;
    try {
      const unpaid = Number(bill.balance_due);
      if (unpaid > 0 && bill.customer_id) {
        const { data: party } = await supabase.from('parties').select('current_balance').eq('id', bill.customer_id).single();
        if (party) {
          await supabase.from('parties').update({ current_balance: Number(party.current_balance) - unpaid }).eq('id', bill.customer_id);
        }
      }
      const { error } = await supabase.from('bills').update({ status: 'cancelled' }).eq('id', bill.id);
      if (error) throw error;
      alert('Invoice cancelled successfully.');
      fetchAll();
    } catch (err) {
      alert('Error cancelling: ' + err.message);
    }
  };

  const handleDeleteBill = async (bill) => {
    if (!window.confirm('Are you sure you want to delete Invoice ' + bill.bill_no + '? This cannot be undone.')) return;
    try {
      if (bill.status !== 'cancelled') {
        const unpaid = Number(bill.balance_due);
        if (unpaid > 0 && bill.customer_id) {
          const { data: party } = await supabase.from('parties').select('current_balance').eq('id', bill.customer_id).single();
          if (party) {
            await supabase.from('parties').update({ current_balance: Number(party.current_balance) - unpaid }).eq('id', bill.customer_id);
          }
        }
        await supabase.from('bills').update({ status: 'cancelled' }).eq('id', bill.id);
      }
      await supabase.from('bill_payments').delete().eq('bill_id', bill.id);
      const { error } = await supabase.from('bills').delete().eq('id', bill.id);
      if (error) throw error;
      alert('Invoice deleted successfully.');
      fetchAll();
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  const buildMenuOptions = (bill) => [
    { label: 'Edit', icon: <HiOutlinePencilAlt />, onClick: () => navigate('/billing/' + bill.id + '/edit') },
    { label: 'Duplicate', icon: <HiOutlineDocumentDuplicate />, onClick: () => navigate('/billing/new', { state: { duplicateFrom: bill.id } }) },
    { label: 'Issue Credit Note', icon: <HiOutlineReceiptRefund />, onClick: () => navigate('/sales/returns', { state: { selectedBillId: bill.id } }) },
    { divider: true },
    { label: 'Cancel Invoice', icon: <HiOutlineBan />, onClick: () => handleCancelBill(bill), danger: true },
    { label: 'Delete', icon: <HiOutlineTrash />, onClick: () => handleDeleteBill(bill), danger: true }
  ];

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
  const [showReports, setShowReports] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Invoice Quick Settings (persisted to localStorage)
  const [invoiceSettings, setInvoiceSettings] = useState({ showPurchasePrice: true, priceHistory: true, invoiceTheme: "Billbook(A5)" });
  const [settingsDraft, setSettingsDraft] = useState(invoiceSettings);

  const saveInvoiceSettings = async () => {
    setInvoiceSettings(settingsDraft);
    setShowSettings(false);
    try {
      const { data: existing } = await supabase.from('shop_settings').select('id').limit(1).maybeSingle();
      if (existing) {
        await supabase.from('shop_settings').update({
          invoice_theme: settingsDraft.invoiceTheme,
          show_purchase_price: settingsDraft.showPurchasePrice,
          show_price_history: settingsDraft.priceHistory
        }).eq('id', existing.id);
      } else {
        await supabase.from('shop_settings').insert([{
          shop_name: 'My Shop',
          invoice_theme: settingsDraft.invoiceTheme,
          show_purchase_price: settingsDraft.showPurchasePrice,
          show_price_history: settingsDraft.priceHistory
        }]);
      }
    } catch (err) {
      console.error('Failed to save invoice settings:', err);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: billData }, { data: custData }, { data: prodData }, { data: carpData }] = await Promise.all([
        supabase.from('bills').select('*').order('date', { ascending: false }),
        supabase.from('parties').select('*').order('name'),
        supabase.from('products').select('*, units(name)').order('name'),
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

  const renderSettingsModal = () => {
    if (!showSettings) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setShowSettings(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
            <h2 className="text-[17px] font-bold text-surface-800">Quick Invoice Settings</h2>
            <button onClick={() => setShowSettings(false)} className="text-surface-400 hover:text-surface-700"><HiOutlineX className="w-5 h-5" /></button>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[14px] font-semibold text-surface-800">Show Purchase Price while adding Items</p>
                <p className="text-[12px] text-surface-500 mt-0.5">Add purchase price while adding items</p>
              </div>
              <button
                onClick={() => setSettingsDraft(p => ({ ...p, showPurchasePrice: !p.showPurchasePrice }))}
                className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ' + (settingsDraft.showPurchasePrice ? 'bg-indigo-600' : 'bg-surface-200')}
              >
                <span className={'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ' + (settingsDraft.showPurchasePrice ? 'translate-x-6' : 'translate-x-1')} />
              </button>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-surface-800">Price History</p>
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">New</span>
                </div>
                <p className="text-[12px] text-surface-500 mt-0.5">Show last 5 sales / purchase prices of the item for the selected party in Invoice</p>
              </div>
              <button
                onClick={() => setSettingsDraft(p => ({ ...p, priceHistory: !p.priceHistory }))}
                className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ' + (settingsDraft.priceHistory ? 'bg-indigo-600' : 'bg-surface-200')}
              >
                <span className={'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ' + (settingsDraft.priceHistory ? 'translate-x-6' : 'translate-x-1')} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[14px] font-semibold text-surface-800">Choose Invoice Theme</p>
              <select
                value={settingsDraft.invoiceTheme}
                onChange={e => setSettingsDraft(p => ({ ...p, invoiceTheme: e.target.value }))}
                className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm text-surface-700 focus:outline-none focus:border-indigo-400 bg-white"
              >
                <option>Billbook(A5)</option>
                <option>Classic(A4)</option>
                <option>Modern</option>
                <option>Minimal</option>
                <option>Professional</option>
              </select>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
              <p className="text-sm font-bold text-indigo-800">Now customise Invoice with ease</p>
              <button
                onClick={() => { setShowSettings(false); navigate('/settings'); }}
                className="text-sm font-bold text-indigo-600 flex items-center gap-1 hover:underline whitespace-nowrap"
              >
                Full Invoice Settings →
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-200">
            <button onClick={() => setShowSettings(false)} className="px-5 py-2 text-sm font-semibold border border-surface-200 rounded-lg text-surface-600 hover:bg-surface-50">Cancel</button>
            <button onClick={saveInvoiceSettings} className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">Save</button>
          </div>
        </div>
      </div>
    );
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
          invoiceSettings={invoiceSettings}
          onOpenSettings={() => setShowSettings(true)}
        />
        {renderSettingsModal()}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">

      {/* ─── Quick Invoice Settings Modal ─── */}
      {renderSettingsModal()}

      {/* ─── Reports Panel ─── */}
      {showReports && (
        <div className="fixed inset-0 z-40" onClick={() => setShowReports(false)}>
          <div
            className="absolute bg-white rounded-2xl shadow-2xl border border-surface-200 w-80 overflow-hidden"
            style={{ top: '80px', right: '180px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-surface-200">
              <h3 className="font-bold text-surface-900 text-[15px]">Sales Report</h3>
              <p className="text-xs text-surface-500 mt-0.5">Summary of all your sales activity</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center py-2.5 px-3 bg-purple-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <HiOutlineCash className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-surface-700">Total Sales</span>
                </div>
                <span className="font-black text-surface-900">₹ {totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 px-3 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <HiOutlineCheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-surface-700">Amount Received</span>
                </div>
                <span className="font-black text-green-700">₹ {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 px-3 bg-red-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <HiOutlineExclamationCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-semibold text-surface-700">Outstanding</span>
                </div>
                <span className="font-black text-red-700">₹ {totalUnpaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 px-3 bg-surface-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <HiOutlineDocumentText className="w-4 h-4 text-surface-500" />
                  <span className="text-sm font-semibold text-surface-700">Total Invoices</span>
                </div>
                <span className="font-black text-surface-900">{bills.filter(b => b.status !== 'cancelled').length}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 px-3 bg-surface-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <HiOutlineTrendingUp className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-surface-700">Paid Invoices</span>
                </div>
                <span className="font-black text-indigo-700">{bills.filter(b => Number(b.balance_due) <= 0 && b.status !== 'cancelled').length}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 px-3 bg-surface-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <HiOutlineCalendar className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-semibold text-surface-700">Unpaid Invoices</span>
                </div>
                <span className="font-black text-orange-700">{bills.filter(b => Number(b.balance_due) > 0 && b.status !== 'cancelled').length}</span>
              </div>
            </div>
            <div className="px-4 pb-4">
              <button onClick={() => setShowReports(false)} className="w-full py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-2">
        <div>
          <h1 className="text-lg font-bold text-surface-900">Sales Invoices</h1>
        </div>
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => { setShowReports(!showReports); setShowSettings(false); }}
            className={'px-4 py-2.5 text-sm font-semibold border rounded-xl flex items-center gap-2 shadow-sm transition-colors ' + (showReports ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-surface-200 text-blue-600 bg-white hover:bg-surface-50')}
          >
            <HiOutlineDocumentText className="w-4 h-4" /> Reports
            {showReports ? <HiOutlineChevronUp className="w-3.5 h-3.5" /> : <HiOutlineChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => { setShowSettings(!showSettings); setShowReports(false); }}
            className={'p-2.5 border rounded-xl shadow-sm transition-colors ' + (showSettings ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-surface-200 text-surface-500 bg-white hover:bg-surface-50')}
            title="Quick Invoice Settings"
          >
            <HiOutlineCog className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <span className="mt-0.5 text-red-400">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl py-3 px-4 shadow-sm border border-[#e0e7ff] bg-[#f8f7ff] flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1 text-[#7c3aed]">
            <HiOutlineCash className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Sales</span>
          </div>
          <div className="text-xl font-bold text-surface-900">
            ₹ {totalSales.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
          </div>
        </div>
        <div className="bg-white rounded-xl py-3 px-4 shadow-sm border border-surface-200 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1 text-green-600">
            <HiOutlineCheckCircle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Paid</span>
          </div>
          <div className="text-xl font-bold text-surface-900">
            ₹ {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-xl py-3 px-4 shadow-sm border border-surface-200 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1 text-red-600">
            <HiOutlineExclamationCircle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Unpaid</span>
          </div>
          <div className="text-xl font-bold text-surface-900">
            ₹ {totalUnpaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-xl py-3 px-4 shadow-sm border border-surface-200 flex flex-col justify-center opacity-70">
          <div className="flex items-center gap-1.5 mb-1 text-surface-500">
            <HiOutlineXCircle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Cancelled</span>
          </div>
          <div className="text-xl font-bold text-surface-900">
            {bills.filter(b => b.status === 'cancelled').length}
          </div>
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
                        <input type="checkbox" className="rounded border-surface-300" />
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
                      <td className="py-3 px-4 text-center"><ActionMenu options={buildMenuOptions(b)} /></td>
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
