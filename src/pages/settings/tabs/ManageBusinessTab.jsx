import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { HiOutlineSearch } from 'react-icons/hi';
import { HiOutlinePhotograph } from 'react-icons/hi';

export default function ManageBusinessTab() {
  const [loading, setLoading] = useState(true);
  
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

  useEffect(() => {
    const handleSave = async () => {
      setLoading(true);
      try {
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
          logo_url: formData.logo_url,
          signature_url: formData.signature_url,
          updated_at: new Date().toISOString()
        };

        let err;
        if (formData.id) {
          const { error } = await supabase.from('shop_settings').update(payload).eq('id', formData.id);
          err = error;
        } else {
          const { data, error } = await supabase.from('shop_settings').insert([payload]).select().single();
          if (data) setFormData(prev => ({...prev, id: data.id}));
          err = error;
        }
        
        if (err) throw err;
        alert('Business Settings saved successfully!');
      } catch (err) {
        alert('Failed to save settings: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('saveBusinessSettings', handleSave);
    return () => window.removeEventListener('saveBusinessSettings', handleSave);
  }, [formData]);

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [fieldName]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

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

  // We are relying on the global Save Changes button in Settings.jsx, 
  // but since we need to tie it to this form, it's better to auto-save or handle it.
  // For the sake of UI accuracy, we will just manage the state. 
  // In a real scenario, we would use a context or ref to trigger save from the global header.

  if (loading) return <div className="p-4 text-surface-500 animate-pulse">Loading settings...</div>;

  return (
    <div className="w-full h-full animate-fade-in pb-10">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col space-y-6">
          
          <div className="flex items-start gap-4">
            {/* Upload Logo Box */}
            <label className="w-32 h-32 border-2 border-dashed border-[#4f46e5] text-[#4f46e5] rounded flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors flex-shrink-0 bg-white overflow-hidden relative group">
              <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleFileUpload(e, 'logo_url')} />
              {formData.logo_url ? (
                <>
                  <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">Change</div>
                </>
              ) : (
                <>
                  <HiOutlinePhotograph className="w-6 h-6 mb-2" />
                  <span className="text-xs font-bold text-center">Upload Logo</span>
                  <span className="text-[9px] text-center mt-1 px-2 font-medium text-surface-500">PNG/JPG, max 5<br/>MB.</span>
                </>
              )}
            </label>
            
            {/* Business Name */}
            <div className="flex-1 space-y-1.5">
              <label className="block text-[12px] font-bold text-surface-500">Business Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.shop_name}
                onChange={(e) => setFormData({...formData, shop_name: e.target.value})}
                className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] text-surface-900 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-surface-500">Company Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] text-surface-900 font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-surface-500">Company E-Mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] text-surface-900 font-medium"
                placeholder="Enter company e-mail"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold text-surface-500">Billing Address</label>
            <textarea
              rows="3"
              value={formData.address_line1}
              onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
              className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] resize-none text-surface-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-surface-500">State</label>
              <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-2.5 text-surface-400 w-4 h-4" />
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] text-surface-900 font-medium appearance-none"
                >
                  <option value="">Select</option>
                  <option value="Odisha">Odisha</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Delhi">Delhi</option>
                </select>
                <div className="absolute right-3 top-3 text-surface-400 pointer-events-none">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-surface-500">Pincode</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                placeholder="Enter Pincode"
                className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] text-surface-900 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold text-surface-500">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              placeholder="Enter City"
              className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] text-surface-900 font-medium"
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="block text-[12px] font-bold text-[#4f46e5]">Are you GST Registered?</label>
            <div className="flex items-center gap-4">
              <div 
                className={`flex items-center justify-between px-4 py-2 border rounded cursor-pointer w-32 ${formData.gst_registered ? 'border-[#4f46e5] shadow-[0_0_0_1px_rgba(79,70,229,1)]' : 'border-surface-200'}`}
                onClick={() => setFormData({...formData, gst_registered: true})}
              >
                <span className="text-sm font-semibold">Yes</span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.gst_registered ? 'border-[#4f46e5]' : 'border-surface-300'}`}>
                  {formData.gst_registered && <div className="w-2 h-2 rounded-full bg-[#4f46e5]"></div>}
                </div>
              </div>
              <div 
                className={`flex items-center justify-between px-4 py-2 border rounded cursor-pointer w-32 ${!formData.gst_registered ? 'border-[#4f46e5] shadow-[0_0_0_1px_rgba(79,70,229,1)]' : 'border-surface-200'}`}
                onClick={() => setFormData({...formData, gst_registered: false})}
              >
                <span className="text-sm font-semibold text-surface-600">No</span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!formData.gst_registered ? 'border-[#4f46e5]' : 'border-surface-300'}`}>
                  {!formData.gst_registered && <div className="w-2 h-2 rounded-full bg-[#4f46e5]"></div>}
                </div>
              </div>
            </div>
          </div>

          {formData.gst_registered && (
            <div className="space-y-1.5 pt-2">
              <label className="block text-[12px] font-bold text-red-600">GSTIN*</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({...formData, gstin: e.target.value})}
                className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] text-surface-900 font-medium uppercase"
              />
            </div>
          )}

        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-surface-500">Business Type (Select multiple, if applicable)</label>
              <div className="relative">
                <select
                  value={formData.business_type}
                  onChange={(e) => setFormData({...formData, business_type: e.target.value})}
                  className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] text-surface-900 font-medium appearance-none"
                >
                  <option value="">Select</option>
                  <option value="Retail">Retail</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Distributor">Distributor</option>
                </select>
                <div className="absolute right-3 top-3 text-surface-400 pointer-events-none">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-surface-500">Industry Type</label>
              <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-2.5 text-surface-400 w-4 h-4" />
                <select
                  value={formData.industry_type}
                  onChange={(e) => setFormData({...formData, industry_type: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] text-surface-900 font-medium appearance-none"
                >
                  <option value="">Select</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Furniture">Furniture</option>
                </select>
                <div className="absolute right-3 top-3 text-surface-400 pointer-events-none">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold text-surface-500">Business Registration Type</label>
            <div className="relative">
              <select
                value={formData.registration_type}
                onChange={(e) => setFormData({...formData, registration_type: e.target.value})}
                className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] text-surface-900 font-medium appearance-none"
              >
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Partnership">Partnership</option>
                <option value="Private Limited">Private Limited</option>
              </select>
              <div className="absolute right-3 top-3 text-surface-400 pointer-events-none">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className="bg-surface-50 px-4 py-2 rounded text-[11px] font-bold text-surface-700 text-center border border-surface-100">
            Note: Details added below will be shown on your Invoices
          </div>

          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold text-surface-500">Signature</label>
            <label className="w-48 h-24 border-2 border-dashed border-[#4f46e5] text-[#4f46e5] rounded flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors bg-white overflow-hidden relative group">
              <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => handleFileUpload(e, 'signature_url')} />
              {formData.signature_url ? (
                <>
                  <img src={formData.signature_url} alt="Signature" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">Change</div>
                </>
              ) : (
                <span className="text-sm font-bold flex items-center gap-1">+ Add Signature</span>
              )}
            </label>
          </div>

          <div className="mt-6 border border-surface-200 rounded p-4 bg-white shadow-sm">
            <h4 className="text-sm font-bold text-[#4f46e5] mb-1">Add Business Details</h4>
            <p className="text-[11px] text-surface-500 mb-4">Add additional business information such as MSME number, Website etc.</p>
            
            <div className="flex items-center gap-3">
              <div className="w-1/3">
                <div className="relative">
                  <select className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] text-surface-900 font-medium appearance-none bg-white">
                    <option>Website</option>
                    <option>MSME Number</option>
                  </select>
                  <div className="absolute right-3 top-3 text-surface-400 pointer-events-none">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
              <div className="text-surface-400 font-bold">=</div>
              <div className="flex-1">
                <input 
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] text-surface-900 font-medium"
                  placeholder="www.website.com"
                />
              </div>
              <button className="px-6 py-2 bg-[#4f46e5] text-white rounded text-sm font-bold shadow-sm hover:bg-[#4338ca] transition-colors">
                Add
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
