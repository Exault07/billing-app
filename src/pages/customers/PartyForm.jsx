import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { 
  HiOutlineUser, 
  HiOutlinePhone, 
  HiOutlineMail, 
  HiOutlineIdentification,
  HiOutlineLocationMarker,
  HiOutlineCurrencyRupee,
  HiOutlineCalendar,
  HiOutlineDocumentText,
  HiOutlinePlus,
  HiOutlineArrowLeft
} from 'react-icons/hi';

export default function PartyForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    opening_balance: 0,
    balance_type: 'to_collect',
    party_type: 'customer',
    category_id: '',
    pan_number: '',
    billing_address: '',
    shipping_addresses: [''],
    same_as_billing: false,
    credit_period: 30,
    credit_limit: 0,
    notes: ''
  });

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const { data: catData, error: catError } = await supabase
          .from('party_categories')
          .select('*')
          .order('name');
        if (catError && catError.code !== '42P01') throw catError; // Ignore if table doesn't exist yet
        setCategories(catData || []);

        if (isEditing) {
          const { data, error } = await supabase.from('parties').select('*').eq('id', id).single();
          if (error) throw error;
          if (data) {
            let parsedShipping = [''];
            if (data.shipping_address) {
              try {
                parsedShipping = JSON.parse(data.shipping_address);
                if (!Array.isArray(parsedShipping)) parsedShipping = [data.shipping_address];
              } catch (e) {
                parsedShipping = data.shipping_address.split('\n---\n');
              }
            }
            
            setForm({
              name: data.name || '',
              mobile: data.mobile || '',
              email: data.email || '',
              opening_balance: data.opening_balance || 0,
              balance_type: data.balance_type || 'to_collect',
              party_type: data.party_type || 'customer',
              category_id: data.category_id || '',
              pan_number: data.pan_number || '',
              billing_address: data.billing_address || '',
              shipping_addresses: parsedShipping.length > 0 ? parsedShipping : [''],
              same_as_billing: false,
              credit_period: data.credit_period || 30,
              credit_limit: data.credit_limit || 0,
              notes: data.notes || ''
            });
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, isEditing]);

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleShippingChange = (index, value) => {
    const updated = [...form.shipping_addresses];
    updated[index] = value;
    setForm({ ...form, shipping_addresses: updated });
  };

  const addShippingAddress = () => {
    setForm({ ...form, shipping_addresses: [...form.shipping_addresses, ''] });
  };

  const handleSameAsBilling = (e) => {
    const checked = e.target.checked;
    setForm({
      ...form,
      same_as_billing: checked,
      shipping_addresses: checked ? [form.billing_address] : ['']
    });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('party_categories')
        .insert([{ name: newCategoryName.trim() }])
        .select()
        .single();
      if (error) throw error;
      setCategories([...categories, data]);
      setForm({ ...form, category_id: data.id });
      setNewCategoryName('');
      setShowNewCategory(false);
    } catch (err) {
      alert('Error adding category: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Party Name is required.');
    
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        mobile: form.mobile,
        email: form.email,
        opening_balance: Number(form.opening_balance) || 0,
        balance_type: form.balance_type,
        party_type: form.party_type,
        category_id: form.category_id || null,
        pan_number: form.pan_number,
        billing_address: form.billing_address,
        shipping_address: JSON.stringify(form.shipping_addresses.filter(a => a.trim() !== '')),
        credit_period: Number(form.credit_period) || 0,
        credit_limit: Number(form.credit_limit) || 0,
        notes: form.notes
      };

      if (isEditing) {
        const { error } = await supabase.from('parties').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('parties').insert([payload]);
        if (error) throw error;
      }
      navigate('/parties');
    } catch (err) {
      setError(err.message || 'Failed to save party');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-100 rounded-full text-surface-500 transition-colors">
          <HiOutlineArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            {isEditing ? 'Edit Party' : 'Create New Party'}
          </h1>
          <p className="text-sm text-surface-500 mt-1">Manage party details, addresses, and credit settings.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in flex items-start gap-2">
          <span className="mt-0.5 text-red-400">âš </span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* General Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-100 bg-surface-50/50">
            <h2 className="text-sm font-bold text-surface-800 uppercase tracking-wider">General Details</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-surface-600 mb-1">Party Type</label>
                <select value={form.party_type} onChange={set('party_type')} className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="flex-1 relative">
                <label className="block text-xs font-medium text-surface-600 mb-1">Category</label>
                {showNewCategory ? (
                  <div className="flex items-center gap-2">
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Category Name" 
                      value={newCategoryName} 
                      onChange={(e) => setNewCategoryName(e.target.value)} 
                      className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button type="button" onClick={handleAddCategory} className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm whitespace-nowrap">Save</button>
                    <button type="button" onClick={() => setShowNewCategory(false)} className="px-3 py-2 bg-surface-100 text-surface-600 rounded-lg text-sm">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select value={form.category_id} onChange={set('category_id')} className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">- No Category -</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowNewCategory(true)} className="p-2.5 text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors" title="Add Category">
                      <HiOutlinePlus className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-surface-600 mb-1">Party Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 w-5 h-5" />
                <input required type="text" value={form.name} onChange={set('name')} className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Enter full name or business name" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Mobile Number</label>
              <div className="relative">
                <HiOutlinePhone className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 w-5 h-5" />
                <input type="text" value={form.mobile} onChange={set('mobile')} className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="10-digit number" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Email Address</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 w-5 h-5" />
                <input type="email" value={form.email} onChange={set('email')} className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="email@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">PAN Number</label>
              <div className="relative">
                <HiOutlineIdentification className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 w-5 h-5" />
                <input type="text" value={form.pan_number} onChange={set('pan_number')} className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="ABCDE1234F" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Opening Balance (₹)</label>
              <div className="flex relative">
                <HiOutlineCurrencyRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 w-5 h-5 z-10" />
                <input type="number" step="0.01" value={form.opening_balance} onChange={set('opening_balance')} className="w-full pl-10 pr-4 py-2.5 border border-r-0 border-surface-200 rounded-l-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10 relative" placeholder="0.00" />
                <select value={form.balance_type} onChange={set('balance_type')} className="border border-surface-200 rounded-r-xl px-3 py-2.5 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10 relative font-medium">
                  <option value="to_collect">To Collect</option>
                  <option value="to_pay">To Pay</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-100 bg-surface-50/50">
            <h2 className="text-sm font-bold text-surface-800 uppercase tracking-wider">Address Details</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Billing Address</label>
              <div className="relative">
                <HiOutlineLocationMarker className="absolute left-3 top-3 text-surface-400 w-5 h-5" />
                <textarea rows="2" value={form.billing_address} onChange={set('billing_address')} className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Full billing address..." />
              </div>
            </div>

            <div className="pt-4 border-t border-surface-100">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-medium text-surface-600">Shipping Addresses</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.same_as_billing} onChange={handleSameAsBilling} className="w-4 h-4 text-primary-600 rounded border-surface-300 focus:ring-primary-500" />
                  <span className="text-sm text-surface-600">Same as Billing Address</span>
                </label>
              </div>
              
              <div className="space-y-3">
                {form.shipping_addresses.map((addr, idx) => (
                  <div key={idx} className="relative">
                    <HiOutlineLocationMarker className="absolute left-3 top-3 text-surface-400 w-5 h-5" />
                    <textarea 
                      rows="2" 
                      value={addr} 
                      onChange={(e) => handleShippingChange(idx, e.target.value)} 
                      disabled={form.same_as_billing}
                      className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-surface-50 disabled:text-surface-500" 
                      placeholder={`Shipping address ${idx + 1}...`} 
                    />
                  </div>
                ))}
              </div>
              
              {!form.same_as_billing && (
                <button type="button" onClick={addShippingAddress} className="mt-3 text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1">
                  <HiOutlinePlus className="w-4 h-4" /> Add Another Shipping Address
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Credit & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-surface-100 bg-surface-50/50">
              <h2 className="text-sm font-bold text-surface-800 uppercase tracking-wider">Credit Settings</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Credit Period (Days)</label>
                <div className="relative">
                  <HiOutlineCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 w-5 h-5" />
                  <input type="number" min="0" value={form.credit_period} onChange={set('credit_period')} className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Credit Limit (₹)</label>
                <div className="relative">
                  <HiOutlineCurrencyRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 w-5 h-5" />
                  <input type="number" min="0" step="0.01" value={form.credit_limit} onChange={set('credit_limit')} className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-surface-100 bg-surface-50/50">
              <h2 className="text-sm font-bold text-surface-800 uppercase tracking-wider">Additional Notes</h2>
            </div>
            <div className="p-6 h-[calc(100%-53px)]">
              <div className="relative h-full">
                <HiOutlineDocumentText className="absolute left-3 top-3 text-surface-400 w-5 h-5" />
                <textarea value={form.notes} onChange={set('notes')} className="w-full h-full min-h-[120px] pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Add any private notes about this party..." />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-surface-200">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 text-sm font-semibold text-surface-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-70 flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Save Party
          </button>
        </div>

      </form>
    </div>
  );
}
