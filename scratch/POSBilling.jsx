import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { HiOutlineShoppingCart, HiOutlineTrash, HiOutlinePlus, HiOutlineX } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

export default function POSBilling() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Data State
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Tabs State (Held Bills)
  const [tabs, setTabs] = useState([{
    id: Date.now(),
    name: 'Billing Screen 1',
    items: [],
    customerId: '',
    discount: 0,
    additionalCharge: 0,
    paymentMode: 'cash',
    amountReceived: ''
  }]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);

  const currentBillIndex = tabs.findIndex(t => t.id === activeTabId);
  const currentBill = tabs[currentBillIndex];

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', selling_price: 0, barcode: '', stock_qty: 1, category_id: '' });

  // Refs
  const searchInputRef = useRef(null);
  const discountInputRef = useRef(null);
  const chargeInputRef = useRef(null);
  const receivedInputRef = useRef(null);
  const customerInputRef = useRef(null);

  // Fetch Data
  useEffect(() => {
    const loadData = async () => {
      const [{ data: prodData }, { data: custData }, { data: catData }] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('parties').select('*').eq('party_type', 'customer').order('name'),
        supabase.from('item_categories').select('*').order('name')
      ]);
      setProducts(prodData || []);
      setCustomers(custData || []);
      setCategories(catData || []);
      searchInputRef.current?.focus();
    };
    loadData();
  }, []);

  // Keyboard Manager
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

      if (e.ctrlKey && e.key === 'Escape') {
        e.preventDefault();
        navigate('/');
      }
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        // Settings logic placeholder
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        holdAndCreateAnother();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setShowNewItemModal(true);
      }
      
      // Tab Switching
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (tabs[index]) {
          e.preventDefault();
          setActiveTabId(tabs[index].id);
        }
      }

      // Function Keys
      if (e.key === 'F1') { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === 'F2') { e.preventDefault(); discountInputRef.current?.focus(); }
      if (e.key === 'F3') { e.preventDefault(); chargeInputRef.current?.focus(); }
      if (e.key === 'F4') { e.preventDefault(); receivedInputRef.current?.focus(); }
      if (e.key === 'F5') { e.preventDefault(); customerInputRef.current?.focus(); }
      if (e.key === 'F6') { e.preventDefault(); checkout(true); }
      if (e.key === 'F7') { e.preventDefault(); checkout(false); }

      // Row Operations (Only if not in input and modal is closed)
      if (!isInput && !showNewItemModal && currentBill?.items.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedRowIndex(prev => Math.min(prev + 1, currentBill.items.length - 1));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedRowIndex(prev => Math.max(prev - 1, 0));
        }
        
        if (selectedRowIndex >= 0 && selectedRowIndex < currentBill.items.length) {
          const item = currentBill.items[selectedRowIndex];
          if (e.key.toLowerCase() === 'p') {
            e.preventDefault();
            const newP = prompt('Enter new price for ' + item.name, item.price);
            if (newP !== null && !isNaN(newP)) updateItemField(item.product_id, 'price', Number(newP));
          }
          if (e.key.toLowerCase() === 'q') {
            e.preventDefault();
            const newQ = prompt('Enter new quantity for ' + item.name, item.qty);
            if (newQ !== null && !isNaN(newQ)) updateItemField(item.product_id, 'qty', Number(newQ));
          }
          if (e.key.toLowerCase() === 'd') {
            e.preventDefault();
            const newD = prompt('Enter discount (%) for ' + item.name, item.disc || 0);
            if (newD !== null && !isNaN(newD)) updateItemField(item.product_id, 'disc', Number(newD));
          }
          if (e.key === 'Delete') {
            e.preventDefault();
            removeItem(item.product_id);
            setSelectedRowIndex(Math.max(0, selectedRowIndex - 1));
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, currentBill, selectedRowIndex, navigate, showNewItemModal]);

  const updateCurrentBill = (updates) => {
    setTabs(prev => {
      const newTabs = [...prev];
      newTabs[currentBillIndex] = { ...newTabs[currentBillIndex], ...updates };
      return newTabs;
    });
  };

  const holdAndCreateAnother = () => {
    const newId = Date.now();
    setTabs(prev => [...prev, {
      id: newId,
      name: `Billing Screen ${prev.length + 1}`,
      items: [],
      customerId: '',
      discount: 0,
      additionalCharge: 0,
      paymentMode: 'cash',
      amountReceived: ''
    }]);
    setActiveTabId(newId);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const closeTab = (e, id) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    newTabs.forEach((t, i) => t.name = `Billing Screen ${i + 1}`);
    setTabs(newTabs);
    if (activeTabId === id) setActiveTabId(newTabs[newTabs.length - 1].id);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      let candidates = products;
      if (searchCategory) {
        candidates = candidates.filter(p => p.category_id === searchCategory);
      }
      
      let match = candidates.find(p => 
        (p.barcode && p.barcode.toLowerCase() === term) ||
        (p.item_code && p.item_code.toLowerCase() === term)
      );
      if (!match) {
        match = candidates.find(p => p.name.toLowerCase().includes(term));
      }
      
      if (match) {
        addToCart(match);
        setSearchTerm('');
      } else {
        alert('Product not found!');
      }
    }
  };

  const addToCart = (product) => {
    const items = [...currentBill.items];
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({
        product_id: product.id,
        name: product.name,
        barcode: product.barcode || '-',
        item_code: product.item_code || '-',
        mrp: product.selling_price || 0,
        price: Number(product.selling_price || 0),
        disc: 0,
        qty: 1
      });
    }
    updateCurrentBill({ items });
    setSelectedRowIndex(items.length - 1);
  };

  const updateItemField = (id, field, value) => {
    const items = currentBill.items.map(i => i.product_id === id ? { ...i, [field]: value } : i);
    updateCurrentBill({ items });
  };

  const removeItem = (id) => {
    const items = currentBill.items.filter(i => i.product_id !== id);
    updateCurrentBill({ items });
  };

  const saveNewProduct = async (e) => {
    e.preventDefault();
    if (!newItem.name) return;
    try {
      const { data, error } = await supabase.from('products').insert([{
        name: newItem.name,
        selling_price: Number(newItem.selling_price),
        barcode: newItem.barcode,
        stock_qty: Number(newItem.stock_qty),
        category_id: newItem.category_id || null
      }]).select().single();
      if (error) throw error;
      
      setProducts(prev => [...prev, data]);
      addToCart(data);
      setShowNewItemModal(false);
      setNewItem({ name: '', selling_price: 0, barcode: '', stock_qty: 1, category_id: '' });
      searchInputRef.current?.focus();
    } catch (err) {
      alert('Error creating product: ' + err.message);
    }
  };

  const subtotal = currentBill.items.reduce((sum, item) => {
    const sp = item.price * (1 - (item.disc / 100));
    return sum + (item.qty * sp);
  }, 0);
  
  // Assuming a generic tax logic if needed, currently leaving at 0 based on mock
  const taxAmount = 0; 
  
  const grandTotal = subtotal + taxAmount - Number(currentBill.discount) + Number(currentBill.additionalCharge);
  
  const checkout = async (shouldPrint) => {
    if (currentBill.items.length === 0) return;
    setSaving(true);
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const { count } = await supabase.from('bills').select('id', { count: 'exact', head: true });
      const seq = String((count || 0) + 1).padStart(3, '0');
      const billNo = `POS-${dateStr}-${seq}`;

      const rAmt = currentBill.amountReceived === '' ? grandTotal : Number(currentBill.amountReceived);

      const payload = {
        bill_no: billNo,
        date: today.toISOString().split('T')[0],
        customer_id: currentBill.customerId || null,
        items: currentBill.items,
        subtotal,
        discount: Number(currentBill.discount),
        additional_charge: Number(currentBill.additionalCharge),
        advance_paid: rAmt,
        balance_due: grandTotal - rAmt,
        payment_mode: currentBill.paymentMode,
        status: 'final',
        created_by: user?.id,
      };

      const { error } = await supabase.from('bills').insert(payload);
      if (error) throw error;

      if (shouldPrint) {
        window.print();
      } else {
        alert(`Bill ${billNo} Saved Successfully!`);
      }
      
      updateCurrentBill({ items: [], customerId: '', discount: 0, additionalCharge: 0, amountReceived: '' });
      searchInputRef.current?.focus();
    } catch (err) {
      alert('Error saving bill: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white font-sans overflow-hidden">
      
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded px-3 py-1">
          <HiOutlineX className="w-4 h-4" /> Exit POS <span className="text-gray-400 ml-1 text-xs">[CTRL + ESC]</span>
        </button>
        <h1 className="text-lg font-bold text-gray-800">POS Billing</h1>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 bg-blue-50 rounded px-3 py-1">
            Watch how to use POS Billing
          </button>
          <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded px-3 py-1">
            Settings <span className="text-gray-400 ml-1 text-xs">[CTRL + S]</span>
          </button>
        </div>
      </div>

      {/* ── Tabs Bar ── */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-2 pt-2">
        {tabs.map((tab, idx) => (
          <div 
            key={tab.id}
            onClick={() => { setActiveTabId(tab.id); setTimeout(() => searchInputRef.current?.focus(), 50); }}
            className={`flex items-center gap-3 px-4 py-2 border-t border-l border-r rounded-t-lg cursor-pointer text-sm font-medium transition-colors ${
              activeTabId === tab.id ? 'bg-white border-gray-200 text-gray-900 -mb-px' : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tab.name} <span className="text-xs text-gray-400">[CTRL + {idx + 1}]</span>
            {tabs.length > 1 && (
              <HiOutlineX 
                className="w-4 h-4 hover:text-red-500 rounded hover:bg-gray-200 p-0.5 ml-2" 
                onClick={(e) => closeTab(e, tab.id)} 
              />
            )}
          </div>
        ))}
        <button 
          onClick={holdAndCreateAnother}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 hover:text-blue-800"
        >
          + Hold Bill & Create Another <span className="text-xs text-blue-400 font-normal">[CTRL + B]</span>
        </button>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel (Cart & Search) */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
          
          {/* Actions Row */}
          <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-gray-50">
            <button onClick={() => setShowNewItemModal(true)} className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded px-3 py-1.5 shadow-sm hover:bg-gray-50">
              + New Item <span className="text-gray-400 font-normal">[CTRL + I]</span>
            </button>
            <button className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded px-3 py-1.5 shadow-sm hover:bg-gray-50">
              Change Price <span className="text-gray-400 font-normal">[P]</span>
            </button>
            <button className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded px-3 py-1.5 shadow-sm hover:bg-gray-50">
              Change QTY <span className="text-gray-400 font-normal">[Q]</span>
            </button>
            <button className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded px-3 py-1.5 shadow-sm hover:bg-gray-50">
              Change Discount <span className="text-gray-400 font-normal">[D]</span>
            </button>
            <button onClick={() => { if(selectedRowIndex >= 0 && selectedRowIndex < currentBill.items.length) { removeItem(currentBill.items[selectedRowIndex].product_id); setSelectedRowIndex(Math.max(0, selectedRowIndex - 1)); } }} className="flex items-center gap-2 text-xs font-bold text-red-600 bg-white border border-red-200 rounded px-3 py-1.5 shadow-sm hover:bg-red-50">
              Delete Item <span className="text-red-300 font-normal">[DEL]</span>
            </button>
          </div>

          {/* Search Row */}
          <div className="flex items-center p-3 border-b border-gray-200">
            <select 
              value={searchCategory}
              onChange={e => setSearchCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-l-lg text-sm text-gray-600 bg-gray-50 border-r-0 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex-1 relative">
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search by Item/ Serial no./ HSN code/ SKU/ Custom Field/ Category or Scan Barcode"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                className="w-full px-4 py-2 border border-gray-300 text-sm outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="px-3 py-2 border border-gray-300 rounded-r-lg text-sm text-gray-400 bg-gray-50 border-l-0">
              [F1]
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600">
            <div className="col-span-1">NO</div>
            <div className="col-span-3">ITEMS</div>
            <div className="col-span-2">ITEM CODE</div>
            <div className="col-span-1 text-right">MRP</div>
            <div className="col-span-1 text-right">SP (₹)</div>
            <div className="col-span-1 text-right">DISC (%)</div>
            <div className="col-span-1 text-right">QUANTITY</div>
            <div className="col-span-2 text-right">AMOUNT (₹)</div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {currentBill.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                <HiOutlineShoppingCart className="w-16 h-16 opacity-30" />
                <div className="text-center">
                  <p className="text-gray-600 font-medium mb-2">Add items by searching item name or item code</p>
                  <p className="text-sm">Or</p>
                  <p className="text-gray-600 font-medium mt-2 flex items-center gap-2 justify-center">
                    <span className="border border-gray-300 px-2 py-1 rounded text-xs">[F1]</span> Simply scan barcode to add items
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {currentBill.items.map((item, idx) => {
                  const isSelected = selectedRowIndex === idx;
                  const sp = item.price * (1 - (item.disc / 100));
                  const amt = item.qty * sp;
                  return (
                    <div 
                      key={item.product_id}
                      onClick={() => setSelectedRowIndex(idx)}
                      className={`grid grid-cols-12 gap-2 p-3 border-b border-gray-100 text-sm cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
                    >
                      <div className="col-span-1 text-gray-500">{idx + 1}</div>
                      <div className="col-span-3 font-medium text-gray-800 truncate">{item.name}</div>
                      <div className="col-span-2 text-gray-500 truncate">{item.item_code}</div>
                      <div className="col-span-1 text-right text-gray-500">₹{item.mrp}</div>
                      <div className="col-span-1 text-right font-medium">₹{item.price}</div>
                      <div className="col-span-1 text-right">{item.disc}%</div>
                      <div className="col-span-1 text-right font-bold">{item.qty}</div>
                      <div className="col-span-2 text-right font-bold text-gray-900">₹{amt.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel (Summary & Checkout) */}
        <div className="w-[380px] bg-gray-50 flex flex-col flex-shrink-0 border-l border-gray-200">
          
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {/* Quick Inputs */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Add Discount</span>
              <div className="flex items-center gap-2">
                <input 
                  ref={discountInputRef}
                  type="number" 
                  value={currentBill.discount}
                  onChange={e => updateCurrentBill({ discount: e.target.value })}
                  className="w-24 text-right px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
                <span className="text-xs text-gray-400 w-6">[F2]</span>
              </div>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Add Additional Charge</span>
              <div className="flex items-center gap-2">
                <input 
                  ref={chargeInputRef}
                  type="number" 
                  value={currentBill.additionalCharge}
                  onChange={e => updateCurrentBill({ additionalCharge: e.target.value })}
                  className="w-24 text-right px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
                <span className="text-xs text-gray-400 w-6">[F3]</span>
              </div>
            </div>

            {/* Bill Details */}
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mt-4 mb-2">Bill details</h3>
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Sub Total</span>
              <span>₹ {subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500 mb-4 pb-4 border-b border-gray-200">
              <span>Tax</span>
              <span>₹ {taxAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>

            <div className="flex justify-between items-center py-3 px-4 bg-green-50 rounded-lg border border-green-100">
              <span className="text-base font-bold text-green-800">Total Amount</span>
              <span className="text-xl font-black text-green-700">₹ {grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>

            {/* Received Amount */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Received Amount</span>
                <span className="text-xs text-gray-400">[F4]</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-2 text-gray-500">₹</span>
                  <input 
                    ref={receivedInputRef}
                    type="number" 
                    value={currentBill.amountReceived}
                    onChange={e => updateCurrentBill({ amountReceived: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                    placeholder={grandTotal}
                  />
                </div>
                <select 
                  value={currentBill.paymentMode}
                  onChange={e => updateCurrentBill({ paymentMode: e.target.value })}
                  className="w-28 px-2 py-2 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank Tx</option>
                </select>
              </div>
            </div>

            {/* Customer Details */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Customer Details</span>
                <span className="text-xs text-gray-400">[F5]</span>
              </div>
              <select 
                ref={customerInputRef}
                value={currentBill.customerId}
                onChange={e => updateCurrentBill({ customerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:ring-1 focus:ring-blue-500 bg-white text-sm"
              >
                <option value="">Cash Sale</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-gray-200 bg-white flex gap-3">
            <button 
              onClick={() => checkout(true)}
              disabled={saving || currentBill.items.length === 0}
              className="flex-1 py-3 text-sm font-bold text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              Save & Print <span className="text-xs font-normal ml-1">[F6]</span>
            </button>
            <button 
              onClick={() => checkout(false)}
              disabled={saving || currentBill.items.length === 0}
              className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Save Bill <span className="text-xs font-normal ml-1">[F7]</span>
            </button>
          </div>
        </div>
      </div>

      {/* New Item Modal */}
      {showNewItemModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-[400px] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800">New Item</h2>
              <button onClick={() => setShowNewItemModal(false)} className="text-gray-400 hover:text-gray-600">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveNewProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Item Name *</label>
                <input autoFocus required type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full px-3 py-2 border rounded outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Selling Price</label>
                  <input type="number" required value={newItem.selling_price} onChange={e => setNewItem({...newItem, selling_price: e.target.value})} className="w-full px-3 py-2 border rounded outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Stock QTY</label>
                  <input type="number" value={newItem.stock_qty} onChange={e => setNewItem({...newItem, stock_qty: e.target.value})} className="w-full px-3 py-2 border rounded outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Category</label>
                <select value={newItem.category_id} onChange={e => setNewItem({...newItem, category_id: e.target.value})} className="w-full px-3 py-2 border rounded outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">-- Select Category --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Barcode / Item Code</label>
                <input type="text" value={newItem.barcode} onChange={e => setNewItem({...newItem, barcode: e.target.value})} className="w-full px-3 py-2 border rounded outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg mt-2">
                Save & Add to Cart
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
