import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAudit, computeDiff } from '../../utils/auditLog';
import ActionMenu from '../../components/ActionMenu';
import InvoiceTemplate from '../../components/invoice-templates/InvoiceTemplate';
import {
  HiOutlinePrinter,
  HiOutlinePencil,
  HiOutlineArrowLeft,
  HiOutlineDocumentText,
  HiOutlineCash,
  HiOutlineDuplicate,
  HiOutlineX,
  HiOutlineRefresh,
  HiOutlineClipboardList,
  HiOutlineShare,
  HiOutlineDownload,
  HiOutlineDotsVertical,
  HiOutlineCalculator,
  HiOutlineInformationCircle,
  HiOutlineTruck,
  HiOutlineBan,
  HiOutlineTrash,
  HiOutlineChevronDown
} from 'react-icons/hi';

const WhatsAppIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

// ─── Record Payment Modal ────────────────────────────────────────────────────────
function RecordPaymentModal({ bill, onClose, onSaved, userId }) {
  const maxAmount = Number(bill.balance_due || 0);
  const [amount, setAmount] = useState(maxAmount.toFixed(2));
  const [mode, setMode] = useState('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError('Enter a valid amount.');
    if (amt > maxAmount) return setError('Amount exceeds balance due of ₹ ' + fmt(maxAmount));
    setSaving(true);
    setError('');
    try {
      await supabase.from('bill_payments').insert({
        bill_id: bill.id, amount: amt, payment_mode: mode, date, notes, created_by: userId,
      });

      const newAdvance = Number(bill.advance_paid || 0) + amt;
      const newBalance = Number(bill.grand_total || 0) - newAdvance;
      const newStatus = newBalance <= 0 ? 'final' : bill.status;

      await supabase.from('bills').update({
        advance_paid: newAdvance, balance_due: Math.max(0, newBalance), status: newStatus, payment_mode: mode,
      }).eq('id', bill.id);

      await logAudit({
        tableName: 'bills', recordId: bill.id, changedBy: userId, changeType: 'updated',
        oldData: { advance_paid: bill.advance_paid, balance_due: bill.balance_due, status: bill.status },
        newData: { advance_paid: newAdvance, balance_due: Math.max(0, newBalance), status: newStatus },
      });

      onSaved();
    } catch (err) {
      setError('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-[#f5f3ff]">
          <h3 className="text-[16px] font-bold text-surface-800 flex items-center gap-2">
            <HiOutlineCash className="w-5 h-5 text-[#7c3aed]" />
            Record Payment
          </h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-800"><HiOutlineX className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="bg-surface-50 rounded-lg p-3 text-[13px]">
            <div className="flex justify-between text-surface-600">
              <span>Bill No:</span><span className="font-bold text-surface-800">{bill.bill_no}</span>
            </div>
            <div className="flex justify-between text-surface-600 mt-1">
              <span>Grand Total:</span><span className="font-bold">₹ {fmt(bill.grand_total)}</span>
            </div>
            <div className="flex justify-between text-red-600 mt-1">
              <span>Balance Due:</span><span className="font-black">₹ {fmt(bill.balance_due)}</span>
            </div>
          </div>
          {error && <div className="text-red-600 text-[13px] bg-red-50 p-2 rounded">{error}</div>}
          <div>
            <label className="block text-[12px] font-bold text-surface-600 mb-1">Amount Received *</label>
            <div className="flex border border-surface-200 rounded-lg overflow-hidden">
              <span className="px-3 py-2.5 bg-surface-100 text-surface-500 text-[13px] font-medium">₹</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 px-3 py-2.5 text-[14px] font-bold outline-none" min="0" max={maxAmount} />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-surface-600 mb-1">Payment Mode</label>
            <select value={mode} onChange={e => setMode(e.target.value)} className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-[13px] outline-none focus:border-[#7c3aed]">
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank Transfer</option><option value="cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-surface-600 mb-1">Payment Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-[13px] outline-none focus:border-[#7c3aed]" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-surface-600 mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. UPI ref #12345" className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-[13px] outline-none focus:border-[#7c3aed] resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-surface-200 bg-surface-50">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-surface-200 rounded-lg text-[13px] font-bold text-surface-600 hover:bg-surface-100">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-lg text-[13px] font-bold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Profit Details Modal ────────────────────────────────────────────────────────
function ProfitDetailsModal({ bill, products, onClose }) {
  const itemsWithCost = (bill.items || []).map(item => {
    const product = products.find(p => p.id === item.product_id);
    const purchasePrice = Number(product?.purchase_price || 0);
    const cost = purchasePrice * Number(item.qty || 0);
    return { ...item, purchasePrice, cost };
  });

  const salesAmount = Number(bill.subtotal) - Number(bill.discount);
  const totalCost = itemsWithCost.reduce((s, i) => s + i.cost, 0);
  const taxPayable = 0; // Current schema adds tax implicitly or not separated in main bill record simply
  const profit = salesAmount - totalCost - taxPayable;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h3 className="text-[16px] font-semibold text-[#4f46e5]">Profit Calculation</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-800"><HiOutlineX className="w-6 h-6" /></button>
        </div>
        
        <div className="p-6">
          <div className="max-h-64 overflow-y-auto mb-6">
            <table className="w-full text-left text-[13px]">
              <thead className="text-[11px] font-bold text-surface-500 uppercase border-b border-surface-200">
                <tr>
                  <th className="py-2.5 px-2">Item Name</th>
                  <th className="py-2.5 px-2 text-right">Qty</th>
                  <th className="py-2.5 px-2 text-right w-32">Purchase Price<br/><span className="text-[9px] font-normal lowercase">(exl. taxes)</span></th>
                  <th className="py-2.5 px-2 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {itemsWithCost.map((item, i) => (
                  <tr key={i} className="border-b border-surface-100">
                    <td className="py-3 px-2 text-surface-800">{item.name}</td>
                    <td className="py-3 px-2 text-right">{item.qty} {item.unit}</td>
                    <td className="py-3 px-2 text-right text-surface-600">₹ {fmt(item.purchasePrice)}</td>
                    <td className="py-3 px-2 text-right font-medium">₹ {fmt(item.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 text-[14px]">
            <div className="flex justify-between font-medium text-surface-700 px-2">
              <span>Sales Amount (Excl. Addn. Charges):</span>
              <span>₹ {fmt(salesAmount)}</span>
            </div>
            <div className="flex justify-between font-medium text-surface-700 px-2">
              <span>Total Cost:</span>
              <span>₹ {fmt(totalCost)}</span>
            </div>
            <div className="flex justify-between font-medium text-surface-700 px-2">
              <span>Tax Payable:</span>
              <span>₹ {fmt(taxPayable)}</span>
            </div>
            <div className="flex justify-between font-semibold px-2 pt-3 border-t border-surface-200">
              <span className="text-surface-800">
                Profit:<br/><span className="text-[11px] font-normal text-surface-500">(Sales Amount - Total Cost - Tax Payable)</span>
              </span>
              <span className={profit >= 0 ? 'text-green-600 text-lg' : 'text-red-600 text-lg'}>
                {profit > 0 ? '+ ' : ''}₹ {fmt(profit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Payment History Sidebar ─────────────────────────────────────────────────────
function PaymentHistorySidebar({ billId, bill, onClose, onRecordPayment, role }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!billId) return;
    supabase.from('bill_payments').select('*').eq('bill_id', billId).order('date', { ascending: false })
      .then(({ data }) => { setPayments(data || []); setLoading(false); });
  }, [billId]);

  const totalReceived = payments.reduce((s, p) => s + Number(p.amount), 0);
  const isPaid = Number(bill.balance_due) <= 0;

  return (
    <div className="w-80 bg-white border-l border-surface-200 flex flex-col h-full absolute right-0 top-0 shadow-2xl z-40 transition-transform">
      <div className="flex items-center justify-between p-5 border-b border-surface-200">
        <h3 className="text-[16px] font-bold text-surface-800">Payment History</h3>
        <button onClick={onClose} className="text-surface-400 hover:text-surface-700"><HiOutlineX className="w-5 h-5" /></button>
      </div>

      <div className="p-5 flex-1 overflow-y-auto">
        <div className="space-y-3 mb-6 text-[13px]">
          <div className="flex justify-between text-surface-600">
            <span>Invoice Amount</span>
            <span>₹ {fmt(bill.grand_total)}</span>
          </div>
          <div className="flex justify-between text-surface-600">
            <span>Initial Amount Received</span>
            <span>₹ {fmt(totalReceived)}</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-surface-400 text-sm">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="text-center text-surface-400 text-sm">No payments recorded.</div>
        ) : (
          <div className="space-y-4">
            {payments.map(p => (
              <div key={p.id} className="border border-surface-200 rounded-lg p-3">
                <div className="flex justify-between font-bold text-surface-800 text-[13px] mb-1">
                  <span>₹ {fmt(p.amount)}</span>
                  <span className="text-surface-500 font-normal">{new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                </div>
                <div className="text-[12px] text-surface-500 capitalize">{p.payment_mode}</div>
                {p.notes && <div className="text-[12px] text-surface-500 mt-1">Note: {p.notes}</div>}
              </div>
            ))}
          </div>
        )}

        {!isPaid && (role === 'owner' || role === 'staff') && (
          <button 
            onClick={onRecordPayment}
            className="w-full mt-6 py-2.5 border border-[#7c3aed] text-[#7c3aed] font-bold rounded-lg text-[13px] hover:bg-[#f5f3ff] transition-colors"
          >
            + Record Payment
          </button>
        )}
      </div>

      <div className="p-5 border-t border-surface-200 bg-surface-50">
        <div className="flex justify-between text-[13px] text-surface-600 mb-2">
          <span>Total Amount Received</span>
          <span className="font-medium text-surface-800">₹ {fmt(totalReceived)}</span>
        </div>
        <div className="flex justify-between text-[14px] font-bold text-green-600">
          <span>Balance Amount</span>
          <span>₹ {fmt(bill.balance_due)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main BillView ───────────────────────────────────────────────────────────────
export default function BillView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  
  const [bill, setBill] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [products, setProducts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProfitDetails, setShowProfitDetails] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const fetchBill = useCallback(async () => {
    try {
      const { data: billData, error: billErr } = await supabase.from('bills').select('*').eq('id', id).single();
      if (billErr) throw billErr;
      setBill(billData);

      if (billData.customer_id) {
        const { data: custData } = await supabase.from('parties').select('name, phone, mobile, address').eq('id', billData.customer_id).single();
        setCustomer(custData);
      }

      const { data: settingsData } = await supabase.from('shop_settings').select('*').limit(1).single();
      if (settingsData) setShopSettings(settingsData);

      const { data: prodData } = await supabase.from('products').select('id, name, purchase_price');
      if (prodData) setProducts(prodData);
      
    } catch (err) {
      setError('Could not load bill: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchBill(); }, [fetchBill]);

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    try {
      // Dynamic import to avoid blowing up initial bundle size
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const element = document.getElementById('printable-bill-wrapper');
      if (!element) return;

      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');

      const isA5 = shopSettings?.invoice_theme?.includes('a5');
      const orientation = isA5 ? 'l' : 'p';
      const format = isA5 ? 'a5' : 'a4';

      const pdf = new jsPDF(orientation, 'pt', format);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${bill?.bill_no || 'Document'}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF. Make sure you are connected to the internet to load external resources if any.');
    }
  };

  const handleWhatsApp = () => {
    if (!customer?.mobile && !customer?.phone) return alert('No phone number found for this customer.');
    const phone = (customer.mobile || customer.phone).replace(/\D/g, '');
    const message = `Hello ${customer.name},\n\nYour bill *${bill.bill_no}* dated ${bill.date} has been generated.\n\n*Amount Details:*\n- Grand Total: ₹${fmt(bill.grand_total)}\n- Advance Paid: ₹${fmt(bill.advance_paid)}\n- *Balance Due: ₹${fmt(bill.balance_due)}*\n\nThank you for your business!`;
    window.open('https://wa.me/91' + phone + '?text=' + encodeURIComponent(message), '_blank');
  };

  const handleDuplicate = async () => {
    if (!bill) return;
    setDuplicating(true);
    try {
      const { count } = await supabase.from('bills').select('id', { count: 'exact', head: true });
      const newBillNo = 'BILL-' + String((count || 0) + 1);
      const today = new Date().toISOString().split('T')[0];

      const { data: newBill, error: dupErr } = await supabase.from('bills').insert({
        bill_no: newBillNo, date: today, due_date: bill.due_date, customer_id: bill.customer_id,
        items: bill.items, subtotal: bill.subtotal, discount: bill.discount, labour_charges: bill.labour_charges,
        transport_charges: bill.transport_charges, round_off: bill.round_off, grand_total: bill.grand_total,
        advance_paid: 0, balance_due: bill.grand_total, notes: bill.notes, payment_mode: bill.payment_mode,
        bill_type: bill.bill_type || 'invoice', status: 'draft', created_by: user?.id,
      }).select().single();

      if (dupErr) throw dupErr;

      await logAudit({
        tableName: 'bills', recordId: newBill.id, changedBy: user?.id, changeType: 'created',
        oldData: null, newData: { duplicated_from: id, bill_no: newBillNo },
      });

      navigate('/billing/' + newBill.id + '/edit');
    } catch (err) {
      alert('Duplicate failed: ' + err.message);
    } finally {
      setDuplicating(false);
    }
  };

  const handleCancelBill = async () => {
    if (bill.status === 'cancelled') return alert('Already cancelled.');
    if (!window.confirm('Are you sure you want to cancel Invoice ' + bill.bill_no + '?')) return;
    try {
      const unpaid = Number(bill.balance_due);
      if (unpaid > 0 && bill.customer_id) {
        const { data: party } = await supabase.from('parties').select('current_balance').eq('id', bill.customer_id).single();
        if (party) {
          await supabase.from('parties').update({ current_balance: Number(party.current_balance) - unpaid }).eq('id', bill.customer_id);
        }
      }
      await supabase.from('bills').update({ status: 'cancelled' }).eq('id', bill.id);
      fetchBill();
    } catch (err) {
      alert('Error cancelling: ' + err.message);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin" /></div>;
  if (error || !bill) return <div className="text-center py-16"><p className="text-red-500">{error || 'Bill not found.'}</p><Link to="/sales/invoices" className="text-[#4f46e5] text-sm mt-2 inline-block">Back to Sales Invoices</Link></div>;

  const grandTotal = bill.grand_total || (Number(bill.subtotal) - Number(bill.discount) + Number(bill.labour_charges) + Number(bill.transport_charges));
  const billHeader = bill.bill_type === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE';
  const isPaid = Number(bill.balance_due) <= 0;
  
  const statusColors = {
    draft: 'bg-amber-100 text-amber-800', final: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800',
    fully_returned: 'bg-purple-100 text-purple-800', partially_returned: 'bg-orange-100 text-orange-800',
  };

  const menuOptions = [
    ...(bill.status !== 'cancelled' ? [{ label: 'Edit', icon: <HiOutlinePencil />, onClick: () => navigate('/billing/' + id + '/edit') }] : []),
    { label: 'Duplicate', icon: <HiOutlineDuplicate />, onClick: handleDuplicate },
    { divider: true },
    { label: 'Cancel Invoice', icon: <HiOutlineBan />, onClick: handleCancelBill, danger: true }
  ];

  return (
    <div className="bg-[#f0f2f5] min-h-[calc(100vh-64px)] -m-6 p-6 relative overflow-hidden">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-bill, #printable-bill * { visibility: visible; }
          #printable-bill { position: fixed; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Top Header */}
      <div className="no-print flex items-center justify-between mb-4 bg-white p-4 rounded-xl shadow-sm border border-surface-200">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/sales/invoices')} className="p-2 text-surface-500 hover:bg-surface-100 rounded-full transition-colors">
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-surface-800">Sales Invoice #{bill.bill_no.replace('BILL-', '')}</h1>
            <span className={'px-2.5 py-0.5 rounded text-xs font-bold capitalize ' + (statusColors[bill.status] || 'bg-surface-100 text-surface-800')}>
              {isPaid && bill.status !== 'cancelled' ? 'Paid' : bill.status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowProfitDetails(true)}
            className="flex items-center gap-2 px-4 py-2 border border-surface-200 rounded-lg text-sm font-semibold text-surface-700 bg-white hover:bg-surface-50 shadow-sm transition-colors"
          >
            <HiOutlineCalculator className="w-4 h-4 text-indigo-600" /> Profit Details
          </button>
          {role !== 'viewer' && (
            <div className="border border-surface-200 rounded-lg shadow-sm bg-white hover:bg-surface-50 transition-colors">
              <ActionMenu options={menuOptions} />
            </div>
          )}
        </div>
      </div>

      {/* Action Bar Sub-Header */}
      <div className="no-print flex flex-wrap items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 border border-surface-200 rounded-lg text-sm font-medium text-surface-700 bg-white hover:bg-surface-50 shadow-sm transition-colors">
            <HiOutlineDownload className="w-4 h-4" /> Download PDF <HiOutlineChevronDown className="w-3 h-3 text-surface-400" />
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 border border-surface-200 rounded-lg text-sm font-medium text-surface-700 bg-white hover:bg-surface-50 shadow-sm transition-colors">
            <HiOutlinePrinter className="w-4 h-4" /> Print PDF <HiOutlineChevronDown className="w-3 h-3 text-surface-400" />
          </button>
          <button className="p-2 border border-surface-200 rounded-lg text-surface-400 bg-white hover:bg-surface-50 shadow-sm transition-colors">
            <HiOutlineInformationCircle className="w-4 h-4" />
          </button>
          <button onClick={handleWhatsApp} className="flex items-center gap-2 px-4 py-2 border border-surface-200 rounded-lg text-sm font-medium text-surface-700 bg-white hover:bg-surface-50 shadow-sm transition-colors">
            <HiOutlineShare className="w-4 h-4" /> Share <HiOutlineChevronDown className="w-3 h-3 text-surface-400" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
            <HiOutlineTruck className="w-4 h-4" /> Generate E-way Bill
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
            <HiOutlineDocumentText className="w-4 h-4" /> Generate e-Invoice
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex relative">
        
        {/* Bill Preview Container */}
        <div className="w-full flex justify-center pb-12 transition-all" style={{ marginRight: showPaymentHistory ? '320px' : '0' }}>
          {/* The printable area needs to wrap tightly around the template for correct box-shadow in screen view, but the template handles print layout */}
          <div id="printable-bill-wrapper" className="bg-white shadow-xl border border-surface-200 mt-2 print:shadow-none print:border-none print:mt-0 relative" style={{ width: '210mm', minHeight: '297mm' }}>
            <InvoiceTemplate bill={{ ...bill, party: customer }} shop={shopSettings} settings={shopSettings} />
          </div>
        </div>

        {/* Right Floating Button (when sidebar closed) */}
        {!showPaymentHistory && (
          <button 
            onClick={() => setShowPaymentHistory(true)}
            className="no-print absolute right-0 top-10 bg-white border border-surface-200 border-r-0 shadow-lg rounded-l-lg py-3 px-2 flex flex-col items-center gap-2 text-surface-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors z-30"
          >
            <HiOutlineDocumentText className="w-5 h-5" />
            <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-[12px] font-bold tracking-widest mt-1">Payment History</span>
          </button>
        )}

        {/* Right Sidebar */}
        {showPaymentHistory && (
          <PaymentHistorySidebar 
            billId={id} 
            bill={bill} 
            role={role}
            onClose={() => setShowPaymentHistory(false)} 
            onRecordPayment={() => setShowPaymentModal(true)}
          />
        )}

      </div>

      {/* Modals */}
      {showPaymentModal && (
        <RecordPaymentModal
          bill={bill}
          userId={user?.id}
          onClose={() => setShowPaymentModal(false)}
          onSaved={() => { setShowPaymentModal(false); fetchBill(); }}
        />
      )}

      {showProfitDetails && (
        <ProfitDetailsModal 
          bill={bill} 
          products={products} 
          onClose={() => setShowProfitDetails(false)} 
        />
      )}

    </div>
  );
}
