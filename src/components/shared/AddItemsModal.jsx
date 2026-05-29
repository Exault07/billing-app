import React, { useState, useEffect } from 'react';
import { HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import { supabase } from '../../supabaseClient';

export default function AddItemsModal({ products, onAdd, onClose, invoiceSettings = {}, customerId }) {
  const [search, setSearch] = useState('');
  const [selectedQtys, setSelectedQtys] = useState({});
  const [priceHistory, setPriceHistory] = useState({});
  const showPurchasePriceCol = invoiceSettings.showPurchasePrice !== false;
  const showPriceHistory = invoiceSettings.priceHistory !== false;

  useEffect(() => {
    if (showPriceHistory && customerId) {
      supabase
        .from('bills')
        .select('items, date')
        .eq('customer_id', customerId)
        .order('date', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          if (!data) return;
          const history = {};
          data.forEach(bill => {
            (bill.items || []).forEach(item => {
              if (!history[item.product_id]) history[item.product_id] = [];
              if (history[item.product_id].length < 5) {
                history[item.product_id].push({ price: item.price, date: bill.date });
              }
            });
          });
          setPriceHistory(history);
        });
    }
  }, [customerId, showPriceHistory]);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const addedCount = Object.values(selectedQtys).filter(q => Number(q) > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl mx-4 flex flex-col" style={{ maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <h2 className="text-[17px] font-bold text-surface-800">Add Items to Bill</h2>
          <button type="button" onClick={onClose} className="text-surface-400 hover:text-surface-800">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <div className="flex-1 flex items-center border-2 border-[#7c3aed] rounded px-3 py-2 gap-2">
            <HiOutlineSearch className="w-4 h-4 text-[#7c3aed]" />
            <input
              autoFocus
              type="text"
              placeholder="Search by Item / Serial no. / HSN code / SKU / Custom Field / Category"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 text-[13px] outline-none"
            />
          </div>
          <select className="border border-surface-200 rounded px-3 py-2 text-[13px] text-surface-600 bg-white w-40">
            <option>Select Category</option>
          </select>
          <button
            type="button"
            onClick={() => window.open('/inventory/new', '_blank')}
            className="px-4 py-2 bg-[#7c3aed] text-white text-[13px] font-bold rounded whitespace-nowrap hover:bg-[#6d28d9]"
          >
            Create New Item
          </button>
        </div>

        {/* Items Table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white border-b border-surface-200 text-[12px] font-bold text-surface-600 shadow-sm z-10">
              <tr>
                <th className="py-2.5 px-4 bg-white">Item Name</th>
                <th className="py-2.5 px-4 bg-white">Item Code</th>
                <th className="py-2.5 px-4 bg-white">Stock</th>
                <th className="py-2.5 px-4 bg-white">Sales Price</th>
                {showPurchasePriceCol && <th className="py-2.5 px-4 bg-white">Purchase Price</th>}
                {showPriceHistory && customerId && <th className="py-2.5 px-4 bg-white">Last Price</th>}
                <th className="py-2.5 px-4 text-right pr-6 bg-white">Quantity</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-surface-400">No items found</td>
                </tr>
              ) : (
                filtered.slice(0, 50).map(p => (
                  <tr
                    key={p.id}
                    className="border-b border-surface-100 hover:bg-[#f5f3ff] transition-colors cursor-pointer"
                    onClick={(e) => {
                      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                        setSelectedQtys(prev => ({ ...prev, [p.id]: (Number(prev[p.id]) || 0) + 1 }));
                      }
                    }}
                  >
                    <td className="py-3 px-4 font-medium text-surface-800">
                      <div>{p.name}</div>
                      {Number(selectedQtys[p.id] || 0) > Number(p.stock_qty || 0) && (
                        <div className="text-[10px] text-red-500 font-normal mt-0.5 leading-tight">Insufficient stock</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-surface-500">{p.barcode || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={Number(p.stock_qty) <= 0 ? 'text-red-500 font-medium' : 'text-surface-700'}>
                        {p.stock_qty} {p.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4">₹ {Number(p.selling_price || 0).toLocaleString('en-IN')}</td>
                    {showPurchasePriceCol && (
                      <td className="py-3 px-4 text-surface-500">₹ {Number(p.purchase_price || 0).toLocaleString('en-IN')}</td>
                    )}
                    {showPriceHistory && customerId && (
                      <td className="py-3 px-4">
                        {priceHistory[p.id] && priceHistory[p.id].length > 0 ? (
                          <div className="text-[11px]">
                            <div className="font-bold text-indigo-600">₹ {Number(priceHistory[p.id][0].price).toLocaleString('en-IN')}</div>
                            <div className="text-surface-400">{new Date(priceHistory[p.id][0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                          </div>
                        ) : <span className="text-surface-400 text-[11px]">—</span>}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right pr-3">
                      <div className="flex items-center justify-end gap-2 h-[28px]">
                        {Number(selectedQtys[p.id] || 0) > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedQtys(prev => ({ ...prev, [p.id]: Math.max(0, Number(prev[p.id] || 1) - 1) })); }}
                              className="w-6 h-6 flex items-center justify-center bg-red-500 text-white font-bold hover:bg-red-600 rounded-sm text-[16px] leading-none"
                            >
                              -
                            </button>
                            <input
                              type="number" min="0"
                              value={selectedQtys[p.id]}
                              onChange={e => setSelectedQtys(prev => ({ ...prev, [p.id]: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              className="w-10 border border-surface-200 rounded px-1 py-0.5 text-center text-[13px] text-blue-600 font-bold outline-none no-spinners"
                            />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedQtys(prev => ({ ...prev, [p.id]: Number(prev[p.id] || 1) + 1 })); }}
                              className="w-6 h-6 flex items-center justify-center bg-red-500 text-white font-bold hover:bg-red-600 rounded-sm text-[16px] leading-none"
                            >
                              +
                            </button>
                            <span className="text-[11px] text-surface-500 font-medium ml-1 w-6 text-left">{p.unit || 'PCS'}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedQtys(prev => ({ ...prev, [p.id]: 1 })); }}
                            className="bg-blue-50 text-blue-600 font-bold px-4 py-1.5 rounded text-[12px] hover:bg-blue-100 transition-colors min-w-[64px]"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-200 bg-surface-50">
          <div className="text-[12px] text-surface-500 hidden md:flex items-center gap-2">
            <span>Keyboard Shortcuts:</span>
            <kbd className="bg-white border border-surface-200 rounded px-1.5 py-0.5 text-[11px]">Enter</kbd>
            <kbd className="bg-white border border-surface-200 rounded px-1.5 py-0.5 text-[11px]">+ / -</kbd>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-blue-600 text-[13px] font-medium underline cursor-pointer">
              Show {addedCount} Item(s) Selected
            </span>
            <button type="button" onClick={onClose} className="px-4 py-1.5 border border-surface-200 rounded text-[13px] font-medium text-surface-600 bg-white hover:bg-surface-50">
              Cancel [ESC]
            </button>
            <button 
              type="button" 
              onClick={() => {
                const selected = Object.keys(selectedQtys).filter(id => Number(selectedQtys[id]) > 0);
                selected.forEach(id => {
                  const product = products.find(p => p.id === id);
                  if (product) {
                    onAdd(product, Number(selectedQtys[id]));
                  }
                });
                onClose();
              }} 
              className="px-4 py-1.5 bg-[#7c3aed] text-white rounded text-[13px] font-bold hover:bg-[#6d28d9]"
            >
              Add to Bill [F7]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
