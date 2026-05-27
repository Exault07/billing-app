import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  HiPlus,
  HiX,
  HiSave,
  HiRefresh,
  HiCurrencyRupee,
  HiCheckCircle,
  HiExclamationCircle,
} from 'react-icons/hi';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtAmt(n) {
  const num = parseFloat(n) || 0;
  return 'Rs. ' + num.toFixed(2);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
];

// ─── Inline Record Payment Form ───────────────────────────────────────────────

function RecordPaymentForm({ billId, onSave, onCancel, saving }) {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    onSave({ amount: amt, payment_mode: mode, payment_date: date, notes: notes.trim() || null });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4"
    >
      <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
        <HiCurrencyRupee className="w-4 h-4" />
        Record New Payment
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={1}
            placeholder="Optional note..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <HiX className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-semibold transition-colors"
        >
          {saving ? (
            <>
              <HiRefresh className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <HiSave className="w-4 h-4" />
              Save Payment
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

/**
 * PaymentHistoryPanel
 * Props:
 *   billId        {string}   - The bill's UUID
 *   onPaymentAdded {function} - Called after a successful payment insert
 */
export default function PaymentHistoryPanel({ billId, onPaymentAdded }) {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }

  const fetchPayments = useCallback(async () => {
    if (!billId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bill_payments')
        .select('*')
        .eq('bill_id', billId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSavePayment = async ({ amount, payment_mode, payment_date, notes }) => {
    setSaving(true);
    try {
      // 1. Insert payment record
      const { error: payErr } = await supabase.from('bill_payments').insert({
        bill_id: billId,
        amount,
        payment_mode,
        payment_date,
        notes,
        created_by: user?.id || null,
      });
      if (payErr) throw payErr;

      // 2. Fetch current bill totals
      const { data: bill, error: billErr } = await supabase
        .from('bills')
        .select('total_amount, advance_paid, balance_due')
        .eq('id', billId)
        .single();
      if (billErr) throw billErr;

      const newAdvancePaid = (parseFloat(bill.advance_paid) || 0) + amount;
      const newBalanceDue = Math.max(0, (parseFloat(bill.total_amount) || 0) - newAdvancePaid);
      let newStatus = 'partially_paid';
      if (newBalanceDue <= 0) newStatus = 'paid';
      else if (newAdvancePaid <= 0) newStatus = 'unpaid';

      // 3. Update bill
      const { error: updateErr } = await supabase
        .from('bills')
        .update({
          advance_paid: newAdvancePaid,
          balance_due: newBalanceDue,
          status: newStatus,
        })
        .eq('id', billId);
      if (updateErr) throw updateErr;

      // 4. Refresh and notify
      await fetchPayments();
      setShowForm(false);
      showToast('success', `Payment of ${fmtAmt(amount)} recorded successfully.`);
      if (onPaymentAdded) onPaymentAdded({ amount, payment_mode, payment_date, notes });
    } catch (err) {
      console.error('Error saving payment:', err);
      showToast('error', 'Failed to save payment: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-b border-green-100">
        <div className="flex items-center gap-2">
          <HiCurrencyRupee className="w-5 h-5 text-green-600" />
          <h2 className="text-sm font-semibold text-green-800">Payment History</h2>
          {!loading && (
            <span className="bg-green-200 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {payments.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          {showForm ? <HiX className="w-3.5 h-3.5" /> : <HiPlus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Record Payment'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <HiCheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <HiExclamationCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <div className="px-4">
          <RecordPaymentForm
            billId={billId}
            onSave={handleSavePayment}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Payments Table */}
      <div className="overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
            <HiRefresh className="w-5 h-5 animate-spin" />
            Loading payments...
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No payments recorded yet.
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Date
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Amount
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Mode
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-green-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                    {fmtDate(p.payment_date)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-700 whitespace-nowrap">
                    {fmtAmt(p.amount)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 capitalize">
                      {(p.payment_mode || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">
                    {p.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Total Footer */}
      {!loading && payments.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-t border-green-100">
          <span className="text-sm font-medium text-green-700">Total Payments Received</span>
          <span className="text-base font-bold text-green-800">{fmtAmt(totalPaid)}</span>
        </div>
      )}
    </div>
  );
}
