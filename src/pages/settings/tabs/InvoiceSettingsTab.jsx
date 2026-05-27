import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { HiOutlineSave } from 'react-icons/hi';

export default function InvoiceSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [formData, setFormData] = useState({
    id: '',
    bill_prefix: 'INV-',
    bill_start_number: 1,
    quotation_prefix: 'QT-',
    purchase_prefix: 'PUR-',
    default_bill_notes: '',
    show_customer_balance: false,
    show_thankyou_message: true
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
          bill_prefix: data.bill_prefix || 'INV-',
          bill_start_number: data.bill_start_number || 1,
          quotation_prefix: data.quotation_prefix || 'QT-',
          purchase_prefix: data.purchase_prefix || 'PUR-',
          default_bill_notes: data.default_bill_notes || '',
          show_customer_balance: !!data.show_customer_balance,
          show_thankyou_message: data.show_thankyou_message !== false // default true
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
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
        bill_prefix: formData.bill_prefix,
        bill_start_number: parseInt(formData.bill_start_number) || 1,
        quotation_prefix: formData.quotation_prefix,
        purchase_prefix: formData.purchase_prefix,
        default_bill_notes: formData.default_bill_notes,
        show_customer_balance: formData.show_customer_balance,
        show_thankyou_message: formData.show_thankyou_message,
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
      setMessage({ text: 'Invoice settings saved successfully!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      console.error('Error saving invoice settings:', err);
      setMessage({ text: 'Failed to save: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-surface-500">Loading settings...</div>;

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold text-surface-900 mb-6">Invoice Settings</h2>
      
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Prefixes */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Document Prefixes & Numbers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-surface-50 rounded-xl border border-surface-200">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Sales Bill Prefix</label>
              <input
                type="text" required
                value={formData.bill_prefix}
                onChange={(e) => setFormData({...formData, bill_prefix: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Next Bill Starting Number</label>
              <input
                type="number" required min="1"
                value={formData.bill_start_number}
                onChange={(e) => setFormData({...formData, bill_start_number: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
              <p className="text-xs text-surface-500 mt-1">Example: {formData.bill_prefix}{String(formData.bill_start_number).padStart(3, '0')}</p>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Quotation Prefix</label>
              <input
                type="text" required
                value={formData.quotation_prefix}
                onChange={(e) => setFormData({...formData, quotation_prefix: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Purchase Order Prefix</label>
              <input
                type="text" required
                value={formData.purchase_prefix}
                onChange={(e) => setFormData({...formData, purchase_prefix: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Default Notes & Terms</h3>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-surface-700">Default Bill Notes (appears on footer)</label>
            <textarea
              rows="4"
              value={formData.default_bill_notes}
              onChange={(e) => setFormData({...formData, default_bill_notes: e.target.value})}
              className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              placeholder="Terms and conditions, return policy, etc."
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Display Options</h3>
          <div className="space-y-3 p-4 bg-surface-50 rounded-xl border border-surface-200">
            
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={formData.show_customer_balance}
                  onChange={(e) => setFormData({...formData, show_customer_balance: e.target.checked})}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${formData.show_customer_balance ? 'bg-primary-600' : 'bg-surface-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.show_customer_balance ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
              <span className="text-sm font-medium text-surface-700">Show previous customer balance on new bills</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={formData.show_thankyou_message}
                  onChange={(e) => setFormData({...formData, show_thankyou_message: e.target.checked})}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${formData.show_thankyou_message ? 'bg-primary-600' : 'bg-surface-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.show_thankyou_message ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
              <span className="text-sm font-medium text-surface-700">Show "Thank you for your business" message on footer</span>
            </label>

          </div>
        </div>

        <div className="pt-6 border-t border-surface-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            <HiOutlineSave className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Invoice Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
