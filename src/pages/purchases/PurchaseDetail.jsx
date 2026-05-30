import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { HiOutlinePrinter, HiOutlinePencilAlt, HiOutlineCurrencyRupee } from 'react-icons/hi';

const PurchaseDetail = () => {
 const { id } = useParams();
 const [invoice, setInvoice] = useState(null);
 const [payments, setPayments] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showPaymentModal, setShowPaymentModal] = useState(false);
 const [paymentForm, setPaymentForm] = useState({
 amount: '',
 date: new Date().toISOString().split('T')[0],
 mode: 'cash',
 notes: ''
 });

 useEffect(() => {
 fetchInvoiceDetails();
 fetchPayments();
 }, [id]);

 const fetchInvoiceDetails = async () => {
 const { data: invData, error: invError } = await supabase
 .from('purchase_invoices')
 .select('*')
 .eq('id', id)
 .single();
 
 if (!invError && invData) {
 const { data: partyData } = await supabase.from('parties').select('*').eq('id', invData.supplier_id).single();
 setInvoice({ ...invData, suppliers: partyData || null });
 }
 setLoading(false);
 };

 const fetchPayments = async () => {
 const { data, error } = await supabase
 .from('purchase_payments')
 .select('*')
 .eq('purchase_id', id)
 .order('date', { ascending: false });
 if (!error && data) {
 setPayments(data);
 }
 };

 const handleRecordPayment = async (e) => {
 e.preventDefault();
 const amount = parseFloat(paymentForm.amount);
 if (!amount || amount <= 0) return;

 // 1. Insert into purchase_payments
 const { error: paymentError } = await supabase.from('purchase_payments').insert([{
 purchase_id: id,
 amount,
 date: paymentForm.date,
 payment_mode: paymentForm.mode,
 notes: paymentForm.notes
 }]);

 if (!paymentError) {
 // 2. Update purchase_invoices
 const newAdvancePaid = (parseFloat(invoice.advance_paid) || 0) + amount;
 const newBalanceDue = (parseFloat(invoice.total_amount) || 0) - newAdvancePaid;
 const newStatus = newBalanceDue <= 0 ? 'Paid' : 'Partial';

 const { error: updateError } = await supabase.from('purchase_invoices')
 .update({
 advance_paid: newAdvancePaid,
 balance_due: newBalanceDue,
 status: newStatus
 })
 .eq('id', id);

 if (!updateError) {
 setShowPaymentModal(false);
 setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], mode: 'cash', notes: '' });
 fetchInvoiceDetails();
 fetchPayments();
 }
 }
 };

 if (loading) return <div className="p-6">Loading...</div>;
 if (!invoice) return <div className="p-6">Invoice not found.</div>;

 const items = invoice.items || [];

 return (
 <div className="max-w-5xl mx-auto">
 <div className="flex justify-between items-center mb-6">
 <h1 className="text-xl font-bold text-gray-800">Purchase Invoice #{invoice.bill_no}</h1>
 <div className="flex gap-3">
 <Link to={`/purchases/${id}/edit`} className="bg-gray-100 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-200">
 <HiOutlinePencilAlt /> Edit
 </Link>
 <button onClick={() => setShowPaymentModal(true)} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700">
 <HiOutlineCurrencyRupee /> Record Payment
 </button>
 <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
 <HiOutlinePrinter /> Print
 </button>
 </div>
 </div>

 <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 flex justify-between">
 <div>
 <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Supplier Details</h3>
 <p className="font-bold text-lg">{invoice.suppliers?.name || '-'}</p>
 <p className="text-gray-600">{invoice.suppliers?.billing_address || ''}</p>
 <p className="text-gray-600">{invoice.suppliers?.mobile || invoice.suppliers?.phone || ''}</p>
 </div>
 <div className="text-right">
 <p><span className="text-gray-500">Bill No:</span> <span className="font-medium">{invoice.bill_no}</span></p>
 <p><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date(invoice.date).toLocaleDateString()}</span></p>
 <p><span className="text-gray-500">Due Date:</span> <span className="font-medium">{new Date(invoice.due_date || invoice.date).toLocaleDateString()}</span></p>
 <p className="mt-2">
 <span className={`px-3 py-1 rounded-full text-sm font-semibold ${invoice.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
 {invoice.status || 'Pending'}
 </span>
 </p>
 </div>
 </div>

 <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-6">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {items.map((item, idx) => (
 <tr key={idx}>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name || item.product_name}</td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.qty || item.quantity}</td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{item.rate || item.price}</td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">₹{(item.qty || item.quantity) * (item.rate || item.price)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 <div className="p-6 border-t bg-gray-50 flex justify-end">
 <div className="w-64 space-y-2 text-sm">
 <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span> <span>₹{invoice.subtotal || 0}</span></div>
 <div className="flex justify-between"><span className="text-gray-500">Discount:</span> <span>₹{invoice.discount || 0}</span></div>
 <div className="flex justify-between"><span className="text-gray-500">Additional Charges:</span> <span>₹{invoice.additional_charges || 0}</span></div>
 <div className="flex justify-between font-bold text-lg border-t pt-2"><span className="text-gray-800">Grand Total:</span> <span>₹{invoice.total_amount || 0}</span></div>
 <div className="flex justify-between text-green-600"><span className="font-medium">Amount Paid:</span> <span>₹{invoice.advance_paid || 0}</span></div>
 <div className="flex justify-between text-red-600 font-bold border-t pt-2"><span>Balance Due:</span> <span>₹{invoice.balance_due || 0}</span></div>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
 <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Payment History</h3>
 {payments.length === 0 ? (
 <p className="text-gray-500">No payments recorded yet.</p>
 ) : (
 <table className="min-w-full divide-y divide-gray-200">
 <thead>
 <tr>
 <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
 <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
 <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
 <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {payments.map(payment => (
 <tr key={payment.id}>
 <td className="py-3 text-sm text-gray-900">{new Date(payment.date).toLocaleDateString()}</td>
 <td className="py-3 text-sm text-gray-900 capitalize">{payment.payment_mode}</td>
 <td className="py-3 text-sm text-gray-900">{payment.notes || '-'}</td>
 <td className="py-3 text-sm text-gray-900 text-right font-medium text-green-600">₹{payment.amount}</td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>

 {showPaymentModal && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
 <div className="p-6 border-b flex justify-between items-center">
 <h3 className="text-lg font-bold">Record Payment</h3>
 <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
 </div>
 <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
 <input 
 type="number" 
 step="0.01" 
 max={invoice.balance_due} 
 required 
 className="w-full border rounded-md px-3 py-2"
 value={paymentForm.amount}
 onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
 <input 
 type="date" 
 required 
 className="w-full border rounded-md px-3 py-2"
 value={paymentForm.date}
 onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
 <select 
 className="w-full border rounded-md px-3 py-2"
 value={paymentForm.mode}
 onChange={(e) => setPaymentForm({...paymentForm, mode: e.target.value})}
 >
 <option value="cash">Cash</option>
 <option value="upi">UPI</option>
 <option value="bank">Bank Transfer</option>
 <option value="cheque">Cheque</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
 <textarea 
 className="w-full border rounded-md px-3 py-2"
 rows="2"
 value={paymentForm.notes}
 onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
 ></textarea>
 </div>
 <div className="pt-4 flex justify-end gap-3">
 <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50">Cancel</button>
 <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Payment</button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};

export default PurchaseDetail;
