import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { HiOutlinePlus as Plus, HiOutlineTrash as Trash2, HiOutlineArrowRight as ArrowRight, HiOutlineSave as Save, HiOutlineArrowLeft as ArrowLeft } from 'react-icons/hi';

export default function PurchaseOrderForm() {
 const { id } = useParams();
 const navigate = useNavigate();
 const isEditing = !!id;

 const [suppliers, setSuppliers] = useState([]);
 const [products, setProducts] = useState([]);
 const [loading, setLoading] = useState(true);
 const [converting, setConverting] = useState(false);
 
 const [formData, setFormData] = useState({
 supplier_id: '',
 po_number: '',
 po_date: new Date().toISOString().split('T')[0],
 expected_delivery_date: '',
 notes: '',
 status: 'draft',
 subtotal: 0,
 tax_amount: 0,
 total_amount: 0,
 converted_to_purchase_id: null,
 });

 const [items, setItems] = useState([
 { product_id: '', quantity: 1, unit: 'pcs', expected_rate: 0, total: 0 }
 ]);

 useEffect(() => {
 fetchSuppliers();
 fetchProducts();
 if (isEditing) {
 fetchPurchaseOrder();
 } else {
 generatePONumber();
 }
 }, [id]);

 const fetchsuppliers = async () => {
 const { data } = await supabase.from('suppliers').select('*').order('name');
 if (data) setSuppliers(data);
 };

 const fetchProducts = async () => {
 const { data } = await supabase.from('products').select('*').order('name');
 if (data) setProducts(data);
 };

 const generatePONumber = async () => {
 const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
 const { data } = await supabase
 .from('purchase_orders')
 .select('po_number')
 .like('po_number', `PO-${dateStr}-%`)
 .order('created_at', { ascending: false })
 .limit(1);

 let nextNum = 1;
 if (data && data.length > 0) {
 const parts = data[0].po_number.split('-');
 if (parts.length === 3) {
 nextNum = parseInt(parts[2], 10) + 1;
 }
 }
 setFormData(prev => ({ ...prev, po_number: `PO-${dateStr}-${nextNum.toString().padStart(3, '0')}` }));
 };

 const fetchPurchaseOrder = async () => {
 setLoading(true);
 const { data, error } = await supabase
 .from('purchase_orders')
 .select(`
 *,
 purchase_order_items(*)
 `)
 .eq('id', id)
 .single();
 
 if (data) {
 setFormData({
 supplier_id: data.supplier_id || '',
 po_number: data.po_number || '',
 po_date: data.po_date || '',
 expected_delivery_date: data.expected_delivery_date || '',
 notes: data.notes || '',
 status: data.status || 'draft',
 subtotal: data.subtotal || 0,
 tax_amount: data.tax_amount || 0,
 total_amount: data.total_amount || 0,
 converted_to_purchase_id: data.converted_to_purchase_id
 });
 if (data.purchase_order_items && data.purchase_order_items.length > 0) {
 setItems(data.purchase_order_items.map(item => ({
 id: item.id,
 product_id: item.product_id,
 quantity: item.quantity,
 unit: item.unit || 'pcs',
 expected_rate: item.expected_rate,
 total: item.total_amount || (item.quantity * item.expected_rate)
 })));
 }
 }
 if (error) {
 alert('Error fetching data: ' + error.message);
 }
 setLoading(false);
 };

 const handleItemChange = (index, field, value) => {
 const newItems = [...items];
 newItems[index][field] = value;
 
 if (field === 'product_id') {
 const product = products.find(p => p.id === value);
 if (product) {
 newItems[index].expected_rate = product.purchase_price || 0;
 newItems[index].unit = product.unit || 'pcs';
 }
 }
 
 if (['quantity', 'expected_rate', 'product_id'].includes(field)) {
 newItems[index].total = Number(newItems[index].quantity || 0) * Number(newItems[index].expected_rate || 0);
 }
 
 setItems(newItems);
 calculateTotals(newItems);
 };

 const calculateTotals = (currentItems) => {
 const subtotal = currentItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
 setFormData(prev => ({ ...prev, subtotal, total_amount: subtotal }));
 };

 const addItem = () => {
 setItems([...items, { product_id: '', quantity: 1, unit: 'pcs', expected_rate: 0, total: 0 }]);
 };

 const removeItem = (index) => {
 const newItems = items.filter((_, i) => i !== index);
 setItems(newItems);
 calculateTotals(newItems);
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 setLoading(true);
 try {
 const orderData = {
 supplier_id: formData.supplier_id,
 po_number: formData.po_number,
 po_date: formData.po_date,
 expected_delivery_date: formData.expected_delivery_date || null,
 notes: formData.notes,
 status: formData.status,
 subtotal: formData.subtotal,
 tax_amount: formData.tax_amount,
 total_amount: formData.total_amount,
 converted_to_purchase_id: formData.converted_to_purchase_id,
 };

 let orderId = id;

 if (isEditing) {
 const { error } = await supabase.from('purchase_orders').update(orderData).eq('id', id);
 if (error) throw error;
 
 await supabase.from('purchase_order_items').delete().eq('purchase_order_id', id);
 } else {
 const { data, error } = await supabase.from('purchase_orders').insert([orderData]).select().single();
 if (error) throw error;
 orderId = data.id;
 }

 const itemsToInsert = items.map(item => ({
 purchase_order_id: orderId,
 product_id: item.product_id,
 quantity: item.quantity,
 unit: item.unit,
 expected_rate: item.expected_rate,
 total_amount: item.total
 }));
 
 const { error: itemsError } = await supabase.from('purchase_order_items').insert(itemsToInsert);
 if (itemsError) throw itemsError;

 navigate('/purchases');
 } catch (error) {
 alert('Error saving PO: ' + error.message);
 } finally {
 setLoading(false);
 }
 };

 const handleConvertToInvoice = async () => {
 if (!window.confirm('Are you sure you want to convert this PO to a Purchase Invoice?')) return;
 setConverting(true);
 try {
 const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
 const { data: invData } = await supabase
 .from('purchase_invoices')
 .select('invoice_number')
 .like('invoice_number', `PI-${dateStr}-%`)
 .order('created_at', { ascending: false })
 .limit(1);

 let nextNum = 1;
 if (invData && invData.length > 0) {
 const parts = invData[0].invoice_number.split('-');
 if (parts.length === 3) {
 nextNum = parseInt(parts[2], 10) + 1;
 }
 }
 const invoiceNumber = `PI-${dateStr}-${nextNum.toString().padStart(3, '0')}`;

 const invoiceData = {
 supplier_id: formData.supplier_id,
 invoice_number: invoiceNumber,
 invoice_date: new Date().toISOString().split('T')[0],
 status: 'draft',
 subtotal: formData.subtotal,
 tax_amount: formData.tax_amount,
 total_amount: formData.total_amount,
 notes: `Converted from PO: ${formData.po_number}`
 };

 const { data: newInvoice, error: invError } = await supabase
 .from('purchase_invoices')
 .insert([invoiceData])
 .select()
 .single();
 
 if (invError) throw invError;

 const invoiceItems = items.map(item => ({
 purchase_invoice_id: newInvoice.id,
 product_id: item.product_id,
 quantity: item.quantity,
 unit: item.unit,
 rate: item.expected_rate,
 total_amount: item.total
 }));

 const { error: itemsError } = await supabase.from('purchase_invoice_items').insert(invoiceItems);
 if (itemsError) throw itemsError;

 const { error: poError } = await supabase
 .from('purchase_orders')
 .update({ converted_to_purchase_id: newInvoice.id })
 .eq('id', id);
 
 if (poError) throw poError;

 navigate(`/purchases/${newInvoice.id}/edit`);
 } catch (error) {
 alert('Error converting: ' + error.message);
 } finally {
 setConverting(false);
 }
 };

 return (
 <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm">
 <div className="flex justify-between items-center mb-6">
 <div className="flex items-center gap-4">
 <button onClick={() => navigate('/purchases')} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
 <ArrowLeft className="w-5 h-5" />
 </button>
 <h1 className="text-xl font-bold text-gray-800">
 {isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}
 </h1>
 </div>
 {isEditing && formData.status === 'received' && !formData.converted_to_purchase_id && (
 <button
 type="button"
 onClick={handleConvertToInvoice}
 disabled={converting}
 className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow font-medium transition-colors disabled:opacity-50"
 >
 {converting ? 'Converting...' : 'Convert to Purchase Invoice'}
 <ArrowRight className="w-4 h-4" />
 </button>
 )}
 </div>

 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
 <select
 required
 value={formData.supplier_id}
 onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
 className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
 >
 <option value="">Select a supplier</option>
 {suppliers.map(s => (
 <option key={s.id} value={s.id}>{s.name}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
 <input
 type="text"
 required
 readOnly
 value={formData.po_number}
 className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">PO Date</label>
 <input
 type="date"
 required
 value={formData.po_date}
 onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
 className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
 <input
 type="date"
 value={formData.expected_delivery_date}
 onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
 className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
 <select
 value={formData.status}
 onChange={(e) => setFormData({ ...formData, status: e.target.value })}
 className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
 >
 <option value="draft">Draft</option>
 <option value="sent">Sent</option>
 <option value="received">Received</option>
 <option value="cancelled">Cancelled</option>
 </select>
 </div>
 </div>

 <div className="mt-8">
 <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Items</h2>
 <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
 <table className="w-full text-left border-collapse">
 <thead className="bg-gray-50">
 <tr>
 <th className="p-3 text-sm font-medium text-gray-600">Product</th>
 <th className="p-3 text-sm font-medium text-gray-600">Qty</th>
 <th className="p-3 text-sm font-medium text-gray-600">Unit</th>
 <th className="p-3 text-sm font-medium text-gray-600">Expected Rate</th>
 <th className="p-3 text-sm font-medium text-gray-600 text-right">Total</th>
 <th className="p-3 text-sm font-medium text-gray-600 text-center">Actions</th>
 </tr>
 </thead>
 <tbody>
 {items.map((item, index) => (
 <tr key={index} className="border-t border-gray-200 bg-white hover:bg-gray-50 transition-colors">
 <td className="p-3">
 <select
 required
 value={item.product_id}
 onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">Select product</option>
 {products.map(p => (
 <option key={p.id} value={p.id}>{p.name}</option>
 ))}
 </select>
 </td>
 <td className="p-3 w-28">
 <input
 type="number"
 min="1"
 required
 value={item.quantity}
 onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </td>
 <td className="p-3 w-28">
 <input
 type="text"
 value={item.unit}
 onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </td>
 <td className="p-3 w-36">
 <input
 type="number"
 min="0"
 step="0.01"
 required
 value={item.expected_rate}
 onChange={(e) => handleItemChange(index, 'expected_rate', e.target.value)}
 className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </td>
 <td className="p-3 w-36 text-right">
 <span className="block font-medium text-gray-800">
 ₹{(Number(item.total) || 0).toFixed(2)}
 </span>
 </td>
 <td className="p-3 w-16 text-center">
 <button
 type="button"
 onClick={() => removeItem(index)}
 className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
 >
 <Trash2 className="w-5 h-5" />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <button
 type="button"
 onClick={addItem}
 className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
 >
 <Plus className="w-4 h-4" /> Add Item
 </button>
 </div>

 <div className="flex flex-col md:flex-row justify-between items-start pt-8 border-t border-gray-200">
 <div className="w-full md:w-1/2 mb-6 md:mb-0">
 <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
 <textarea
 rows="4"
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
 placeholder="Add any additional notes here..."
 />
 </div>
 <div className="w-full md:w-1/3 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
 <div className="flex justify-between items-center mb-3">
 <span className="text-gray-600">Subtotal</span>
 <span className="font-medium text-gray-800">₹{(Number(formData.subtotal) || 0).toFixed(2)}</span>
 </div>
 <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-2">
 <span className="text-lg font-bold text-gray-800">Total</span>
 <span className="text-2xl font-bold text-blue-600">₹{(Number(formData.total_amount) || 0).toFixed(2)}</span>
 </div>
 </div>
 </div>

 <div className="flex justify-end gap-4 pt-6">
 <button
 type="button"
 onClick={() => navigate('/purchases')}
 className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={loading}
 className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium transition-colors disabled:opacity-50"
 >
 <Save className="w-4 h-4" />
 {loading ? 'Saving...' : 'Save Purchase Order'}
 </button>
 </div>
 </form>
 </div>
 );
}
