import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { HiOutlineSave, HiOutlineCamera, HiOutlineOfficeBuilding, HiOutlineDocumentText, HiOutlinePhotograph } from 'react-icons/hi';

export default function ShopProfileTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [formData, setFormData] = useState({
    id: '',
    shop_name: '',
    owner_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    alternate_phone: '',
    email: '',
    business_type: '',
    industry_type: '',
    registration_type: '',
    gst_registered: false,
    gstin: '',
    website: '',
    msme_number: '',
    logo_url: '',
    signature_url: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('shop_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      if (data) {
        setFormData({
          id: data.id,
          shop_name: data.shop_name || '',
          owner_name: data.owner_name || '',
          address_line1: data.address_line1 || '',
          address_line2: data.address_line2 || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
          phone: data.phone || '',
          alternate_phone: data.alternate_phone || '',
          email: data.email || '',
          business_type: data.business_type || '',
          industry_type: data.industry_type || '',
          registration_type: data.registration_type || '',
          gst_registered: data.gst_registered || false,
          gstin: data.gstin || '',
          website: data.website || '',
          msme_number: data.msme_number || '',
          logo_url: data.logo_url || '',
          signature_url: data.signature_url || ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      let error;
      const payload = {
        shop_name: formData.shop_name,
        owner_name: formData.owner_name,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        phone: formData.phone,
        alternate_phone: formData.alternate_phone,
        email: formData.email,
        business_type: formData.business_type,
        industry_type: formData.industry_type,
        registration_type: formData.registration_type,
        gst_registered: formData.gst_registered,
        gstin: formData.gstin,
        website: formData.website,
        msme_number: formData.msme_number,
        updated_at: new Date().toISOString()
      };

      if (formData.id) {
        const { error: updateErr } = await supabase.from('shop_settings').update(payload).eq('id', formData.id);
        error = updateErr;
      } else {
        const { data: newRow, error: insertErr } = await supabase.from('shop_settings').insert([payload]).select().single();
        error = insertErr;
        if (newRow) setFormData(prev => ({ ...prev, id: newRow.id }));
      }

      if (error) throw error;
      setMessage({ text: 'Business Settings saved successfully!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setMessage({ text: 'Failed to save settings: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-surface-500 flex justify-center py-20 animate-pulse">Loading settings...</div>;

  return (
    <div className="w-full max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-200">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Business Profile</h2>
          <p className="text-sm text-surface-500">Update your company details and tax information</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-6 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-70"
        >
          <HiOutlineSave className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg text-sm font-medium flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Card 1: Basic Details */}
        <div className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-surface-50 px-6 py-4 border-b border-surface-200 flex items-center gap-2">
            <HiOutlineOfficeBuilding className="w-5 h-5 text-surface-500" />
            <h3 className="font-bold text-surface-800">Basic Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-sm font-semibold text-surface-700">Business Name <span className="text-red-500">*</span></label>
                <input
                  type="text" required
                  value={formData.shop_name}
                  onChange={(e) => setFormData({...formData, shop_name: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  placeholder="E.g. Om Namah Shivay"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  placeholder="Primary contact"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  placeholder="contact@company.com"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-sm font-medium text-surface-700">Billing Address</label>
                <textarea
                  rows="2"
                  value={formData.address_line1}
                  onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none transition-shadow"
                  placeholder="Shop No., Street Name"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 md:col-span-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-surface-700">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-surface-700">State</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  >
                    <option value="">Select State</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-surface-700">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Registration & Tax */}
        <div className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-surface-50 px-6 py-4 border-b border-surface-200 flex items-center gap-2">
            <HiOutlineDocumentText className="w-5 h-5 text-surface-500" />
            <h3 className="font-bold text-surface-800">Registration & Tax Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700">Business Type</label>
                <select
                  value={formData.business_type}
                  onChange={(e) => setFormData({...formData, business_type: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                >
                  <option value="">Select Type</option>
                  <option value="Retail">Retail</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Manufacturer">Manufacturer</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700">Industry</label>
                <select
                  value={formData.industry_type}
                  onChange={(e) => setFormData({...formData, industry_type: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                >
                  <option value="">Select Industry</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Electronics">Electronics</option>
                  <option value="FMCG">FMCG</option>
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-sm font-medium text-surface-700">Registration Type</label>
                <select
                  value={formData.registration_type}
                  onChange={(e) => setFormData({...formData, registration_type: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                >
                  <option value="">Select Registration</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Private Limited">Private Limited</option>
                  <option value="Public Limited">Public Limited</option>
                  <option value="LLP">LLP</option>
                </select>
              </div>

              <div className="space-y-3 md:col-span-2 p-4 bg-surface-50 border border-surface-200 rounded-lg">
                <label className="block text-sm font-medium text-surface-800">Are you GST Registered?</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gst" checked={formData.gst_registered} onChange={() => setFormData({...formData, gst_registered: true})} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium">Yes, I am registered</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gst" checked={!formData.gst_registered} onChange={() => setFormData({...formData, gst_registered: false})} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium">No</span>
                  </label>
                </div>
              </div>

              {formData.gst_registered && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-sm font-semibold text-red-600">GSTIN <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.gstin}
                    onChange={(e) => setFormData({...formData, gstin: e.target.value})}
                    className="w-full px-4 py-2 bg-surface-50 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none uppercase font-mono tracking-wider transition-shadow"
                    placeholder="21ABWPA..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Media & Documents */}
        <div className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-surface-50 px-6 py-4 border-b border-surface-200 flex items-center gap-2">
            <HiOutlinePhotograph className="w-5 h-5 text-surface-500" />
            <h3 className="font-bold text-surface-800">Branding & Additional Info</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-surface-700">Company Logo</label>
                  <div className="w-full h-32 border-2 border-dashed border-primary-300 rounded-xl flex flex-col items-center justify-center text-primary-600 cursor-pointer hover:bg-primary-50 bg-white transition-colors">
                    <HiOutlineCamera className="w-8 h-8 mb-2 opacity-70" />
                    <span className="text-sm font-semibold text-center">Upload Logo</span>
                    <span className="text-[10px] mt-1 font-normal text-surface-500">PNG or JPG, max 5MB</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-surface-700">Authorized Signature</label>
                  <div className="w-full h-32 border-2 border-dashed border-primary-300 rounded-xl flex flex-col items-center justify-center text-primary-600 cursor-pointer hover:bg-primary-50 bg-white transition-colors">
                    <span className="text-sm font-semibold flex items-center gap-1">+ Add Signature</span>
                    <span className="text-[10px] mt-1 font-normal text-surface-500">Will be printed on invoices</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-surface-700">Website</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="www.yourcompany.com"
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-surface-700">MSME Number (Udyam)</label>
                  <input
                    type="text"
                    value={formData.msme_number}
                    onChange={(e) => setFormData({...formData, msme_number: e.target.value})}
                    placeholder="UDYAM-XX-00-XXXXXXX"
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none uppercase font-mono transition-shadow"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
