import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { HiOutlineCube, HiOutlineSave, HiOutlineTrash } from 'react-icons/hi';

const UNITS = ['piece', 'kg', 'ft', 'sqft', 'meter', 'litre', 'box', 'bundle', 'bag', 'dozen', 'set', 'pair'];
const CATEGORIES = ['Furniture', 'Plywood & Board', 'Hardware', 'Adhesives & Sealants', 'Glass & Mirror', 'Paint & Polish', 'Electrical', 'Tools', 'Fabric & Upholstery', 'Other'];

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form, setForm] = useState({
    name: '', category: '', unit: 'piece', mrp: '', selling_price: '', stock_qty: '',
    low_stock_alert_qty: '', barcode: '', godown_location: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditing) return;
    setLoading(true);
    supabase.from('products').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setForm({
        name: data.name || '', category: data.category || '', unit: data.unit || 'piece',
        mrp: data.mrp || '', selling_price: data.selling_price || '', stock_qty: data.stock_qty || '',
        low_stock_alert_qty: data.low_stock_alert_qty || '', barcode: data.barcode || '',
        godown_location: data.godown_location || '',
      });
      setLoading(false);
    });
  }, [isEditing, id]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (!form.selling_price) { setError('Selling price is required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, mrp: Number(form.mrp) || 0, selling_price: Number(form.selling_price), stock_qty: Number(form.stock_qty) || 0, low_stock_alert_qty: Number(form.low_stock_alert_qty) || 0 };
      if (isEditing) {
        await supabase.from('products').update(payload).eq('id', id);
      } else {
        await supabase.from('products').insert(payload);
      }
      navigate('/inventory');
    } catch (err) { setError('Failed to save: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    setDeleting(true);
    await supabase.from('products').delete().eq('id', id);
    navigate('/inventory');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
            <HiOutlineCube className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-800">{isEditing ? 'Edit Product' : 'Add New Product'}</h1>
            <p className="text-xs text-surface-400">{isEditing ? 'Update product details.' : 'Fill in the details to add a product.'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing && (
            <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
              <HiOutlineTrash className="w-4 h-4" /> Delete
            </button>
          )}
          <Link to="/inventory" className="px-4 py-2 text-sm rounded-xl border border-surface-200 text-surface-600 hover:bg-surface-50">Cancel</Link>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50">
            <HiOutlineSave className="w-4 h-4" />{saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">⚠ {error}</div>}

      {/* Basic Info */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide mb-4">Product Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-surface-600 mb-1">Product Name *</label>
            <input value={form.name} onChange={set('name')} placeholder="e.g. Century Plywood 18mm MR Grade" className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Category</label>
            <select value={form.category} onChange={set('category')} className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">— Select Category —</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Unit</label>
            <select value={form.unit} onChange={set('unit')} className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Barcode / SKU</label>
            <input value={form.barcode} onChange={set('barcode')} placeholder="e.g. BAR001" className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Godown / Location</label>
            <input value={form.godown_location} onChange={set('godown_location')} placeholder="e.g. A1-Row2" className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide mb-4">Pricing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">MRP (₹)</label>
            <input type="number" min="0" step="0.01" value={form.mrp} onChange={set('mrp')} placeholder="0.00" className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Selling Price (₹) *</label>
            <input type="number" min="0" step="0.01" value={form.selling_price} onChange={set('selling_price')} placeholder="0.00" className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
      </div>

      {/* Stock */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6">
        <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide mb-4">Stock Management</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Current Stock Qty</label>
            <input type="number" min="0" step="0.01" value={form.stock_qty} onChange={set('stock_qty')} placeholder="0" className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Low Stock Alert Below</label>
            <input type="number" min="0" step="0.01" value={form.low_stock_alert_qty} onChange={set('low_stock_alert_qty')} placeholder="e.g. 10" className="w-full border border-surface-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <p className="text-xs text-surface-400 mt-1">Alert shows when stock falls below this number.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
