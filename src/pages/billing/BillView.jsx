import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAudit, computeDiff } from '../../utils/auditLog';
import {
  HiOutlinePrinter,
  HiOutlinePencil,
  HiOutlineArrowLeft,
  HiOutlineDocumentText,
  HiOutlineCash,
  HiOutlineDuplicate,
  HiOutlineX,
  HiOutlineRefresh,
  HiOutlineClipboardList,
} from 'react-icons/hi';

const WhatsAppIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

// ─── Record Payment Modal ─────────────────────────────────────────────────────
function RecordPaymentModal({ bill, onClose, onSaved, userId }) {
  const maxAmount = Number(bill.balance_due || 0);
  const [amount, setAmount] = useState(maxAmount.toFixed(2));
  const [mode, setMode] = useState('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError('Enter a valid amount.');
    if (amt > maxAmount) return setError('Amount exceeds balance due of Rs. ' + fmt(maxAmount));
    setSaving(true);
    setError('');
    try {
      // 1. Insert payment record
      await supabase.from('bill_payments').insert({
        bill_id: bill.id,
        amount: amt,
        payment_mode: mode,
        date,
        notes,
        created_by: userId,
      });

      // 2. Update bill
      const newAdvance = Number(bill.advance_paid || 0) + amt;
      const newBalance = Number(bill.grand_total || 0) - newAdvance;
      const newStatus = newBalance <= 0 ? 'final' : bill.status;

      await supabase.from('bills').update({
        advance_paid: newAdvance,
        balance_due: Math.max(0, newBalance),
        status: newStatus,
        payment_mode: mode,
      }).eq('id', bill.id);

      // 3. Audit log
      await logAudit({
        tableName: 'bills',
        recordId: bill.id,
        changedBy: userId,
        changeType: 'updated',
        oldData: { advance_paid: bill.advance_paid, balance_due: bill.balance_due, status: bill.status },
        newData: { advance_paid: newAdvance, balance_due: Math.max(0, newBalance), status: newStatus },
      });

      onSaved();
    } catch (err) {
      setError('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-[#f5f3ff]">
          <h3 className="text-[16px] font-bold text-surface-800 flex items-center gap-2">
            <HiOutlineCash className="w-5 h-5 text-[#7c3aed]" />
            Record Payment
          </h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-800">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="bg-surface-50 rounded-lg p-3 text-[13px]">
            <div className="flex justify-between text-surface-600">
              <span>Bill No:</span>
              <span className="font-bold text-surface-800">{bill.bill_no}</span>
            </div>
            <div className="flex justify-between text-surface-600 mt-1">
              <span>Grand Total:</span>
              <span className="font-bold">Rs. {fmt(bill.grand_total)}</span>
            </div>
            <div className="flex justify-between text-red-600 mt-1">
              <span>Balance Due:</span>
              <span className="font-black">Rs. {fmt(bill.balance_due)}</span>
            </div>
          </div>

          {error && <div className="text-red-600 text-[13px] bg-red-50 p-2 rounded">{error}</div>}

          <div>
            <label className="block text-[12px] font-bold text-surface-600 mb-1">Amount Received *</label>
            <div className="flex border border-surface-200 rounded-lg overflow-hidden">
              <span className="px-3 py-2.5 bg-surface-100 text-surface-500 text-[13px] font-medium">Rs.</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 px-3 py-2.5 text-[14px] font-bold outline-none"
                min="0"
                max={maxAmount}
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-surface-600 mb-1">Payment Mode</label>
            <select
              value={mode}
              onChange={e => setMode(e.target.value)}
              className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-[13px] outline-none focus:border-[#7c3aed]"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-surface-600 mb-1">Payment Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-[13px] outline-none focus:border-[#7c3aed]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-surface-600 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. UPI ref #12345"
              className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-[13px] outline-none focus:border-[#7c3aed] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-surface-200 bg-surface-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-surface-200 rounded-lg text-[13px] font-bold text-surface-600 hover:bg-surface-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg text-[13px] font-bold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment History Panel ────────────────────────────────────────────────────
function PaymentHistoryPanel({ billId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!billId) return;
    supabase
      .from('bill_payments')
      .select('*')
      .eq('bill_id', billId)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setPayments(data || []);
        setLoading(false);
      });
  }, [billId]);

  const total = payments.reduce((s, p) => s + Number(p.amount), 0);

  if (loading) return <div className="py-4 text-center text-surface-400 text-[13px]">Loading payments...</div>;
  if (payments.length === 0) return <div className="py-4 text-center text-surface-400 text-[13px]">No payments recorded yet.</div>;

  return (
    <div>
      <table className="w-full text-[13px] text-left">
        <thead className="bg-surface-50 border-b border-surface-200">
          <tr className="text-[11px] font-bold text-surface-500 uppercase">
            <th className="py-2 px-4">Date</th>
            <th className="py-2 px-4">Amount</th>
            <th className="py-2 px-4">Mode</th>
            <th className="py-2 px-4">Notes</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id} className="border-b border-surface-100">
              <td className="py-2.5 px-4">{new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
              <td className="py-2.5 px-4 font-bold text-green-700">Rs. {fmt(p.amount)}</td>
              <td className="py-2.5 px-4">
                <span className="capitalize bg-surface-100 px-2 py-0.5 rounded text-surface-600">{p.payment_mode}</span>
              </td>
              <td className="py-2.5 px-4 text-surface-500">{p.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-green-50">
            <td className="py-2.5 px-4 font-bold text-surface-700">Total Received</td>
            <td className="py-2.5 px-4 font-black text-green-700">Rs. {fmt(total)}</td>
            <td colSpan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Audit Trail Panel ────────────────────────────────────────────────────────
function AuditTrailPanel({ billId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!billId) return;
    supabase
      .from('audit_logs')
      .select('*')
      .eq('record_id', billId)
      .order('changed_at', { ascending: false })
      .then(({ data }) => {
        setLogs(data || []);
        setLoading(false);
      });
  }, [billId]);

  if (loading) return <div className="py-4 text-center text-surface-400 text-[13px]">Loading history...</div>;
  if (logs.length === 0) return <div className="py-4 text-center text-surface-400 text-[13px]">No edit history found.</div>;

  return (
    <div className="space-y-3">
      {logs.map(log => {
        const diffs = computeDiff(log.old_data, log.new_data);
        return (
          <div key={log.id} className="border border-surface-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className={'text-[12px] font-bold uppercase px-2 py-0.5 rounded ' + (log.change_type === 'created' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                {log.change_type}
              </span>
              <span className="text-[12px] text-surface-400">
                {new Date(log.changed_at).toLocaleString('en-IN')}
              </span>
            </div>
            {diffs.length > 0 && (
              <div className="space-y-1 mt-2">
                {diffs.map((d, i) => (
                  <div key={i} className="text-[12px] text-surface-600 flex items-center gap-2">
                    <span className="font-bold text-surface-700 min-w-[120px]">{d.field}:</span>
                    <span className="text-red-500 line-through">{String(d.from)}</span>
                    <span className="text-surface-400">→</span>
                    <span className="text-green-600 font-medium">{String(d.to)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main BillView ────────────────────────────────────────────────────────────
export default function BillView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [bill, setBill] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('bill'); // 'bill' | 'payments' | 'history'
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const fetchBill = useCallback(async () => {
    try {
      const { data: billData, error: billErr } = await supabase
        .from('bills')
        .select('*')
        .eq('id', id)
        .single();
      if (billErr) throw billErr;
      setBill(billData);

      if (billData.customer_id) {
        const { data: custData } = await supabase
          .from('customers')
          .select('name, phone, address')
          .eq('id', billData.customer_id)
          .single();
        setCustomer(custData);
      }

      const { data: settingsData } = await supabase.from('shop_settings').select('*').limit(1).single();
      if (settingsData) setShopSettings(settingsData);
    } catch (err) {
      setError('Could not load bill: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchBill(); }, [fetchBill]);

  const handlePrint = () => window.print();

  const handleWhatsApp = () => {
    if (!customer?.phone) {
      alert('No phone number found for this customer.');
      return;
    }
    const phone = customer.phone.replace(/\D/g, '');
    const message =
      'Hello ' + customer.name + ',\n\n' +
      'Your bill *' + bill.bill_no + '* dated ' + bill.date + ' has been generated.\n\n' +
      '*Amount Details:*\n' +
      '- Subtotal: Rs.' + fmt(bill.subtotal) + '\n' +
      '- Grand Total: Rs.' + fmt(bill.grand_total) + '\n' +
      '- Advance Paid: Rs.' + fmt(bill.advance_paid) + '\n' +
      '- *Balance Due: Rs.' + fmt(bill.balance_due) + '*\n\n' +
      'Thank you for your business!';
    window.open('https://wa.me/91' + phone + '?text=' + encodeURIComponent(message), '_blank');
  };

  const handleDuplicate = async () => {
    if (!bill) return;
    setDuplicating(true);
    try {
      // Get next bill number
      const { count } = await supabase.from('bills').select('id', { count: 'exact', head: true });
      const newBillNo = 'BILL-' + String((count || 0) + 1);
      const today = new Date().toISOString().split('T')[0];

      const { data: newBill, error: dupErr } = await supabase.from('bills').insert({
        bill_no: newBillNo,
        date: today,
        due_date: bill.due_date,
        customer_id: bill.customer_id,
        items: bill.items,
        subtotal: bill.subtotal,
        discount: bill.discount,
        labour_charges: bill.labour_charges,
        transport_charges: bill.transport_charges,
        round_off: bill.round_off,
        grand_total: bill.grand_total,
        advance_paid: 0,
        balance_due: bill.grand_total,
        notes: bill.notes,
        payment_mode: bill.payment_mode,
        bill_type: bill.bill_type || 'invoice',
        status: 'draft',
        created_by: user?.id,
      }).select().single();

      if (dupErr) throw dupErr;

      // Audit log
      await logAudit({
        tableName: 'bills',
        recordId: newBill.id,
        changedBy: user?.id,
        changeType: 'created',
        oldData: null,
        newData: { duplicated_from: id, bill_no: newBillNo },
      });

      navigate('/billing/' + newBill.id + '/edit');
    } catch (err) {
      alert('Duplicate failed: ' + err.message);
    } finally {
      setDuplicating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500">{error || 'Bill not found.'}</p>
        <Link to="/sales/invoices" className="text-primary-600 text-sm mt-2 inline-block">
          Back to Sales Invoices
        </Link>
      </div>
    );
  }

  const grandTotal = bill.grand_total || (Number(bill.subtotal) - Number(bill.discount) + Number(bill.labour_charges) + Number(bill.transport_charges));

  const statusColors = {
    draft: 'bg-amber-100 text-amber-800 border border-amber-300',
    final: 'bg-green-100 text-green-800 border border-green-300',
    cancelled: 'bg-red-100 text-red-800 border border-red-300',
    fully_returned: 'bg-purple-100 text-purple-800 border border-purple-300',
    partially_returned: 'bg-orange-100 text-orange-800 border border-orange-300',
  };

  const billHeader = bill.bill_type === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE';
  const isPaid = Number(bill.balance_due) <= 0;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-bill, #printable-bill * { visibility: visible; }
          #printable-bill { position: fixed; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Action Bar */}
      <div className="no-print flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/sales/invoices')}
          className="flex items-center gap-2 text-sm text-surface-600 hover:text-surface-800"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>
        <div className="flex gap-2 flex-wrap justify-end">
          {/* Record Payment button - only if balance > 0 */}
          {!isPaid && (role === 'owner' || role === 'staff') && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
            >
              <HiOutlineCash className="w-4 h-4" /> Record Payment
            </button>
          )}
          {/* Duplicate button */}
          {(role === 'owner' || role === 'staff') && (
            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-surface-300 text-surface-700 hover:bg-surface-50 disabled:opacity-50"
            >
              <HiOutlineDuplicate className="w-4 h-4" />
              {duplicating ? 'Duplicating...' : 'Duplicate'}
            </button>
          )}
          {/* Edit button */}
          {(role === 'owner' || role === 'staff') && bill.status !== 'cancelled' && (
            <Link
              to={'/billing/' + id + '/edit'}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-surface-300 text-surface-700 hover:bg-surface-50"
            >
              <HiOutlinePencil className="w-4 h-4" /> Edit
            </Link>
          )}
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-green-600 text-white hover:bg-green-700"
          >
            <WhatsAppIcon /> WhatsApp
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-surface-800 text-white hover:bg-surface-900"
          >
            <HiOutlinePrinter className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-print flex border-b border-surface-200 mb-6">
        {[
          { key: 'bill', label: 'Bill Details', icon: HiOutlineDocumentText },
          { key: 'payments', label: 'Payment History', icon: HiOutlineCash },
          { key: 'history', label: 'Edit History', icon: HiOutlineClipboardList },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={'flex items-center gap-2 px-5 py-3 text-[13px] font-semibold border-b-2 transition-colors ' +
              (activeTab === tab.key
                ? 'border-[#7c3aed] text-[#7c3aed]'
                : 'border-transparent text-surface-500 hover:text-surface-700')}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="no-print bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
            <h2 className="font-bold text-surface-800">Payment History</h2>
            {!isPaid && (role === 'owner' || role === 'staff') && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-[#7c3aed] text-white text-[13px] font-bold rounded-lg hover:bg-[#6d28d9]"
              >
                + Record Payment
              </button>
            )}
          </div>
          <PaymentHistoryPanel billId={id} />
        </div>
      )}

      {/* Edit History Tab */}
      {activeTab === 'history' && (
        <div className="no-print bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="font-bold text-surface-800 mb-4">Edit History</h2>
          <AuditTrailPanel billId={id} />
        </div>
      )}

      {/* Bill Details Tab (printable) */}
      {activeTab === 'bill' && (
        <div id="printable-bill" className="bg-white rounded-2xl border border-surface-200 p-8 max-w-4xl mx-auto">
          {/* Bill Header */}
          <div className="flex items-start justify-between pb-6 border-b border-surface-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center">
                <HiOutlineDocumentText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-surface-900">{shopSettings?.shop_name || 'BillDesk'}</h1>
                <p className="text-xs text-surface-500">
                  {shopSettings?.address_line1 || 'Furniture & Hardware Billing'}
                  {shopSettings?.address_line2 ? `, ${shopSettings.address_line2}` : ''}
                  {(shopSettings?.city || shopSettings?.state) && <br />}
                  {shopSettings?.city} {shopSettings?.state} {shopSettings?.pincode}
                  {shopSettings?.phone && <><br />Phone: {shopSettings.phone}</>}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-1">{billHeader}</p>
              <p className="text-2xl font-bold text-surface-900">{bill.bill_no}</p>
              <p className="text-sm text-surface-500 mt-1">
                Date: {new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <span className={'inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold capitalize ' + (statusColors[bill.status] || '')}>
                {bill.status}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="py-5 border-b border-surface-200">
            <p className="text-xs text-surface-500 uppercase tracking-wide font-semibold mb-1">Bill To</p>
            <p className="text-base font-bold text-surface-900">{customer?.name || '—'}</p>
            {customer?.phone && <p className="text-sm text-surface-600">Phone: {customer.phone}</p>}
            {customer?.address && <p className="text-sm text-surface-600">Address: {customer.address}</p>}
          </div>

          {/* Items Table */}
          <div className="py-5 border-b border-surface-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-surface-500 uppercase tracking-wide border-b border-surface-200">
                  <th className="text-left pb-3">#</th>
                  <th className="text-left pb-3">Item</th>
                  <th className="text-center pb-3">Unit</th>
                  <th className="text-right pb-3">Qty</th>
                  <th className="text-right pb-3">Rate</th>
                  <th className="text-right pb-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {(bill.items || []).map((item, i) => (
                  <tr key={i}>
                    <td className="py-2 text-surface-400">{i + 1}</td>
                    <td className="py-2 font-medium text-surface-800">{item.name}</td>
                    <td className="py-2 text-center text-surface-500">{item.unit || '-'}</td>
                    <td className="py-2 text-right text-surface-700">{item.qty}</td>
                    <td className="py-2 text-right text-surface-700">Rs. {fmt(item.price)}</td>
                    <td className="py-2 text-right font-semibold text-surface-900">Rs. {fmt(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="py-5 flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-surface-600">
                <span>Subtotal</span>
                <span>Rs. {fmt(bill.subtotal)}</span>
              </div>
              {Number(bill.discount) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>- Rs. {fmt(bill.discount)}</span>
                </div>
              )}
              {Number(bill.labour_charges) > 0 && (
                <div className="flex justify-between text-surface-600">
                  <span>Labour Charges</span>
                  <span>+ Rs. {fmt(bill.labour_charges)}</span>
                </div>
              )}
              {Number(bill.transport_charges) > 0 && (
                <div className="flex justify-between text-surface-600">
                  <span>Transport Charges</span>
                  <span>+ Rs. {fmt(bill.transport_charges)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-surface-900 border-t border-surface-200 pt-2">
                <span>Grand Total</span>
                <span>Rs. {fmt(grandTotal)}</span>
              </div>
              {Number(bill.advance_paid) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Amount Paid</span>
                  <span>- Rs. {fmt(bill.advance_paid)}</span>
                </div>
              )}
              <div className={'flex justify-between font-black text-lg border-t border-surface-300 pt-2 ' + (Number(bill.balance_due) > 0 ? 'text-red-600' : 'text-green-600')}>
                <span>Balance Due</span>
                <span>Rs. {fmt(bill.balance_due)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-5 border-t border-surface-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500">
                Payment Mode: <span className="font-semibold uppercase text-surface-700">{bill.payment_mode}</span>
              </p>
              {bill.notes && <p className="text-xs text-surface-500 mt-1">Note: {bill.notes}</p>}
              {shopSettings?.default_bill_notes && !bill.notes && <p className="text-xs text-surface-500 mt-1 whitespace-pre-wrap">Note: {shopSettings.default_bill_notes}</p>}
              
              {shopSettings?.show_thankyou_message !== false && (
                <p className="text-sm font-medium text-surface-700 mt-4 italic">Thank you for your business!</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-surface-400">Authorised Signatory</p>
              <div className="mt-8 border-t border-surface-400 w-32" />
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <RecordPaymentModal
          bill={bill}
          userId={user?.id}
          onClose={() => setShowPaymentModal(false)}
          onSaved={() => {
            setShowPaymentModal(false);
            fetchBill();
            setActiveTab('payments');
          }}
        />
      )}
    </>
  );
}
