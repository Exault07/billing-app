import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { HiOutlineX, HiOutlineCheck, HiOutlineAdjustments } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';

export default function AdjustStockModal({ item, onClose, onSaved }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    adjustment_type: 'Add', // Add, Reduce, Set
    quantity: '',
    reason: 'Manual Adjustment',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const reasons = ['Purchase', 'Sale Correction', 'Damage', 'Return', 'Manual Adjustment'];

  const calculateNewStock = () => {
    const current = Number(item.stock_qty || 0);
    const qty = Number(form.quantity || 0);
    if (form.adjustment_type === 'Add') return current + qty;
    if (form.adjustment_type === 'Reduce') return current - qty;
    if (form.adjustment_type === 'Set') return qty;
    return current;
  };

  const handleSave = async () => {
    if (!form.quantity || Number(form.quantity) < 0) {
      return alert("Please enter a valid positive quantity");
    }

    setLoading(true);
    try {
      const previousStock = Number(item.stock_qty || 0);
      const newStock = calculateNewStock();
      const qty = Number(form.quantity);

      // 1. Log Adjustment
      const { error: logError } = await supabase.from('stock_adjustments').insert({
        product_id: item.id,
        adjustment_type: form.adjustment_type,
        quantity: qty,
        reason: form.reason,
        date: form.date,
        notes: form.notes,
        previous_stock: previousStock,
        new_stock: newStock,
        created_by: user?.id
      });
      if (logError) throw logError;

      // 2. Update Product Stock
      const { error: updateError } = await supabase.from('products').update({
        stock_qty: newStock
      }).eq('id', item.id);
      if (updateError) throw updateError;

      onSaved();
      onClose();
    } catch (err) {
      alert("Error adjusting stock: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <HiOutlineAdjustments className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-surface-900">Adjust Stock</h3>
              <p className="text-xs text-surface-500">{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-700 bg-white border border-surface-200 rounded-full hover:bg-surface-100 transition-colors">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="flex justify-between items-center p-4 bg-surface-50 rounded-xl border border-surface-200">
            <div>
              <p className="text-xs font-semibold text-surface-500 uppercase">Current Stock</p>
              <p className="text-2xl font-bold text-surface-900">{Number(item.stock_qty || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-surface-500 uppercase">New Stock</p>
              <p className="text-2xl font-bold text-indigo-600">{calculateNewStock()}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Adjustment Type</label>
            <div className="flex bg-surface-100 p-1 rounded-xl">
              {['Add', 'Reduce', 'Set'].map(type => (
                <button
                  key={type}
                  onClick={() => setForm({ ...form, adjustment_type: type })}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${form.adjustment_type === type ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Quantity</label>
              <input type="number" min="0" step="0.01" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full border border-surface-200 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border border-surface-200 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Reason</label>
            <select value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full border border-surface-200 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
              {reasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Notes (Optional)</label>
            <textarea rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any extra details..." className="w-full border border-surface-200 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"></textarea>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-100 bg-surface-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-surface-600 bg-white border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
            <HiOutlineCheck className="w-5 h-5" /> Confirm Adjustment
          </button>
        </div>

      </div>
    </div>
  );
}
