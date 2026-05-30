import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { 
 HiOutlineSearch, 
 HiOutlinePlus, 
 HiOutlineCog,
 HiOutlineDocumentReport,
 HiDotsVertical,
 HiOutlineQuestionMarkCircle
} from 'react-icons/hi';

const PurchaseList = ({ tab = 'invoices' }) => {
 const navigate = useNavigate();
 const [activeTab, setActiveTab] = useState(tab);
 const [invoices, setInvoices] = useState([]);

 const [returns, setReturns] = useState([]);
 
 const [searchQuery, setSearchQuery] = useState('');
 const [dateFilter, setDateFilter] = useState('365days');
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [metrics, setMetrics] = useState({
 totalPurchases: 0,
 paid: 0,
 unpaid: 0
 });

 useEffect(() => {
 setActiveTab(tab);
 }, [tab]);

 useEffect(() => {
 fetchData();
 }, [activeTab]);

 const fetchData = async () => {
 setLoading(true);
 try {
 const { data: partiesData } = await supabase.from('parties').select('id, name');
 const partyMap = {};
 if (partiesData) {
 partiesData.forEach(p => partyMap[p.id] = p.name);
 }

 if (activeTab === 'invoices') {
 const { data, error } = await supabase
 .from('purchase_invoices')
 .select('*')
 .order('date', { ascending: false });
 
 if (!error && data) {
 const processed = data.map(inv => ({ ...inv, suppliers: { name: partyMap[inv.supplier_id] || '-' } }));
 setInvoices(processed);
 
 // Calculate metrics
 let total = 0, paid = 0, unpaid = 0;
 processed.forEach(inv => {
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { 
 HiOutlineSearch, 
 HiOutlinePlus, 
 HiOutlineCog,
 HiOutlineDocumentReport,
 HiDotsVertical,
 HiOutlineQuestionMarkCircle,
 HiOutlinePencilAlt,
 HiOutlineDocumentDuplicate,
 HiOutlineReceiptRefund,
 HiOutlineBan,
 HiOutlineTrash
} from 'react-icons/hi';

const PurchaseList = ({ tab = 'invoices' }) => {
 const navigate = useNavigate();
 const [activeTab, setActiveTab] = useState(tab);
 const [invoices, setInvoices] = useState([]);

 const [returns, setReturns] = useState([]);
 
 const [searchQuery, setSearchQuery] = useState('');
 const [dateFilter, setDateFilter] = useState('365days');
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [metrics, setMetrics] = useState({
 totalPurchases: 0,
 paid: 0,
 unpaid: 0
 });

 useEffect(() => {
 setActiveTab(tab);
 }, [tab]);

 useEffect(() => {
 fetchData();
 }, [activeTab]);

 const fetchData = async () => {
 setLoading(true);
 try {
 const { data: partiesData } = await supabase.from('parties').select('id, name');
 const partyMap = {};
 if (partiesData) {
 partiesData.forEach(p => partyMap[p.id] = p.name);
 }

 if (activeTab === 'invoices') {
 const { data, error } = await supabase
 .from('purchase_invoices')
 .select('*')
 .order('date', { ascending: false });
 
 if (!error && data) {
 const processed = data.map(inv => ({ ...inv, suppliers: { name: partyMap[inv.supplier_id] || '-' } }));
 setInvoices(processed);
 
 // Calculate metrics
 let total = 0, paid = 0, unpaid = 0;
 processed.forEach(inv => {
 total += Number(inv.total_amount || 0);
 paid += Number(inv.paid_amount || 0);
 unpaid += Number(inv.balance_due || 0);
 });
 setMetrics({ totalPurchases: total, paid, unpaid });
 }
 } else if (activeTab === 'returns') {
 const { data, error } = await supabase.from('purchase_returns').select('*, purchase_invoices(bill_no)').order('return_date', { ascending: false });
 if (!error && data) {
 setReturns(data.map(ret => ({ ...ret, suppliers: { name: partyMap[ret.supplier_id] || '-' } })));
 }
 }
 } catch (err) {
 setError(err.message || 'Failed to fetch data');
 } finally {
 setLoading(false);
 }
 };

 const formatCurrency = (amount) => {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 minimumFractionDigits: 0,
 maximumFractionDigits: 2
 }).format(amount || 0);
 };

 
  const handleCancelBill = async (bill) => {
    if (bill.status === 'cancelled') return alert('Already cancelled.');
    if (!window.confirm('Are you sure you want to cancel Purchase Invoice ' + bill.bill_no + '?')) return;
    try {
      const unpaid = Number(bill.balance_due);
      if (unpaid > 0 && bill.supplier_id) {
        const { data: party } = await supabase.from('parties').select('current_balance').eq('id', bill.supplier_id).single();
        if (party) {
          await supabase.from('parties').update({ current_balance: Number(party.current_balance) - unpaid }).eq('id', bill.supplier_id);
        }
      }
      const { error } = await supabase.from('purchase_invoices').update({ status: 'cancelled' }).eq('id', bill.id);
      if (error) throw error;
      alert('Invoice cancelled successfully.');
      fetchData();
    } catch (err) {
      alert('Error cancelling: ' + err.message);
    }
  };

  const handleDeleteBill = async (bill) => {
    if (!window.confirm('Are you sure you want to delete Invoice ' + bill.bill_no + '? This cannot be undone.')) return;
    try {
      if (bill.status !== 'cancelled') {
        const unpaid = Number(bill.balance_due);
        if (unpaid > 0 && bill.supplier_id) {
          const { data: party } = await supabase.from('parties').select('current_balance').eq('id', bill.supplier_id).single();
          if (party) {
            await supabase.from('parties').update({ current_balance: Number(party.current_balance) - unpaid }).eq('id', bill.supplier_id);
          }
        }
        await supabase.from('purchase_invoices').update({ status: 'cancelled' }).eq('id', bill.id);
      }
      await supabase.from('purchase_payments').delete().eq('invoice_id', bill.id);
      const { error } = await supabase.from('purchase_invoices').delete().eq('id', bill.id);
      if (error) throw error;
      alert('Invoice deleted successfully.');
      fetchData();
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  const buildMenuOptions = (inv) => [
    { label: 'Edit', icon: <HiOutlinePencilAlt />, onClick: () => navigate('/purchases/' + inv.id + '/edit') },
    { label: 'Duplicate', icon: <HiOutlineDocumentDuplicate />, onClick: () => navigate('/purchases/new', { state: { duplicateFrom: inv.id } }) },
    { label: 'Issue Debit Note', icon: <HiOutlineReceiptRefund />, onClick: () => navigate('/purchases/returns/new', { state: { selectedInvoiceId: inv.id } }) },
    { divider: true },
    { label: 'Cancel Invoice', icon: <HiOutlineBan />, onClick: () => handleCancelBill(inv), danger: true },
    { label: 'Delete', icon: <HiOutlineTrash />, onClick: () => handleDeleteBill(inv), danger: true }
  ];

 <td className="px-4 py-4 text-sm text-gray-600">{ret.purchase_invoices?.bill_no || '-'}</td>
 <td className="px-4 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(ret.total_return_amount)}</td>
 <td className="px-4 py-4 text-center text-gray-400">
 <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
 <HiDotsVertical className="w-5 h-5" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

export default PurchaseList;
