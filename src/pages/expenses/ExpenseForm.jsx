import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { HiArrowLeft, HiCheck, HiPlus, HiX } from 'react-icons/hi';

export default function ExpenseForm() {
 const { id } = useParams();
 const navigate = useNavigate();
 const { user } = useAuth();

 const [loading, setLoading] = useState(true);
 const [categories, setCategories] = useState([]);

 // Form State
 const [amount, setAmount] = useState('');
 const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
 const [categoryId, setCategoryId] = useState('');
 const [paymentMode, setPaymentMode] = useState('Cash');
 const [notes, setNotes] = useState('');
 const [isRecurring, setIsRecurring] = useState(false);
 const [recurringFrequency, setRecurringFrequency] = useState('monthly');
 const [recurringEndDate, setRecurringEndDate] = useState('');

 // New Category State
 const [isAddingCategory, setIsAddingCategory] = useState(false);
 const [newCategoryName, setNewCategoryName] = useState('');

 useEffect(() => {
 fetchCategories();
 if (id) {
 fetchExpense();
 }
 }, [id]);

 const fetchCategories = async () => {
 try {
 const { data, error } = await supabase
 .from('expense_categories')
 .select('*')
 .order('name');
 if (error) throw error;
 setCategories(data || []);
 } catch (err) {
 alert('Error fetching categories: ' + err.message);
 }
 };

 const fetchExpense = async () => {
 try {
 setLoading(true);
 const { data, error } = await supabase
 .from('expenses')
 .select('*')
 .eq('id', id)
 .single();
 
 if (error) throw error;
 if (data) {
 setAmount(data.amount);
 setDate(data.date ? data.date.split('T')[0] : '');
 setCategoryId(data.category_id || '');
 setPaymentMode(data.payment_mode || 'Cash');
 setNotes(data.notes || '');
 setIsRecurring(data.is_recurring || false);
 setRecurringFrequency(data.recurring_frequency || 'monthly');
 setRecurringEndDate(data.recurring_end_date ? data.recurring_end_date.split('T')[0] : '');
 }
 } catch (err) {
 alert('Error fetching expense: ' + err.message);
 } finally {
 setLoading(false);
 }
 };

 const handleAddNewCategory = async () => {
 if (!newCategoryName.trim()) return;
 try {
 const { data, error } = await supabase
 .from('expense_categories')
 .insert([{ name: newCategoryName.trim() }])
 .select()
 .single();
 
 if (error) throw error;
 if (data) {
 setCategories([...categories, data]);
 setCategoryId(data.id);
 setIsAddingCategory(false);
 setNewCategoryName('');
 }
 } catch (err) {
 alert('Failed to add category: ' + err.message);
 }
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!categoryId) {
 alert('Please select a category');
 return;
 }

 try {
 setLoading(true);
 const payload = {
 amount,
 date,
 category_id: categoryId,
 payment_mode: paymentMode,
 notes,
 is_recurring: isRecurring,
 recurring_frequency: isRecurring ? recurringFrequency : null,
 recurring_end_date: isRecurring && recurringEndDate ? recurringEndDate : null,
 created_by: user?.id
 };

 if (id) {
 const { error } = await supabase
 .from('expenses')
 .update(payload)
 .eq('id', id);
 if (error) throw error;
 } else {
 const { error } = await supabase
 .from('expenses')
 .insert([payload]);
 if (error) throw error;
 }

 navigate('/expenses');
 } catch (err) {
 alert('Failed to save expense: ' + err.message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="max-w-3xl mx-auto">
 <div className="flex items-center gap-4 mb-6">
 <Link to="/expenses" className="text-slate-400 hover:text-rose-600 transition-colors">
 <HiArrowLeft className="w-6 h-6" />
 </Link>
 <h1 className="text-xl font-bold text-slate-800">
 {id ? 'Edit Expense' : 'Add Expense'}
 </h1>
 </div>

 <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
 
 {/* Row 1: Amount & Date */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">
 Amount (₹) *
 </label>
 <input 
 type="number" 
 step="0.01"
 required
 value={amount}
 onChange={(e) => setAmount(e.target.value)}
 className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
 placeholder="0.00"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">
 Date *
 </label>
 <input 
 type="date" 
 required
 value={date}
 onChange={(e) => setDate(e.target.value)}
 className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
 />
 </div>
 </div>

 {/* Row 2: Category & Payment Mode */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">
 Category *
 </label>
 {isAddingCategory ? (
 <div className="flex gap-2">
 <input 
 type="text" 
 value={newCategoryName}
 onChange={(e) => setNewCategoryName(e.target.value)}
 placeholder="New Category Name"
 className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
 />
 <button 
 type="button" 
 onClick={handleAddNewCategory}
 className="px-3 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
 >
 <HiCheck className="w-5 h-5" />
 </button>
 <button 
 type="button" 
 onClick={() => setIsAddingCategory(false)}
 className="px-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
 >
 <HiX className="w-5 h-5" />
 </button>
 </div>
 ) : (
 <div className="flex gap-2">
 <select 
 value={categoryId}
 onChange={(e) => setCategoryId(e.target.value)}
 className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
 required
 >
 <option value="" disabled>Select Category</option>
 {categories.map(c => (
 <option key={c.id} value={c.id}>{c.name}</option>
 ))}
 </select>
 <button 
 type="button"
 onClick={() => setIsAddingCategory(true)}
 className="px-3 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors flex items-center justify-center border border-rose-100"
 title="Add New Category"
 >
 <HiPlus className="w-5 h-5" />
 </button>
 </div>
 )}
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">
 Payment Mode
 </label>
 <select 
 value={paymentMode}
 onChange={(e) => setPaymentMode(e.target.value)}
 className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
 >
 <option value="Cash">Cash</option>
 <option value="UPI">UPI</option>
 <option value="Bank Transfer">Bank Transfer</option>
 <option value="Cheque">Cheque</option>
 </select>
 </div>
 </div>

 {/* Row 3: Notes */}
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">
 Notes
 </label>
 <textarea 
 rows="3"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
 placeholder="Add any extra details..."
 ></textarea>
 </div>

 {/* Row 4: Recurring Logic */}
 <div className="border-t border-slate-100 pt-6">
 <label className="flex items-center gap-2 cursor-pointer mb-4">
 <input 
 type="checkbox" 
 checked={isRecurring}
 onChange={(e) => setIsRecurring(e.target.checked)}
 className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300 rounded cursor-pointer"
 />
 <span className="text-slate-800 font-medium">Make this a recurring expense</span>
 </label>

 {isRecurring && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-rose-50 p-4 rounded-lg border border-rose-100">
 <div>
 <label className="block text-sm font-medium text-rose-900 mb-1">
 Frequency
 </label>
 <select 
 value={recurringFrequency}
 onChange={(e) => setRecurringFrequency(e.target.value)}
 className="w-full px-4 py-2 border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
 >
 <option value="daily">Daily</option>
 <option value="weekly">Weekly</option>
 <option value="monthly">Monthly</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-rose-900 mb-1">
 End Date (Optional)
 </label>
 <input 
 type="date" 
 value={recurringEndDate}
 onChange={(e) => setRecurringEndDate(e.target.value)}
 className="w-full px-4 py-2 border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
 />
 </div>
 </div>
 )}
 </div>

 {/* Form Actions */}
 <div className="flex justify-end gap-3 pt-4">
 <button 
 type="button" 
 onClick={() => navigate('/expenses')}
 className="px-6 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium"
 >
 Cancel
 </button>
 <button 
 type="submit" 
 disabled={loading}
 className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
 >
 {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
 Save Expense
 </button>
 </div>

 </form>
 </div>
 );
}
