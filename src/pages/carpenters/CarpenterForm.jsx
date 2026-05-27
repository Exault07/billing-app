import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { 
  HiOutlineUser, 
  HiOutlinePhone, 
  HiOutlineLocationMarker, 
  HiOutlineReceiptTax, 
  HiOutlineDocumentText 
} from 'react-icons/hi';

export default function CarpenterForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    default_commission_rate: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchCarpenter();
    }
  }, [id]);

  const fetchCarpenter = async () => {
    try {
      const { data, error } = await supabase
        .from('carpenters')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      if (data) {
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || '',
          default_commission_rate: data.default_commission_rate || 0,
          notes: data.notes || ''
        });
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching carpenter details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase
          .from('carpenters')
          .update(formData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('carpenters')
          .insert([formData]);
        if (error) throw error;
      }
      navigate('/carpenters');
    } catch (err) {
      console.error(err);
      alert('Error saving carpenter: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-surface-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-surface-800">{isEdit ? 'Edit Carpenter' : 'Add New Carpenter'}</h1>
        <p className="text-sm text-surface-500">Enter details for the referring carpenter</p>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Full Name *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineUser className="h-5 w-5 text-surface-400" />
                </div>
                <input 
                  required 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  className="pl-10 w-full px-4 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" 
                  placeholder="e.g. Ramesh Kumar" 
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlinePhone className="h-5 w-5 text-surface-400" />
                </div>
                <input 
                  type="text" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  className="pl-10 w-full px-4 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" 
                  placeholder="10-digit number" 
                />
              </div>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Address</label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <HiOutlineLocationMarker className="h-5 w-5 text-surface-400" />
                </div>
                <textarea 
                  name="address" 
                  rows="2" 
                  value={formData.address} 
                  onChange={handleChange} 
                  className="pl-10 w-full px-4 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" 
                  placeholder="Full address" 
                />
              </div>
            </div>

            {/* Commission Rate */}
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Default Commission Rate (%)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineReceiptTax className="h-5 w-5 text-surface-400" />
                </div>
                <input 
                  type="number" 
                  step="0.01" 
                  name="default_commission_rate" 
                  value={formData.default_commission_rate} 
                  onChange={handleChange} 
                  className="pl-10 w-full px-4 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" 
                  placeholder="0.00" 
                />
              </div>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-surface-700 mb-1">Notes</label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <HiOutlineDocumentText className="h-5 w-5 text-surface-400" />
                </div>
                <textarea 
                  name="notes" 
                  rows="2" 
                  value={formData.notes} 
                  onChange={handleChange} 
                  className="pl-10 w-full px-4 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" 
                  placeholder="Any additional details..." 
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-surface-200">
            <button 
              type="button" 
              onClick={() => navigate('/carpenters')} 
              className="px-5 py-2.5 text-sm font-medium text-surface-700 bg-surface-100 hover:bg-surface-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving} 
              className="px-5 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Saving...' : (isEdit ? 'Update Carpenter' : 'Save Carpenter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
