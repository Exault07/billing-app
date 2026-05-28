const fs = require('fs');

const componentCode = `import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { HiOutlineSave, HiOutlineCamera, HiOutlinePencil } from 'react-icons/hi';

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

  if (loading) return <div className="p-4 text-surface-500">Loading settings...</div>;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 border-b border-surface-200 pb-4">
        <h2 className="text-xl font-bold text-surface-900">Business Settings</h2>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-70"
        >
          <HiOutlineSave className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      
      {message.text && (
        <div className={\`mb-6 p-4 rounded-lg text-sm font-medium \${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }\`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-10">
        
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 border-2 border-dashed border-primary-300 rounded-lg flex flex-col items-center justify-center text-primary-600 cursor-pointer hover:bg-primary-50 bg-white">
              <HiOutlineCamera className="w-8 h-8 mb-2" />
              <span className="text-xs font-semibold text-center">Upload Logo<br/><span className="text-[10px] font-normal text-surface-500">PNG/JPG max 5MB</span></span>
            </div>
            <div className="flex-1 space-y-1">
              <label className="block text-sm font-semibold text-surface-700">Business Name *</label>
              <input
                type="text" required
                value={formData.shop_name}
                onChange={(e) => setFormData({...formData, shop_name: e.target.value})}
                className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="E.g. Om Namah Shivay"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Company Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Company E-Mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Billing Address</label>
            <textarea
              rows="3"
              value={formData.address_line1}
              onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
              className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              placeholder="Shop No., Street Name"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">State</label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Select</option>
                <option value="Odisha">Odisha</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
                {/* Add more states as needed */}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Pincode</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="block text-sm font-medium text-surface-700">Are you GST Registered?</label>
                <div className="flex gap-4 p-2 bg-surface-50 border border-surface-200 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gst" checked={formData.gst_registered} onChange={() => setFormData({...formData, gst_registered: true})} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gst" checked={!formData.gst_registered} onChange={() => setFormData({...formData, gst_registered: false})} className="w-4 h-4 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm">No</span>
                  </label>
                </div>
             </div>
             {formData.gst_registered && (
               <div className="space-y-1">
                 <label className="block text-sm font-medium text-red-600">GSTIN *</label>
                 <input
                   type="text"
                   required
                   value={formData.gstin}
                   onChange={(e) => setFormData({...formData, gstin: e.target.value})}
                   className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none uppercase"
                   placeholder="21ABWPA..."
                 />
               </div>
             )}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Business Type</label>
              <select
                value={formData.business_type}
                onChange={(e) => setFormData({...formData, business_type: e.target.value})}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Select</option>
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Distributor">Distributor</option>
                <option value="Manufacturer">Manufacturer</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Industry Type</label>
              <select
                value={formData.industry_type}
                onChange={(e) => setFormData({...formData, industry_type: e.target.value})}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Select</option>
                <option value="Hardware">Hardware</option>
                <option value="Furniture">Furniture</option>
                <option value="Electronics">Electronics</option>
                <option value="FMCG">FMCG</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Business Registration Type</label>
            <select
              value={formData.registration_type}
              onChange={(e) => setFormData({...formData, registration_type: e.target.value})}
              className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">Select</option>
              <option value="Sole Proprietorship">Sole Proprietorship</option>
              <option value="Partnership">Partnership</option>
              <option value="Private Limited">Private Limited</option>
              <option value="Public Limited">Public Limited</option>
              <option value="LLP">LLP</option>
            </select>
          </div>

          <div className="bg-surface-50 rounded-lg border border-surface-200 p-4 mt-8">
            <p className="text-xs text-center text-surface-600 mb-4"><strong>Note:</strong> Details added below will be shown on your invoices</p>
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Signature</label>
              <div className="w-full h-32 border-2 border-dashed border-primary-300 rounded-lg flex flex-col items-center justify-center text-primary-600 cursor-pointer hover:bg-primary-50 bg-white">
                <span className="text-sm font-semibold flex items-center gap-1">+ Add Signature</span>
              </div>
            </div>
          </div>

          <div className="border border-surface-200 rounded-lg overflow-hidden">
            <div className="bg-surface-50 p-4 border-b border-surface-200">
              <h4 className="text-sm font-bold text-surface-800">Add Business Details</h4>
              <p className="text-xs text-surface-500">Add additional business information such as MSME number, Website etc.</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <div className="w-1/3">
                  <input type="text" readOnly value="Website" className="w-full px-3 py-2 bg-surface-100 border border-surface-200 rounded text-sm text-surface-600 outline-none" />
                </div>
                <div className="w-2/3">
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="www.website.com"
                    className="w-full px-3 py-2 bg-white border border-surface-200 rounded text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-1/3">
                  <input type="text" readOnly value="MSME Number" className="w-full px-3 py-2 bg-surface-100 border border-surface-200 rounded text-sm text-surface-600 outline-none" />
                </div>
                <div className="w-2/3">
                  <input
                    type="text"
                    value={formData.msme_number}
                    onChange={(e) => setFormData({...formData, msme_number: e.target.value})}
                    placeholder="E.g. UDYAM-XX-00-XXXXXXX"
                    className="w-full px-3 py-2 bg-white border border-surface-200 rounded text-sm focus:ring-2 focus:ring-primary-500 outline-none"
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
`;

fs.writeFileSync('src/pages/settings/tabs/ShopProfileTab.jsx', componentCode);
console.log('ShopProfileTab.jsx rewritten!');
