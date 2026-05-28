import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { 
 HiOutlineUsers, 
 HiOutlinePlus, 
 HiOutlineSearch, 
 HiOutlineCash,
 HiOutlineCreditCard,
 HiOutlineEye,
 HiOutlinePencil,
 HiOutlineTrash,
 HiOutlineReceiptTax
} from 'react-icons/hi';

export default function CarpenterList() {
 const navigate = useNavigate();
 const [carpenters, setCarpenters] = useState([]);
 const [searchTerm, setSearchTerm] = useState('');
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);

 // Summary state
 const [stats, setStats] = useState({
 totalCarpenters: 0,
 totalReferredSales: 0,
 totalCommissionEarned: 0,
 pendingCommission: 0
 });

 useEffect(() => {
 fetchData();
 }, []);

 const fetchData = async () => {
 setLoading(true);
 try {
 // Fetch all carpenters and their related bills and payments
 const { data, error } = await supabase
 .from('carpenters')
 .select(`
 *,
 bills (*),
 carpenter_payments (*)
 `);

 if (error) throw error;

 let totalSales = 0;
 let totalEarned = 0;
 let totalPendingGlobal = 0;

 const processedData = (data || []).map(carpenter => {
 const bills = carpenter.bills || [];
 const payments = carpenter.carpenter_payments || [];
 const commissionRate = Number(carpenter.default_commission_rate) || 0;

 // Earned commission from bills
 const referredCustomersCount = bills.length;
 let carpenterSales = 0;
 let carpenterEarned = 0;

 bills.forEach(bill => {
 const billTotal = Number(bill.grand_total) || 0;
 const billCommissionRate = Number(bill.commission_rate) || commissionRate;
 carpenterSales += billTotal;
 carpenterEarned += (billTotal * billCommissionRate) / 100;
 });
 
 // Paid commission
 let carpenterPaid = 0;
 payments.forEach(payment => {
 carpenterPaid += Number(payment.amount) || 0;
 });

 const pendingBalance = carpenterEarned - carpenterPaid;

 totalSales += carpenterSales;
 totalEarned += carpenterEarned;
 totalPendingGlobal += pendingBalance;

 return {
 ...carpenter,
 referredCustomersCount,
 carpenterEarned,
 carpenterPaid,
 pendingBalance
 };
 });

 setStats({
 totalCarpenters: processedData.length,
 totalReferredSales: totalSales,
 totalCommissionEarned: totalEarned,
 pendingCommission: totalPendingGlobal
 });

 setCarpenters(processedData);

 } catch (err) {
 setError(err.message || 'Failed to fetch carpenters');
 } finally {
 setLoading(false);
 }
 };

 const handleDelete = async (id) => {
 if (!window.confirm('Are you sure you want to delete this carpenter?')) return;
 try {
 const { error } = await supabase.from('carpenters').delete().eq('id', id);
 if (error) throw error;
 fetchData(); // refresh list
 } catch (err) {
 alert('Error deleting: ' + err.message);
 }
 };

 const filteredCarpenters = carpenters.filter(c => 
 c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 c.phone?.includes(searchTerm)
 );

 return (
 <div className="max-w-6xl mx-auto">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
 <HiOutlineUsers className="w-5 h-5 text-orange-600" />
 </div>
 <div>
 <h1 className="text-xl font-bold text-surface-800">Carpenters (Referrals)</h1>
 <p className="text-xs text-surface-400">Manage referring carpenters and commissions.</p>
 </div>
 </div>
 <Link 
 to="/carpenters/new"
 className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-sm"
 >
 <HiOutlinePlus className="w-4 h-4" /> Add Carpenter
 </Link>
 </div>

 {error && (
 <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in flex items-start gap-2">
 <span className="mt-0.5 text-red-400">âš </span>
 <span>{error}</span>
 </div>
 )}

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
 <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-sm flex flex-col justify-center">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
 <HiOutlineUsers className="w-5 h-5" />
 </div>
 <p className="text-sm font-medium text-surface-500">Total Carpenters</p>
 </div>
 <p className="text-2xl font-bold text-surface-900">{stats.totalCarpenters}</p>
 </div>

 <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-sm flex flex-col justify-center">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
 <HiOutlineReceiptTax className="w-5 h-5" />
 </div>
 <p className="text-sm font-medium text-surface-500">Total Referred Sales</p>
 </div>
 <p className="text-2xl font-bold text-surface-900">₹{stats.totalReferredSales.toLocaleString('en-IN')}</p>
 </div>

 <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-sm flex flex-col justify-center">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-green-50 text-green-600 rounded-lg">
 <HiOutlineCash className="w-5 h-5" />
 </div>
 <p className="text-sm font-medium text-surface-500">Commission Earned</p>
 </div>
 <p className="text-2xl font-bold text-surface-900">₹{stats.totalCommissionEarned.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
 </div>

 <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-sm flex flex-col justify-center">
 <div className="flex items-center gap-3 mb-2">
 <div className="p-2 bg-red-50 text-red-600 rounded-lg">
 <HiOutlineCreditCard className="w-5 h-5" />
 </div>
 <p className="text-sm font-medium text-surface-500">Pending Commission</p>
 </div>
 <p className="text-2xl font-bold text-surface-900">₹{stats.pendingCommission.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
 </div>
 </div>

 {/* Main Table View */}
 <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
 {/* Search */}
 <div className="p-4 border-b border-surface-200">
 <div className="relative w-full md:w-96">
 <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input 
 type="text" 
 placeholder="Search carpenters by name or phone..." 
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
 />
 </div>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-surface-50 text-surface-500 uppercase tracking-wide text-xs">
 <th className="text-left py-4 px-6 font-medium">Name & Contact</th>
 <th className="text-center py-4 px-6 font-medium">Referred Customers</th>
 <th className="text-right py-4 px-6 font-medium">Commission Earned</th>
 <th className="text-right py-4 px-6 font-medium">Commission Paid</th>
 <th className="text-right py-4 px-6 font-medium">Pending Balance</th>
 <th className="text-center py-4 px-6 font-medium">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-surface-100">
 {loading ? (
 <tr>
 <td colSpan="6" className="py-16 text-center">
 <div className="flex flex-col items-center justify-center">
 <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
 <span className="text-surface-500">Loading carpenters.</span>
 </div>
 </td>
 </tr>
 ) : filteredCarpenters.length === 0 ? (
 <tr>
 <td colSpan="6" className="py-16 text-center text-surface-500">
 <div className="flex flex-col items-center">
 <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mb-3">
 <HiOutlineUsers className="w-8 h-8 text-surface-400" />
 </div>
 <p className="text-base font-semibold text-surface-700">No carpenters found</p>
 <p className="text-sm mt-1 mb-4">Click"Add Carpenter" above to create one.</p>
 <Link 
 to="/carpenters/new"
 className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700"
 >
 + Add Carpenter
 </Link>
 </div>
 </td>
 </tr>
 ) : (
 filteredCarpenters.map((carpenter) => (
 <tr key={carpenter.id} className="hover:bg-surface-50 transition-colors">
 <td className="py-4 px-6">
 <p className="font-semibold text-surface-800">{carpenter.name}</p>
 <p className="text-xs text-surface-500">{carpenter.phone || 'No phone'}</p>
 </td>
 <td className="py-4 px-6 text-center">
 <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-surface-100 text-surface-700 text-xs font-medium">
 {carpenter.referredCustomersCount}
 </span>
 </td>
 <td className="py-4 px-6 text-right text-surface-600 font-medium">
 ₹{carpenter.carpenterEarned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 </td>
 <td className="py-4 px-6 text-right text-green-600 font-medium">
 ₹{carpenter.carpenterPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 </td>
 <td className="py-4 px-6 text-right font-bold text-red-600">
 ₹{carpenter.pendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 </td>
 <td className="py-4 px-6">
 <div className="flex items-center justify-center gap-2">
 <button 
 onClick={() => navigate(`/carpenters/${carpenter.id}`)}
 className="p-1.5 text-surface-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
 title="View Details"
 >
 <HiOutlineEye className="w-5 h-5" />
 </button>
 <button 
 onClick={() => navigate(`/carpenters/${carpenter.id}/edit`)}
 className="p-1.5 text-surface-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
 title="Edit"
 >
 <HiOutlinePencil className="w-5 h-5" />
 </button>
 <button 
 onClick={() => handleDelete(carpenter.id)}
 className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
 title="Delete"
 >
 <HiOutlineTrash className="w-5 h-5" />
 </button>
 </div>
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
