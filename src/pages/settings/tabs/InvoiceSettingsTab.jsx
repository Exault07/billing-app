import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineCheck, HiOutlinePlus } from 'react-icons/hi';
import InvoiceTemplate from '../../../components/invoice-templates/InvoiceTemplate';

// ─── Sample data for live preview ───────────────────────────────────────────
const SAMPLE_SHOP = { name: 'Om Namah Shivay', address: 'Estimate / Quotation, Odisha', phone: '7400417400', gstin: '21ABWPA9273G2ZH' };
const SAMPLE_PARTY = { name: 'SAMPLE PARTY', address: 'No F2, Outer Circle, Connaught Circus, New Delhi', gstin: 'GSTIN12345', mobile: '9876543210' };
const SAMPLE_ITEMS = [
  { name: 'Samsung A30', qty: 1, unit: 'PCS', price: 11620, discount: 1000, tax: 10, total: 10620 },
  { name: 'Parle-G 200g', qty: 1, unit: 'BOX', price: 357.43, discount: 51.43, tax: 15, total: 306 },
  { name: 'Puma Blue Round Neck T-Shirt', qty: 2, unit: 'PCS', price: 945, discount: 0, tax: 5, total: 1890 },
];
const SAMPLE_BILL = { bill_no: 'AABBCCDD/202', date: '17/01/2023', due_date: '16/02/2023', subtotal: 12922.43, discount: 1051.43, grand_total: 12816, advance_paid: 0, balance_due: 12816, notes: 'Sample Note' };
const fmt = (n) => Number(n || 0).toFixed(2);

// ─── Accent color palette ────────────────────────────────────────────────────
const COLORS = ['#000000', '#2d6a2d', '#0e7490', '#7c3aed', '#dc2626', '#4f46e5', '#d97706', '#ea580c'];

// ─── Theme thumbnails data ───────────────────────────────────────────────────
const A4_THEMES = [
  { id: 'standard', label: 'Standard' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'stylish', label: 'Stylish' },
  { id: 'modern', label: 'Modern' },
  { id: 'tally', label: 'Advanced GST (Tally)' },
  { id: 'simple', label: 'Simple' },
];

const A5_THEMES = [
  { id: 'standard_a5', label: 'Standard (A5)' },
  { id: 'luxury_a5', label: 'Luxury (A5)' },
  { id: 'stylish_a5', label: 'Stylish (A5)' },
  { id: 'modern_a5', label: 'Modern (A5)' },
  { id: 'tally_a5', label: 'Advanced GST (A5)' },
  { id: 'simple_a5', label: 'Simple (A5)' },
];

