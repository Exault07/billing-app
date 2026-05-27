import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { HiOutlineShoppingCart, HiOutlineTrash, HiOutlinePause, HiOutlinePlay, HiOutlineSave } from 'react-icons/hi';

export default function POSBilling() {
  const { user } = useAuth();
  
  // â”€â”€ States â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // Current active bill state
  const [items, setItems] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  
  // Held bills state
  const [heldBills, setHeldBills] = useState([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const searchInputRef = useRef(null);

  // â”€â”€ Fetch Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const loadData = async () => {
      const [{ data: prodData }, { data: custData }] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('customers').select('*').order('name')
      ]);
      setProducts(prodData || []);
      setCustomers(custData || []);
      // Auto focus search
      searchInputRef.current?.focus();
    };
    loadData();
  }, []);

  // â”€â”€ Derived Totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const grandTotal = subtotal - Number(discount);
  const balanceDue = grandTotal - (amountReceived === '' ? grandTotal : Number(amountReceived));

  // â”€â”€ POS Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      // Find exact barcode match first
      let match = products.find(p => p.barcode === searchTerm.trim());
      // If no barcode match, find by name
      if (!match) {
        match = products.find(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      
      if (match) {
        addToCart(match);
        setSearchTerm('');
      }
    }
  };

  const addToCart = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: Number(product.selling_price),
        qty: 1
      }];
    });
  };

  const updateQty = (id, newQty) => {
    if (newQty < 1) return;
    setItems(prev => prev.map(i => i.product_id === id ? { ...i, qty: Number(newQty) } : i));
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(i => i.product_id !== id));
  };

  // â”€â”€ Hold Bill Logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const holdCurrentBill = () => {
    if (items.length === 0) return;
    const holdId = Date.now();
    setHeldBills(prev => [...prev, {
      id: holdId,
      time: new Date().toLocaleTimeString(),
      items: [...items],
      customerId,
      discount
    }]);
    // Clear current
    resetCart();
    searchInputRef.current?.focus();
  };

  const resumeBill = (holdId) => {
    const bill = heldBills.find(b => b.id === holdId);
    if (!bill) return;
    
    // If currently working on a bill, hold it first
    if (items.length > 0) {
      holdCurrentBill();
    }

    setItems(bill.items);
    setCustomerId(bill.customerId);
    setDiscount(bill.discount);
    
    // Remove from held
    setHeldBills(prev => prev.filter(b => b.id !== holdId));
  };

  const resetCart = () => {
    setItems([]);
    setCustomerId('');
    setDiscount(0);
    setAmountReceived('');
    setPaymentMode('cash');
  };

  // â”€â”€ Save Bill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const checkout = async () => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      // Generate Bill No
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const { count } = await supabase.from('bills').select('id', { count: 'exact', head: true });
      const seq = String((count || 0) + 1).padStart(3, '0');
      const billNo = `POS-${dateStr}-${seq}`;

      const payload = {
        bill_no: billNo,
        date: today.toISOString().split('T')[0],
        customer_id: customerId || null,
        items: items,
        subtotal,
        discount: Number(discount),
        advance_paid: amountReceived === '' ? grandTotal : Number(amountReceived),
        balance_due: balanceDue,
        payment_mode: paymentMode,
        status: 'final',
        created_by: user?.id,
      };

      const { error } = await supabase.from('bills').insert(payload);
      if (error) throw error;

      alert(`Bill ${billNo} Saved & Finalised Successfully!`);
      resetCart();
      searchInputRef.current?.focus();
    } catch (err) {
      alert('Error saving bill: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] gap-4 pb-4">
      
      {/* â”€â”€ Left Side: Products Catalog & Scanner â”€â”€ */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-surface-200 bg-surface-50 flex gap-3">
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Scan Barcode or Search Product (Press Enter)" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            className="flex-1 px-4 py-2.5 border border-surface-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-inner"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products
              .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm)))
              .slice(0, 40) // Limit render for perf
              .map(p => (
              <button 
                key={p.id}
                onClick={() => addToCart(p)}
                className="flex flex-col items-start p-3 border border-surface-200 rounded-xl hover:border-primary-500 hover:shadow-md transition-all text-left group"
              >
                <span className="text-sm font-semibold text-surface-800 line-clamp-2 mb-1 group-hover:text-primary-700">{p.name}</span>
                <span className="text-xs text-surface-400 mb-2">Stock: {p.stock_qty} {p.unit}</span>
                <span className="text-sm font-bold text-primary-600 mt-auto">₹{p.selling_price}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* â”€â”€ Right Side: POS Cart / Checkout â”€â”€ */}
      <div className="w-[400px] flex flex-col bg-white rounded-2xl border border-surface-200 shadow-sm flex-shrink-0">
        
        {/* Held Bills Bar */}
        {heldBills.length > 0 && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex gap-2 overflow-x-auto">
            {heldBills.map(b => (
              <button 
                key={b.id} 
                onClick={() => resumeBill(b.id)}
                className="whitespace-nowrap px-3 py-1 bg-white border border-amber-300 text-amber-800 text-xs font-semibold rounded-lg hover:bg-amber-100 flex items-center gap-1"
              >
                <HiOutlinePlay className="w-3 h-3" /> Resume ({b.time})
              </button>
            ))}
          </div>
        )}

        <div className="p-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
          <div className="flex items-center gap-2">
            <HiOutlineShoppingCart className="w-5 h-5 text-primary-600" />
            <h2 className="font-bold text-surface-800">Current Cart</h2>
          </div>
          <button 
            onClick={holdCurrentBill}
            disabled={items.length === 0}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-surface-300 text-surface-600 hover:bg-surface-100 disabled:opacity-50 flex items-center gap-1"
          >
            <HiOutlinePause className="w-4 h-4" /> Hold Bill
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-surface-400">
              <HiOutlineShoppingCart className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.product_id} className="flex flex-col bg-surface-50 border border-surface-100 p-2.5 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-semibold text-surface-800 line-clamp-1 flex-1 pr-2">{item.name}</span>
                    <button onClick={() => removeItem(item.product_id)} className="text-surface-400 hover:text-red-500">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.product_id, item.qty - 1)} className="w-7 h-7 rounded bg-white border border-surface-300 flex items-center justify-center text-lg leading-none hover:bg-surface-100">-</button>
                      <input 
                        type="number" 
                        value={item.qty}
                        onChange={(e) => updateQty(item.product_id, e.target.value)}
                        className="w-12 text-center text-sm border-none bg-transparent focus:ring-0 font-medium"
                      />
                      <button onClick={() => updateQty(item.product_id, item.qty + 1)} className="w-7 h-7 rounded bg-white border border-surface-300 flex items-center justify-center text-lg leading-none hover:bg-surface-100">+</button>
                    </div>
                    <span className="font-bold text-surface-800">₹{(item.qty * item.price).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Footer */}
        <div className="p-4 bg-surface-50 border-t border-surface-200">
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-surface-600">Customer</span>
              <select 
                value={customerId} 
                onChange={e => setCustomerId(e.target.value)}
                className="w-48 px-2 py-1 border border-surface-300 rounded-lg text-sm bg-white"
              >
                <option value="">Walk-in Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-surface-600">Discount (₹)</span>
              <input 
                type="number" 
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                className="w-24 text-right px-2 py-1 border border-surface-300 rounded-lg text-sm bg-white"
              />
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-surface-600">Payment Mode</span>
              <select 
                value={paymentMode} 
                onChange={e => setPaymentMode(e.target.value)}
                className="w-32 px-2 py-1 border border-surface-300 rounded-lg text-sm bg-white"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-surface-200 mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-surface-500 font-medium text-sm">Total to Pay</span>
              <span className="text-2xl font-black text-primary-700">₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button 
            onClick={checkout}
            disabled={items.length === 0 || saving}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <HiOutlineSave className="w-5 h-5" />
            {saving ? 'Processing...' : 'Checkout & Print'}
          </button>
        </div>
      </div>

    </div>
  );
}
