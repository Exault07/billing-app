import React, { useState } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import { supabase } from '../../supabaseClient';

export default function QuickCreatePartyModal({ onClose, onSaved, initialType = 'customer' }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [type, setType] = useState(initialType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Party name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const partyData = {
        name,
        mobile,
        party_type: type,
        user_id: user?.id,
        current_balance: 0,
        opening_balance: 0
      };
      const { error: insertError } = await supabase.from('parties').insert([partyData]);
      if (insertError) throw insertError;
      
      onSaved();
    } catch (err) {
      setError('Error creating party: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-[400px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
          <h2 className="font-bold text-surface-800">Quick Create Party</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div>
            <label className="block text-[13px] font-bold text-surface-700 mb-1">Party Name <span className="text-red-500">*</span></label>
            <input 
              autoFocus
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-surface-700 mb-1">Mobile</label>
            <input 
              type="text" 
              value={mobile} 
              onChange={e => setMobile(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-surface-700 mb-1">Party Type</label>
            <select 
              value={type} 
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded focus:border-blue-500 outline-none bg-white"
            >
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 hover:bg-surface-200 rounded">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Party'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
