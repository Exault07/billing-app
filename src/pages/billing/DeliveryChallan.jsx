import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { HiOutlineSave, HiOutlinePlus, HiOutlineTrash, HiOutlineSearch, HiOutlineDocumentText } from 'react-icons/hi';
import PartySelect from '../../components/shared/PartySelect';
import AddItemsModal from '../../components/shared/AddItemsModal';

const emptyItem = () => ({ product_id: '', name: '', unit: '', qty: 1 });

export default function DeliveryChallan() {
 const { id } = useParams(); // bill_id if coming from a bill
 const navigate = useNavigate();
 const { user } = useAuth();

 const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
 const [customerId, setCustomerId] = useState('');
 const [billId, setBillId] = useState(id || '');
 const [items, setItems] = useState([emptyItem()]);
 const [notes, setNotes] = useState('');
 const [customers, setCustomers] = useState([]);
 const [products, setProducts] = useState([]);
 const [productSearch, setProductSearch] = useState({});
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');
 
 const [showItemModal, setShowItemModal] = useState(false);
 const [showNotes, setShowNotes] = useState(false);

 useEffect(() => {
 const fetchData = async () => {
 const [{ data: c }, { data: p }] = await Promise.all([
 supabase.from('parties').select('id, name, mobile').order('name'),
 supabase.from('products').select('id, name, unit').order('name'),
 ]);
 setCustomers(c || []);
 setProducts(p || []);
 };

 // If created from a bill, pre-fill from bill data
 const prefillFromBill = async () => {
 if (!id) return;
 const { data: bill } = await supabase.from('bills').select('customer_id, items, date').eq('id', id).single();
 if (bill) {
 setCustomerId(bill.customer_id || '');
 setDate(bill.date);
 setItems(bill.items?.map(i => ({ product_id: i.product_id, name: i.name, unit: i.unit, qty: i.qty })) || [emptyItem()]);
 }
 };

 fetchData();
 prefillFromBill();
 }, [id]);

 const updateItem = (index, field, value) => {
 setItems(prev => {
 const updated = [...prev];
 updated[index] = { ...updated[index], [field]: value };
 return updated;
 });
 };

  const handleAddItemFromModal = (product, qty) => {
    const q = Number(qty || 1);
    setItems(prev => {
      const existing = prev.findIndex(i => i.product_id === product.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = {
          ...updated[existing],
          qty: Number(updated[existing].qty) + q
        };
        return updated;
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        unit: product.unit || 'PCS',
        qty: q
      }];
    });
  };

 const handleSave = async () => {
 setError('');
 if (!customerId) { setError('Please select a customer.'); return; }
 setSaving(true);
 try {
 await supabase.from('delivery_challans').insert({
 bill_id: billId || null,
 customer_id: customerId,
 items: items.filter(i => i.product_id),
 date,
 notes,
 });
 navigate('/billing/history');
 } catch (err) {
 setError('Failed to save: ' + err.message);
 } finally {
 setSaving(false);
 }
 };

 return (
 <div className="animate-fade-in w-full">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
 <HiOutlineSave className="w-5 h-5 text-blue-600" />
 </div>
 <div>
 <h1 className="text-xl font-bold text-surface-800">Delivery Challan</h1>
 <p className="text-xs text-surface-400">Record goods dispatched to a customer.</p>
 </div>
 </div>
 <div className="flex gap-2">
 <Link to="/billing/history" className="px-4 py-2 text-sm rounded-xl border border-surface-200 text-surface-600 hover:bg-surface-50">Cancel</Link>
 <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
 <HiOutlineSave className="w-4 h-4" />{saving ? 'Saving...' : 'Save Challan'}
 </button>
 </div>
 </div>

 {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">⚠️ {error}</div>}

 <div className="bg-white rounded-2xl border border-surface-200 p-6 mb-4">
 <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide mb-4">Details</h2>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-surface-600 mb-1">Date</label>
 <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 <div>
          <PartySelect
            label="Customer / Supplier *"
            partyType="both"
            parties={customers}
            selectedParty={customers.find(c => c.id === customerId)}
            onSelect={c => setCustomerId(c.id)}
            onClear={() => setCustomerId('')}
            onPartyCreated={async () => {
              const { data: c } = await supabase.from('parties').select('id, name, mobile').order('name');
              setCustomers(c || []);
            }}
          />
        </div>
 </div>
      <div className="mt-4">
        <label className="block text-[13px] font-bold text-surface-700 mb-1">Linked Bill ID (optional)</label>
        <input value={billId} onChange={e => setBillId(e.target.value)} placeholder="Leave blank if standalone" className="w-full border border-surface-200 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-indigo-500" />
      </div>
      
      <div className="mt-4">
        {!showNotes ? (
          <div onClick={() => setShowNotes(true)} className="text-[#4f46e5] font-bold text-[13px] cursor-pointer hover:underline inline-block">
            + Add Notes
          </div>
        ) : (
          <div>
            <label className="block text-[13px] font-bold text-surface-700 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-surface-200 rounded px-3 py-2 text-[13px] resize-none focus:outline-none focus:border-indigo-500" />
          </div>
        )}
      </div>
 </div>

    <div className="bg-white rounded-2xl border border-surface-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide">Items Dispatched</h2>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => {
          if (!item.product_id) return null;
          return (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1 border border-surface-200 rounded px-3 py-2 bg-surface-50">
                <span className="text-sm font-medium text-surface-800 flex-1">{item.name}</span>
                <span className="text-xs text-surface-400 ml-2">{item.unit}</span>
              </div>
              <div className="w-24">
                <input type="number" min="1" value={item.qty} onChange={e => updateItem(index, 'qty', e.target.value)} placeholder="Qty" className="w-full text-right border border-surface-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white" />
              </div>
              <button onClick={() => setItems(prev => prev.length === 1 ? [emptyItem()] : prev.filter((_, i) => i !== index))} className="text-surface-400 hover:text-red-500 p-2">
                <HiOutlineTrash className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        
        <div 
          onClick={() => setShowItemModal(true)}
          className="w-full border-2 border-dashed border-[#4f46e5]/30 bg-[#4f46e5]/5 hover:bg-[#4f46e5]/10 text-[#4f46e5] font-bold text-[13px] py-3 flex items-center justify-center cursor-pointer rounded"
        >
          + Add Item
        </div>
      </div>
    </div>
    
    {showItemModal && (
      <AddItemsModal
        products={products}
        onAdd={handleAddItemFromModal}
        onClose={() => setShowItemModal(false)}
        customerId={customerId}
        onProductCreated={async () => {
          const { data: p } = await supabase.from('products').select('id, name, unit').order('name');
          setProducts(p || []);
        }}
      />
    )}
 </div>
 );
}
