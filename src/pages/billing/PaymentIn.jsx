import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineSearch,
  HiOutlineCash,
  HiOutlineX,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
} from 'react-icons/hi';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function PaymentIn() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [paymentsCache, setPaymentsCache] = useState({});

  // Payment Modal State
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchUnpaidBills = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('bills')
        .select('*, customers(name)')
        .gt('balance_due', 0)
        .neq('status', 'cancelled')
        .order('date', { ascending: false });
      setBills(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnpaidBills();
  }, []);

  const loadPayments = async (billId) => {
    if (paymentsCache[billId]) {
      setExpandedId(expandedId === billId ? null : billId);
      return;
    }
    const { data } = await supabase
      .from('bill_payments')
      .select('*')
      .eq('bill_id', billId)
      .order('date', { ascending: false });
    
    setPaymentsCache(prev => ({ ...prev, [billId]: data || [] }));
    setExpandedId(expandedId === billId ? null : billId);
  };

  const handleOpenModal = (bill) => {
    setSelectedBill(bill);
    setAmount(bill.balance_due);
    setMode('cash');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setError('');
  };

  const handleSavePayment = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError('Enter valid amount');
    if (amt > selectedBill.balance_due) return setError('Amount exceeds balance');
    
    setSaving(true);
    setError('');
    try {
      await supabase.from('bill_payments').insert({
        bill_id: selectedBill.id,
        amount: amt,
        payment_mode: mode,
        date,
        notes,
        created_by: user?.id,
      });

      const newAdvance = Number(selectedBill.advance_paid || 0) + amt;
      const newBalance = Number(selectedBill.balance_due) - amt;
      
      await supabase.from('bills').update({
        advance_paid: newAdvance,
        balance_due: newBalance,
        status: newBalance <= 0 ? 'final' : 'draft' // keep logic simple
      }).eq('id', selectedBill.id);

      setSelectedBill(null);
      fetchUnpaidBills();
      // Invalidate cache for this bill
      setPaymentsCache(prev => ({ ...prev, [selectedBill.id]: null }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredBills = bills.filter(b => 
    b.bill_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <HiOutlineCash className="w-6 h-6 text-[#7c3aed]" />
          Payment In (Collect Payments)
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
        <div className="p-4 border-b border-surface-200">
          <div className="relative max-w-sm">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search by Bill No or Party Name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-lg text-sm focus:border-[#7c3aed] outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-50 border-b border-surface-200 text-surface-600 font-bold uppercase text-xs">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Bill No</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-surface-500">Loading...</td></tr>
              ) : filteredBills.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-surface-500">No pending bills found.</td></tr>
              ) : (
                filteredBills.map(b => (
                  <React.Fragment key={b.id}>
                    <tr className="hover:bg-surface-50 transition-colors">
                      <td className="py-3 px-4">{new Date(b.date).toLocaleDateString('en-GB')}</td>
                      <td className="py-3 px-4 font-medium">{b.bill_no}</td>
                      <td className="py-3 px-4">{b.customers?.name || '-'}</td>
                      <td className="py-3 px-4 text-right">Rs. {fmt(b.grand_total)}</td>
                      <td className="py-3 px-4 text-right text-green-600">Rs. {fmt(b.advance_paid)}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-600">Rs. {fmt(b.balance_due)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => loadPayments(b.id)}
                            className="text-xs text-[#7c3aed] font-medium flex items-center gap-1 hover:underline"
                          >
                            History {expandedId === b.id ? <HiOutlineChevronUp/> : <HiOutlineChevronDown/>}
                          </button>
                          <button
                            onClick={() => handleOpenModal(b)}
                            className="px-3 py-1.5 bg-[#7c3aed] text-white text-xs font-bold rounded hover:bg-[#6d28d9]"
                          >
                            Record Payment
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === b.id && paymentsCache[b.id] && (
                      <tr className="bg-surface-50">
                        <td colSpan="7" className="p-4">
                          <div className="border border-surface-200 rounded-lg bg-white p-4">
                            <h4 className="text-xs font-bold text-surface-500 uppercase mb-3">Payment History</h4>
                            {paymentsCache[b.id].length === 0 ? (
                              <p className="text-sm text-surface-500">No payments recorded.</p>
                            ) : (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-surface-400 border-b">
                                    <th className="text-left pb-2 font-normal">Date</th>
                                    <th className="text-left pb-2 font-normal">Mode</th>
                                    <th className="text-left pb-2 font-normal">Notes</th>
                                    <th className="text-right pb-2 font-normal">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-100">
                                  {paymentsCache[b.id].map(p => (
                                    <tr key={p.id}>
                                      <td className="py-2">{new Date(p.date).toLocaleDateString()}</td>
                                      <td className="py-2 capitalize">{p.payment_mode}</td>
                                      <td className="py-2 text-surface-500">{p.notes || '-'}</td>
                                      <td className="py-2 text-right font-medium text-green-600">Rs. {fmt(p.amount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-200 flex justify-between items-center bg-[#f5f3ff]">
              <h3 className="font-bold text-surface-800">Record Payment</h3>
              <button onClick={() => setSelectedBill(null)} className="text-surface-500 hover:text-surface-800">
                <HiOutlineX className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm flex justify-between font-bold">
                <span>Balance Due:</span>
                <span>Rs. {fmt(selectedBill.balance_due)}</span>
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <div>
                <label className="block text-xs font-bold text-surface-600 mb-1">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded outline-none focus:border-[#7c3aed]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-600 mb-1">Mode</label>
                <select
                  value={mode}
                  onChange={e => setMode(e.target.value)}
                  className="w-full px-3 py-2 border rounded outline-none focus:border-[#7c3aed]"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-600 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded outline-none focus:border-[#7c3aed]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-600 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded outline-none focus:border-[#7c3aed] resize-none"
                  rows="2"
                />
              </div>
            </div>
            <div className="p-5 border-t border-surface-200 flex gap-3">
              <button onClick={() => setSelectedBill(null)} className="flex-1 py-2 border rounded font-bold text-surface-600">Cancel</button>
              <button onClick={handleSavePayment} disabled={saving} className="flex-1 py-2 bg-[#7c3aed] text-white rounded font-bold">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
