import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { HiPlus, HiSearch, HiPencil, HiTrash, HiFilter, HiOutlineCurrencyRupee } from 'react-icons/hi';

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('This Month');
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: catData } = await supabase
        .from('expense_categories')
        .select('*');
      if (catData) setCategories(catData);

      const { data: expData, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_categories (name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      if (expData) setExpenses(expData);
    } catch (err) {
      setError(err.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete expense');
    }
  };

  const filteredExpenses = useMemo(() => {
    let result = expenses;

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(e => 
        (e.notes && e.notes.toLowerCase().includes(lowerSearch)) ||
        (e.expense_categories?.name && e.expense_categories.name.toLowerCase().includes(lowerSearch))
      );
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter(e => e.category_id === categoryFilter);
    }

    // Payment Mode filter
    if (paymentModeFilter) {
      result = result.filter(e => e.payment_mode === paymentModeFilter);
    }

    // Date Range filter
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);
    
    if (dateRangeFilter === 'This Month') {
      result = result.filter(e => new Date(e.date) >= startOfThisMonth);
    } else if (dateRangeFilter === 'Last Month') {
      result = result.filter(e => {
        const d = new Date(e.date);
        return d >= startOfLastMonth && d < startOfThisMonth;
      });
    } else if (dateRangeFilter === 'This Year') {
      result = result.filter(e => new Date(e.date) >= startOfThisYear);
    }

    return result;
  }, [expenses, searchTerm, categoryFilter, paymentModeFilter, dateRangeFilter]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [filteredExpenses]);

  // Summary logic
  const { totalThisMonth, totalThisYear, biggestCategoryMonth } = useMemo(() => {
    let tMonth = 0;
    let tYear = 0;
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);

    const categorySums = {};

    expenses.forEach(e => {
      const d = new Date(e.date);
      const amt = Number(e.amount || 0);

      if (d >= startOfThisYear) {
        tYear += amt;
      }
      if (d >= startOfThisMonth) {
        tMonth += amt;
        
        const catName = e.expense_categories?.name || 'Uncategorized';
        categorySums[catName] = (categorySums[catName] || 0) + amt;
      }
    });

    let maxCat = '-';
    let maxAmt = 0;
    Object.entries(categorySums).forEach(([cat, sum]) => {
      if (sum > maxAmt) {
        maxAmt = sum;
        maxCat = cat;
      }
    });

    return { totalThisMonth: tMonth, totalThisYear: tYear, biggestCategoryMonth: maxCat };
  }, [expenses]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
        <Link 
          to="/expenses/new" 
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <HiPlus className="w-5 h-5" />
          Add Expense
        </Link>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in flex items-start gap-2">
          <span className="mt-0.5 text-red-400">âš </span>
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm font-medium text-slate-500 mb-1">Total This Month</p>
          <p className="text-2xl font-bold text-slate-800 flex items-center">
            ₹{totalThisMonth.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm font-medium text-slate-500 mb-1">Total This Year</p>
          <p className="text-2xl font-bold text-slate-800">
            ₹{totalThisYear.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm font-medium text-slate-500 mb-1">Biggest Category (This Month)</p>
          <p className="text-2xl font-bold text-rose-600">
            {biggestCategoryMonth}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search notes or category..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-auto overflow-x-auto">
          <select 
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select 
            value={paymentModeFilter}
            onChange={e => setPaymentModeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
          >
            <option value="">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>

          <select 
            value={dateRangeFilter}
            onChange={e => setDateRangeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
          >
            <option value="All">All Time</option>
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
            <option value="This Year">This Year</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Payment Mode</th>
                <th className="px-6 py-4 font-medium">Notes</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
                      <span className="text-slate-500">Loading expenses...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <HiOutlineCurrencyRupee className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-base font-semibold text-slate-700">No expenses found</p>
                      <p className="text-sm mt-1 mb-4">Click "Add Expense" above to record an expense.</p>
                      <button 
                        onClick={() => navigate('/expenses/new')}
                        className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700"
                      >
                        + Add Expense
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      {new Date(expense.date).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                        {expense.expense_categories?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      ₹{Number(expense.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">{expense.payment_mode}</td>
                    <td className="px-6 py-4 truncate max-w-xs" title={expense.notes}>
                      {expense.notes || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Link 
                          to={`/expenses/${expense.id}/edit`}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <HiPencil className="w-5 h-5" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(expense.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <HiTrash className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-100">
                <tr>
                  <td colSpan="2" className="px-6 py-4 font-bold text-right text-slate-700">
                    Total:
                  </td>
                  <td className="px-6 py-4 font-bold text-rose-600 text-base">
                    ₹{totalFilteredAmount.toLocaleString('en-IN')}
                  </td>
                  <td colSpan="3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
