import React from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoiceTemplate({ bill, shop, settings }) {
  if (!bill || !settings) return null;

  const themeId = settings.invoice_theme || 'standard';
  const isA5 = themeId.includes('a5');
  const accent = settings.invoice_color || '#000000';

  // "In A5 the remaining blank page will not be shown and in a4 layout the whole page will be coverered"
  // A5 Landscape is 210mm wide x 148mm high. A4 Portrait is 210mm wide x 297mm high.
  // Both share the exact same width!
  const pageStyle = {
    width: '210mm',
    minHeight: isA5 ? 'auto' : '297mm',
    margin: '0 auto',
    backgroundColor: '#fff',
    fontFamily: 'sans-serif',
    position: 'relative',
    color: '#000',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  };

  const PrintStyles = () => (
    <style>
      {`
        @media print {
          @page {
            size: ${isA5 ? 'A5 landscape' : 'A4 portrait'};
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}
    </style>
  );

  // Group themes into Master Layouts
  if (themeId.includes('luxury')) {
    return <div className="invoice-page" style={pageStyle}><PrintStyles /><LuxuryLayout bill={bill} shop={shop} s={settings} accent={accent} isA5={isA5} /></div>;
  }
  if (themeId.includes('stylish')) {
    return <div className="invoice-page" style={pageStyle}><PrintStyles /><StylishLayout bill={bill} shop={shop} s={settings} accent={accent} isA5={isA5} /></div>;
  }
  if (themeId.includes('modern')) {
    return <div className="invoice-page" style={pageStyle}><PrintStyles /><ModernLayout bill={bill} shop={shop} s={settings} accent={accent} isA5={isA5} /></div>;
  }
  if (themeId.includes('tally') || themeId.includes('advanced')) {
    return <div className="invoice-page" style={pageStyle}><PrintStyles /><TallyLayout bill={bill} shop={shop} s={settings} accent={accent} isA5={isA5} /></div>;
  }
  if (themeId.includes('simple')) {
    return <div className="invoice-page" style={pageStyle}><PrintStyles /><SimpleLayout bill={bill} shop={shop} s={settings} accent={accent} isA5={isA5} /></div>;
  }

  // Fallback to Standard
  return (
    <div className="invoice-page" style={pageStyle}>
      <PrintStyles />
      <StandardLayout bill={bill} shop={shop} s={settings} accent={accent} isA5={isA5} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STANDARD LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
function StandardLayout({ bill, shop, s, isA5 }) {
  const pSize = isA5 ? 'text-[9px]' : 'text-[11px]';
  const hSize = isA5 ? 'text-lg' : 'text-2xl';

  return (
    <div className={`flex flex-col flex-1 ${isA5 ? 'p-3 m-2 border border-black' : 'p-6 m-4 border border-black'}`}>
      <div className="border-b border-black p-4 text-center bg-surface-50/50">
        <h1 className={`${hSize} font-bold uppercase`}>{shop?.shop_name || 'SHOP NAME'}</h1>
        <p className={`${pSize} mt-1`}>{shop?.address_line1}</p>
        {s.show_phone_on_invoice && <p className={`${pSize}`}>Ph: {shop?.phone}</p>}
        {shop?.gstin && <p className={`${pSize} font-bold mt-1`}>GSTIN: {shop.gstin}</p>}
      </div>

      <div className={`flex border-b border-black ${pSize}`}>
        <div className="flex-1 p-3 border-r border-black">
          <div className="font-bold uppercase text-surface-500 mb-1 text-[9px]">BILL TO</div>
          <div className="font-bold uppercase text-[12px]">{bill.party?.name || 'CASH'}</div>
          {s.inv_party_show_address && <div>{bill.party?.billing_address}</div>}
          {s.inv_party_show_mobile && <div>Mob: {bill.party?.mobile || bill.party?.phone}</div>}
          {s.inv_party_show_gstin && <div>GSTIN: {bill.party?.gstin}</div>}
        </div>
        <div className="w-1/3 flex flex-col">
          <div className="flex border-b border-black flex-1">
            <div className="flex-1 p-2 border-r border-black font-bold">Invoice No:</div>
            <div className="flex-1 p-2 font-bold">{bill.bill_no}</div>
          </div>
          <div className="flex flex-1 bg-surface-50/30">
            <div className="flex-1 p-2 border-r border-black font-bold">Date:</div>
            <div className="flex-1 p-2">{bill.date}</div>
          </div>
        </div>
      </div>

      {(s.show_po_number || s.show_eway_number || s.show_vehicle_number) && (
        <div className={`flex border-b border-black bg-surface-50/50 ${pSize}`}>
          {s.show_po_number && <div className="flex-1 p-2 border-r border-black"><span className="font-bold">PO:</span> {bill.po_number || '—'}</div>}
          {s.show_eway_number && <div className="flex-1 p-2 border-r border-black"><span className="font-bold">E-way:</span> {bill.eway_number || '—'}</div>}
          {s.show_vehicle_number && <div className="flex-1 p-2"><span className="font-bold">Vehicle:</span> {bill.vehicle_number || '—'}</div>}
        </div>
      )}

      <div className="flex-1 flex flex-col relative">
        <table className={`w-full ${pSize} h-full`}>
          <thead>
            <tr className="border-b border-black font-bold bg-surface-50">
              <th className="p-2 border-r border-black w-8 text-center">#</th>
              <th className="p-2 border-r border-black text-left">ITEMS</th>
              {s.inv_col_show_qty && <th className="p-2 border-r border-black text-right w-16">QTY</th>}
              {s.inv_col_show_price && <th className="p-2 border-r border-black text-right w-20">RATE</th>}
              {s.inv_col_show_discount && <th className="p-2 border-r border-black text-right w-16">DISC</th>}
              {s.inv_col_show_tax && <th className="p-2 border-r border-black text-right w-16">TAX</th>}
              <th className="p-2 text-right w-24">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {(bill.items || []).map((item, i) => (
              <tr key={i}>
                <td className="p-2 border-r border-black text-center align-top">{i + 1}</td>
                <td className="p-2 border-r border-black align-top font-bold">
                  {item.name}
                  {s.show_item_description && <div className="text-[9px] text-surface-500 mt-0.5 font-normal">Item Description</div>}
                </td>
                {s.inv_col_show_qty && <td className="p-2 border-r border-black text-right align-top">{item.qty} <span className="text-[8px] text-surface-500">{item.unit}</span></td>}
                {s.inv_col_show_price && <td className="p-2 border-r border-black text-right align-top">{fmt(item.price)}</td>}
                {s.inv_col_show_discount && <td className="p-2 border-r border-black text-right align-top">{fmt(item.discount)}</td>}
                {s.inv_col_show_tax && <td className="p-2 border-r border-black text-right align-top">{fmt(item.tax)}%</td>}
                <td className="p-2 text-right align-top font-bold">{fmt(item.total)}</td>
              </tr>
            ))}
            {/* Filler Row for A4 only to push footer down */}
            {!isA5 && (
              <tr className="h-full">
                <td className="border-r border-black h-full min-h-[100px]"></td>
                <td className="border-r border-black"></td>
                {s.inv_col_show_qty && <td className="border-r border-black"></td>}
                {s.inv_col_show_price && <td className="border-r border-black"></td>}
                {s.inv_col_show_discount && <td className="border-r border-black"></td>}
                {s.inv_col_show_tax && <td className="border-r border-black"></td>}
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer Top Border applied manually since table body might not end perfectly at bottom if short */}
      <div className="border-t border-black"></div>

      <div className={`flex border-b border-black font-bold bg-surface-50/80 ${pSize}`}>
        <div className="flex-1 p-2 border-r border-black flex justify-between">
          <span className="uppercase tracking-wider">Total Quantity: {(bill.items || []).reduce((a, b) => a + Number(b.qty), 0)}</span>
          <span className="uppercase tracking-wider">Subtotal: {fmt(bill.subtotal)}</span>
        </div>
        <div className="w-48 p-2 flex justify-between text-[13px]">
          <span>GRAND TOTAL</span>
          <span>{fmt(bill.grand_total)}</span>
        </div>
      </div>

      <div className={`flex border-b border-black font-bold ${pSize}`}>
        {s.show_received_amount && <div className="flex-1 p-3 border-r border-black text-surface-600">Received: <span className="text-black">₹ {fmt(bill.advance_paid)}</span></div>}
        {s.show_balance_amount && <div className="flex-1 p-3 text-surface-600">Balance: <span className="text-black">₹ {fmt(bill.balance_due)}</span></div>}
      </div>

      {bill.notes && <div className={`p-3 border-b border-black ${pSize}`}><span className="font-bold">Notes: </span>{bill.notes}</div>}

      <div className="flex flex-1 min-h-[100px] bg-surface-50/20">
        {s.show_terms && (
          <div className={`flex-1 p-3 border-r border-black ${pSize}`}>
            <div className="font-bold mb-1 uppercase tracking-wider text-[9px] text-surface-500">Terms & Conditions</div>
            <div className="text-surface-700 whitespace-pre-wrap">{s.default_bill_notes || '1. Goods once sold cannot be returned.'}</div>
          </div>
        )}
        <div className="w-48 p-3 flex flex-col items-center justify-end">
          {s.show_signature && shop?.signature_url && <img src={shop.signature_url} alt="sig" className="h-12 object-contain mb-2" />}
          {s.show_signature && <div className={`border-t border-black w-[80%] text-center pt-1 font-bold ${pSize}`}>Authorized Signatory</div>}
        </div>
      </div>

      {/* Bottom Border / Footer space */}
      <div className="h-2 w-full bg-[#f9fafb]"></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LUXURY LAYOUT (Colored Box Header)
// ─────────────────────────────────────────────────────────────────────────────
function LuxuryLayout({ bill, shop, s, accent, isA5 }) {
  const pSize = isA5 ? 'text-[9px]' : 'text-[11px]';
  const hSize = isA5 ? 'text-xl' : 'text-3xl';
  
  return (
    <div className={`flex flex-col flex-1 bg-white ${isA5 ? 'p-3' : 'p-8'}`}>
      
      {/* Luxury Colored Header */}
      <div className={`flex justify-between items-center p-6 rounded-xl shadow-lg mb-6`} style={{ backgroundColor: accent, color: '#fff' }}>
        <div>
          <h1 className={`${hSize} font-black uppercase tracking-tight`}>{shop?.shop_name || 'SHOP NAME'}</h1>
          <p className={`${pSize} mt-1 opacity-90`}>{shop?.address_line1}</p>
          {s.show_phone_on_invoice && <p className={`${pSize} opacity-90`}>Ph: {shop?.phone}</p>}
          {shop?.gstin && <p className={`${pSize} font-bold mt-1 opacity-90`}>GSTIN: {shop.gstin}</p>}
        </div>
        <div className="text-right">
          <div className="text-[12px] font-bold tracking-widest uppercase opacity-70 mb-1">INVOICE</div>
          <div className="text-2xl font-black tracking-wider">{bill.bill_no}</div>
          <div className={`${pSize} mt-1 font-medium bg-white/20 px-3 py-1 rounded-full inline-block`}>Date: {bill.date}</div>
        </div>
      </div>

      <div className="flex gap-8 mb-6">
        <div className="flex-1">
          <div className={`font-bold uppercase tracking-widest text-surface-400 mb-2 ${isA5 ? 'text-[8px]' : 'text-[10px]'}`} style={{ color: accent }}>BILLED TO</div>
          <div className={`font-black ${pSize} text-lg`}>{bill.party?.name || 'CASH'}</div>
          {s.inv_party_show_address && <div className={`${pSize} text-surface-600 mt-1`}>{bill.party?.billing_address}</div>}
          {s.inv_party_show_mobile && <div className={`${pSize} text-surface-600 mt-0.5`}>Mob: {bill.party?.mobile || bill.party?.phone}</div>}
          {s.inv_party_show_gstin && <div className={`${pSize} text-surface-600 mt-0.5 font-bold`}>GSTIN: {bill.party?.gstin}</div>}
        </div>
        {(s.show_po_number || s.show_eway_number || s.show_vehicle_number) && (
          <div className="w-1/3 bg-surface-50 p-4 rounded-xl border border-surface-100">
            {s.show_po_number && <div className={`flex justify-between ${pSize} mb-1.5`}><span className="text-surface-500 font-medium">PO No:</span> <span className="font-bold">{bill.po_number || '—'}</span></div>}
            {s.show_eway_number && <div className={`flex justify-between ${pSize} mb-1.5`}><span className="text-surface-500 font-medium">E-way:</span> <span className="font-bold">{bill.eway_number || '—'}</span></div>}
            {s.show_vehicle_number && <div className={`flex justify-between ${pSize}`}><span className="text-surface-500 font-medium">Vehicle:</span> <span className="font-bold">{bill.vehicle_number || '—'}</span></div>}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <table className={`w-full ${pSize}`}>
          <thead>
            <tr className="border-b-2" style={{ borderColor: accent, color: accent }}>
              <th className="py-3 px-2 text-left w-8 font-black">#</th>
              <th className="py-3 px-2 text-left font-black">ITEM DESCRIPTION</th>
              {s.inv_col_show_qty && <th className="py-3 px-2 text-right font-black">QTY</th>}
              {s.inv_col_show_price && <th className="py-3 px-2 text-right font-black">RATE</th>}
              {s.inv_col_show_discount && <th className="py-3 px-2 text-right font-black">DISC</th>}
              {s.inv_col_show_tax && <th className="py-3 px-2 text-right font-black">TAX</th>}
              <th className="py-3 px-2 text-right font-black">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {(bill.items || []).map((item, i) => (
              <tr key={i} className="border-b border-surface-100/50">
                <td className="py-4 px-2 text-surface-400 font-bold align-top">{String(i + 1).padStart(2, '0')}</td>
                <td className="py-4 px-2 align-top">
                  <div className="font-bold text-surface-900 text-[13px]">{item.name}</div>
                  {s.show_item_description && <div className="text-surface-400 mt-1 text-[10px]">Description note here</div>}
                </td>
                {s.inv_col_show_qty && <td className="py-4 px-2 text-right align-top font-medium">{item.qty} <span className="text-surface-400 text-[9px]">{item.unit}</span></td>}
                {s.inv_col_show_price && <td className="py-4 px-2 text-right align-top font-medium">{fmt(item.price)}</td>}
                {s.inv_col_show_discount && <td className="py-4 px-2 text-right align-top font-medium text-rose-500">{fmt(item.discount)}</td>}
                {s.inv_col_show_tax && <td className="py-4 px-2 text-right align-top font-medium">{fmt(item.tax)}%</td>}
                <td className="py-4 px-2 text-right align-top font-black text-surface-900">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-8 mt-8">
        <div className="flex-1 flex flex-col justify-end">
          {bill.notes && <div className={`mb-4 ${pSize}`}><span className="font-bold block mb-1 uppercase tracking-widest text-[10px]" style={{ color: accent }}>Notes</span><span className="text-surface-600 font-medium">{bill.notes}</span></div>}
          {s.show_terms && (
            <div className={pSize}>
              <div className="font-bold block mb-1 uppercase tracking-widest text-[10px]" style={{ color: accent }}>Terms & Conditions</div>
              <div className="text-surface-500 whitespace-pre-wrap leading-relaxed">{s.default_bill_notes || '1. Goods once sold cannot be returned.'}</div>
            </div>
          )}
        </div>

        <div className="w-72 bg-surface-50 rounded-2xl p-6 shadow-sm border border-surface-100">
          <div className={`flex justify-between mb-3 ${pSize} font-bold`}>
            <span className="text-surface-500">Subtotal</span>
            <span className="text-surface-900">{fmt(bill.subtotal)}</span>
          </div>
          <div className={`flex justify-between items-center ${isA5 ? 'text-lg' : 'text-2xl'} font-black mt-4 pt-4 border-t-2 border-surface-200`} style={{ color: accent }}>
            <span>TOTAL</span>
            <span>₹ {fmt(bill.grand_total)}</span>
          </div>
          {s.show_received_amount && (
            <div className={`flex justify-between mt-4 pt-4 border-t border-surface-100 ${pSize} font-bold text-emerald-600`}>
              <span>Received</span>
              <span>₹ {fmt(bill.advance_paid)}</span>
            </div>
          )}
          {s.show_balance_amount && (
            <div className={`flex justify-between mt-2 ${pSize} font-bold text-rose-600`}>
              <span>Balance</span>
              <span>₹ {fmt(bill.balance_due)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <div className="w-56 flex flex-col items-center">
          {s.show_signature && shop?.signature_url && <img src={shop.signature_url} alt="sig" className="h-14 object-contain mb-3" />}
          {s.show_signature && <div className={`border-t-2 border-surface-200 w-full text-center pt-2 font-bold text-surface-400 ${pSize} tracking-widest uppercase`}>Authorized Signatory</div>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STYLISH LAYOUT (Accent borders, alternate row backgrounds)
// ─────────────────────────────────────────────────────────────────────────────
function StylishLayout({ bill, shop, s, accent, isA5 }) {
  const pSize = isA5 ? 'text-[9px]' : 'text-[11px]';
  const hSize = isA5 ? 'text-xl' : 'text-3xl';
  
  return (
    <div className={`flex flex-col flex-1 bg-white ${isA5 ? 'p-4' : 'p-10'} border-t-[12px]`} style={{ borderColor: accent }}>
      
      <div className="flex justify-between items-end pb-6 border-b-2" style={{ borderColor: accent }}>
        <div>
          <h1 className={`${hSize} font-black uppercase tracking-wider text-surface-900`}>{shop?.shop_name || 'SHOP NAME'}</h1>
          <p className={`${pSize} mt-2 text-surface-600 font-medium`}>{shop?.address_line1}</p>
          {s.show_phone_on_invoice && <p className={`${pSize} text-surface-600 font-medium`}>Ph: {shop?.phone}</p>}
          {shop?.gstin && <p className={`${pSize} font-bold mt-1`} style={{ color: accent }}>GSTIN: {shop.gstin}</p>}
        </div>
        <div className="text-right border-l-4 pl-6" style={{ borderColor: accent }}>
          <div className="text-2xl font-black uppercase tracking-widest text-surface-900">INVOICE</div>
          <div className="text-lg font-bold text-surface-500 mt-1">#{bill.bill_no}</div>
          <div className={`${pSize} mt-2 font-bold text-surface-400 uppercase tracking-wider`}>Date: <span className="text-surface-800">{bill.date}</span></div>
        </div>
      </div>

      <div className="flex gap-8 py-6">
        <div className="flex-1 bg-surface-50 p-4 rounded-r-xl border-l-4" style={{ borderColor: accent }}>
          <div className={`font-bold uppercase tracking-widest text-surface-400 mb-2 ${isA5 ? 'text-[8px]' : 'text-[10px]'}`}>BILL TO</div>
          <div className={`font-black ${pSize} text-lg text-surface-900`}>{bill.party?.name || 'CASH'}</div>
          {s.inv_party_show_address && <div className={`${pSize} text-surface-600 mt-1 font-medium`}>{bill.party?.billing_address}</div>}
          {s.inv_party_show_mobile && <div className={`${pSize} text-surface-600 mt-0.5 font-medium`}>Mob: {bill.party?.mobile || bill.party?.phone}</div>}
          {s.inv_party_show_gstin && <div className={`${pSize} text-surface-600 mt-1 font-bold`}>GSTIN: {bill.party?.gstin}</div>}
        </div>
        {(s.show_po_number || s.show_eway_number || s.show_vehicle_number) && (
          <div className="w-1/3 flex flex-col justify-center gap-2">
            {s.show_po_number && <div className={`flex justify-between ${pSize} border-b border-surface-100 pb-1`}><span className="text-surface-400 uppercase tracking-widest font-bold text-[9px]">PO No</span> <span className="font-bold">{bill.po_number || '—'}</span></div>}
            {s.show_eway_number && <div className={`flex justify-between ${pSize} border-b border-surface-100 pb-1`}><span className="text-surface-400 uppercase tracking-widest font-bold text-[9px]">E-way</span> <span className="font-bold">{bill.eway_number || '—'}</span></div>}
            {s.show_vehicle_number && <div className={`flex justify-between ${pSize}`}><span className="text-surface-400 uppercase tracking-widest font-bold text-[9px]">Vehicle</span> <span className="font-bold">{bill.vehicle_number || '—'}</span></div>}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <table className={`w-full ${pSize}`}>
          <thead>
            <tr style={{ backgroundColor: accent, color: '#fff' }}>
              <th className="py-3 px-3 text-left w-8 font-bold rounded-l-lg">#</th>
              <th className="py-3 px-3 text-left font-bold">ITEM DESCRIPTION</th>
              {s.inv_col_show_qty && <th className="py-3 px-3 text-right font-bold">QTY</th>}
              {s.inv_col_show_price && <th className="py-3 px-3 text-right font-bold">RATE</th>}
              {s.inv_col_show_discount && <th className="py-3 px-3 text-right font-bold">DISC</th>}
              {s.inv_col_show_tax && <th className="py-3 px-3 text-right font-bold">TAX</th>}
              <th className="py-3 px-3 text-right font-bold rounded-r-lg">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {(bill.items || []).map((item, i) => (
              <tr key={i} style={i % 2 !== 0 ? { backgroundColor: accent + '08' } : {}}>
                <td className="py-3 px-3 text-surface-500 font-bold align-top border-b border-surface-50">{String(i + 1).padStart(2, '0')}</td>
                <td className="py-3 px-3 align-top border-b border-surface-50">
                  <div className="font-bold text-surface-900">{item.name}</div>
                </td>
                {s.inv_col_show_qty && <td className="py-3 px-3 text-right align-top font-medium border-b border-surface-50">{item.qty} {item.unit}</td>}
                {s.inv_col_show_price && <td className="py-3 px-3 text-right align-top font-medium border-b border-surface-50">{fmt(item.price)}</td>}
                {s.inv_col_show_discount && <td className="py-3 px-3 text-right align-top font-medium border-b border-surface-50">{fmt(item.discount)}</td>}
                {s.inv_col_show_tax && <td className="py-3 px-3 text-right align-top font-medium border-b border-surface-50">{fmt(item.tax)}%</td>}
                <td className="py-3 px-3 text-right align-top font-black text-surface-900 border-b border-surface-50">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex mt-8 border-t-2 pt-6" style={{ borderColor: accent }}>
        <div className="flex-1 pr-8">
          {bill.notes && <div className={`mb-4 ${pSize}`}><span className="font-bold block mb-1 uppercase tracking-widest text-[9px]" style={{ color: accent }}>Notes</span><span className="text-surface-700">{bill.notes}</span></div>}
          {s.show_terms && (
            <div className={pSize}>
              <div className="font-bold block mb-1 uppercase tracking-widest text-[9px]" style={{ color: accent }}>Terms & Conditions</div>
              <div className="text-surface-500 whitespace-pre-wrap">{s.default_bill_notes || '1. Goods once sold cannot be returned.'}</div>
            </div>
          )}
        </div>

        <div className="w-64">
          <div className={`flex justify-between mb-2 ${pSize} font-bold text-surface-600`}>
            <span>Subtotal</span>
            <span>{fmt(bill.subtotal)}</span>
          </div>
          <div className={`flex justify-between items-center ${isA5 ? 'text-xl' : 'text-3xl'} font-black mt-4`} style={{ color: accent }}>
            <span>TOTAL</span>
            <span>₹{fmt(bill.grand_total)}</span>
          </div>
          {s.show_received_amount && (
            <div className={`flex justify-between mt-4 ${pSize} font-bold text-surface-500`}>
              <span>Received</span>
              <span className="text-emerald-600">₹ {fmt(bill.advance_paid)}</span>
            </div>
          )}
          {s.show_balance_amount && (
            <div className={`flex justify-between mt-1 ${pSize} font-bold text-surface-500`}>
              <span>Balance</span>
              <span className="text-rose-600">₹ {fmt(bill.balance_due)}</span>
            </div>
          )}
          
          <div className="mt-8 flex flex-col items-end">
            {s.show_signature && shop?.signature_url && <img src={shop.signature_url} alt="sig" className="h-12 object-contain mb-2" />}
            {s.show_signature && <div className={`w-[80%] text-right font-bold text-surface-400 ${pSize} uppercase`}>Authorized Signatory</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MODERN LAYOUT (Ultra Minimalist)
// ─────────────────────────────────────────────────────────────────────────────
function ModernLayout({ bill, shop, s, accent, isA5 }) {
  const pSize = isA5 ? 'text-[9px]' : 'text-[11px]';
  const hSize = isA5 ? 'text-2xl' : 'text-4xl';
  
  return (
    <div className={`flex flex-col flex-1 bg-white ${isA5 ? 'p-6' : 'p-12'}`}>
      
      <div className="flex justify-between items-start mb-12">
        <div className="text-left">
          <div className={`font-medium tracking-[0.2em] text-surface-400 uppercase ${isA5 ? 'text-[8px] mb-2' : 'text-[10px] mb-4'}`}>INVOICE #{bill.bill_no}</div>
          <h1 className={`${hSize} font-light tracking-tight text-surface-900`}>{shop?.shop_name || 'SHOP NAME'}</h1>
          <p className={`${pSize} mt-3 text-surface-500 font-light`}>{shop?.address_line1}</p>
          {s.show_phone_on_invoice && <p className={`${pSize} text-surface-500 font-light mt-1`}>Ph: {shop?.phone}</p>}
          {shop?.gstin && <p className={`${pSize} font-medium mt-2 text-surface-800`}>GSTIN: {shop.gstin}</p>}
        </div>
        <div className="text-right flex flex-col items-end">
          {shop?.logo_url && <img src={shop.logo_url} alt="Logo" className="w-16 h-16 object-contain opacity-80 grayscale" />}
          <div className={`${pSize} mt-4 text-surface-400 uppercase tracking-widest`}>{bill.date}</div>
        </div>
      </div>

      <div className="flex gap-12 mb-12">
        <div className="flex-1">
          <div className={`font-medium uppercase tracking-[0.2em] text-surface-300 mb-4 ${isA5 ? 'text-[8px]' : 'text-[10px]'}`}>BILLED TO</div>
          <div className={`font-normal ${pSize} text-lg text-surface-800`}>{bill.party?.name || 'CASH'}</div>
          {s.inv_party_show_address && <div className={`${pSize} text-surface-400 mt-2 font-light`}>{bill.party?.billing_address}</div>}
          {s.inv_party_show_mobile && <div className={`${pSize} text-surface-400 mt-1 font-light`}>Mob: {bill.party?.mobile || bill.party?.phone}</div>}
          {s.inv_party_show_gstin && <div className={`${pSize} text-surface-800 mt-2 font-medium`}>GSTIN: {bill.party?.gstin}</div>}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <table className={`w-full ${pSize}`}>
          <thead>
            <tr className="border-b border-surface-200">
              <th className="py-4 px-2 text-left font-medium text-surface-400 uppercase tracking-widest w-8">#</th>
              <th className="py-4 px-2 text-left font-medium text-surface-400 uppercase tracking-widest">ITEM</th>
              {s.inv_col_show_qty && <th className="py-4 px-2 text-right font-medium text-surface-400 uppercase tracking-widest">QTY</th>}
              {s.inv_col_show_price && <th className="py-4 px-2 text-right font-medium text-surface-400 uppercase tracking-widest">RATE</th>}
              {s.inv_col_show_discount && <th className="py-4 px-2 text-right font-medium text-surface-400 uppercase tracking-widest">DISC</th>}
              {s.inv_col_show_tax && <th className="py-4 px-2 text-right font-medium text-surface-400 uppercase tracking-widest">TAX</th>}
              <th className="py-4 px-2 text-right font-medium text-surface-400 uppercase tracking-widest">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {(bill.items || []).map((item, i) => (
              <tr key={i} className="border-b border-surface-50 group hover:bg-surface-50/50 transition-colors">
                <td className="py-4 px-2 text-surface-300 font-light align-top">{String(i + 1).padStart(2, '0')}</td>
                <td className="py-4 px-2 align-top">
                  <div className="font-medium text-surface-700">{item.name}</div>
                </td>
                {s.inv_col_show_qty && <td className="py-4 px-2 text-right align-top font-light text-surface-600">{item.qty} {item.unit}</td>}
                {s.inv_col_show_price && <td className="py-4 px-2 text-right align-top font-light text-surface-600">{fmt(item.price)}</td>}
                {s.inv_col_show_discount && <td className="py-4 px-2 text-right align-top font-light text-surface-600">{fmt(item.discount)}</td>}
                {s.inv_col_show_tax && <td className="py-4 px-2 text-right align-top font-light text-surface-600">{fmt(item.tax)}%</td>}
                <td className="py-4 px-2 text-right align-top font-medium text-surface-900">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex mt-12 pt-8 border-t border-surface-200">
        <div className="flex-1 pr-12">
          {s.show_terms && (
            <div className={pSize}>
              <div className="font-medium tracking-[0.2em] text-surface-300 uppercase mb-3 text-[9px]">Terms & Conditions</div>
              <div className="text-surface-400 font-light leading-relaxed">{s.default_bill_notes || 'Goods once sold cannot be returned.'}</div>
            </div>
          )}
        </div>

        <div className="w-64">
          <div className={`flex justify-between mb-4 ${pSize} font-light text-surface-500`}>
            <span>Subtotal</span>
            <span>{fmt(bill.subtotal)}</span>
          </div>
          <div className={`flex justify-between items-center ${isA5 ? 'text-2xl' : 'text-4xl'} font-light mt-6 mb-6 text-surface-900`}>
            <span className="text-surface-300 text-sm tracking-[0.2em] uppercase mr-4">TOTAL</span>
            <span>{fmt(bill.grand_total)}</span>
          </div>
          
          <div className="mt-12 flex flex-col items-end">
            {s.show_signature && shop?.signature_url && <img src={shop.signature_url} alt="sig" className="h-10 object-contain mb-4 opacity-50" />}
            {s.show_signature && <div className={`w-[80%] text-right font-medium text-surface-300 ${pSize} uppercase tracking-[0.2em]`}>SIGNATURE</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TALLY LAYOUT (Strict Grid / Taxation detailed)
// ─────────────────────────────────────────────────────────────────────────────
function TallyLayout({ bill, shop, s, isA5 }) {
  const pSize = isA5 ? 'text-[8px]' : 'text-[10px]';
  const hSize = isA5 ? 'text-sm' : 'text-lg';

  return (
    <div className={`flex flex-col flex-1 ${isA5 ? 'p-2' : 'p-6'}`}>
      <div className={`font-bold text-center mb-1 ${isA5 ? 'text-[10px]' : 'text-[12px]'}`}>TAX INVOICE</div>
      
      <div className="border-2 border-black flex flex-col flex-1">
        
        {/* Header Grid */}
        <div className="flex border-b-2 border-black">
          <div className="w-1/2 p-2 border-r-2 border-black flex flex-col justify-center">
            <h1 className={`${hSize} font-bold`}>{shop?.shop_name || 'SHOP NAME'}</h1>
            <p className={pSize}>{shop?.address_line1}</p>
            {s.show_phone_on_invoice && <p className={pSize}>Ph: {shop?.phone}</p>}
            {shop?.gstin && <p className={`${pSize} font-bold mt-1`}>GSTIN/UIN: {shop.gstin}</p>}
          </div>
          <div className="w-1/2 grid grid-cols-2">
            <div className={`p-2 border-r border-b border-black ${pSize}`}>
              <div className="text-surface-600">Invoice No.</div>
              <div className="font-bold">{bill.bill_no}</div>
            </div>
            <div className={`p-2 border-b border-black ${pSize}`}>
              <div className="text-surface-600">Dated</div>
              <div className="font-bold">{bill.date}</div>
            </div>
            <div className={`p-2 border-r border-black ${pSize}`}>
              <div className="text-surface-600">Supplier's Ref.</div>
              <div className="font-bold">{bill.po_number || '—'}</div>
            </div>
            <div className={`p-2 border-black ${pSize}`}>
              <div className="text-surface-600">Other Reference(s)</div>
              <div className="font-bold">{bill.eway_number || '—'}</div>
            </div>
          </div>
        </div>

        {/* Party Meta Grid */}
        <div className="flex border-b-2 border-black">
          <div className="w-1/2 p-2 border-r-2 border-black">
            <div className={`text-surface-600 ${pSize}`}>Buyer (Bill to)</div>
            <div className={`font-bold ${isA5 ? 'text-[10px]' : 'text-[12px]'}`}>{bill.party?.name || 'CASH'}</div>
            {s.inv_party_show_address && <div className={pSize}>{bill.party?.billing_address}</div>}
            {s.inv_party_show_mobile && <div className={pSize}>Mob: {bill.party?.mobile || bill.party?.phone}</div>}
            {s.inv_party_show_gstin && <div className={`${pSize} font-bold mt-1`}>GSTIN/UIN: {bill.party?.gstin}</div>}
          </div>
          <div className="w-1/2 grid grid-cols-2">
            <div className={`p-2 border-r border-b border-black ${pSize}`}>
              <div className="text-surface-600">Dispatch Doc No.</div>
              <div className="font-bold">—</div>
            </div>
            <div className={`p-2 border-b border-black ${pSize}`}>
              <div className="text-surface-600">Delivery Note Date</div>
              <div className="font-bold">—</div>
            </div>
            <div className={`p-2 border-r border-black ${pSize}`}>
              <div className="text-surface-600">Dispatched through</div>
              <div className="font-bold">—</div>
            </div>
            <div className={`p-2 border-black ${pSize}`}>
              <div className="text-surface-600">Destination</div>
              <div className="font-bold">—</div>
            </div>
          </div>
        </div>

        {/* Tally Items Table */}
        <div className="flex-1 flex flex-col border-b-2 border-black relative">
          <table className={`w-full ${pSize} h-full`}>
            <thead>
              <tr className="border-b-2 border-black font-bold">
                <th className="p-1 border-r border-black w-8 text-center">Sl No.</th>
                <th className="p-1 border-r border-black text-center">Description of Goods</th>
                <th className="p-1 border-r border-black text-center w-12">HSN/SAC</th>
                {s.inv_col_show_qty && <th className="p-1 border-r border-black text-center w-16">Quantity</th>}
                {s.inv_col_show_price && <th className="p-1 border-r border-black text-center w-16">Rate</th>}
                <th className="p-1 border-r border-black text-center w-10">per</th>
                <th className="p-1 text-center w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(bill.items || []).map((item, i) => (
                <tr key={i}>
                  <td className="p-1 border-r border-black text-center align-top">{i + 1}</td>
                  <td className="p-1 border-r border-black align-top font-bold">{item.name}</td>
                  <td className="p-1 border-r border-black text-center align-top">{item.hsn || ''}</td>
                  {s.inv_col_show_qty && <td className="p-1 border-r border-black text-right align-top font-bold">{item.qty} {item.unit}</td>}
                  {s.inv_col_show_price && <td className="p-1 border-r border-black text-right align-top">{fmt(item.price)}</td>}
                  <td className="p-1 border-r border-black text-center align-top">{item.unit}</td>
                  <td className="p-1 text-right align-top font-bold">{fmt(item.total)}</td>
                </tr>
              ))}
              {/* Filler row for Tally structure (A4 only stretches) */}
              {!isA5 && (
                <tr className="h-full">
                  <td className="border-r border-black h-full min-h-[120px]"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  {s.inv_col_show_qty && <td className="border-r border-black"></td>}
                  {s.inv_col_show_price && <td className="border-r border-black"></td>}
                  <td className="border-r border-black"></td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer Top Border applied manually */}
        <div className="border-t-2 border-black"></div>

        {/* Tally Subtotal Row */}
        <div className={`flex border-b-2 border-black font-bold ${pSize}`}>
           <div className="flex-1 text-right p-1 border-r border-black">Total</div>
           {s.inv_col_show_qty && <div className="w-16 text-right p-1 border-r border-black">{(bill.items || []).reduce((a, b) => a + Number(b.qty), 0)}</div>}
           <div className="w-[150px] text-right p-1 font-bold">₹ {fmt(bill.grand_total)}</div>
        </div>

        {/* Amount in words */}
        <div className={`p-2 border-b border-black ${pSize}`}>
          <div className="text-surface-600">Amount Chargeable (in words)</div>
          <div className="font-bold">Indian Rupees {bill.grand_total} Only</div>
        </div>

        {/* Footer info */}
        <div className="flex min-h-[100px]">
          <div className={`w-1/2 p-2 border-r-2 border-black ${pSize} flex flex-col justify-between`}>
            <div>
              <div className="underline mb-1 font-bold">Declaration</div>
              <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
            </div>
            {s.show_terms && (
              <div>
                <div className="underline mt-2 mb-1 font-bold">Company's Terms & Conditions</div>
                <div>{s.default_bill_notes || '1. Goods once sold cannot be returned.'}</div>
              </div>
            )}
          </div>
          <div className="w-1/2 flex flex-col bg-surface-50/20">
            <div className={`p-2 border-b border-black ${pSize} flex-1`}>
              <div className="font-bold underline mb-1">Company's Bank Details</div>
              <div className="flex justify-between mt-1"><span>A/c Name:</span> <span className="font-bold">{shop?.shop_name}</span></div>
              <div className="flex justify-between"><span>A/c No.:</span> <span className="font-bold">—</span></div>
              <div className="flex justify-between"><span>Branch & IFS Code:</span> <span className="font-bold">—</span></div>
            </div>
            <div className="flex-1 p-2 flex flex-col items-end justify-between">
              <div className={`font-bold ${pSize}`}>for {shop?.shop_name}</div>
              {s.show_signature && shop?.signature_url && <img src={shop.signature_url} alt="sig" className="h-8 object-contain" />}
              <div className={`text-surface-600 ${pSize} font-bold`}>Authorised Signatory</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SIMPLE LAYOUT (Basic Text & Lines)
// ─────────────────────────────────────────────────────────────────────────────
function SimpleLayout({ bill, shop, s, isA5 }) {
  const pSize = isA5 ? 'text-[9px]' : 'text-[12px]';
  const hSize = isA5 ? 'text-lg' : 'text-2xl';

  return (
    <div className={`flex flex-col flex-1 ${isA5 ? 'p-4' : 'p-10'} bg-white font-serif`}>
      <div className="text-center pb-6 border-b border-surface-300">
        <h1 className={`${hSize} font-bold tracking-widest uppercase`}>{shop?.shop_name || 'SHOP NAME'}</h1>
        <p className={`${pSize} mt-2 text-surface-600`}>{shop?.address_line1}</p>
        {s.show_phone_on_invoice && <p className={`${pSize} text-surface-600`}>Ph: {shop?.phone}</p>}
      </div>

      <div className="flex justify-between py-6 border-b border-surface-300">
        <div>
          <div className={`font-bold uppercase text-surface-400 mb-1 ${isA5 ? 'text-[8px]' : 'text-[10px]'}`}>BILL TO</div>
          <div className={`font-bold ${isA5 ? 'text-xs' : 'text-sm'}`}>{bill.party?.name || 'CASH'}</div>
          {s.inv_party_show_address && <div className={`${pSize} text-surface-700 mt-1`}>{bill.party?.billing_address}</div>}
          {s.inv_party_show_mobile && <div className={`${pSize} text-surface-700 mt-0.5`}>Mob: {bill.party?.mobile || bill.party?.phone}</div>}
        </div>
        <div className="text-right">
          <div className="font-bold text-lg">INVOICE</div>
          <div className={`${pSize} font-medium mt-1`}>No: {bill.bill_no}</div>
          <div className={`${pSize} text-surface-500`}>Date: {bill.date}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col py-6">
        <table className={`w-full ${pSize}`}>
          <thead>
            <tr className="border-b-2 border-surface-800">
              <th className="py-2 text-left font-bold w-8">#</th>
              <th className="py-2 text-left font-bold">ITEM</th>
              {s.inv_col_show_qty && <th className="py-2 text-right font-bold w-16">QTY</th>}
              {s.inv_col_show_price && <th className="py-2 text-right font-bold w-24">RATE</th>}
              {s.inv_col_show_tax && <th className="py-2 text-right font-bold w-16">TAX</th>}
              <th className="py-2 text-right font-bold w-24">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {(bill.items || []).map((item, i) => (
              <tr key={i} className="border-b border-surface-100">
                <td className="py-3 text-surface-500 align-top">{i + 1}</td>
                <td className="py-3 align-top font-bold">{item.name}</td>
                {s.inv_col_show_qty && <td className="py-3 text-right align-top">{item.qty} {item.unit}</td>}
                {s.inv_col_show_price && <td className="py-3 text-right align-top">{fmt(item.price)}</td>}
                {s.inv_col_show_tax && <td className="py-3 text-right align-top">{fmt(item.tax)}%</td>}
                <td className="py-3 text-right align-top font-bold">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex mt-4 pt-6 border-t border-surface-300">
        <div className="flex-1 pr-8">
          {s.show_terms && (
            <div className={pSize}>
              <div className="font-bold mb-2 uppercase text-[10px] text-surface-500">Terms & Conditions</div>
              <div className="text-surface-700 whitespace-pre-wrap">{s.default_bill_notes || 'Goods once sold cannot be returned.'}</div>
            </div>
          )}
        </div>
        <div className="w-64 border border-surface-200 p-4 rounded bg-surface-50/50">
          <div className={`flex justify-between mb-2 ${pSize}`}>
            <span className="text-surface-600">Subtotal</span>
            <span>{fmt(bill.subtotal)}</span>
          </div>
          <div className={`flex justify-between items-center ${isA5 ? 'text-lg' : 'text-2xl'} font-bold mt-4 pt-4 border-t border-surface-300`}>
            <span>TOTAL</span>
            <span>₹ {fmt(bill.grand_total)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-12">
        <div className="w-48 flex flex-col items-center">
          {s.show_signature && shop?.signature_url && <img src={shop.signature_url} alt="sig" className="h-12 object-contain mb-2 opacity-80" />}
          {s.show_signature && <div className={`border-t border-surface-400 w-full text-center pt-2 font-bold text-surface-500 ${pSize}`}>Authorized Signatory</div>}
        </div>
      </div>
    </div>
  );
}
