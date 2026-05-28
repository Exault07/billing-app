import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { 
 HiOutlineArrowLeft, HiOutlineCreditCard, 
 HiOutlineDocumentText, HiOutlineX, HiOutlineReceiptTax
} from 'react-icons/hi';

export default function CarpenterDetail() {
 const { id } = useParams();
 const { user } = useAuth();
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [carpenter, setCarpenter] = useState(null);
 const [bills, setBills] = useState([]);
 const [payments, setPayments] = useState([]);
 const [activeTab, setActiveTab] = useState('bills');

 const [showPaymentModal, setShowPaymentModal] = useState(false);
 const [paymentForm, setPaymentForm] = useState({
 payment_date: new Date().toISOString().split('T')[0],
 amount: '',
 payment_mode: 'Cash',
 notes: ''
 });
 const [savingPayment, setSavingPayment] = useState(false);

 useEffect(() => {
 fetchData();
 }, [id]);

 const fetchData = async () => {
 try {
 setLoading(true);
 
 const [carpenterRes, billsRes, paymentsRes] = await Promise.all([
 supabase.from('carpenters').select('*').eq('id', id).single(),
 supabase.from('bills').select('*, customers(name)').eq('carpenter_id', id).order('date', { ascending: false }),
 supabase.from('carpenter_payments').select('*').eq('carpenter_id', id).order('payment_date', { ascending: false })
 ]);

 if (carpenterRes.error) throw carpenterRes.error;
 
 setCarpenter(carpenterRes.data);
 setBills(billsRes.data || []);
 setPayments(paymentsRes.data || []);

 } catch (err) {
 setError(err.message || 'Failed to fetch carpenter details');
 } finally {
 setLoading(false);
 }
 };

 const handlePaymentSubmit = async (e) => {
 e.preventDefault();
 setSavingPayment(true);
 try {
 const { error } = await supabase.from('carpenter_payments').insert({
 carpenter_id: id,
 payment_date: paymentForm.payment_date,
 amount: parseFloat(paymentForm.amount),
 payment_mode: paymentForm.payment_mode,
 notes: paymentForm.notes,
 created_by: user?.id
 });
 if (error) throw error;
 
 setShowPaymentModal(false);
 setPaymentForm({
 payment_date: new Date().toISOString().split('T')[0],
 amount: '',
 payment_mode: 'Cash',
 notes: ''
 });
 fetchData(); // Refresh data
 } catch (err) {
 alert('Error recording payment: ' + err.message);
 } finally {
 setSavingPayment(false);
 }
 };

 if (loading) {
 return <div className="p-6 text-center text-surface-500">Loading details...</div>;
 }

 if (!carpenter) {
 return <div className="p-6 text-center text-red-500">Carpenter not found.</div>;
 }

 const commissionRate = Number(carpenter.default_commission_rate) || 0;

 // Derived calculations
 let totalCommissionEarned = 0;
 bills.forEach(bill => {
 const billTotal = Number(bill.grand_total) || 0;
 const billCommissionRate = Number(bill.commission_rate) || commissionRate;
 totalCommissionEarned += (billTotal * billCommissionRate) / 100;
 });

 const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
 const totalPending = totalCommissionEarned - totalPaid;

 return (
 <div className="max-w-6xl mx-auto space-y-6">
 {error && (
 <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in flex items-start gap-2">
 <span className="mt-0.5 text-red-400">âš </span>
 <span>{error}</span>
 </div>
 )}
 <div className="flex items-center gap-4">
 <Link
 to="/carpenters"
 className="p-2 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 text-surface-600 transition-colors"
 >
 <HiOutlineArrowLeft className="w-5 h-5" />
 </Link>
 <h1 className="text-2xl font-bold text-surface-900">Carpenter Details</h1>
 </div>

 {/* Profile Card */}
 <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
 <div>
 <h2 className="text-2xl font-bold text-surface-900">{carpenter.name}</h2>
 <div className="mt-2 text-surface-600 space-y-1">
 <p><strong>Phone:</strong> {carpenter.phone || 'N/A'}</p>
 <p><strong>Default Commission Rate:</strong> {commissionRate}%</p>
 </div>
 </div>
 <div className="flex flex-col sm:flex-row gap-4 items-center bg-surface-50 p-4 rounded-xl border border-surface-100">
 <div className="text-center px-4">
 <p className="text-sm text-surface-500 font-medium uppercase tracking-wider">Total Earned</p>
 <p className="text-3xl font-bold text-green-600">₹{totalCommissionEarned.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
 </div>
 <div className="hidden sm:block w-px h-12 bg-surface-200"></div>
 <div className="text-center px-4">
 <p className="text-sm text-surface-500 font-medium uppercase tracking-wider">Total Pending</p>
 <p className="text-3xl font-bold text-red-600">₹{totalPending.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex flex-wrap gap-3">
 <button
 onClick={() => setShowPaymentModal(true)}
 className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
 >
 <HiOutlineCreditCard className="w-5 h-5" /> Pay Commission
 </button>
 </div>

 {/* Tabs */}
 <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
 <div className="flex border-b border-surface-200 overflow-x-auto hide-scrollbar">
 <button
 onClick={() => setActiveTab('bills')}
 className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors ${
 activeTab === 'bills' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-surface-600 hover:bg-surface-50'
 }`}
 >
 <HiOutlineReceiptTax className="w-5 h-5" /> Referred Bills
 </button>
 <button
 onClick={() => setActiveTab('payments')}
 className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors ${
 activeTab === 'payments' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-surface-600 hover:bg-surface-50'
 }`}
 >
 <HiOutlineCreditCard className="w-5 h-5" /> Commission Payments
 </button>
 <button
 onClick={() => setActiveTab('notes')}
 className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors ${
 activeTab === 'notes' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-surface-600 hover:bg-surface-50'
 }`}
 >
 <HiOutlineDocumentText className="w-5 h-5" /> Notes
 </button>
 </div>

 <div className="p-6">
 {/* BILLS TAB */}
 {activeTab === 'bills' && (
 <div className="overflow-x-auto">
 {bills.length === 0 ? (
 <p className="text-surface-500 text-center py-4">No referred bills found.</p>
 ) : (
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-surface-200 text-surface-500 text-sm bg-surface-50">
 <th className="py-3 px-4 font-medium">Date</th>
 <th className="py-3 px-4 font-medium">Bill No</th>
 <th className="py-3 px-4 font-medium">Customer Name</th>
 <th className="py-3 px-4 font-medium text-right">Bill Total</th>
 <th className="py-3 px-4 font-medium text-right">Amount Paid by Customer</th>
 <th className="py-3 px-4 font-medium text-right">Commission Earned</th>
 <th className="py-3 px-4 font-medium text-center">Action</th>
 </tr>
 </thead>
 <tbody>
 {bills.map(bill => {
 const billTotal = Number(bill.grand_total) || 0;
 const billCommissionRate = Number(bill.commission_rate) || commissionRate;
 const commissionEarned = (billTotal * billCommissionRate) / 100;
 const customerPaid = Number(bill.advance_paid) || 0;

 return (
 <tr key={bill.id} className="border-b border-surface-100 hover:bg-surface-50/50">
 <td className="py-3 px-4 text-surface-700">{new Date(bill.date).toLocaleDateString()}</td>
 <td className="py-3 px-4 font-medium text-surface-900">{bill.bill_no}</td>
 <td className="py-3 px-4 text-surface-700">{bill.customers?.name || 'Unknown'}</td>
 <td className="py-3 px-4 text-right text-surface-900 font-medium">₹{billTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
 <td className="py-3 px-4 text-right text-surface-700">₹{customerPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
 <td className="py-3 px-4 text-right text-green-600 font-medium">₹{commissionEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
 <td className="py-3 px-4 text-center">
 <Link to={`/billing/${bill.id}`} className="text-primary-600 hover:text-primary-800 font-medium text-sm">View Bill</Link>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 )}
 </div>
 )}

 {/* PAYMENTS TAB */}
 {activeTab === 'payments' && (
 <div className="overflow-x-auto">
 {payments.length === 0 ? (
 <p className="text-surface-500 text-center py-4">No payments recorded.</p>
 ) : (
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-surface-200 text-surface-500 text-sm bg-surface-50">
 <th className="py-3 px-4 font-medium">Date</th>
 <th className="py-3 px-4 font-medium">Amount</th>
 <th className="py-3 px-4 font-medium">Mode</th>
 <th className="py-3 px-4 font-medium">Notes</th>
 </tr>
 </thead>
 <tbody>
 {payments.map(payment => (
 <tr key={payment.id} className="border-b border-surface-100 hover:bg-surface-50/50">
 <td className="py-3 px-4 text-surface-700">{new Date(payment.payment_date).toLocaleDateString()}</td>
 <td className="py-3 px-4 font-medium text-green-600">₹{Number(payment.amount).toFixed(2)}</td>
 <td className="py-3 px-4 text-surface-700">{payment.payment_mode}</td>
 <td className="py-3 px-4 text-surface-600 text-sm">{payment.notes || '-'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 )}

 {/* NOTES TAB */}
 {activeTab === 'notes' && (
 <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 min-h-[150px]">
 {carpenter.notes ? (
 <p className="text-surface-700 whitespace-pre-wrap">{carpenter.notes}</p>
 ) : (
 <p className="text-surface-500 italic">No notes provided for this carpenter.</p>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Payment Modal */}
 {showPaymentModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
 <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
 <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
 <h3 className="text-lg font-bold text-surface-900">Pay Commission</h3>
 <button onClick={() => setShowPaymentModal(false)} className="text-surface-400 hover:text-surface-600 transition-colors">
 <HiOutlineX className="w-6 h-6" />
 </button>
 </div>
 
 <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
 <div className="space-y-1">
 <label className="block text-sm font-medium text-surface-700">Date</label>
 <input
 type="date"
 required
 value={paymentForm.payment_date}
 onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
 />
 </div>
 <div className="space-y-1">
 <label className="block text-sm font-medium text-surface-700">Amount (₹)</label>
 <input
 type="number"
 required min="0.01" step="0.01"
 value={paymentForm.amount}
 onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
 placeholder="0.00"
 />
 </div>
 <div className="space-y-1">
 <label className="block text-sm font-medium text-surface-700">Payment Mode</label>
 <select
 value={paymentForm.payment_mode}
 onChange={(e) => setPaymentForm({...paymentForm, payment_mode: e.target.value})}
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
 >
 <option>Cash</option>
 <option>UPI</option>
 <option>Bank Transfer</option>
 <option>Cheque</option>
 </select>
 </div>
 <div className="space-y-1">
 <label className="block text-sm font-medium text-surface-700">Notes</label>
 <textarea
 value={paymentForm.notes}
 onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
 rows="2"
 className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none resize-none"
 placeholder="Optional details..."
 />
 </div>
 
 <div className="pt-4 flex justify-end gap-3">
 <button
 type="button"
 onClick={() => setShowPaymentModal(false)}
 className="px-4 py-2 border border-surface-200 text-surface-700 rounded-lg hover:bg-surface-50 font-medium"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={savingPayment}
 className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-70"
 >
 {savingPayment ? 'Saving...' : 'Save Payment'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
