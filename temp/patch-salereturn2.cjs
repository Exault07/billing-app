const fs = require('fs');

let file = fs.readFileSync('src/pages/sales/SaleReturn.jsx', 'utf8');

const listComponentStart = file.indexOf('\n// List Component');

if (listComponentStart === -1) {
    console.error("Could not find // List Component.");
    process.exit(1);
}

const originalTop = file.substring(0, file.indexOf('return (', file.indexOf('const selectedCustomer = customers.find(c => c.id === customerId);')));

const newJSX = `return (
    <div className="max-w-[1400px] mx-auto min-h-[calc(100vh-6rem)] bg-white animate-fade-in shadow-sm rounded-2xl overflow-hidden mt-4">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-surface-50">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-surface-600 hover:text-surface-900 bg-white p-2 rounded-full border border-surface-200 shadow-sm transition-all hover:bg-surface-100">
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-[20px] font-bold text-surface-900 leading-tight">Create Sales Return</h1>
            <p className="text-[12px] text-surface-500 font-medium">Record returned items and process refunds</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-[13px] font-bold text-surface-600 px-4 py-2 border border-surface-200 rounded-xl shadow-sm hover:bg-surface-50 bg-white transition-colors">
            <HiOutlineCog className="w-4 h-4" /> Settings
          </button>
          <button onClick={(e) => handleSave(e, true)} disabled={saving} className="text-[13px] font-bold text-surface-600 px-5 py-2 border border-surface-200 rounded-xl shadow-sm hover:bg-surface-50 bg-white disabled:opacity-50 transition-colors">
            Save & New
          </button>
          <button 
            onClick={(e) => handleSave(e, false)} 
            disabled={saving}
            className="text-[13px] font-bold text-white px-8 py-2 bg-[#4f46e5] hover:bg-[#4338ca] rounded-xl shadow-sm disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Return'}
          </button>
        </div>
      </div>

      {error && <div className="m-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-3"><span className="text-xl">⚠️</span><span className="mt-0.5">{error}</span></div>}

      <div className="p-8">
        {/* ── Top Section: Party & Meta ── */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-10 mb-10">
          
          {/* Bill To Box */}
          <div className="w-full lg:w-[420px] relative">
            <label className="block text-[13px] font-bold text-surface-700 mb-2 uppercase tracking-wide">Return From Party</label>
            {!selectedCustomer ? (
              <div 
                onClick={() => setShowPartyDropdown(true)}
                className="w-full h-[110px] border-2 border-dashed border-[#4f46e5]/40 bg-[#4f46e5]/5 rounded-xl flex items-center justify-center cursor-pointer hover:bg-[#4f46e5]/10 text-[#4f46e5] font-bold text-[14px] transition-colors"
              >
                + Select Party
              </div>
            ) : (
              <div className="w-full min-h-[110px] border border-surface-200 rounded-xl p-5 relative group bg-white shadow-sm hover:border-[#4f46e5] transition-colors">
                <div className="font-bold text-[16px] text-surface-900">{selectedCustomer.name}</div>
                {selectedCustomer.phone && <div className="text-[13px] text-surface-500 mt-1">{selectedCustomer.phone}</div>}
                <button 
                  onClick={() => { setCustomerId(''); setShowPartyDropdown(true); }}
                  className="absolute top-4 right-4 text-[12px] font-bold text-surface-400 hover:text-[#4f46e5] transition-colors bg-surface-50 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100"
                >
                  Change
                </button>
              </div>
            )}

            {/* Custom Party Dropdown */}
            {showPartyDropdown && (
              <div className="absolute top-[140px] left-0 right-0 bg-white border border-[#4f46e5]/30 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-3 border-b border-surface-100 bg-surface-50/50">
                  <div className="relative">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 w-4 h-4" />
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="Search party by name or number..." 
                      value={partySearch}
                      onChange={e => setPartySearch(e.target.value)}
                      className="w-full outline-none text-[13px] pl-9 pr-3 py-2 bg-white border border-surface-200 rounded-lg focus:border-[#4f46e5]"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {customers.filter(c => c.name.toLowerCase().includes(partySearch.toLowerCase())).map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => { setCustomerId(c.id); setShowPartyDropdown(false); setPartySearch(''); }}
                      className="flex flex-col px-4 py-3 hover:bg-[#4f46e5]/5 cursor-pointer border-b border-surface-50 last:border-0"
                    >
                      <span className="font-bold text-surface-900 text-[13px]">{c.name}</span>
                      {c.phone && <span className="text-surface-500 text-[11px] mt-0.5">{c.phone}</span>}
                    </div>
                  ))}
                  {customers.length === 0 && <div className="p-6 text-center text-sm font-medium text-surface-400">No parties found matching search</div>}
                </div>
              </div>
            )}
          </div>

          {/* Right Meta Grid */}
          <div className="w-full lg:w-auto">
            <div className="flex flex-wrap gap-5 mb-5">
              <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
                <label className="block text-[11px] font-bold text-surface-500 mb-1.5 uppercase tracking-wide">Return No</label>
                <input 
                  value={returnNo} onChange={e => setReturnNo(e.target.value)}
                  className="w-32 px-3 py-1.5 border-b border-surface-300 outline-none text-[14px] font-bold text-surface-900 bg-transparent focus:border-[#4f46e5]"
                />
              </div>
              <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
                <label className="block text-[11px] font-bold text-surface-500 mb-1.5 uppercase tracking-wide">Return Date</label>
                <input 
                  type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-36 px-3 py-1.5 outline-none text-[14px] font-bold text-surface-900 bg-transparent cursor-pointer"
                />
              </div>
            </div>
            
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 relative">
              <label className="block text-[11px] font-bold text-blue-600 mb-2 uppercase tracking-wide flex items-center gap-2">
                <HiOutlineDocumentText className="w-4 h-4" /> Link to Original Invoice
              </label>
              <div
                onClick={() => setShowBillDropdown(!showBillDropdown)}
                className="w-full min-w-[300px] px-4 py-2.5 bg-white border border-blue-200 rounded-lg text-[13px] cursor-pointer flex justify-between items-center hover:border-blue-400 transition-colors shadow-sm font-medium text-surface-800"
              >
                <span className="truncate">{originalBillId ? bills.find(b => b.id === originalBillId)?.bill_no : '-- Select Original Invoice --'}</span>
                <span className="text-blue-500 text-[10px]">▼</span>
              </div>
              
              {showBillDropdown && (
                <div className="absolute top-full right-0 w-[400px] mt-2 bg-white border border-[#4f46e5]/20 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-surface-100 bg-surface-50">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search invoices by number or party..."
                      value={billSearch}
                      onChange={e => setBillSearch(e.target.value)}
                      className="w-full outline-none text-[13px] px-4 py-2 bg-white border border-surface-200 rounded-lg focus:border-[#4f46e5]"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <div onClick={() => { handleBillSelect(''); setShowBillDropdown(false); }} className="px-4 py-3 hover:bg-red-50 cursor-pointer text-[12px] font-bold text-red-500 border-b border-surface-100">
                      ✕ Clear Selection
                    </div>
                    {bills.filter(b => b.bill_no.toLowerCase().includes(billSearch.toLowerCase()) || (b.customers?.name || '').toLowerCase().includes(billSearch.toLowerCase())).map(b => (
                      <div
                        key={b.id}
                        onClick={() => { handleBillSelect(b.id); setShowBillDropdown(false); setBillSearch(''); }}
                        className="px-5 py-3 hover:bg-[#4f46e5]/5 cursor-pointer border-b border-surface-50 flex justify-between items-center group"
                      >
                        <div>
                          <div className="font-bold text-surface-900 text-[13px] group-hover:text-[#4f46e5]">{b.bill_no}</div>
                          <div className="text-[11px] text-surface-500 mt-0.5">{b.customers?.name || 'Unknown'} • {new Date(b.date).toLocaleDateString()}</div>
                        </div>
                        <div className="font-black text-surface-800 text-[13px]">₹ {b.grand_total}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Middle Section: Items Table ── */}
        <div className="border border-surface-200 rounded-xl overflow-hidden mb-8 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-[#f8f9fa] border-b border-surface-200 text-[11px] font-black text-surface-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center border-r border-surface-200">No</th>
                  <th className="py-3.5 px-4 border-r border-surface-200">Items / Services</th>
                  <th className="py-3.5 px-4 w-28 border-r border-surface-200 text-center">HSN / SAC</th>
                  <th className="py-3.5 px-4 w-28 border-r border-surface-200 text-center">Return Qty</th>
                  <th className="py-3.5 px-4 w-32 border-r border-surface-200 text-right">Price / Item (₹)</th>
                  <th className="py-3.5 px-4 w-28 border-r border-surface-200 text-right">Discount</th>
                  <th className="py-3.5 px-4 w-24 border-r border-surface-200 text-right">Tax</th>
                  <th className="py-3.5 px-4 w-36 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-2 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#4f46e5]/[0.02] group transition-colors">
                    <td className="py-3 px-4 text-center text-[13px] font-bold text-surface-400 border-r border-surface-100">{idx + 1}</td>
                    <td className="py-3 px-4 relative border-r border-surface-100">
                      <input 
                        type="text" 
                        placeholder="Type item name..."
                        value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                        className="w-full bg-transparent text-[13px] outline-none font-bold text-surface-800 placeholder-surface-300"
                      />
                    </td>
                    <td className="py-3 px-4 border-r border-surface-100">
                      <input 
                        type="text" value={item.hsn || ''} onChange={e => updateItem(idx, 'hsn', e.target.value)}
                        className="w-full bg-transparent text-[13px] outline-none text-surface-800 text-center font-medium"
                      />
                    </td>
                    <td className="py-3 px-4 relative border-r border-surface-100 bg-red-50/30">
                      <input 
                        type="number" min="1" max={item.original_qty || 9999}
                        value={item.qty || ''} onChange={e => updateItem(idx, 'qty', e.target.value)}
                        className="w-full bg-transparent text-[14px] outline-none text-center font-black text-red-600"
                      />
                      {item.original_qty > 0 && <span className="absolute -bottom-1 left-0 right-0 text-center text-[10px] font-bold text-surface-400">Max: {item.original_qty}</span>}
                    </td>
                    <td className="py-3 px-4 border-r border-surface-100">
                      <input 
                        type="number" value={item.price || ''} onChange={e => updateItem(idx, 'price', e.target.value)}
                        className="w-full bg-transparent text-[13px] outline-none text-right font-medium text-surface-800"
                      />
                    </td>
                    <td className="py-3 px-4 border-r border-surface-100">
                      <input 
                        type="number" value={item.discount || ''} onChange={e => updateItem(idx, 'discount', e.target.value)}
                        className="w-full bg-transparent text-[13px] outline-none text-right font-medium text-surface-800"
                      />
                    </td>
                    <td className="py-3 px-4 border-r border-surface-100">
                      <div className="flex items-center justify-end">
                        <input 
                          type="number" value={item.tax || ''} onChange={e => updateItem(idx, 'tax', e.target.value)}
                          className="w-12 bg-transparent text-[13px] outline-none text-right font-medium text-surface-800"
                        />
                        <span className="text-[12px] font-bold text-surface-400 ml-1.5">%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-[14px] font-black text-surface-900">
                      {Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button 
                        onClick={() => removeItem(idx)} 
                        className="text-surface-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-50"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center p-3 bg-[#f8f9fa] border-t border-surface-200">
            <button 
              onClick={addItemRow}
              className="flex items-center gap-1.5 text-[12px] font-black tracking-wide text-[#4f46e5] px-4 py-2 hover:bg-[#4f46e5]/10 rounded-lg transition-colors border border-transparent hover:border-[#4f46e5]/20"
            >
              <HiOutlinePlus className="w-4 h-4" /> ADD ROW
            </button>
          </div>
        </div>

        {/* ── Bottom Section ── */}
        <div className="flex flex-col lg:flex-row justify-between gap-10">
          
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-[12px] font-bold text-surface-600 mb-2 flex items-center gap-1.5 cursor-pointer hover:text-surface-900 w-max uppercase tracking-wide">
                <HiOutlinePlus className="w-4 h-4" /> Add Notes / Reason
              </label>
              <textarea 
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Write the reason for returning these items..."
                className="w-full max-w-xl p-4 border border-surface-200 rounded-xl text-[13px] bg-surface-50 focus:bg-white outline-none focus:border-[#4f46e5] resize-none shadow-sm transition-all"
                rows="4"
              />
            </div>
          </div>

          <div className="w-full lg:w-[380px]">
            <div className="bg-[#f8f9fa] rounded-2xl border border-surface-200 p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-center text-[13px] text-surface-700 font-bold">
                <span>Subtotal</span>
                <span className="text-[15px]">₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="flex justify-between items-center text-[13px] text-[#4f46e5] group font-bold">
                <span className="flex items-center gap-1.5 cursor-pointer hover:underline"><HiOutlinePlus className="w-4 h-4" /> Additional Charges</span>
                <div className="flex items-center">
                  <span>₹</span>
                  <input 
                    type="number" value={additionalCharges} onChange={e => setAdditionalCharges(e.target.value)}
                    className="w-20 bg-transparent outline-none text-right border-b-2 border-transparent group-hover:border-[#4f46e5]/30 focus:border-[#4f46e5]"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[13px] text-[#4f46e5] group font-bold">
                <span className="flex items-center gap-1.5 cursor-pointer hover:underline"><HiOutlinePlus className="w-4 h-4" /> Discount</span>
                <div className="flex items-center">
                  <span>₹</span>
                  <input 
                    type="number" value={overallDiscount} onChange={e => setOverallDiscount(e.target.value)}
                    className="w-20 bg-transparent outline-none text-right border-b-2 border-transparent group-hover:border-[#4f46e5]/30 focus:border-[#4f46e5]"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[13px] font-bold">
                <label className="flex items-center gap-2 text-surface-600 cursor-pointer select-none">
                  <input type="checkbox" checked={autoRoundOff} onChange={e => setAutoRoundOff(e.target.checked)} className="rounded text-[#4f46e5] focus:ring-[#4f46e5]" />
                  Auto Round Off
                </label>
                <div className="text-surface-500">{roundOffAmt > 0 ? '+' : ''}{roundOffAmt.toFixed(2)}</div>
              </div>

              <div className="pt-4 border-t border-surface-200 flex justify-between items-center mt-2">
                <span className="text-[15px] font-black text-surface-800 uppercase tracking-wide">Total Return</span>
                <span className="text-[24px] font-black text-surface-900">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="pt-4 mt-2 border-t border-surface-200">
                <div className="flex justify-between items-center mb-3">
                  <label className="flex items-center gap-2 text-[12px] font-bold text-surface-600 cursor-pointer select-none hover:text-surface-900 bg-surface-100 px-3 py-1.5 rounded-lg">
                    <input type="checkbox" checked={isFullyRefunded} onChange={e => setIsFullyRefunded(e.target.checked)} className="rounded text-green-500 focus:ring-green-500" />
                    Mark fully refunded
                  </label>
                  <select className="bg-white border border-surface-200 rounded-lg px-2 py-1 text-[11px] font-bold text-surface-600 outline-none cursor-pointer hover:border-[#4f46e5]">
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Bank</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Amount Refunded</span>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 font-black text-[16px]">₹</span>
                    <input 
                      type="number" 
                      value={effectiveRefunded} onChange={e => setAmountRefunded(e.target.value)}
                      disabled={isFullyRefunded}
                      className="w-full pl-9 pr-4 py-3 bg-white border border-surface-200 rounded-xl text-[16px] font-black text-surface-900 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 disabled:opacity-50 disabled:bg-surface-100 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

const finalFile = originalTop + newJSX + file.substring(listComponentStart);
fs.writeFileSync('src/pages/sales/SaleReturn.jsx', finalFile);
console.log('SaleReturn form patched successfully.');
