import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import {
  HiOutlineUser,
  HiOutlineArrowLeft,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineLocationMarker,
  HiOutlineDocumentDownload,
  HiOutlineChatAlt2
} from 'react-icons/hi';

export default function PartyDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isSupplier = location.pathname.includes('/suppliers');
  const table = isSupplier ? 'suppliers' : 'customers';
  const invoiceTable = isSupplier ? 'purchase_invoices' : 'bills';
  const invoiceLinkBase = isSupplier ? '/purchases' : '/billing';
  
  const [party, setParty] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id, isSupplier]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
      
      setParty(profileData);

      // Fetch related invoices for the ledger
      const idColumn = isSupplier ? 'supplier_id' : 'customer_id';
      const { data: invoicesData } = await supabase
        .from(invoiceTable)
        .select('*')
        .eq(idColumn, id)
        .order('date', { ascending: true }); // chronological

      // Calculate running balance for ledger
      let runningBalance = Number(profileData?.balance || 0); // start with current balance (Wait, opening balance should technically be stored separately, but we'll use current for now and work backwards if needed. Actually, let's just show invoice totals for now)
      
      const ledgerEntries = (invoicesData || []).map(inv => {
        return {
          id: inv.id,
          date: inv.date,
          type: isSupplier ? 'Purchase Invoice' : 'Sale Invoice',
          refNo: inv.bill_no,
          total: Number(inv.subtotal) - Number(inv.discount) + Number(inv.labour_charges) + Number(inv.transport_charges) + Number(inv.round_off || 0),
          paid: Number(inv.advance_paid),
          balanceDue: Number(inv.balance_due),
          status: inv.status
        };
      });

      setLedger(ledgerEntries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppReminder = () => {
    if (!party?.phone) return alert('No phone number saved for this party.');
    
    const amount = Number(party.balance);
    const typeText = isSupplier ? 'owe you' : 'are requesting payment of';
    const message = `Hello ${party.name}, this is a gentle reminder regarding an outstanding balance of ₹${amount.toLocaleString('en-IN')}. Please let us know when we can expect the payment. Thank you!`;
    
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/91${party.phone}?text=${encoded}`, '_blank');
  };

  if (loading) {
    return <div className="p-8 text-center text-surface-500">Loading ledger...</div>;
  }

  if (!party) {
    return <div className="p-8 text-center text-surface-500">Party not found.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto pb-16">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(isSupplier ? '/suppliers' : '/customers')}
            className="w-10 h-10 rounded-xl border border-surface-200 flex items-center justify-center text-surface-500 hover:bg-surface-100 transition-colors"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-surface-800">{party.name}</h1>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isSupplier ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                {isSupplier ? 'Supplier' : 'Customer'}
              </span>
            </div>
            <p className="text-xs text-surface-400">Ledger & Profile Details</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={sendWhatsAppReminder}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors font-medium border border-green-200"
          >
            <HiOutlineChatAlt2 className="w-4 h-4" /> Send Reminder
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-white border border-surface-200 text-surface-700 hover:bg-surface-50 transition-colors">
            <HiOutlineDocumentDownload className="w-4 h-4" /> Export Ledger
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* ── Profile Card ── */}
        <div className="md:col-span-1 bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center mb-4 border-2 border-white shadow-sm">
            <HiOutlineUser className="w-8 h-8 text-surface-400" />
          </div>
          <h2 className="text-lg font-bold text-surface-800 mb-4">{party.name}</h2>
          
          <div className="space-y-3 text-sm text-surface-600">
            {party.phone && (
              <div className="flex items-center gap-3">
                <HiOutlinePhone className="w-4 h-4 text-surface-400" />
                <span>{party.phone}</span>
              </div>
            )}
            {party.email && (
              <div className="flex items-center gap-3">
                <HiOutlineMail className="w-4 h-4 text-surface-400" />
                <span className="truncate">{party.email}</span>
              </div>
            )}
            {party.address && (
              <div className="flex items-start gap-3">
                <HiOutlineLocationMarker className="w-4 h-4 text-surface-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{party.address}</span>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-surface-200">
            <p className="text-xs text-surface-500 uppercase tracking-wide mb-1">Current Outstanding Balance</p>
            <p className={`text-3xl font-black ${Number(party.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{Math.abs(party.balance).toLocaleString('en-IN')}
              <span className="text-sm font-medium ml-2 text-surface-500">{Number(party.balance) > 0 ? (isSupplier ? 'To Pay' : 'To Collect') : 'Advance'}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-surface-200">
            <div>
              <p className="text-[10px] text-surface-400 uppercase tracking-wide mb-1">Credit Limit</p>
              <p className="font-semibold text-surface-800">₹{Number(party.credit_limit || 0).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] text-surface-400 uppercase tracking-wide mb-1">Credit Period</p>
              <p className="font-semibold text-surface-800">{party.credit_period || 0} Days</p>
            </div>
          </div>
        </div>

        {/* ── Ledger Table ── */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-surface-200 bg-surface-50 flex justify-between items-center">
            <h2 className="font-bold text-surface-800">Ledger Statement</h2>
            <span className="text-xs text-surface-500 bg-white px-2 py-1 border border-surface-200 rounded-lg">{ledger.length} Transactions</span>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-white sticky top-0 border-b border-surface-200">
                <tr className="text-[11px] text-surface-500 uppercase tracking-wide">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Reference</th>
                  <th className="text-right py-3 px-4">Total Amt</th>
                  <th className="text-right py-3 px-4">Paid</th>
                  <th className="text-right py-3 px-4">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {ledger.length === 0 ? (
                  <tr><td colSpan="5" className="py-8 text-center text-surface-400">No transactions found.</td></tr>
                ) : (
                  ledger.map((entry, index) => (
                    <tr key={index} className={`hover:bg-surface-50 transition-colors ${entry.status === 'cancelled' ? 'opacity-50' : ''}`}>
                      <td className="py-3 px-4 text-surface-600 whitespace-nowrap">{entry.date}</td>
                      <td className="py-3 px-4">
                        <button 
                          onClick={() => navigate(`${invoiceLinkBase}/${entry.id}`)}
                          className="font-semibold text-primary-600 hover:underline"
                        >
                          {entry.refNo}
                        </button>
                        <div className="text-[10px] text-surface-400 mt-0.5">{entry.type} {entry.status === 'cancelled' && '(Cancelled)'}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-surface-800">₹{entry.total.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-green-600">₹{entry.paid.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-semibold text-red-600">₹{entry.balanceDue.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
