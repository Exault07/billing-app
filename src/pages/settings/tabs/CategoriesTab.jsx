import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil } from 'react-icons/hi';

export default function CategoriesTab() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: catData, error: catError } = await supabase.from('item_categories').select('*').order('name');
      if (catError) throw catError;

      // Fetch products to count items per category
      const { data: prodData, error: prodError } = await supabase.from('products').select('category');
      if (prodError) throw prodError;

      const counts = {};
      prodData.forEach(p => {
        if (p.category) {
          counts[p.category] = (counts[p.category] || 0) + 1;
        }
      });

      const merged = (catData || []).map(c => ({
        ...c,
        itemCount: counts[c.name] || 0
      }));

      setCategories(merged);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    try {
      const { error } = await supabase.from('item_categories').insert({ name: newCategory.trim() });
      if (error) {
        if (error.code === '23505') alert('Category already exists!');
        else throw error;
      } else {
        setNewCategory('');
        fetchCategories();
      }
    } catch (err) {
      console.error('Error adding category:', err);
      alert('Failed to add category');
    }
  };

  const handleEditSave = async (id, oldName) => {
    if (!editName.trim() || editName.trim() === oldName) {
      setEditingId(null);
      return;
    }
    
    try {
      // Update category table
      const { error } = await supabase.from('item_categories').update({ name: editName.trim() }).eq('id', id);
      if (error) throw error;
      
      // Update all products that had the old category name
      await supabase.from('products').update({ category: editName.trim() }).eq('category', oldName);
      
      setEditingId(null);
      fetchCategories();
    } catch (err) {
      console.error('Error updating category:', err);
      alert('Failed to update category');
    }
  };

  const handleDelete = async (id, name, count) => {
    if (count > 0) {
      alert(`Cannot delete '${name}' because it has ${count} items. Please reassign those items first.`);
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete '${name}'?`)) return;
    
    try {
      const { error } = await supabase.from('item_categories').delete().eq('id', id);
      if (error) throw error;
      fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category');
    }
  };

  if (loading) return <div className="p-4 text-surface-500">Loading categories...</div>;

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold text-surface-900 mb-6">Item Categories</h2>

      <form onSubmit={handleAdd} className="mb-8 flex gap-3">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name..."
          className="flex-1 px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
        />
        <button
          type="submit"
          disabled={!newCategory.trim()}
          className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <HiOutlinePlus className="w-5 h-5" /> Add
        </button>
      </form>

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200 text-surface-500 text-sm">
              <th className="py-3 px-4 font-medium">Category Name</th>
              <th className="py-3 px-4 font-medium text-center">Items Count</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan="3" className="py-8 text-center text-surface-500">No categories found.</td>
              </tr>
            ) : (
              categories.map(c => (
                <tr key={c.id} className="border-b border-surface-100 hover:bg-surface-50/50">
                  <td className="py-3 px-4">
                    {editingId === c.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleEditSave(c.id, c.name)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEditSave(c.id, c.name)}
                        className="w-full px-2 py-1 bg-white border border-primary-500 rounded outline-none"
                      />
                    ) : (
                      <span className="font-medium text-surface-900">{c.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-surface-100 text-surface-700 text-xs font-medium">
                      {c.itemCount} items
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                      className="p-1.5 text-surface-400 hover:text-primary-600 rounded-lg transition-colors"
                      title="Rename"
                    >
                      <HiOutlinePencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.name, c.itemCount)}
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
