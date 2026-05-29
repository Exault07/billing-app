const fs = require('fs');

let file = fs.readFileSync('src/pages/sales/SaleReturn.jsx', 'utf8');

const match = file.match(/return \(\s+<div className="animate-fade-in w-full">([\s\S]*?)  \);\n\}\n\n\/\/ List Component/);

if (!match) {
    console.error("Could not find the bounds of CreateReturnForm JSX.");
    process.exit(1);
}

const newJSX = `return (
    <div className="max-w-[1400px] mx-auto min-h-screen bg-white animate-fade-in">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-200">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-surface-600 hover:text-surface-900">
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[18px] font-bold text-surface-800">
            Create Sales Return
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1 text-[13px] font-bold text-surface-600 px-3 py-1.5 border border-surface-200 rounded shadow-sm hover:bg-surface-50">
            <HiOutlineCog className="w-4 h-4" /> Settings
          </button>
          <button onClick={(e) => handleSave(e, true)} disabled={saving} className="text-[13px] font-bold text-surface-600 px-4 py-1.5 border border-surface-200 rounded shadow-sm hover:bg-surface-50 disabled:opacity-50">
            Save & New
          </button>
          <button 
            onClick={(e) => handleSave(e, false)} 
            disabled={saving}
            className="text-[13px] font-bold text-white px-6 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] rounded shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && <div className="m-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>}

      <div className="p-6">
        {/* ── Top Section: Party & Meta ── */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-8">
          
          {/* Bill To Box */}
          <div className="w-full lg:w-96 relative">
            <label className="block text-[13px] font-bold text-surface-700 mb-2">Bill To</label>
            {!selectedCustomer ? (
              <div 
                onClick={() => setShowPartyDropdown(true)}
                className="w-full h-24 border-2 border-dashed border-blue-300 bg-blue-50/50 rounded flex items-center justify-center cursor-pointer hover:bg-blue-50 text-blue-600 font-bold text-[14px]"
              >
                + Add Party
              </div>
            ) : (
              <div className="w-full min-h-[96px] border border-surface-200 rounded p-4 relative group">
                <div className="font-bold text-[15px] text-surface-800">{selectedCustomer.name}</div>
                {selectedCustomer.phone && <div className="text-[12px] text-surface-500 mt-1">{selectedCustomer.phone}</div>}
                <button 
                  onClick={() => { setCustomerId(''); setShowPartyDropdown(true); }}
                  className="absolute top-2 right-2 text-surface-400 hover:text-red-500 transition-opacity"
                >
                  Edit
                </button>
              </div>
            )}

            {/* Custom Party Dropdown */}
            {showPartyDropdown && (
              <div className="absolute top-[30px] left-0 w-[400px] bg-white border border-[#8b5cf6] rounded-md shadow-2xl z-50 overflow-hidden">
                <div className="p-2 border-b border-[#8b5cf6]">
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Search party by name or number" 
                    value={partySearch}
                    onChange={e => setPartySearch(e.target.value)}
                    className="w-full outline-none text-[13px] p-1"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {customers.filter(c => c.name.toLowerCase().includes(partySearch.toLowerCase())).map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => { setCustomerId(c.id); setShowPartyDropdown(false); setPartySearch(''); }}
                      className="flex flex-col px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-surface-100"
                    >
                      <span className="font-medium text-surface-800 text-[13px]">{c.name}</span>
                      {c.phone && <span className="text-surface-500 text-[11px]">{c.phone}</span>}
                    </div>
                  ))}
                  {customers.length === 0 && <div className="p-4 text-center text-sm text-surface-500">No parties found</div>}
                </div>
              </div>
            )}
          </div>

          {/* Right Meta Grid */}
          <div className="w-full lg:w-auto">
            <div className="flex gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-medium text-surface-500 mb-1">Return No:</label>
                <input 
                  value={returnNo} onChange={e => setReturnNo(e.target.value)}
                  className="w-32 px-3 py-1.5 border border-surface-200 rounded text-[13px] bg-surface-50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-surface-500 mb-1">Return Date:</label>
                <input 
                  type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-36 px-3 py-1.5 border border-surface-200 rounded text-[13px]"
                />
              </div>
            </div>
            <div className="flex gap-4 relative">
              <div className="w-full">
                <label className="block text-[11px] font-medium text-surface-500 mb-1">Link to Original Invoice:</label>
                <div
                  onClick={() => setShowBillDropdown(!showBillDropdown)}
                  className="w-full px-3 py-1.5 bg-white border border-surface-200 rounded text-[13px] cursor-pointer flex justify-between items-center"
                >
                  <span className="truncate">{originalBillId ? bills.find(b => b.id === originalBillId)?.bill_no : '-- Select Invoice --'}</span>
                  <span className="text-surface-400 text-xs">▼</span>
                </div>
                {showBillDropdown && (
                  <div className="absolute top-full right-0 w-80 mt-1 bg-white border border-[#8b5cf6] rounded-md shadow-xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-[#8b5cf6]">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search invoices..."
                        value={billSearch}
                        onChange={e => setBillSearch(e.target.value)}
                        className="w-full outline-none text-[13px] p-1"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <div onClick={() => { handleBillSelect(''); setShowBillDropdown(false); }} className="px-4 py-2 hover:bg-surface-50 cursor-pointer text-[12px] text-surface-500">
                        -- Clear --
                      </div>
                      {bills.filter(b => b.bill_no.toLowerCase().includes(billSearch.toLowerCase())).map(b => (
                        <div
                          key={b.id}
                          onClick={() => { handleBillSelect(b.id); setShowBillDropdown(false); setBillSearch(''); }}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-surface-100 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium text-surface-800 text-[13px]">{b.bill_no}</div>
                            <div className="text-[11px] text-surface-500">{b.customers?.name || 'Unknown'}</div>
                          </div>
                          <div className="font-bold text-surface-700 text-[12px]">₹ {b.grand_total}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Middle Section: Items Table ── */}
        <div className="border border-surface-200 rounded mb-8">
          <table className="w-full text-left">
            <thead className="bg-[#f9fafb] border-b border-surface-200 text-[11px] font-bold text-surface-500">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">NO</th>
                <th className="py-2.5 px-3">ITEMS/ SERVICES</th>
                <th className="py-2.5 px-3 w-24">HSN/ SAC</th>
                <th className="py-2.5 px-3 w-20 text-right">RETURN QTY</th>
                <th className="py-2.5 px-3 w-28 text-right">PRICE/ ITEM (₹)</th>
                <th className="py-2.5 px-3 w-24 text-right">DISCOUNT</th>
                <th className="py-2.5 px-3 w-24 text-right">TAX</th>
                <th className="py-2.5 px-3 w-28 text-right">AMOUNT (₹)</th>
                <th className="py-2.5 px-3 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-surface-100 last:border-0 hover:bg-surface-50 group">
                  <td className="py-2 px-3 text-center text-[13px] text-surface-500">{idx + 1}</td>
                  <td className="py-2 px-3 relative">
                    <input 
                      type="text" 
                      placeholder="Type item name..."
                      value={item.name}
                      onChange={e => updateItem(idx, 'name', e.target.value)}
                      className="w-full bg-transparent text-[13px] outline-none font-medium text-surface-800 placeholder-surface-300"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input 
                      type="text" value={item.hsn || ''} onChange={e => updateItem(idx, 'hsn', e.target.value)}
                      className="w-full bg-transparent text-[13px] outline-none text-surface-800"
                    />
                  </td>
                  <td className="py-2 px-3 relative">
                    <input 
                      type="number" min="1" max={item.original_qty || 9999}
                      value={item.qty || ''} onChange={e => updateItem(idx, 'qty', e.target.value)}
                      className="w-full bg-transparent text-[13px] outline-none text-right font-medium text-surface-800"
                    />
                    {item.original_qty > 0 && <span className="absolute -bottom-3 right-3 text-[9px] text-surface-400">Max: {item.original_qty}</span>}
                  </td>
                  <td className="py-2 px-3">
                    <input 
                      type="number" value={item.price || ''} onChange={e => updateItem(idx, 'price', e.target.value)}
                      className="w-full bg-transparent text-[13px] outline-none text-right text-surface-800"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input 
                      type="number" value={item.discount || ''} onChange={e => updateItem(idx, 'discount', e.target.value)}
                      className="w-full bg-transparent text-[13px] outline-none text-right text-surface-800"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-end">
                      <input 
                        type="number" value={item.tax || ''} onChange={e => updateItem(idx, 'tax', e.target.value)}
                        className="w-12 bg-transparent text-[13px] outline-none text-right text-surface-800"
                      />
                      <span className="text-[12px] text-surface-400 ml-1">%</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right text-[13px] font-bold text-surface-800">
                    {Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button 
                      onClick={() => removeItem(idx)} 
                      className="text-surface-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center p-2 bg-[#f9fafb] border-t border-surface-200">
            <button 
              onClick={addItemRow}
              className="flex items-center gap-1 text-[12px] font-bold text-blue-600 px-3 py-1.5 hover:bg-blue-50 rounded transition-colors"
            >
              <HiOutlinePlus className="w-3.5 h-3.5" /> ADD ROW
            </button>
          </div>
        </div>

        {/* ── Bottom Section ── */}
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-[12px] font-bold text-surface-600 mb-1 flex items-center gap-1 cursor-pointer hover:text-surface-800 w-max">
                <HiOutlinePlus className="w-3.5 h-3.5" /> Add Notes
              </label>
              <textarea 
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Return reason or remarks..."
                className="w-full p-3 border border-surface-200 rounded text-[13px] bg-surface-50 focus:bg-white outline-none focus:border-blue-300 resize-none"
                rows="3"
              />
            </div>
          </div>

          <div className="w-full lg:w-80">
            <div className="bg-surface-50 rounded border border-surface-200 p-4 space-y-3">
              <div className="flex justify-between items-center text-[13px] text-surface-700">
                <span>Subtotal</span>
                <span className="font-medium">₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="flex justify-between items-center text-[12px] text-blue-600 group">
                <span className="flex items-center gap-1 cursor-pointer font-medium hover:underline"><HiOutlinePlus className="w-3.5 h-3.5" /> Additional Charges</span>
                <div className="flex items-center">
                  <span>₹</span>
                  <input 
                    type="number" value={additionalCharges} onChange={e => setAdditionalCharges(e.target.value)}
                    className="w-16 bg-transparent outline-none text-right font-medium border-b border-transparent group-hover:border-blue-200 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[12px] text-blue-600 group">
                <span className="flex items-center gap-1 cursor-pointer font-medium hover:underline"><HiOutlinePlus className="w-3.5 h-3.5" /> Discount</span>
                <div className="flex items-center">
                  <span>₹</span>
                  <input 
                    type="number" value={overallDiscount} onChange={e => setOverallDiscount(e.target.value)}
                    className="w-16 bg-transparent outline-none text-right font-medium border-b border-transparent group-hover:border-blue-200 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[12px]">
                <label className="flex items-center gap-2 text-surface-600 cursor-pointer">
                  <input type="checkbox" checked={autoRoundOff} onChange={e => setAutoRoundOff(e.target.checked)} className="rounded" />
                  Auto Round Off
                </label>
                <div className="text-surface-500 font-medium">{roundOffAmt > 0 ? '+' : ''}{roundOffAmt.toFixed(2)}</div>
              </div>

              <div className="pt-3 border-t border-surface-200 flex justify-between items-center">
                <span className="text-[14px] font-bold text-surface-800">Total Return</span>
                <span className="text-[18px] font-black text-surface-900">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="pt-3 mt-1 border-t border-surface-200">
                <div className="flex justify-end mb-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-surface-500 cursor-pointer select-none hover:text-surface-700">
                    <input type="checkbox" checked={isFullyRefunded} onChange={e => setIsFullyRefunded(e.target.checked)} className="rounded" />
                    Mark fully refunded
                  </label>
                </div>
                <div className="flex justify-between items-center text-[13px] font-bold text-surface-700 mb-1">
                  <span>Amount Refunded</span>
                  <select className="bg-transparent text-[11px] font-medium text-surface-500 outline-none cursor-pointer">
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Bank</option>
                  </select>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    value={effectiveRefunded} onChange={e => setAmountRefunded(e.target.value)}
                    disabled={isFullyRefunded}
                    className="w-full pl-7 pr-3 py-1.5 border border-surface-200 rounded text-[14px] font-bold text-surface-900 outline-none focus:border-blue-400 disabled:opacity-50"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// List Component`;

const newFile = file.replace(/return \(\s+<div className="animate-fade-in w-full">([\s\S]*?)  \);\n\}\n\n\/\/ List Component/, newJSX);

if (newFile === file) {
    console.error("Replacement failed.");
    process.exit(1);
}

fs.writeFileSync('src/pages/sales/SaleReturn.jsx', newFile);
console.log('SaleReturnForm patched successfully.');
