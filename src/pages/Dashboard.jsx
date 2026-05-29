import { useState, useEffect } from 'react';
import { 
  HiOutlineArrowNarrowDown, 
  HiOutlineArrowNarrowUp, 
  HiOutlineCash, 
  HiOutlineRefresh,
  HiOutlineExclamation,
  HiOutlineDocumentText,
  HiOutlineBell,
  HiOutlineTrendingUp
} from 'react-icons/hi';
import { supabase } from '../supabaseClient';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    toCollect: 0,
    toPay: 0,
    todaySales: 0,
    totalCash: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [chartData, setChartData] = useState([]);
  
  const [chartView, setChartView] = useState('Daily');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Balances (To Collect & To Pay)
      const [{ data: cData }, { data: sData }] = await Promise.all([
        supabase.from('parties').select('current_balance').eq('party_type', 'customer'),
        supabase.from('parties').select('current_balance').eq('party_type', 'supplier')
      ]);
      
      const toCollect = (cData || []).reduce((sum, c) => sum + Number(c.current_balance || 0), 0);
      const toPay = (sData || []).reduce((sum, s) => sum + Number(s.current_balance || 0), 0);

      // 2. Fetch Today's Sales
      const todayString = new Date().toISOString().split('T')[0];
      const { data: todayBills } = await supabase
        .from('bills')
        .select('grand_total')
        .eq('status', 'final')
        .eq('date', todayString);
      const todaySales = (todayBills || []).reduce((sum, b) => sum + Number(b.grand_total || 0), 0);

      // 3. Fetch Total Cash Balance
      const { data: payments } = await supabase.from('bill_payments').select('amount');
      const totalCash = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

      setStats({ toCollect, toPay, todaySales, totalCash });

      // 4. Fetch Pending Payments (Top 5 customers with balance > 0)
      const { data: topcustomers } = await supabase
        .from('parties').select('name, mobile, current_balance').eq('party_type', 'customer').gt('current_balance', 0).order('current_balance', { ascending: false })
        .limit(5);
      setPendingPayments(topcustomers || []);

      // 5. Fetch Low Stock
      const { data: products } = await supabase.from('products').select('name, stock_qty, low_stock_alert_qty');
      const lowStockItems = (products || [])
        .filter(p => Number(p.stock_qty) <= Number(p.low_stock_alert_qty))
        .slice(0, 10);
      setLowStock(lowStockItems);

      // 6. Fetch Latest Transactions (Merge Sales, Purchases, Quotations)
      const [{ data: sales }, { data: purchases }, { data: quotations }] = await Promise.all([
        supabase.from('bills').select('*, customers:parties(name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('purchase_invoices').select('*, suppliers:parties(name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('quotations').select('*, customers:parties(name)').order('created_at', { ascending: false }).limit(10)
      ]);

      const mergedTxns = [
        ...(sales || []).map(s => ({
          id: s.id,
          date: s.date,
          type: 'Sales',
          txnNo: s.bill_no,
          partyName: s.customers?.name || 'Unknown',
          amount: s.grand_total || (Number(s.balance_due || 0) + Number(s.advance_paid || 0)),
          sortDate: new Date(s.created_at || s.date).getTime()
        })),
        ...(purchases || []).map(p => ({
          id: p.id,
          date: p.date,
          type: 'Purchase',
          txnNo: p.bill_no,
          partyName: p.suppliers?.name || 'Unknown',
          amount: p.grand_total || (Number(p.balance_due || 0) + Number(p.advance_paid || 0)),
          sortDate: new Date(p.created_at || p.date).getTime()
        })),
        ...(quotations || []).map(q => ({
          id: q.id,
          date: q.date,
          type: 'Quotation',
          txnNo: q.quote_no,
          partyName: q.customers?.name || 'Unknown',
          amount: q.grand_total,
          sortDate: new Date(q.created_at || q.date).getTime()
        }))
      ].sort((a, b) => b.sortDate - a.sortDate).slice(0, 10);
      setTransactions(mergedTxns);

      // 7. Fetch all final bills for the chart
      const { data: chartBills } = await supabase.from('bills').select('date, grand_total').eq('status', 'final');
      processChartData(chartBills || [], chartView);

    } catch (err) {
      setError(err.message ||"Failed to load dashboard data");
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  const processChartData = (bills, viewType) => {
    const dataMap = {};
    const today = new Date();

    if (viewType === 'Daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i);
        dataMap[format(d, 'yyyy-MM-dd')] = { name: format(d, 'EEE'), amount: 0, fullDate: format(d, 'yyyy-MM-dd') };
      }
      bills.forEach(b => {
        if (dataMap[b.date]) {
          dataMap[b.date].amount += Number(b.grand_total || 0);
        }
      });
    } else if (viewType === 'Weekly') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const wStart = startOfWeek(subWeeks(today, i));
        const wEnd = endOfWeek(subWeeks(today, i));
        const key = `Week ${format(wStart, 'dd MMM')}`;
        dataMap[key] = { name: key, amount: 0, start: wStart, end: wEnd };
      }
      bills.forEach(b => {
        const bDate = parseISO(b.date);
        Object.values(dataMap).forEach(week => {
          if (isWithinInterval(bDate, { start: week.start, end: week.end })) {
            week.amount += Number(b.grand_total || 0);
          }
        });
      });
    } else if (viewType === 'Monthly') {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const m = startOfMonth(subMonths(today, i));
        const key = format(m, 'MMM yyyy');
        dataMap[key] = { name: format(m, 'MMM'), amount: 0, monthStr: key };
      }
      bills.forEach(b => {
        const bDate = parseISO(b.date);
        const key = format(bDate, 'MMM yyyy');
        if (dataMap[key]) {
          dataMap[key].amount += Number(b.grand_total || 0);
        }
      });
    }
    setChartData(Object.values(dataMap));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Re-process chart data when view changes
  useEffect(() => {
    const fetchOnlyBillsForChart = async () => {
      const { data } = await supabase.from('bills').select('date, grand_total').eq('status', 'final');
      processChartData(data || [], chartView);
    };
    if (!loading) {
      fetchOnlyBillsForChart();
    }
  }, [chartView]);

  const fmt = (val) => Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  if (loading) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-surface-50">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-surface-500 font-medium animate-pulse">Gathering insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8">
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-3">
          <HiOutlineExclamation className="w-6 h-6" />
          {error}
        </div>
      </div>
    );
  }

  const StatCard = ({ title, amount, icon: Icon, color, bgGradient }) => (
    <div className={`relative overflow-hidden rounded-2xl ${bgGradient} text-white p-6 shadow-xl shadow-${color}-500/20 transform transition-transform hover:-translate-y-1`}>
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <h3 className="text-white/80 font-medium text-sm tracking-wide uppercase">{title}</h3>
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-3xl font-bold tracking-tight">₹ {fmt(amount)}</div>
        </div>
      </div>
      {/* Decorative Background Shapes */}
      <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
      <div className="absolute -top-6 -left-6 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#f8fafc]">
      
      {/* Header */}
      <div className="px-8 py-6 bg-white/80 backdrop-blur-md border-b border-slate-200 flex justify-between items-center z-10 sticky top-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome back, <span className="text-indigo-600">{user?.user_metadata?.full_name || 'Admin'}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-medium text-slate-400">
            Last synced: {format(lastUpdated, 'hh:mm a')}
          </div>
          <button 
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:shadow-sm transition-all font-bold text-sm"
          >
            <HiOutlineRefresh className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="To Collect" 
            amount={stats.toCollect} 
            icon={HiOutlineArrowNarrowDown} 
            color="emerald"
            bgGradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
          />
          <StatCard 
            title="To Pay" 
            amount={stats.toPay} 
            icon={HiOutlineArrowNarrowUp} 
            color="rose"
            bgGradient="bg-gradient-to-br from-rose-500 to-rose-700"
          />
          <StatCard 
            title="Today's Sales" 
            amount={stats.todaySales} 
            icon={HiOutlineTrendingUp} 
            color="indigo"
            bgGradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
          />
          <StatCard 
            title="Total Cash" 
            amount={stats.totalCash} 
            icon={HiOutlineCash} 
            color="amber"
            bgGradient="bg-gradient-to-br from-amber-500 to-amber-700"
          />
        </div>

        {/* Charts & Pending section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <HiOutlineTrendingUp className="text-indigo-500 w-5 h-5" /> Revenue Overview
              </h2>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {['Daily', 'Weekly', 'Monthly'].map(view => (
                  <button
                    key={view}
                    onClick={() => setChartView(view)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                      chartView === view ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 flex-1 min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val >= 1000 ? (val/1000)+'k' : val}`} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`₹ ${fmt(value)}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <HiOutlineExclamation className="text-rose-500 w-5 h-5" /> Low Stock
              </h2>
              <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-bold">{lowStock.length} items</span>
            </div>
            <div className="p-2 flex-1 overflow-y-auto">
              {lowStock.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <HiOutlineExclamation className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="font-medium text-sm">Stock levels look good!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {lowStock.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                      <div className="font-medium text-sm text-slate-700 truncate pr-4">{item.name}</div>
                      <div className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md group-hover:bg-rose-100 transition-colors whitespace-nowrap">
                        {item.stock_qty} left
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Latest Transactions Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <HiOutlineDocumentText className="text-indigo-500 w-5 h-5" /> Latest Transactions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Txn No</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Party</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-medium text-sm">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {format(new Date(txn.date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider ${
                          txn.type === 'Sales' ? 'bg-emerald-50 text-emerald-600' :
                          txn.type === 'Purchase' ? 'bg-rose-50 text-rose-600' :
                          'bg-indigo-50 text-indigo-600'
                        }`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                        {txn.txnNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                        {txn.partyName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right">
                        ₹ {fmt(txn.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
