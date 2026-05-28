import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { HiOutlineSave } from 'react-icons/hi';

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
 email: ''
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
 email: data.email || ''
 });
 }
 } catch (err) {
 console.error('Error fetching shop settings:', err);
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
 setMessage({ text: 'Shop profile saved successfully!', type: 'success' });
 setTimeout(() => setMessage({ text: '', type: '' }), 3000);
 } catch (err) {
 console.error('Error saving shop profile:', err);
 setMessage({ text: 'Failed to save settings: ' + err.message, type: 'error' });
 } finally {
 setSaving(false);
 }
 };

 if (loading) return <div className="p-4 text-surface-500">Loading settings...</div>;

 return (
 <div className="max-w-3xl">
 <h2 className="text-xl font-bold text-surface-900 mb-6">Shop Profile</h2>
 
 {message.text && (
 <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${
 message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
 }`}>
 {message.text}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-1">
 <label className="block text-sm font-medium text-surface-700">Shop Name *</label>
 <input
 type="text" required
 value={formData.shop_name}
 onChange={(e) => setFormData({...formData, shop_name: e.target.value})}
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
 placeholder="E.g. My Furniture Shop"
 />
 </div>
 <div className="space-y-1">
 <label className="block text-sm font-medium text-surface-700">Owner Name</label>
 <input
 type="text"
 value={formData.owner_name}
 onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
 placeholder="Owner's full name"
 />
 </div>

 <div className="space-y-1 md:col-span-2">
 <label className="block text-sm font-medium text-surface-700">Address Line 1</label>
 <input
 type="text"
 value={formData.address_line1}
 onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
 placeholder="Shop No., Street Name"
 />
 </div>
 <div className="space-y-1 md:col-span-2">
 <label className="block text-sm font-medium text-surface-700">Address Line 2</label>
 <input
 type="text"
 value={formData.address_line2}
 onChange={(e) => setFormData({...formData, address_line2: e.target.value})}
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
 placeholder="Locality, Landmark"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-sm font-medium text-surface-700">City</label>
 <input
 type="text"
 value={formData.city}
 onChange={(e) => setFormData({...formData, city: e.target.value})}
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
 />
 </div>
 <div className="space-y-1">
 <label className="block text-sm font-medium text-surface-700">State</label>
 <input
 type="text"
 value={formData.state}
 onChange={(e) => setFormData({...formData, state: e.target.value})}
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-sm font-medium text-surface-700">Pincode</label>
 <input
 type="text"
 value={formData.pincode}
 onChange={(e) => setFormData({...formData, pincode: e.target.value})}
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
 />
 </div>
 <div className="space-y-1">
 <label className="block text-sm font-medium text-surface-700">Primary Phone</label>
 <input
 type="text"
 value={formData.phone}
 onChange={(e) => setFormData({...formData, phone: e.target.value})}
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-sm font-medium text-surface-700">Alternate Phone</label>
 <input
 type="text"
 value={formData.alternate_phone}
 onChange={(e) => setFormData({...formData, alternate_phone: e.target.value})}
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
 />
 </div>
 <div className="space-y-1">
 <label className="block text-sm font-medium text-surface-700">Email Address</label>
 <input
 type="email"
 value={formData.email}
 onChange={(e) => setFormData({...formData, email: e.target.value})}
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
 />
 </div>
 </div>

 <div className="pt-6 border-t border-surface-200 flex justify-end">
 <button
 type="submit"
 disabled={saving}
 className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-70"
 >
 <HiOutlineSave className="w-5 h-5" />
 {saving ? 'Saving...' : 'Save Profile'}
 </button>
 </div>
 </form>
 </div>
 );
}
