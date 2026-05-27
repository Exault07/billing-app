import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil } from 'react-icons/hi';

export default function PaymentModesTab() {
  const [loading, setLoading] = useState(true);
  const [modes, setModes] = useState([]);
  const [newMode, setNewMode] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchModes();
  }, []);

  const fetchModes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('payment_modes').select('*').order('id');
      if (error) throw error;
      setModes(data || []);
    } catch (err) {
      console.error('Error fetching payment modes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newMode.trim()) return;
    
    try {
      const { error } = await supabase.from('payment_modes').insert({ name: newMode.trim(), is_active: true });
      if (error) {
        if (error.code === '23505') alert('Payment mode already exists!');
        else throw error;
      } else {
        setNewMode('');
        fetchModes();
      }
    } catch (err) {
      console.error('Error adding payment mode:', err);
      alert('Failed to add payment mode');
    }
  };

  const handleEditSave = async (id, oldName) => {
    if (!editName.trim() || editName.trim() === oldName) {
      setEditingId(null);
      return;
    }
    
    try {
      const { error } = await supabase.from('payment_modes').update({ name: editName.trim() }).eq('id', id);
      if (error) throw error;
      
      setEditingId(null);
      fetchModes();
    } catch (err) {
      console.error('Error updating payment mode:', err);
      alert('Failed to update payment mode');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase.from('payment_modes').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      setModes(modes.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m));
    } catch (err) {
      console.error('Error toggling payment mode:', err);
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete '${name}'? This cannot be undone.`)) return;
    
    try {
      const { error } = await supabase.from('payment_modes').delete().eq('id', id);
      if (error) throw error;
      fetchModes();
    } catch (err) {
      console.error('Error deleting payment mode:', err);
      alert('Failed to delete payment mode. It might be linked to existing records.');
    }
  };

  if (loading) return <div className="p-4 text-surface-500">Loading payment modes...</div>;

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold text-surface-900 mb-6">Payment Modes</h2>

      <form onSubmit={handleAdd} className="mb-8 flex gap-3">
        <input
          type="text"
          value={newMode}
          onChange={(e) => setNewMode(e.target.value)}
          placeholder="New payment mode (e.g. PayPal)..."
          className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
        />
        <button
          type="submit"
          disabled={!newMode.trim()}
          className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <HiOutlinePlus className="w-5 h-5" /> Add
        </button>
      </form>

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200 text-surface-500 text-sm">
              <th className="py-3 px-4 font-medium">Payment Mode Name</th>
              <th className="py-3 px-4 font-medium text-center">Status</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {modes.length === 0 ? (
              <tr>
                <td colSpan="3" className="py-8 text-center text-surface-500">No payment modes found.</td>
              </tr>
            ) : (
              modes.map(m => (
                <tr key={m.id} className="border-b border-surface-100 hover:bg-surface-50/50">
                  <td className="py-3 px-4">
                    {editingId === m.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleEditSave(m.id, m.name)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEditSave(m.id, m.name)}
                        className="w-full px-2 py-1 bg-white border border-primary-500 rounded outline-none"
                      />
                    ) : (
                      <span className="font-medium text-surface-900">{m.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleActive(m.id, m.is_active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${m.is_active ? 'bg-green-500' : 'bg-surface-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${m.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingId(m.id);
                        setEditName(m.name);
                      }}
                      className="p-1.5 text-surface-400 hover:text-primary-600 rounded-lg transition-colors"
                      title="Rename"
                    >
                      <HiOutlinePencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id, m.name)}
                      className="p-1.5 text-surface-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <HiOutlineTrash className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
