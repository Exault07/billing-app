import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import {
 HiOutlineUserGroup,
 HiOutlinePlus,
 HiOutlineSearch,
 HiOutlineTrash,
 HiOutlineDotsVertical,
 HiOutlinePencil,
 HiOutlineEye,
 HiOutlineDocumentAdd,
 HiOutlineChevronLeft,
 HiOutlineChevronRight,
 HiOutlineExclamationCircle
} from 'react-icons/hi';

export default function Parties() {
 const navigate = useNavigate();
 const [parties, setParties] = useState([]);
 const [categories, setCategories] = useState([]);
 
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);

 // Filters
 const [searchTerm, setSearchTerm] = useState('');
 const [typeFilter, setTypeFilter] = useState('All');
 const [categoryFilter, setCategoryFilter] = useState('');
 
 // Selection & Bulk
 const [selectedIds, setSelectedIds] = useState(new Set());
 const [showBulkConfirm, setShowBulkConfirm] = useState(false);
 const [deleting, setDeleting] = useState(false);

 // Action Menu
 const [activeMenu, setActiveMenu] = useState(null);

 // Pagination removed

 useEffect(() => {
 fetchData();
 }, []);

 const fetchData = async () => {
 setLoading(true);
 try {
 // Fetch categories
 const { data: categoriesData, error: catError } = await supabase
 .from('party_categories')
 .select('*')
 .order('name');
 
 if (catError && catError.code !== '42P01') throw catError;
 setCategories(categoriesData || []);

 // Fetch parties in chunks to bypass the Supabase 1000 row limit
 let allParties = [];
 let from = 0;
 const step = 1000;
 let fetchMore = true;

 while (fetchMore) {
 const { data: partiesChunk, error: partiesError } = await supabase
 .from('parties')
 .select('*, party_categories(name)')
 .order('name')
 .range(from, from + step - 1);
 
 if (partiesError && partiesError.code !== '42P01') throw partiesError;
 
 if (partiesChunk && partiesChunk.length > 0) {
 allParties = [...allParties, ...partiesChunk];
 if (partiesChunk.length < step) {
 fetchMore = false;
 } else {
 from += step;
 }
 } else {
 fetchMore = false;
 }
 }

 setParties(allParties);
 } catch (err) {
 setError(err.message || 'Failed to fetch data');
 } finally {
 setLoading(false);
 }
 };

 const handleBulkDelete = async () => {
 if (selectedIds.size === 0) return;
 setDeleting(true);
 try {
 const idsToDelete = Array.from(selectedIds);
 const { error } = await supabase.from('parties').delete().in('id', idsToDelete);
 if (error) throw error;
 
 setParties(parties.filter(p => !selectedIds.has(p.id)));
 setSelectedIds(new Set());
 setShowBulkConfirm(false);
 } catch (err) {
 alert('Error deleting parties: ' + err.message);
 } finally {
 setDeleting(false);
 }
 };

 const handleDeleteSingle = async (id) => {
 if (!window.confirm('Are you sure you want to delete this party?')) return;
 try {
 const { error } = await supabase.from('parties').delete().eq('id', id);
 if (error) throw error;
 setParties(parties.filter(p => p.id !== id));
 setActiveMenu(null);
 } catch (err) {
 alert('Error deleting party: ' + err.message);
 }
 };

 const toggleSelect = (id) => {
 const next = new Set(selectedIds);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 setSelectedIds(next);
 };

 const toggleSelectAll = () => {
 if (selectedIds.size === currentItems.length) {
 setSelectedIds(new Set());
 } else {
 setSelectedIds(new Set(currentItems.map(p => p.id)));
 }
 };

 // Close menus on outside click
 useEffect(() => {
 const handleClick = () => setActiveMenu(null);
 document.addEventListener('click', handleClick);
 return () => document.removeEventListener('click', handleClick);
 }, []);

 // Filter Data
 const filteredParties = useMemo(() => {
 return parties.filter(p => {
 const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
 (p.mobile || '').includes(searchTerm);
 const matchesType = typeFilter === 'All' || p.party_type === typeFilter.toLowerCase();
 const matchesCat = categoryFilter === '' || p.category_id === categoryFilter;
 return matchesSearch && matchesType && matchesCat;
 });
 }, [parties, searchTerm, typeFilter, categoryFilter]);

 // Pagination Logic removed
 const currentItems = filteredParties;

 // Summary Metrics
 const summary = useMemo(() => {
 let toCollect = 0;
 let toPay = 0;
 
 parties.forEach(p => {
 const bal = Number(p.current_balance) || 0;
 if (bal > 0 && p.party_type === 'customer') toCollect += bal;
 if (bal > 0 && p.party_type === 'supplier') toPay += bal; // Assuming positive balance for suppliers means they owe us? Or negative means we owe them? In standard accounting, to collect is positive, to pay is negative. Let's strictly follow instructions: SUM where current_balance > 0.
 // Wait, instructions say: To Pay - SUM(current_balance) where party_type = 'supplier' AND current_balance > 0. I will follow exactly.
 });

 return { total: parties.length, toCollect, toPay };
 }, [parties]);

 const formatAmt = (num) => `₹ ${Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

 const getTypeColor = (type) => {
 switch (type) {
 case 'customer': return 'bg-green-100 text-green-700';
 case 'supplier': return 'bg-orange-100 text-orange-700';
 case 'both': return 'bg-blue-100 text-blue-700';
 default: return 'bg-surface-100 text-surface-700';
 }
 };

 return (
 <div className="flex flex-col flex-1 min-h-0 pt-4">
 {error && (
 <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in flex items-start gap-2">
 <HiOutlineExclamationCircle className="mt-0.5 text-red-400 w-5 h-5" />
 <span>{error}</span>
 </div>
 )}

 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <h1 className="text-xl font-bold text-surface-900">Parties</h1>
 </div>
 <Link 
 to="/parties/new"
 className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 shadow-sm flex items-center gap-2"
 >
 <HiOutlinePlus className="w-4 h-4" /> Create Party
 </Link>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
 {[
 { label: 'All Parties', value: summary.total, color: 'text-surface-900' },
 { label: 'To Collect (Customers)', value: formatAmt(summary.toCollect), color: 'text-green-600' },
 { label: 'To Pay (Suppliers)', value: formatAmt(summary.toPay), color: 'text-red-600' }
 ].map((card, idx) => (
 <div key={idx} className="bg-white rounded-2xl shadow-sm border border-surface-200 p-5 flex flex-col justify-center">
 <h3 className="text-sm font-medium text-surface-500 mb-1">{card.label}</h3>
 {loading ? (
 <div className="h-8 w-24 bg-surface-200 rounded animate-pulse mt-1" />
 ) : (
 <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
 )}
 </div>
 ))}
 </div>

 {/* Main Content Area */}
 <div className="bg-white rounded-2xl shadow-sm border border-surface-200 flex flex-col flex-1 min-h-0">
 
 {/* Filters Bar */}
 <div className="p-4 border-b border-surface-200 flex flex-wrap gap-4 items-center justify-between bg-surface-50/50 rounded-t-2xl">
 <div className="flex flex-wrap items-center gap-4 flex-1">
 <div className="relative w-full max-w-xs">
 <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 w-5 h-5" />
 <input 
 type="text" 
 placeholder="Search name or phone..." 
 value={searchTerm}
 onChange={(e) => { setSearchTerm(e.target.value); }}
 className="w-full pl-10 pr-4 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
 />
 </div>

 <select 
 value={typeFilter}
 onChange={(e) => { setTypeFilter(e.target.value); }}
 className="border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
 >
 <option value="All">All Types</option>
 <option value="Customer">Customer</option>
 <option value="Supplier">Supplier</option>
 <option value="Both">Both</option>
 </select>

 <select 
 value={categoryFilter}
 onChange={(e) => { setCategoryFilter(e.target.value); }}
 className="border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 max-w-[200px] truncate"
 >
 <option value="">All Categories</option>
 {categories.length === 0 && <option value="" disabled>No categories</option>}
 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
 </select>
 </div>

 {selectedIds.size > 0 && (
 <button 
 onClick={() => setShowBulkConfirm(true)}
 className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 flex items-center gap-2 border border-red-200"
 >
 <HiOutlineTrash className="w-4 h-4" /> Delete ({selectedIds.size})
 </button>
 )}
 </div>

 {/* Table */}
 <div className="overflow-auto flex-1 min-h-0">
 <table className="w-full text-left border-collapse whitespace-nowrap">
 <thead className="sticky top-0 z-10 shadow-sm bg-white">
 <tr className="border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500 bg-white">
 <th className="px-6 py-4 w-12">
 <input 
 type="checkbox" 
 checked={selectedIds.size === currentItems.length && currentItems.length > 0}
 onChange={toggleSelectAll}
 className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
 />
 </th>
 <th className="px-6 py-4 font-semibold">Party Name</th>
 <th className="px-6 py-4 font-semibold">Category</th>
 <th className="px-6 py-4 font-semibold">Mobile</th>
 <th className="px-6 py-4 font-semibold">Type</th>
 <th className="px-6 py-4 font-semibold text-right">Balance</th>
 <th className="px-6 py-4 font-semibold text-center w-24">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-surface-100">
 {loading ? (
 <tr>
 <td colSpan="7" className="py-16 text-center">
 <div className="flex flex-col items-center justify-center">
 <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
 <span className="text-surface-500">Loading parties...</span>
 </div>
 </td>
 </tr>
 ) : currentItems.length === 0 ? (
 <tr>
 <td colSpan="7" className="py-20 text-center text-surface-500">
 <div className="flex flex-col items-center">
 <div className="w-16 h-16 bg-surface-50 rounded-full flex items-center justify-center mb-4">
 <HiOutlineUserGroup className="w-8 h-8 text-surface-400" />
 </div>
 <p className="text-base font-semibold text-surface-700">No parties found</p>
 <p className="text-sm mt-1 mb-5">Click + Create Party to add your first customer or supplier.</p>
 <Link 
 to="/parties/new"
 className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700"
 >
 + Create Party
 </Link>
 </div>
 </td>
 </tr>
 ) : (
 currentItems.map(party => (
 <tr key={party.id} className="hover:bg-surface-50/50 group transition-colors">
 <td className="px-6 py-4">
 <input 
 type="checkbox" 
 checked={selectedIds.has(party.id)}
 onChange={() => toggleSelect(party.id)}
 className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
 />
 </td>
 <td className="px-6 py-4">
 <Link to={`/parties/${party.id}`} className="font-bold text-surface-900 hover:text-primary-600 transition-colors">
 {party.name}
 </Link>
 </td>
 <td className="px-6 py-4 text-sm text-surface-600">
 {party.party_categories ? party.party_categories.name : '-'}
 </td>
 <td className="px-6 py-4 text-sm text-surface-600">{party.mobile || '-'}</td>
 <td className="px-6 py-4">
 <span className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${getTypeColor(party.party_type)}`}>
 {party.party_type}
 </span>
 </td>
 <td className="px-6 py-4 text-sm font-bold text-right">
 <span className={
 Number(party.current_balance) > 0 ? 'text-green-600' : 
 Number(party.current_balance) < 0 ? 'text-red-600' : 'text-surface-400'
 }>
 {formatAmt(party.current_balance || 0)}
 </span>
 </td>
 <td className="px-6 py-4 text-center">
 <div className="relative inline-block text-left">
 <button 
 onClick={(e) => {
 e.stopPropagation();
 setActiveMenu(activeMenu === party.id ? null : party.id);
 }}
 className="p-1.5 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-md transition-colors"
 >
 <HiOutlineDotsVertical className="w-5 h-5" />
 </button>

 {activeMenu === party.id && (
 <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 py-1" onClick={e => e.stopPropagation()}>
 <Link to={`/parties/${party.id}`} className="flex items-center px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 hover:text-primary-600">
 <HiOutlineEye className="mr-3 w-4 h-4" /> View Ledger
 </Link>
 <Link to={`/parties/${party.id}/edit`} className="flex items-center px-4 py-2 text-sm text-surface-700 hover:bg-surface-50">
 <HiOutlinePencil className="mr-3 w-4 h-4" /> Edit
 </Link>
 <Link to={`/billing/new?party=${party.id}`} className="flex items-center px-4 py-2 text-sm text-surface-700 hover:bg-surface-50">
 <HiOutlineDocumentAdd className="mr-3 w-4 h-4" /> Create Bill
 </Link>
 <button onClick={() => handleDeleteSingle(party.id)} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50">
 <HiOutlineTrash className="mr-3 w-4 h-4" /> Delete
 </button>
 </div>
 )}
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 
 </div>

 {/* Bulk Delete Modal */}
 {showBulkConfirm && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm animate-fade-in">
 <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
 <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
 <HiOutlineExclamationCircle className="w-8 h-8" />
 </div>
 <h3 className="text-lg font-bold text-surface-900 mb-2">Delete {selectedIds.size} Parties?</h3>
 <p className="text-sm text-surface-500 mb-6">This action cannot be undone. All selected parties will be permanently removed.</p>
 <div className="flex gap-3 justify-center">
 <button 
 onClick={() => setShowBulkConfirm(false)}
 className="px-5 py-2 text-sm font-semibold text-surface-700 bg-surface-100 rounded-xl hover:bg-surface-200"
 >
 Cancel
 </button>
 <button 
 onClick={handleBulkDelete}
 disabled={deleting}
 className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-70 flex items-center gap-2"
 >
 {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
 Yes, Delete
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
