import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { supabase } from '../../supabaseClient';
import { 
  HiOutlineX, 
  HiOutlineCheck, 
  HiOutlineCube,
  HiOutlineCollection,
  HiOutlineCurrencyRupee,
  HiOutlinePrinter,
  HiOutlineLightningBolt
} from 'react-icons/hi';

export default function ProductModal({ item, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  
  // Data for dropdowns
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');

  // Form State
  const [form, setForm] = useState({
    item_type: 'product',
    name: '',
    category_id: '',
    unit_id: '',
    barcode: '',
    stock_qty: 0,
    opening_date: new Date().toISOString().split('T')[0],
    low_stock_alert_qty: 0,
    description: '',
    selling_price: 0,
    purchase_price: 0,
    discount_percent: 0
  });

  const barcodeRef = useRef(null);

  useEffect(() => {
    fetchDropdowns();
    if (item) {
      setForm({
        item_type: item.item_type || 'product',
        name: item.name || '',
        category_id: item.category_id || '',
        unit_id: item.unit_id || '',
        barcode: item.barcode || '',
        stock_qty: Number(item.stock_qty || 0),
        opening_date: new Date().toISOString().split('T')[0], // existing items usually don't need a new opening date, but we keep it
        low_stock_alert_qty: Number(item.low_stock_alert_qty || 0),
        description: item.description || '',
        selling_price: Number(item.selling_price || 0),
        purchase_price: Number(item.purchase_price || 0),
        discount_percent: Number(item.discount_percent || 0)
      });
    }
  }, [item]);

  useEffect(() => {
    if (form.barcode && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, form.barcode, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true
        });
      } catch (e) {
        // Barcode generation failed (maybe invalid characters)
        console.warn("Invalid barcode format", e);
      }
    }
  }, [form.barcode, activeTab]);

  const fetchDropdowns = async () => {
    const [catsRes, unitsRes] = await Promise.all([
      supabase.from('item_categories').select('*').order('name'),
      supabase.from('units').select('*').order('name')
    ]);
    if (catsRes.data) setCategories(catsRes.data);
    if (unitsRes.data) setUnits(unitsRes.data);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const { data, error } = await supabase.from('item_categories').insert({ name: newCatName.trim() }).select().single();
    if (!error && data) {
      setCategories([...categories, data].sort((a,b) => a.name.localeCompare(b.name)));
      setForm({ ...form, category_id: data.id });
      setNewCatName('');
    } else {
      alert("Error adding category: " + (error?.message || 'Unknown error'));
    }
  };

  const handleAddUnit = async () => {
    if (!newUnitName.trim()) return;
    const { data, error } = await supabase.from('units').insert({ name: newUnitName.trim().toUpperCase() }).select().single();
    if (!error && data) {
      setUnits([...units, data].sort((a,b) => a.name.localeCompare(b.name)));
      setForm({ ...form, unit_id: data.id });
      setNewUnitName('');
    } else {
      alert("Error adding unit: " + (error?.message || 'Unknown error'));
    }
  };

  const autoGenerateSKU = () => {
    const prefix = (form.name ? form.name.substring(0, 3).toUpperCase() : 'ITM');
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    setForm({ ...form, barcode: `${prefix}-${randomNum}` });
  };

  const printBarcode = () => {
    if (!form.barcode) return alert("Generate a barcode first");
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>Print Barcode</title></head>
        <body style="display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
          <img src="${barcodeRef.current.src}" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const saveItem = async (saveAndNew = false) => {
    if (!form.name.trim()) return alert("Item Name is required.");
    
    setLoading(true);
    try {
      const payload = {
        item_type: form.item_type,
        name: form.name,
        category_id: form.category_id || null,
        unit_id: form.unit_id || null,
        barcode: form.barcode,
        stock_qty: Number(form.stock_qty),
        low_stock_alert_qty: Number(form.low_stock_alert_qty),
        description: form.description,
        selling_price: Number(form.selling_price),
        purchase_price: Number(form.purchase_price),
        discount_percent: Number(form.discount_percent)
      };

      if (item) {
        const { error } = await supabase.from('products').update(payload).eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }

      onSaved();
      if (!saveAndNew) {
        onClose();
      } else {
        setForm({ ...form, name: '', barcode: '', description: '' }); // Reset partial fields for new item
      }
    } catch (err) {
      alert("Error saving item: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Details', icon: HiOutlineCube },
    { id: 'stock', label: 'Stock Details', icon: HiOutlineCollection },
    { id: 'pricing', label: 'Pricing Details', icon: HiOutlineCurrencyRupee }
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] flex overflow-hidden animate-fade-in">
        
        {/* Left Sidebar (Tabs) */}
        <div className="w-64 bg-surface-50 border-r border-surface-200 p-4 flex flex-col">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-surface-900">{item ? 'Edit Item' : 'Create Item'}</h2>
            <p className="text-xs text-surface-500 mt-1">{item ? 'Update item details' : 'Add a new product or service'}</p>
          </div>
          <nav className="flex-1 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeTab === tab.id ? 'bg-primary-50 text-primary-700' : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'}`}
              >
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-primary-600' : 'text-surface-400'}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col relative bg-white">
          <div className="absolute top-4 right-4 z-10">
            <button onClick={onClose} className="p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-700 rounded-full transition-colors">
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'basic' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-bold text-surface-900 border-b border-surface-100 pb-2">Basic Details</h3>
                
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.item_type === 'product'} onChange={() => setForm({...form, item_type: 'product'})} className="text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium text-surface-700">Product (Track Inventory)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.item_type === 'service'} onChange={() => setForm({...form, item_type: 'service'})} className="text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium text-surface-700">Service (No Inventory)</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Item Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Century Plywood 18mm" className="w-full border border-surface-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Category</label>
                    <div className="flex gap-2">
                      <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="flex-1 border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                        <option value="">- No Category -</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div className="flex items-center border border-surface-200 rounded-xl overflow-hidden focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
                        <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New..." className="w-20 px-2 py-2 text-sm outline-none" />
                        <button onClick={handleAddCategory} className="px-2 py-2 bg-surface-100 hover:bg-surface-200 text-surface-600 font-bold border-l border-surface-200">+</button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Unit</label>
                    <div className="flex gap-2">
                      <select value={form.unit_id} onChange={e => setForm({...form, unit_id: e.target.value})} className="flex-1 border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500">
                        <option value="">- Select Unit -</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      <div className="flex items-center border border-surface-200 rounded-xl overflow-hidden focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
                        <input type="text" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} placeholder="New..." className="w-20 px-2 py-2 text-sm outline-none" />
                        <button onClick={handleAddUnit} className="px-2 py-2 bg-surface-100 hover:bg-surface-200 text-surface-600 font-bold border-l border-surface-200">+</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Sales Price (₹)</label>
                    <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => setForm({...form, selling_price: e.target.value})} className="w-full border border-surface-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Opening Stock</label>
                    <input type="number" disabled={item !== undefined && item !== null} min="0" step="0.01" value={form.stock_qty} onChange={e => setForm({...form, stock_qty: e.target.value})} className="w-full border border-surface-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-surface-100" />
                    {item && <p className="text-[10px] text-surface-400 mt-1">Use 'Adjust Stock' to change qty for existing items.</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stock' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-bold text-surface-900 border-b border-surface-100 pb-2">Stock & Barcode</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Item Code / SKU</label>
                    <div className="flex gap-2">
                      <input type="text" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} placeholder="Barcode/SKU" className="flex-1 border border-surface-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                      <button type="button" onClick={autoGenerateSKU} className="px-3 py-2 bg-surface-100 text-surface-700 text-sm font-semibold rounded-xl hover:bg-surface-200 border border-surface-200 flex items-center gap-1">
                        <HiOutlineLightningBolt className="w-4 h-4 text-orange-500" /> Auto
                      </button>
                    </div>
                  </div>
                  <div className="flex items-end pb-1">
                    <button type="button" onClick={printBarcode} className="px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl flex items-center gap-2 border border-primary-100 transition-colors">
                      <HiOutlinePrinter className="w-4 h-4" /> Print Barcode
                    </button>
                  </div>
                </div>

                {form.barcode && (
                  <div className="p-4 border border-dashed border-surface-300 rounded-xl bg-surface-50 flex justify-center items-center">
                    <img ref={barcodeRef} alt="Barcode" className="max-w-full h-auto mix-blend-multiply" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">As of Date</label>
                    <input type="date" value={form.opening_date} onChange={e => setForm({...form, opening_date: e.target.value})} className="w-full border border-surface-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Low Stock Alert Below</label>
                    <input type="number" min="0" step="1" value={form.low_stock_alert_qty} onChange={e => setForm({...form, low_stock_alert_qty: e.target.value})} className="w-full border border-surface-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Description / Notes</label>
                  <textarea rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-surface-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"></textarea>
                </div>
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-bold text-surface-900 border-b border-surface-100 pb-2">Pricing Details</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Purchase Price (₹)</label>
                    <input type="number" min="0" step="0.01" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} className="w-full border border-surface-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">Sales Price (₹)</label>
                    <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => setForm({...form, selling_price: e.target.value})} className="w-full border border-surface-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Discount on Sales Price (%)</label>
                  <input type="number" min="0" max="100" step="0.1" value={form.discount_percent} onChange={e => setForm({...form, discount_percent: e.target.value})} className="w-full max-w-[50%] border border-surface-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-surface-200 bg-surface-50 flex justify-end gap-3 rounded-br-2xl">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-surface-600 bg-white border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors">
              Cancel
            </button>
            {!item && (
              <button onClick={() => saveItem(true)} disabled={loading} className="px-5 py-2.5 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-colors disabled:opacity-50">
                Save & New
              </button>
            )}
            <button onClick={() => saveItem(false)} disabled={loading} className="px-5 py-2.5 text-sm font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 shadow-sm shadow-primary-600/20 transition-all disabled:opacity-50 flex items-center gap-2">
              <HiOutlineCheck className="w-5 h-5" /> {item ? 'Update Item' : 'Save Item'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
