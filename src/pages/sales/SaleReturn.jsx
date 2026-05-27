import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineSearch,
  HiOutlineArrowLeft,
  HiOutlinePrinter,
  HiOutlineDocumentText,
  HiOutlineX,
} from 'react-icons/hi';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function SaleReturn() {
  const { user } = useAuth();
  
  // Step 1: Select Bill
  const [bills, setBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  
  // Step 2: Return Details
  const [returnItems, setReturnItems] = useState([]);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [refundMode, setRefundMode] = useState('cash');
  
  // Step 3: Success/Print
  const [creditNote, setCreditNote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch recent final bills
    supabase
      .from('bills')
      .select('*, customers(name, phone, address)')
      .neq('status', 'cancelled')
      .neq('status', 'draft')
      .order('date', { ascending: false })
      .limit(50)
      .then(({ data }) => setBills(data || []));
  }, []);

  const handleSelectBill = (bill) => {
    setSelectedBill(bill);
    // Initialize return items
    const items = (bill.items || []).map(i => ({
      ...i,
      original_qty: Number(i.qty),
      return_qty: 0,
    }));
    setReturnItems(items);
    setCreditNote(null);
  };

  const updateReturnQty = (idx, val) => {
    setReturnItems(prev => {
      const arr = [...prev];
      let q = Number(val);
      if (q < 0) q = 0;
      if (q > arr[idx].original_qty) q = arr[idx].original_qty;
      arr[idx].return_qty = q;
      return arr;
    });
  };

  const handleCreateCreditNote = async () => {
    const returningItems = returnItems.filter(i => i.return_qty > 0);
    if (returningItems.length === 0) return setError('Select at least one item to return');
    
    setSaving(true);
    setError('');
    try {
      // Get next return number
      const { count } = await supabase.from('sale_returns').select('id', { count: 'exact', head: true });
      const returnNo = 'CN-' + String((count || 0) + 1);

      const itemsToSave = returningItems.map(i => ({
        product_id: i.product_id,
        name: i.name,
        price: i.price,
        return_qty: i.return_qty,
        return_amount: i.price * i.return_qty
      }));

      const totalReturnAmount = itemsToSave.reduce((s, i) => s + i.return_amount, 0);

      // 1. Insert into sale_returns
      const { data: newCN, error: insertErr } = await supabase.from('sale_returns').insert({
        original_bill_id: selectedBill.id,
        return_no: returnNo,
        return_date: returnDate,
        items: itemsToSave,
        total_return_amount: totalReturnAmount,
        reason,
        refund_mode: refundMode,
        created_by: user?.id,
      }).select().single();

      if (insertErr) throw insertErr;

      // 2. Restore stock for each item
      for (const item of itemsToSave) {
        if (item.product_id) {
          // get current stock
          const { data: prod } = await supabase.from('products').select('stock_qty').eq('id', item.product_id).single();
          if (prod) {
            await supabase.from('products').update({ stock_qty: Number(prod.stock_qty) + Number(item.return_qty) }).eq('id', item.product_id);
          }
        }
      }

      // 3. Update original bill status
      const allFullyReturned = returnItems.every(i => i.return_qty === i.original_qty);
      await supabase.from('bills').update({
        status: allFullyReturned ? 'fully_returned' : 'partially_returned'
      }).eq('id', selectedBill.id);

      setCreditNote({
        ...newCN,
        customer: selectedBill.customers,
        original_bill_no: selectedBill.bill_no
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  // If showing Credit Note
  if (creditNote) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-cn, #printable-cn * { visibility: visible; }
            #printable-cn { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}</style>
        <div className="no-print flex justify-between items-center mb-6">
          <button onClick={() => { setSelectedBill(null); setCreditNote(null); }} className="text-surface-600 font-medium">
            ← Back to Returns
          </button>
          <button onClick={handlePrint} className="px-5 py-2 bg-[#f97316] text-white rounded-lg font-bold flex items-center gap-2">
            <HiOutlinePrinter/> Print Credit Note
          </button>
        </div>

        <div id="printable-cn" className="bg-white rounded-xl border border-surface-200 p-8">
          <div className="flex justify-between items-start border-b border-surface-200 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-black text-surface-900">CREDIT NOTE</h1>
              <p className="text-surface-500 font-bold mt-1">Ref: {creditNote.return_no}</p>
              <p className="text-surface-500 text-sm">Date: {new Date(creditNote.return_date).toLocaleDateString()}</p>
              <p className="text-surface-500 text-sm mt-2">Against Bill: <span className="font-bold text-surface-800">{creditNote.original_bill_no}</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-surface-500 uppercase font-bold">Issued To</p>
              <p className="font-bold text-lg">{creditNote.customer?.name}</p>
              <p className="text-sm text-surface-600">{creditNote.customer?.phone}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead className="bg-surface-50 border-b">
              <tr className="text-surface-600 uppercase text-xs">
                <th className="py-3 px-4 text-left">Item</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-right">Ret. Qty</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {creditNote.items.map((i, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-4 font-medium">{i.name}</td>
                  <td className="py-3 px-4 text-right">Rs. {fmt(i.price)}</td>
                  <td className="py-3 px-4 text-right font-bold text-[#f97316]">{i.return_qty}</td>
                  <td className="py-3 px-4 text-right font-bold">Rs. {fmt(i.return_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-start">
            <div className="text-sm text-surface-600 max-w-xs">
              <p><span className="font-bold">Reason:</span> {creditNote.reason || '-'}</p>
              <p><span className="font-bold">Refund Mode:</span> <span className="uppercase">{creditNote.refund_mode}</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm text-surface-600">Total Credit Amount</p>
              <p className="text-2xl font-black text-[#f97316]">Rs. {fmt(creditNote.total_return_amount)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredBills = bills.filter(b => 
    b.bill_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#fff7ed] rounded-lg flex items-center justify-center border border-[#ffedd5]">
          <HiOutlineDocumentText className="w-6 h-6 text-[#f97316]" />
        </div>
        <h1 className="text-2xl font-bold text-surface-900">Sale Return / Credit Note</h1>
      </div>

      {!selectedBill ? (
        <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
          <div className="p-5 border-b border-surface-200 bg-surface-50">
            <h2 className="font-bold text-surface-800 mb-2">Step 1: Select Original Bill</h2>
            <div className="relative max-w-md">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Search bills..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-lg text-sm outline-none focus:border-[#f97316]"
              />
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white sticky top-0 border-b border-surface-200">
                <tr className="text-xs uppercase text-surface-500">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Bill No</th>
                  <th className="py-3 px-5">Party</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredBills.map(b => (
                  <tr key={b.id} onClick={() => handleSelectBill(b)} className="hover:bg-surface-50 cursor-pointer transition-colors group">
                    <td className="py-4 px-5">{new Date(b.date).toLocaleDateString()}</td>
                    <td className="py-4 px-5 font-bold text-surface-800 group-hover:text-[#f97316]">{b.bill_no}</td>
                    <td className="py-4 px-5">{b.customers?.name}</td>
                    <td className="py-4 px-5 text-right font-medium">Rs. {fmt(b.grand_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-surface-200">
          <div className="p-5 border-b border-surface-200 flex items-center justify-between bg-surface-50">
            <div>
              <h2 className="font-bold text-surface-800">Step 2: Return Details</h2>
              <p className="text-sm text-surface-500 mt-1">Returning items for Bill: <span className="font-bold text-surface-800">{selectedBill.bill_no}</span></p>
            </div>
            <button onClick={() => setSelectedBill(null)} className="text-sm font-medium text-surface-500 hover:text-surface-800 flex items-center gap-1">
              <HiOutlineX /> Cancel
            </button>
          </div>

          <div className="p-6">
            {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm font-medium">{error}</div>}
            
            <table className="w-full text-sm mb-6 border border-surface-200 rounded-lg overflow-hidden">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr className="text-xs uppercase text-surface-500">
                  <th className="py-3 px-4 text-left">Item Name</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Orig. Qty</th>
                  <th className="py-3 px-4 text-center">Return Qty</th>
                  <th className="py-3 px-4 text-right">Return Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {returnItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-4 font-medium">{item.name}</td>
                    <td className="py-3 px-4 text-right">Rs. {fmt(item.price)}</td>
                    <td className="py-3 px-4 text-right text-surface-500">{item.original_qty}</td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        max={item.original_qty}
                        value={item.return_qty}
                        onChange={e => updateReturnQty(idx, e.target.value)}
                        className="w-20 px-2 py-1 border border-surface-300 rounded text-center outline-none focus:border-[#f97316]"
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#f97316]">
                      Rs. {fmt(item.return_qty * item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-surface-600 mb-1">Return Date</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={e => setReturnDate(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-200 rounded outline-none focus:border-[#f97316]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-surface-600 mb-1">Refund Mode</label>
                <select
                  value={refundMode}
                  onChange={e => setRefundMode(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-200 rounded outline-none focus:border-[#f97316]"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="adjust">Adjust in Next Bill</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-surface-600 mb-1">Reason for Return</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-surface-200 rounded outline-none focus:border-[#f97316]"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleCreateCreditNote}
                disabled={saving}
                className="px-6 py-2.5 bg-[#f97316] text-white font-bold rounded-lg hover:bg-[#ea580c] disabled:opacity-50 shadow-md shadow-orange-500/20"
              >
                {saving ? 'Creating...' : 'Create Credit Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
