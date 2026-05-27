import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil } from 'react-icons/hi';

export default function UnitsTab() {
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState([]);
  const [newUnit, setNewUnit] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      
      const { data: unitData, error: unitError } = await supabase.from('item_units').select('*').order('name');
      if (unitError) throw unitError;

      const { data: prodData, error: prodError } = await supabase.from('products').select('unit');
      if (prodError) throw prodError;

      const counts = {};
      prodData.forEach(p => {
        if (p.unit) {
          counts[p.unit] = (counts[p.unit] || 0) + 1;
        }
      });

      const merged = (unitData || []).map(u => ({
        ...u,
        itemCount: counts[u.name] || 0
      }));

      setUnits(merged);
    } catch (err) {
      console.error('Error fetching units:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newUnit.trim()) return;
    
    try {
      const { error } = await supabase.from('item_units').insert({ name: newUnit.trim() });
      if (error) {
        if (error.code === '23505') alert('Unit already exists!');
        else throw error;
      } else {
        setNewUnit('');
        fetchUnits();
      }
    } catch (err) {
      console.error('Error adding unit:', err);
      alert('Failed to add unit');
    }
  };

  const handleEditSave = async (id, oldName) => {
    if (!editName.trim() || editName.trim() === oldName) {
      setEditingId(null);
      return;
    }
    
    try {
      const { error } = await supabase.from('item_units').update({ name: editName.trim() }).eq('id', id);
      if (error) throw error;
      
      await supabase.from('products').update({ unit: editName.trim() }).eq('unit', oldName);
      
      setEditingId(null);
      fetchUnits();
    } catch (err) {
      console.error('Error updating unit:', err);
      alert('Failed to update unit');
    }
  };

  const handleDelete = async (id, name, count) => {
    if (count > 0) {
      alert(`Cannot delete '${name}' because it is used by ${count} items.`);
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete '${name}'?`)) return;
    
    try {
      const { error } = await supabase.from('item_units').delete().eq('id', id);
      if (error) throw error;
      fetchUnits();
    } catch (err) {
      console.error('Error deleting unit:', err);
      alert('Failed to delete unit');
    }
  };

  if (loading) return <div className="p-4 text-surface-500">Loading units...</div>;

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold text-surface-900 mb-6">Units of Measure</h2>

      <form onSubmit={handleAdd} className="mb-8 flex gap-3">
        <input
          type="text"
          value={newUnit}
          onChange={(e) => setNewUnit(e.target.value)}
          placeholder="New unit (e.g. sqft, bundle)..."
          className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
        />
        <button
          type="submit"
          disabled={!newUnit.trim()}
          className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <HiOutlinePlus className="w-5 h-5" /> Add
        </button>
      </form>

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200 text-surface-500 text-sm">
              <th className="py-3 px-4 font-medium">Unit Name</th>
              <th className="py-3 px-4 font-medium text-center">Items Using Unit</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {units.length === 0 ? (
              <tr>
                <td colSpan="3" className="py-8 text-center text-surface-500">No units found.</td>
              </tr>
            ) : (
              units.map(u => (
                <tr key={u.id} className="border-b border-surface-100 hover:bg-surface-50/50">
                  <td className="py-3 px-4">
                    {editingId === u.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleEditSave(u.id, u.name)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEditSave(u.id, u.name)}
                        className="w-full px-2 py-1 bg-white border border-primary-500 rounded outline-none"
                      />
                    ) : (
                      <span className="font-medium text-surface-900">{u.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-surface-100 text-surface-700 text-xs font-medium">
                      {u.itemCount} items
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingId(u.id);
                        setEditName(u.name);
                      }}
                      className="p-1.5 text-surface-400 hover:text-primary-600 rounded-lg transition-colors"
                      title="Rename"
                    >
                      <HiOutlinePencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.name, u.itemCount)}
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
