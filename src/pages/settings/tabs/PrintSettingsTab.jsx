import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { HiOutlineUpload, HiOutlineCheckCircle } from 'react-icons/hi';
import ThermalTemplate from '../../../components/invoice-templates/ThermalTemplate';

const DEFAULT_SETTINGS = {
  thermal_print_size: '3inch',
  monochrome_logo_url: '',
  barcode_printer_settings: {
    paper_width: 50,
    paper_height: 25,
    columns: 2,
    margin_top: 2,
    margin_left: 2
  }
};

const SAMPLE_BILL = {
  bill_no: 'RT/24/272',
  date: '29-05-2026 09:22 AM',
  subtotal: 1419.60,
  tax_amount: 216.54,
  grand_total: 1636.15,
  advance_paid: 1220.60,
  balance_due: 0.00,
  notes: 'We offer doorstep delivery for large orders. Enquire within!',
  items: [
    { name: 'Cleanic 100% bleach', qty: 1.0, unit: 'PCS', price: 168.64, discount: 0, tax: 18, total: 189.05 },
    { name: 'AP Honey 500g', qty: 2.0, unit: 'PCS', price: 211.86, discount: 0, tax: 18, total: 500.00 },
    { name: 'Colgate Electric Toothbrush', qty: 1.0, unit: 'PCS', price: 651.69, discount: 0, tax: 18, total: 730.55 },
  ],
  party: {
    name: 'Cash Sale',
    address: 'Odisha',
    phone: '',
    gstin: ''
  }
};

