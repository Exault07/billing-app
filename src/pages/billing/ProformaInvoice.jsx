import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAudit } from '../../utils/auditLog';
import {
 HiOutlineDocumentText,
 HiOutlineCog,
 HiOutlineSearch,
 HiOutlineDotsVertical,
 HiOutlineRefresh
} from 'react-icons/hi';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function ProformaInvoice() {
 const navigate = useNavigate();
 const { user } = useAuth();
 const [bills, setBills] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [searchTerm, setSearchTerm] = useState('');

 const fetchProformas = async () => {
 setLoading(true);
 try {
 const { data } = await supabase
 .from('bills')
 .select('*, customers:parties(name)')
 .eq('bill_type', 'proforma')
 .order('date', { ascending: false });
 setBills(data || []);
 } catch (err) {
 setError(err.message || 'Failed to fetch proformas');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchProformas();
 }, []);

 const handleConvertToInvoice = async (proforma) => {
 if (!window.confirm('Convert this Proforma to a Sale Invoice?')) return;
 try {
 // Get new bill no
 const { count } = await supabase.from('bills').select('id', { count: 'exact', head: true });
 const newBillNo = 'BILL-' + String((count || 0) + 1);
 
 // Fetch full proforma details
 const { data: fullProf } = await supabase.from('bills').select('*').eq('id', proforma.id).single();

 const { data: newInvoice, error } = await supabase.from('bills').insert({
 ...fullProf,
 id: undefined, // let it generate a new uuid
 bill_no: newBillNo,
 bill_type: 'invoice',
 status: 'draft',
 created_at: undefined,
 created_by: user?.id,
 }).select().single();

 if (error) throw error;
 
 // Update original proforma status to converted
 await supabase.from('bills').update({ status: 'converted' }).eq('id', proforma.id);

 await logAudit({
 tableName: 'bills',
 recordId: newInvoice.id,
 changedBy: user?.id,
 changeType: 'created',
 newData: { converted_from: proforma.id, bill_no: newBillNo }
 });

 navigate('/billing/' + newInvoice.id);
 } catch (err) {
 alert('Error converting: ' + err.message);
 }
 };

 const handleCreateProforma = () => {
 // Navigate to a dedicated creation page or use existing create form and pass bill_type
 // For simplicity we will navigate to /sales/new?type=proforma
 navigate('/sales/new?type=proforma');
 };

 const filteredBills = bills.filter(b => 
 b.bill_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 b.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
 );

 return (
 <div className="animate-fade-in w-full">
 {error && (
 <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in flex items-start gap-2">
 <span className="mt-0.5 text-red-400">⚠️</span>
 <span>{error}</span>
 </div>
 )}
 <div className="flex items-center justify-between mb-6">
 <h1 className="text-xl font-bold text-surface-900 flex items-center gap-2">
 <HiOutlineDocumentText className="w-6 h-6 text-[#4f46e5]" />
 Proforma Invoices
 </h1>
 <button
 onClick={handleCreateProforma}
 className="px-5 py-2 bg-[#4f46e5] text-white text-sm font-bold rounded-lg hover:bg-[#4338ca]"
 >
 + Create Proforma
 </button>
 </div>

 <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
 <div className="p-4 border-b border-surface-200">
 <div className="relative max-w-sm">
 <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
 <input
 type="text"
 placeholder="Search Proforma..."
 value={searchTerm}
 onChange={e => setSearchTerm(e.target.value)}
 className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-lg text-sm focus:border-[#4f46e5] outline-none"
 />
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead className="bg-surface-50 border-b border-surface-200 text-surface-600 font-bold uppercase text-xs">
 <tr>
 <th className="py-3 px-4">Date</th>
 <th className="py-3 px-4">Proforma No</th>
 <th className="py-3 px-4">Party Name</th>
 <th className="py-3 px-4 text-right">Amount</th>
 <th className="py-3 px-4 text-center">Status</th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-surface-100">
 {loading ? (
 <tr><td colSpan="6" className="p-8 text-center text-surface-500">Loading...</td></tr>
 ) : filteredBills.length === 0 ? (
 <tr><td colSpan="6" className="p-8 text-center text-surface-500">No proformas found.</td></tr>
 ) : (
 filteredBills.map(b => (
 <tr key={b.id} className="hover:bg-surface-50">
 <td className="py-3 px-4">{new Date(b.date).toLocaleDateString('en-GB')}</td>
 <td className="py-3 px-4 font-medium text-[#4f46e5] cursor-pointer hover:underline" onClick={() => navigate('/billing/' + b.id)}>
 {b.bill_no}
 </td>
 <td className="py-3 px-4">{b.customers?.name || '-'}</td>
 <td className="py-3 px-4 text-right font-bold text-surface-800">₹ {fmt(b.grand_total)}</td>
 <td className="py-3 px-4 text-center">
 <span className={'px-2 py-0.5 rounded text-xs font-bold uppercase border ' + (b.status === 'converted' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200')}>
 {b.status}
 </span>
 </td>
 <td className="py-3 px-4 text-right">
 {b.status !== 'converted' && (
 <button
 onClick={() => handleConvertToInvoice(b)}
 className="text-xs flex items-center gap-1 text-[#4f46e5] hover:underline font-bold ml-auto"
 >
 <HiOutlineRefresh className="w-4 h-4"/> Convert to Invoice
 </button>
 )}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
