import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { HiOutlineSave as Save, HiOutlineExclamationCircle as AlertCircle, HiOutlineArrowLeft as ArrowLeft } from 'react-icons/hi';

export default function PurchaseReturn() {
 const navigate = useNavigate();
  const location = useLocation();
 const [loading, setLoading] = useState(true);
 const [invoices, setInvoices] = useState([]);
 const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
 const [invoiceDetails, setInvoiceDetails] = useState(null);
 
 const [returnItems, setReturnItems] = useState([]);
 const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
 const [reason, setReason] = useState('');
 
 useEffect(() => {
 fetchInvoices();
 }, []);

 const fetchInvoices = async () => {
 const { data } = await supabase
 .from('purchase_invoices')
 .select(`
 id, 
 invoice_number, 
 invoice_date, 
 supplier_id, 
 suppliers(name)
 `)
 .neq('status', 'cancelled')
 .order('invoice_date', { ascending: false });
 
 if (data) {
 const formatted = data.map(inv => ({
 ...inv,
 supplier_name: inv.suppliers?.name || 'Unknown Supplier'
 }));
 setInvoices(formatted);
 }
 };

 const handleInvoiceSelect = async (id) => {
 setSelectedInvoiceId(id);
 if (!id) {
 setInvoiceDetails(null);
 setReturnItems([]);
 return;
 }

 setLoading(true);
 const { data, error } = await supabase
 .from('purchase_invoices')
 .select(`
 *,
 suppliers(id, name),
 purchase_invoice_items(
 id,
 product_id,
 quantity,
 rate,
 products(id, name)
 )
 `)
 .eq('id', id)
 .single();

 if (data) {
 setInvoiceDetails(data);
 const items = data.purchase_invoice_items.map(item => ({
 invoice_item_id: item.id,
 product_id: item.product_id,
 product_name: item.products?.name || 'Unknown Product',
 original_qty: item.quantity,
 return_qty: 0,
 rate: item.rate,
 selected: false
 }));
 setReturnItems(items);
 }
 setLoading(false);
 };

 const handleItemToggle = (index) => {
 const newItems = [...returnItems];
 newItems[index].selected = !newItems[index].selected;
 if (!newItems[index].selected) {
 newItems[index].return_qty = 0;
 } else {
 newItems[index].return_qty = newItems[index].original_qty;
 }
 setReturnItems(newItems);
 };

 const handleQtyChange = (index, qty) => {
 const newItems = [...returnItems];
 const val = Number(qty);
 if (val > newItems[index].original_qty) {
 newItems[index].return_qty = newItems[index].original_qty;
 } else if (val < 0) {
 newItems[index].return_qty = 0;
 } else {
 newItems[index].return_qty = val;
 }
 newItems[index].selected = newItems[index].return_qty > 0;
 setReturnItems(newItems);
 };

 const totalReturnAmount = returnItems
 .filter(item => item.selected && item.return_qty > 0)
 .reduce((sum, item) => sum + (item.return_qty * item.rate), 0);

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!invoiceDetails) return;

 const itemsToReturn = returnItems.filter(item => item.selected && item.return_qty > 0);
 if (itemsToReturn.length === 0) {
 alert('Please select at least one item to return with a quantity greater than 0.');
 return;
 }

 setLoading(true);
 try {
 const { data: userData } = await supabase.auth.getUser();
 const userId = userData?.user?.id || null;

 const returnData = {
 original_purchase_id: invoiceDetails.id,
 supplier_id: invoiceDetails.supplier_id,
 return_date: returnDate,
 items: itemsToReturn,
 total_return_amount: totalReturnAmount,
 reason: reason,
 created_by: userId
 };

 const { error: returnError } = await supabase
 .from('purchase_returns')
 .insert([returnData]);

 if (returnError) throw returnError;

 // Update product stock quantities
 for (const item of itemsToReturn) {
 const { data: prodData } = await supabase
 .from('products')
 .select('stock_qty')
 .eq('id', item.product_id)
 .single();
 
 if (prodData) {
 const newStock = Math.max(0, (prodData.stock_qty || 0) - item.return_qty);
 await supabase
 .from('products')
 .update({ stock_qty: newStock })
 .eq('id', item.product_id);
 }
 }

 // Update supplier balance
 const { data: suppData } = await supabase
 .from('suppliers')
 .select('balance')
 .eq('id', invoiceDetails.supplier_id)
 .single();

 if (suppData) {
 const newBalance = (suppData.balance || 0) - totalReturnAmount;
 await supabase
 .from('suppliers')
 .update({ balance: newBalance })
 .eq('id', invoiceDetails.supplier_id);
 }

 navigate('/purchases');
 } catch (error) {
 alert('Error processing return: ' + error.message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm">
 <div className="flex items-center gap-4 mb-8">
 <button onClick={() => navigate('/purchases')} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
 <ArrowLeft className="w-5 h-5" />
 </button>
 <div>
 <h1 className="text-xl font-bold text-gray-800">Purchase Return (Debit Note)</h1>
 <p className="text-sm text-gray-500 mt-1">Process a return to a supplier for a previous invoice</p>
 </div>
 </div>

 <div className="space-y-8">
 {/* Step 1: Select Invoice */}
 <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
 <h2 className="text-lg font-semibold text-gray-800 mb-4">1. Select Original Invoice</h2>
 <div className="max-w-md">
 <select
 value={selectedInvoiceId}
 onChange={(e) => handleInvoiceSelect(e.target.value)}
 className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
 >
 <option value="">-- Choose an Invoice --</option>
 {invoices.map(inv => (
 <option key={inv.id} value={inv.id}>
 {inv.invoice_number} - {inv.supplier_name} ({inv.invoice_date})
 </option>
 ))}
 </select>
 </div>
 </div>

 {/* Step 2: Return Details */}
 {invoiceDetails && (
 <div className="border border-gray-200 rounded-xl overflow-hidden">
 <div className="bg-white p-6 border-b border-gray-200">
 <div className="flex justify-between items-start mb-6">
 <h2 className="text-lg font-semibold text-gray-800">2. Return Details</h2>
 <div className="text-right">
 <p className="text-sm text-gray-500">Supplier</p>
 <p className="font-medium text-gray-800">{invoiceDetails.suppliers?.name}</p>
 </div>
 </div>

 <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
 <table className="w-full text-left border-collapse">
 <thead className="bg-gray-50">
 <tr>
 <th className="p-3 w-12 text-center">
 <span className="sr-only">Select</span>
 </th>
 <th className="p-3 text-sm font-medium text-gray-600">Product</th>
 <th className="p-3 text-sm font-medium text-gray-600 text-center">Original Qty</th>
 <th className="p-3 text-sm font-medium text-gray-600 text-center">Return Qty</th>
 <th className="p-3 text-sm font-medium text-gray-600 text-right">Price</th>
 <th className="p-3 text-sm font-medium text-gray-600 text-right">Return Amount</th>
 </tr>
 </thead>
 <tbody>
 {returnItems.map((item, index) => (
 <tr key={item.invoice_item_id} className={`border-t border-gray-200 transition-colors ${item.selected ? 'bg-blue-50/30' : 'bg-white hover:bg-gray-50'}`}>
 <td className="p-3 text-center">
 <input
 type="checkbox"
 checked={item.selected}
 onChange={() => handleItemToggle(index)}
 className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
 />
 </td>
 <td className="p-3 font-medium text-gray-800">{item.product_name}</td>
 <td className="p-3 text-center text-gray-600">{item.original_qty}</td>
 <td className="p-3">
 <div className="flex justify-center">
 <input
 type="number"
 min="0"
 max={item.original_qty}
 value={item.return_qty}
 onChange={(e) => handleQtyChange(index, e.target.value)}
 className={`w-24 p-1.5 text-center border rounded-md focus:ring-2 focus:ring-blue-500 ${item.selected && item.return_qty > 0 ? 'border-blue-300 bg-white' : 'border-gray-300 bg-gray-50'}`}
 />
 </div>
 </td>
 <td className="p-3 text-right text-gray-600">₹{item.rate.toFixed(2)}</td>
 <td className="p-3 text-right font-medium text-gray-800">
 ₹{(item.return_qty * item.rate).toFixed(2)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {returnItems.length > 0 && returnItems.every(i => !i.selected) && (
 <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
 <AlertCircle className="w-5 h-5" />
 <p className="text-sm font-medium">Select at least one item to return.</p>
 </div>
 )}
 </div>

 <div className="bg-gray-50 p-6 flex flex-col md:flex-row gap-8 justify-between items-start">
 <div className="w-full md:w-2/3 space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
 <input
 type="date"
 required
 value={returnDate}
 onChange={(e) => setReturnDate(e.target.value)}
 className="w-full md:w-1/2 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Return</label>
 <textarea
 rows="3"
 required
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 placeholder="E.g., Damaged items, wrong products received..."
 />
 </div>
 </div>
 
 <div className="w-full md:w-1/3 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
 <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Return Summary</h3>
 <div className="flex justify-between items-center py-2 border-b border-gray-100">
 <span className="text-gray-600">Items Selected</span>
 <span className="font-medium text-gray-800">{returnItems.filter(i => i.selected && i.return_qty > 0).length}</span>
 </div>
 <div className="flex justify-between items-center pt-3 mt-1">
 <span className="text-lg font-bold text-gray-800">Total Refund</span>
 <span className="text-2xl font-bold text-red-600">₹{totalReturnAmount.toFixed(2)}</span>
 </div>
 
 <button
 type="button"
 onClick={handleSubmit}
 disabled={loading || totalReturnAmount === 0 || !reason}
 className="w-full mt-6 flex justify-center items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm font-medium transition-colors disabled:opacity-50"
 >
 <Save className="w-4 h-4" />
 {loading ? 'Processing...' : 'Process Return'}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
}