export default function PrintSettingsTab({ setIsDirty }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [shopSettings, setShopSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('thermal'); // 'thermal' or 'barcode'
  const [isLocalDirty, setIsLocalDirty] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('shop_settings').select('*').limit(1).single();
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setShopSettings(data);
        setSettings(prev => ({
          ...prev,
          ...data,
          barcode_printer_settings: data.barcode_printer_settings || prev.barcode_printer_settings
        }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isLocalDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isLocalDirty]);

  const saveSettings = async () => {
    if (!window.confirm('Are you sure you want to save these print settings?')) return;
    try {
      const payload = { ...settings };
      delete payload.id;
      payload.updated_at = new Date().toISOString();

      if (settings.id) {
        const { error } = await supabase.from('shop_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('shop_settings').insert([{ ...payload, shop_name: 'My Shop' }]).select().single();
        if (error) throw error;
        if (data) setSettings(prev => ({ ...prev, id: data.id }));
      }
      if (setIsDirty) setIsDirty(false);
      setIsLocalDirty(false);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const set = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (setIsDirty) setIsDirty(true);
    setIsLocalDirty(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `monochrome_logo_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('shop_assets').upload(filePath, file);
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage.from('shop_assets').getPublicUrl(filePath);
      if (publicUrlData) {
        set('monochrome_logo_url', publicUrlData.publicUrl);
      }
    } catch (err) {
      alert('Error uploading logo: ' + err.message);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-surface-400 animate-pulse">Loading Print Settings...</div>;

  return (
    <div className="flex gap-0 h-full w-full overflow-hidden absolute inset-0">
      
      {/* ─── LEFT: Settings Panel ─── */}
      <div className="w-[450px] border-r border-surface-200 bg-white flex flex-col z-20">
        
        {/* Header Tabs */}
        <div className="flex border-b border-surface-200 bg-surface-50 pt-4 px-4 gap-4">
          <button 
            onClick={() => setActiveTab('thermal')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'thermal' ? 'border-[#4f46e5] text-[#4f46e5]' : 'border-transparent text-surface-500 hover:text-surface-800'}`}
          >
            Thermal Printer
          </button>
          <button 
            onClick={() => setActiveTab('barcode')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'barcode' ? 'border-[#4f46e5] text-[#4f46e5]' : 'border-transparent text-surface-500 hover:text-surface-800'}`}
          >
            Barcode Printer
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {activeTab === 'thermal' && (
            <>
              <div>
                <label className="block text-[14px] font-bold text-surface-800 mb-3">Select your Invoice theme</label>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => set('thermal_print_size', '2inch')}
                    className={`flex justify-between items-center px-4 py-3 border-2 rounded-lg transition-colors ${
                      settings.thermal_print_size === '2inch' ? 'border-[#4f46e5] bg-indigo-50/30' : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <span className="font-bold text-surface-700">2 Inch (58mm)</span>
                    {settings.thermal_print_size === '2inch' && <HiOutlineCheckCircle className="w-5 h-5 text-[#4f46e5]" />}
                  </button>
                  <button
                    onClick={() => set('thermal_print_size', '3inch')}
                    className={`flex justify-between items-center px-4 py-3 border-2 rounded-lg transition-colors ${
                      settings.thermal_print_size === '3inch' ? 'border-[#4f46e5] bg-indigo-50/30' : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <span className="font-bold text-surface-700">3 Inch (80mm)</span>
                    {settings.thermal_print_size === '3inch' && <HiOutlineCheckCircle className="w-5 h-5 text-[#4f46e5]" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-bold text-surface-800 mb-3">Business Logo</label>
                <div className="border-2 border-dashed border-surface-200 rounded-lg p-6 flex flex-col items-center justify-center bg-surface-50">
                  {settings.monochrome_logo_url ? (
                    <div className="relative group">
                      <img src={settings.monochrome_logo_url} alt="Logo" className="h-16 object-contain grayscale" />
                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded">
                        <label className="cursor-pointer text-white text-xs font-bold hover:underline">
                          Change
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-surface-100 rounded flex items-center justify-center mb-3">
                        <HiOutlineUpload className="w-6 h-6 text-surface-400" />
                      </div>
                      <label className="cursor-pointer text-[#4f46e5] font-bold text-sm hover:underline">
                        Upload Monochrome Logo
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-surface-500 mt-3 text-center leading-relaxed">
                  You can only upload your logo in Monochrome, *.bmp extension and 210px (max width) x 70px (max height) dimensions.
                </p>
              </div>
            </>
          )}

          {activeTab === 'barcode' && (
            <>
              <div>
                <label className="block text-[14px] font-bold text-surface-800 mb-3">Barcode Paper Dimensions</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-surface-500 mb-1">Paper Width (mm)</label>
                    <input
                      type="number"
                      value={settings.barcode_printer_settings.paper_width}
                      onChange={(e) => set('barcode_printer_settings', { ...settings.barcode_printer_settings, paper_width: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] bg-surface-50 hover:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-surface-500 mb-1">Paper Height (mm)</label>
                    <input
                      type="number"
                      value={settings.barcode_printer_settings.paper_height}
                      onChange={(e) => set('barcode_printer_settings', { ...settings.barcode_printer_settings, paper_height: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] bg-surface-50 hover:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-bold text-surface-800 mb-3">Layout</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-surface-500 mb-1">Labels per Row</label>
                    <select
                      value={settings.barcode_printer_settings.columns}
                      onChange={(e) => set('barcode_printer_settings', { ...settings.barcode_printer_settings, columns: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-surface-200 rounded text-sm outline-none focus:border-[#4f46e5] bg-surface-50 hover:bg-white transition-colors cursor-pointer"
                    >
                      <option value={1}>1 Label</option>
                      <option value={2}>2 Labels</option>
                      <option value={3}>3 Labels</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Sticky Footer */}
        <div className="p-3 border-t border-surface-200 bg-white sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button
            onClick={saveSettings}
            className="w-full bg-[#4f46e5] text-white font-bold py-2 rounded-md shadow hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <span className="text-lg leading-none">💾</span> Save Changes
          </button>
        </div>
      </div>

      {/* ─── RIGHT: Live Preview ─── */}
      <div className="flex-1 bg-[#fff8e7] flex flex-col items-center overflow-y-auto relative p-8">
        
        <div className="w-full max-w-2xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm mb-8 text-center shadow-sm">
          This is a preview of the {activeTab === 'thermal' ? 'Thermal' : 'Barcode'} print of your invoice. Some columns might not appear if they don't have the required information.
        </div>
        
        {activeTab === 'thermal' ? (
          <div className="shadow-xl bg-white border border-surface-200 rounded-sm overflow-hidden" style={{ width: settings.thermal_print_size === '2inch' ? '58mm' : '80mm', minHeight: '150mm' }}>
            <ThermalTemplate bill={{ ...SAMPLE_BILL }} shop={shopSettings} settings={settings} />
          </div>
        ) : (
          <div className="flex gap-4 p-8 bg-white shadow-xl border border-surface-200 rounded-sm">
            {/* Mock Barcode Preview */}
            {[...Array(settings.barcode_printer_settings.columns)].map((_, i) => (
              <div 
                key={i} 
                className="border border-surface-300 border-dashed rounded p-2 flex flex-col items-center justify-center"
                style={{ width: `${settings.barcode_printer_settings.paper_width}mm`, height: `${settings.barcode_printer_settings.paper_height}mm` }}
              >
                <div className="text-[10px] font-bold text-center leading-tight mb-1">{shopSettings?.shop_name || 'SHOP NAME'}</div>
                <div className="flex-1 w-full bg-surface-800 flex items-center justify-center text-white text-[8px] font-mono mb-1">||||||||||||||||||</div>
                <div className="text-[8px] font-mono">RT/24/272</div>
                <div className="text-[11px] font-black mt-0.5">₹ 1,636.15</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