// ─── Collapsible Section (Controlled) ─────────────────────────────────────────
function Section({ title, children, open, onToggle }) {
  return (
    <div className="border-b border-surface-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3.5 text-[15px] font-bold text-surface-800 hover:text-[#4f46e5] transition-colors"
      >
        {title}
        {open ? <HiOutlineChevronUp className="w-5 h-5 text-surface-400" /> : <HiOutlineChevronDown className="w-5 h-5 text-surface-400" />}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[800px] pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

// ─── Checkbox Row ─────────────────────────────────────────────────────────────
function CheckRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group py-0.5">
      <div
        onClick={onChange}
        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
          checked ? 'bg-[#4f46e5] border-[#4f46e5]' : 'border-2 border-surface-300 bg-white group-hover:border-[#4f46e5]'
        }`}
      >
        {checked && <HiOutlineCheck className="w-3.5 h-3.5 text-white stroke-2" />}
      </div>
      <span className="text-[14px] text-surface-700 select-none">{label}</span>
    </label>
  );
}



// ─── Default Settings ────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  id: '',
  bill_prefix: 'INV-',
  bill_start_number: 1,
  quotation_prefix: 'QT-',
  purchase_prefix: 'PUR-',
  default_bill_notes: '',
  invoice_theme: 'standard',
  invoice_color: '#000000',
  invoice_size: 'A4',
  show_party_balance: false,
  enable_free_item_qty: false,
  show_item_description: false,
  show_alternate_unit: false,
  show_phone_on_invoice: false,
  show_time_on_invoice: true,
  show_price_history: true,
  auto_luxury_theme: true,
  inv_industry_type: 'Hardware',
  show_po_number: false,
  show_eway_number: false,
  show_vehicle_number: false,
  inv_party_show_address: true,
  inv_party_show_gstin: true,
  inv_party_show_mobile: true,
  inv_col_show_price: true,
  inv_col_show_qty: true,
  inv_col_show_batch: false,
  inv_col_show_expiry: false,
  inv_col_show_mfg: false,
  inv_col_show_discount: true,
  inv_col_show_tax: true,
  show_received_amount: true,
  show_balance_amount: true,
  show_terms: true,
  show_signature: true,
  show_thankyou: true,
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function InvoiceSettingsTab({ setIsDirty }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [shopSettings, setShopSettings] = useState(null);
  
  // Accordion state
  const [openSection, setOpenSection] = useState('Theme Settings');

  useEffect(() => {
    fetchSettings();
  }, []);

  // Wire up to global Save Changes button in Settings.jsx header
  useEffect(() => {
    const handleSave = () => saveSettings();
    window.addEventListener('saveInvoiceSettings', handleSave);
    return () => window.removeEventListener('saveInvoiceSettings', handleSave);
  }, [settings]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('shop_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      if (data) {
        setShopSettings(data);
        setSettings(prev => ({
          ...prev,
          id: data.id,
          bill_prefix: data.bill_prefix || 'INV-',
          bill_start_number: data.bill_start_number || 1,
          quotation_prefix: data.quotation_prefix || 'QT-',
          purchase_prefix: data.purchase_prefix || 'PUR-',
          default_bill_notes: data.default_bill_notes || '',
          invoice_theme: data.invoice_theme || 'standard',
          invoice_color: data.invoice_color || '#000000',
          invoice_size: data.invoice_size || 'A4',
          show_party_balance: !!data.show_party_balance,
          enable_free_item_qty: !!data.enable_free_item_qty,
          show_item_description: !!data.show_item_description,
          show_alternate_unit: !!data.show_alternate_unit,
          show_phone_on_invoice: !!data.show_phone_on_invoice,
          show_time_on_invoice: data.show_time_on_invoice !== false,
          show_price_history: data.show_price_history !== false,
          auto_luxury_theme: data.auto_luxury_theme !== false,
          inv_industry_type: data.inv_industry_type || 'Hardware',
          show_po_number: !!data.show_po_number,
          show_eway_number: !!data.show_eway_number,
          show_vehicle_number: !!data.show_vehicle_number,
          inv_party_show_address: data.inv_party_show_address !== false,
          inv_party_show_gstin: data.inv_party_show_gstin !== false,
          inv_party_show_mobile: data.inv_party_show_mobile !== false,
          inv_col_show_price: data.inv_col_show_price !== false,
          inv_col_show_qty: data.inv_col_show_qty !== false,
          inv_col_show_batch: !!data.inv_col_show_batch,
          inv_col_show_expiry: !!data.inv_col_show_expiry,
          inv_col_show_mfg: !!data.inv_col_show_mfg,
          inv_col_show_discount: data.inv_col_show_discount !== false,
          inv_col_show_tax: data.inv_col_show_tax !== false,
          show_received_amount: data.show_received_amount !== false,
          show_balance_amount: data.show_balance_amount !== false,
          show_terms: data.show_terms !== false,
          show_signature: data.show_signature !== false,
          show_thankyou: data.show_thankyou !== false,
        }));
      }
    } catch (err) {
      console.error('Failed to load invoice settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const [isLocalDirty, setIsLocalDirty] = useState(false);

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
    if (!window.confirm('Are you sure you want to save these invoice settings?')) return;
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
      // alert('Invoice settings saved!');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const set = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (setIsDirty) setIsDirty(true);
    setIsLocalDirty(true);
  };
  
  const toggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    if (setIsDirty) setIsDirty(true);
    setIsLocalDirty(true);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-surface-400 animate-pulse">Loading Invoice Settings...</div>;

  return (
    <div className="flex gap-0 h-full w-full overflow-hidden absolute inset-0">
      
      {/* ─── LEFT: Live Invoice Preview ─── */}
      <div className="flex-1 bg-[#e8edf3] flex flex-col overflow-y-auto items-center relative">

        
        {/* Scaled Preview Wrapper */}
        <div className="pt-24 pb-12 px-8 flex flex-col items-center w-full" style={{ transformOrigin: 'top center' }}>
          
          <div className="flex flex-col relative" style={{ transform: settings.invoice_theme?.includes('a5') ? 'scale(1.1)' : 'scale(0.85)', transformOrigin: 'top center' }}>
            
            {/* Badges placed exactly at the top left above the paper in the UI (reduced size) */}
            <div className="flex items-end gap-2 w-full mb-2 ml-2">
              <span className="text-[12px] font-bold text-surface-500 uppercase tracking-widest leading-none">BILL OF SUPPLY</span>
              <span className="border border-surface-400 text-surface-500 px-1 py-0.5 rounded text-[7px] font-bold leading-none mb-[1px]">ORIGINAL FOR RECIPIENT</span>
            </div>

            {/* We wrap it in a container that scales it down so it fits nicely on screen while retaining real physical size */}
            <div className="shadow-2xl bg-white w-max">
              <InvoiceTemplate bill={{ ...SAMPLE_BILL, party: SAMPLE_PARTY, items: SAMPLE_ITEMS }} shop={shopSettings} settings={settings} />
            </div>
            
          </div>
          
        </div>
      </div>

      {/* ─── RIGHT: Settings Panel ─── */}
      <div className="w-[420px] flex-shrink-0 bg-white border-l border-surface-200 overflow-y-auto shadow-[-4px_0_15px_rgba(0,0,0,0.03)] z-20">
        <div className="px-8 py-6 space-y-2">

          {/* 1. THEMES */}
          <div className="pb-6 border-b border-surface-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[15px] font-bold text-surface-800 flex items-center gap-2">
                <span className="text-lg">📄</span> Themes
              </span>
              <select
                value={settings.invoice_theme?.includes('a5') ? 'A5' : 'A4'}
                onChange={(e) => {
                  const isNowA5 = e.target.value === 'A5';
                  const currentThemeBase = (settings.invoice_theme || 'standard').replace('_a5', '');
                  set('invoice_theme', isNowA5 ? `${currentThemeBase}_a5` : currentThemeBase);
                }}
                className="px-3 py-1.5 border border-surface-200 rounded-lg text-sm bg-surface-50 outline-none focus:border-indigo-500 cursor-pointer font-bold text-indigo-700"
              >
                <option value="A4">A4 (Portrait)</option>
                <option value="A5">A5 (Landscape)</option>
              </select>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {(settings.invoice_theme?.includes('a5') ? A5_THEMES : A4_THEMES).map(theme => (
                <button
                  key={theme.id}
                  onClick={() => set('invoice_theme', theme.id)}
                  className={`flex flex-col border-2 rounded-xl p-2 transition-all group ${
                    settings.invoice_theme === theme.id 
                      ? 'border-[#4f46e5] bg-indigo-50/30' 
                      : 'border-surface-200 hover:border-surface-300 hover:shadow-sm bg-white'
                  }`}
                >
                  {/* Visual Theme Thumbnail (simplified) */}
                  <div className={`w-full rounded-md mb-2 overflow-hidden border ${theme.id.includes('luxury') || theme.id.includes('modern') ? 'bg-surface-800 border-surface-800' : 'bg-white border-surface-200'}`} style={{ height: 64 }}>
                    {theme.id.includes('standard') || theme.id.includes('simple') ? (
                       <div className="h-full flex flex-col p-1 gap-1">
                          <div className="h-2 bg-surface-200 rounded-sm"></div>
                          <div className="flex-1 border border-surface-300 rounded-sm"></div>
                       </div>
                    ) : theme.id.includes('tally') ? (
                       <div className="h-full flex flex-col p-1 gap-0.5">
                          <div className="h-2 border border-surface-300 bg-surface-50"></div>
                          <div className="h-3 flex gap-0.5"><div className="flex-1 border border-surface-300"></div><div className="flex-1 border border-surface-300"></div></div>
                          <div className="flex-1 border border-surface-300 bg-surface-50/50"></div>
                       </div>
                    ) : (
                       <div className="h-full flex flex-col bg-white">
                          <div className="h-3 w-full" style={{ backgroundColor: settings.invoice_color || '#4f46e5', opacity: 0.8 }}></div>
                          <div className="flex-1 p-1"><div className="h-2 bg-surface-100 rounded-sm w-3/4 mb-1"></div><div className="h-2 bg-surface-100 rounded-sm w-full"></div></div>
                       </div>
                    )}
                  </div>
                  <div className="text-[10px] leading-tight font-bold text-surface-600 w-full text-center">{theme.label}</div>
                  {settings.invoice_theme === theme.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] mx-auto mt-1.5 shadow-sm"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 2. SELECT COLOR */}
          <div className="py-6 border-b border-surface-200">
            <div className="text-[14px] font-bold text-surface-800 mb-3">Select Color</div>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => set('invoice_color', color)}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center shadow-sm"
                  style={{ 
                    backgroundColor: color, 
                    boxShadow: settings.invoice_color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                    border: settings.invoice_color === color ? 'none' : '1px solid rgba(0,0,0,0.1)'
                  }}
                >
                  {settings.invoice_color === color && <HiOutlineCheck className="w-4 h-4 text-white stroke-2" />}
                </button>
              ))}
            </div>
          </div>

          {/* 3. THEME SETTINGS */}
          <Section title="Theme Settings" open={openSection === 'Theme Settings'} onToggle={() => setOpenSection(openSection === 'Theme Settings' ? '' : 'Theme Settings')}>
            <CheckRow label="Show party balance in invoice" checked={settings.show_party_balance} onChange={() => toggle('show_party_balance')} />
            <CheckRow label="Enable free item quantity" checked={settings.enable_free_item_qty} onChange={() => toggle('enable_free_item_qty')} />
            <CheckRow label="Show item description in invoice" checked={settings.show_item_description} onChange={() => toggle('show_item_description')} />
            <CheckRow label="Show Alternate Unit in invoice" checked={settings.show_alternate_unit} onChange={() => toggle('show_alternate_unit')} />
            <CheckRow label="Show phone number on invoice" checked={settings.show_phone_on_invoice} onChange={() => toggle('show_phone_on_invoice')} />
            <CheckRow label="Show time on invoices" checked={settings.show_time_on_invoice} onChange={() => toggle('show_time_on_invoice')} />
            <CheckRow label="Price History" checked={settings.show_price_history} onChange={() => toggle('show_price_history')} />
            <CheckRow label="Auto-apply luxury theme for sharing" checked={settings.auto_luxury_theme} onChange={() => toggle('auto_luxury_theme')} />
          </Section>

          {/* 4. INVOICE DETAILS */}
          <Section title="Invoice Details" open={openSection === 'Invoice Details'} onToggle={() => setOpenSection(openSection === 'Invoice Details' ? '' : 'Invoice Details')}>
            <div className="space-y-2 mb-3">
              <label className="block text-[13px] font-bold text-surface-500">Industry Type</label>
              <select
                value={settings.inv_industry_type}
                onChange={e => set('inv_industry_type', e.target.value)}
                className="w-full px-3 py-2 border border-surface-200 rounded text-[14px] outline-none focus:border-[#4f46e5] bg-surface-50 hover:bg-white transition-colors cursor-pointer"
              >
                <option>Hardware</option>
                <option>Furniture</option>
                <option>Electronics</option>
                <option>FMCG</option>
                <option>Textile</option>
                <option>Pharmacy</option>
                <option>Food & Beverage</option>
                <option>Other</option>
              </select>
            </div>
            <CheckRow label="PO Number" checked={settings.show_po_number} onChange={() => toggle('show_po_number')} />
            <CheckRow label="E-way Bill Number" checked={settings.show_eway_number} onChange={() => toggle('show_eway_number')} />
            <CheckRow label="Vehicle Number" checked={settings.show_vehicle_number} onChange={() => toggle('show_vehicle_number')} />
            <button className="flex items-center gap-1.5 text-[13px] text-[#4f46e5] font-bold hover:underline mt-2 bg-indigo-50/50 px-3 py-1.5 rounded-md w-full justify-center">
              <HiOutlinePlus className="w-4 h-4" /> Add Custom Field
            </button>
          </Section>

          {/* 5. PARTY DETAILS */}
          <Section title="Party Details" open={openSection === 'Party Details'} onToggle={() => setOpenSection(openSection === 'Party Details' ? '' : 'Party Details')}>
            <CheckRow label="Show address on invoice" checked={settings.inv_party_show_address} onChange={() => toggle('inv_party_show_address')} />
            <CheckRow label="Show GSTIN on invoice" checked={settings.inv_party_show_gstin} onChange={() => toggle('inv_party_show_gstin')} />
            <CheckRow label="Show mobile number on invoice" checked={settings.inv_party_show_mobile} onChange={() => toggle('inv_party_show_mobile')} />
            <button className="flex items-center gap-1.5 text-[13px] text-[#4f46e5] font-bold hover:underline mt-2 bg-indigo-50/50 px-3 py-1.5 rounded-md w-full justify-center">
              <HiOutlinePlus className="w-4 h-4" /> Add Custom Field
            </button>
          </Section>

          {/* 6. ITEM TABLE COLUMNS */}
          <Section title="Item Table Columns" open={openSection === 'Item Table Columns'} onToggle={() => setOpenSection(openSection === 'Item Table Columns' ? '' : 'Item Table Columns')}>
            <CheckRow label="Price/Item (₹)" checked={settings.inv_col_show_price} onChange={() => toggle('inv_col_show_price')} />
            <CheckRow label="Quantity" checked={settings.inv_col_show_qty} onChange={() => toggle('inv_col_show_qty')} />
            <CheckRow label="Discount" checked={settings.inv_col_show_discount} onChange={() => toggle('inv_col_show_discount')} />
            <CheckRow label="Tax (%)" checked={settings.inv_col_show_tax} onChange={() => toggle('inv_col_show_tax')} />
            <CheckRow label="Batch No." checked={settings.inv_col_show_batch} onChange={() => toggle('inv_col_show_batch')} />
            <CheckRow label="Exp. Date" checked={settings.inv_col_show_expiry} onChange={() => toggle('inv_col_show_expiry')} />
            <CheckRow label="Mfg Date" checked={settings.inv_col_show_mfg} onChange={() => toggle('inv_col_show_mfg')} />
            <button className="flex items-center gap-1.5 text-[13px] text-[#4f46e5] font-bold hover:underline mt-2 bg-indigo-50/50 px-3 py-1.5 rounded-md w-full justify-center">
              <HiOutlinePlus className="w-4 h-4" /> Add Custom Column
            </button>
          </Section>

          {/* 7. MISCELLANEOUS DETAILS */}
          <Section title="Miscellaneous Details" open={openSection === 'Miscellaneous Details'} onToggle={() => setOpenSection(openSection === 'Miscellaneous Details' ? '' : 'Miscellaneous Details')}>
            <CheckRow label="Show received amount" checked={settings.show_received_amount} onChange={() => toggle('show_received_amount')} />
            <CheckRow label="Show balance amount" checked={settings.show_balance_amount} onChange={() => toggle('show_balance_amount')} />
            <CheckRow label="Show terms and conditions" checked={settings.show_terms} onChange={() => toggle('show_terms')} />
            <CheckRow label="Show authorized signature" checked={settings.show_signature} onChange={() => toggle('show_signature')} />
          </Section>

          {/* 8. DOCUMENT PREFIXES */}
          <Section title="Document Prefixes & Numbers" open={openSection === 'Document Prefixes'} onToggle={() => setOpenSection(openSection === 'Document Prefixes' ? '' : 'Document Prefixes')}>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-[12px] font-bold text-surface-500 mb-1">Bill Prefix</label>
                <input
                  type="text"
                  value={settings.bill_prefix}
                  onChange={e => set('bill_prefix', e.target.value)}
                  className="w-full px-3 py-2 border border-surface-200 rounded text-[14px] outline-none focus:border-[#4f46e5] bg-surface-50 hover:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-surface-500 mb-1">Starting Number</label>
                <input
                  type="number"
                  value={settings.bill_start_number}
                  onChange={e => set('bill_start_number', e.target.value)}
                  className="w-full px-3 py-2 border border-surface-200 rounded text-[14px] outline-none focus:border-[#4f46e5] bg-surface-50 hover:bg-white transition-colors"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-surface-500 mb-1">Quotation Prefix</label>
                <input
                  type="text"
                  value={settings.quotation_prefix}
                  onChange={e => set('quotation_prefix', e.target.value)}
                  className="w-full px-3 py-2 border border-surface-200 rounded text-[14px] outline-none focus:border-[#4f46e5] bg-surface-50 hover:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-surface-500 mb-1">Purchase Prefix</label>
                <input
                  type="text"
                  value={settings.purchase_prefix}
                  onChange={e => set('purchase_prefix', e.target.value)}
                  className="w-full px-3 py-2 border border-surface-200 rounded text-[14px] outline-none focus:border-[#4f46e5] bg-surface-50 hover:bg-white transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-surface-500 mb-1">Default Bill Notes</label>
              <textarea
                rows={3}
                value={settings.default_bill_notes}
                onChange={e => set('default_bill_notes', e.target.value)}
                className="w-full px-3 py-2 border border-surface-200 rounded text-[14px] outline-none focus:border-[#4f46e5] resize-none bg-surface-50 hover:bg-white transition-colors"
                placeholder="Terms and conditions, return policy..."
              />
            </div>
          </Section>

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
    </div>
  );
}
