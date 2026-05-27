import { useState, useEffect } from 'react';
import { 
  HiOutlineArrowNarrowDown, 
  HiOutlineArrowNarrowUp, 
  HiOutlineCash, 
  HiOutlineRefresh,
  HiOutlineExclamation,
  HiOutlineDocumentText,
  HiOutlineBell
} from 'react-icons/hi';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';

export default function Dashboard() {
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
        supabase.from('customers').select('balance'),
        supabase.from('suppliers').select('balance')
      ]);
      
      const toCollect = (cData || []).reduce((sum, c) => sum + Number(c.balance || 0), 0);
      const toPay = (sData || []).reduce((sum, s) => sum + Number(s.balance || 0), 0);

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
        .from('customers')
        .select('name, phone, balance')
        .gt('balance', 0)
        .order('balance', { ascending: false })
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
        supabase.from('bills').select('*, customers(name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('purchase_invoices').select('*, suppliers(name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('quotations').select('*, customers(name)').order('created_at', { ascending: false }).limit(10)
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
      setError(err.message || "Failed to load dashboard data");
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
        const d = subMonths(today, i);
        const key = format(d, 'yyyy-MM');
        dataMap[key] = { name: format(d, 'MMM yyyy'), amount: 0, monthKey: key };
      }
      bills.forEach(b => {
        const mKey = b.date.substring(0, 7);
        if (dataMap[mKey]) {
          dataMap[mKey].amount += Number(b.grand_total || 0);
        }
      });
    }

    setChartData(Object.values(dataMap));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // When chart view changes, re-fetch just for the chart or we could cache. For simplicity, just refetch everything.
  // Actually, we can fetch just bills to save API calls, but re-fetching all is fine for now.
  const handleViewChange = (e) => {
    setChartView(e.target.value);
    fetchDashboardData(); // To regenerate chart properly
  };

  const handleRemind = (customer) => {
    const text = `Hello ${customer.name},\n\nThis is a gentle reminder regarding your pending balance of ₹ ${Number(customer.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Please clear it at your earliest convenience.\n\nThank you!`;
    const url = `https://wa.me/91${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const formatDateStr = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatAmount = (num) => `₹ ${Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-16 animate-fade-in text-surface-900 bg-surface-50 min-h-screen">
      
      {/* Top Header / Title */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in flex items-start gap-2">
          <span className="mt-0.5 text-red-400">âš </span>
          <span>{error}</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-4 mt-2">
        <h1 className="text-lg font-bold text-surface-800">Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-surface-500 font-medium hidden sm:block">
            Last Updated: {format(lastUpdated, 'dd MMM yyyy, hh:mm a')}
          </span>
          <button 
            onClick={fetchDashboardData}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-surface-200 shadow-sm rounded-lg text-sm text-surface-700 hover:bg-surface-50 transition-colors"
          >
            <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main White Canvas Box */}
      <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-5 space-y-6">
        
        {/* Section 1: Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="border border-green-200 bg-green-50/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-green-100 rounded-lg"><HiOutlineArrowNarrowDown className="w-5 h-5 text-green-600" /></div>
              <span className="text-sm font-bold text-green-700">To Collect</span>
            </div>
            <div className="text-2xl font-black text-surface-900 mb-1">{formatAmount(stats.toCollect)}</div>
            <div className="text-[10px] text-surface-500 uppercase tracking-wide">From Customers</div>
          </div>
          
          <div className="border border-red-200 bg-red-50/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-red-100 rounded-lg"><HiOutlineArrowNarrowUp className="w-5 h-5 text-red-600" /></div>
              <span className="text-sm font-bold text-red-700">To Pay</span>
            </div>
            <div className="text-2xl font-black text-surface-900 mb-1">{formatAmount(stats.toPay)}</div>
            <div className="text-[10px] text-surface-500 uppercase tracking-wide">To Suppliers</div>
          </div>

          <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg"><HiOutlineDocumentText className="w-5 h-5 text-blue-600" /></div>
              <span className="text-sm font-bold text-blue-700">Today's Sales</span>
            </div>
            <div className="text-2xl font-black text-surface-900 mb-1">{formatAmount(stats.todaySales)}</div>
            <div className="text-[10px] text-surface-500 uppercase tracking-wide">Finalized Bills Today</div>
          </div>

          <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg"><HiOutlineCash className="w-5 h-5 text-purple-600" /></div>
              <span className="text-sm font-bold text-purple-700">Total Cash Received</span>
            </div>
            <div className="text-2xl font-black text-surface-900 mb-1">{formatAmount(stats.totalCash)}</div>
            <div className="text-[10px] text-surface-500 uppercase tracking-wide">All Time Payments</div>
          </div>

        </div>

        {/* Section 2: Widgets (Pending & Low Stock) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Pending Payments Widget */}
          <div className="border border-surface-200 rounded-xl flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-200 bg-surface-50/80 flex items-center gap-2">
              <HiOutlineBell className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-bold text-surface-800">Pending Payments</h3>
            </div>
            <div className="p-0 overflow-y-auto max-h-[300px]">
              <table className="w-full text-left">
                <thead className="bg-white sticky top-0">
                  <tr className="border-b border-surface-100 text-xs text-surface-500 uppercase">
                    <th className="py-2 px-4 font-semibold">Customer</th>
                    <th className="py-2 px-4 font-semibold text-right">Balance</th>
                    <th className="py-2 px-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-surface-100">
                  {pendingPayments.length === 0 ? (
                    <tr><td colSpan="3" className="py-8 text-center text-surface-400">No pending payments.</td></tr>
                  ) : (
                    pendingPayments.map((c, i) => (
                      <tr key={i} className="hover:bg-surface-50 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-surface-800">{c.name}</div>
                          <div className="text-xs text-surface-500">{c.phone || 'No phone'}</div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-red-600">{formatAmount(c.balance)}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button 
                            onClick={() => handleRemind(c)}
                            disabled={!c.phone}
                            className="text-xs px-3 py-1.5 bg-green-100 text-green-700 font-bold rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                          >
                            Remind
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Widget */}
          <div className="border border-surface-200 rounded-xl flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-200 bg-surface-50/80 flex items-center gap-2">
              <HiOutlineExclamation className="w-5 h-5 text-red-500" />
              <h3 className="text-sm font-bold text-surface-800">Low Stock Alerts</h3>
            </div>
            <div className="p-0 overflow-y-auto max-h-[300px]">
              <table className="w-full text-left">
                <thead className="bg-white sticky top-0">
                  <tr className="border-b border-surface-100 text-xs text-surface-500 uppercase">
                    <th className="py-2 px-4 font-semibold">Item Name</th>
                    <th className="py-2 px-4 font-semibold text-right">Stock Qty</th>
                    <th className="py-2 px-4 font-semibold text-right">Alert Qty</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-surface-100">
                  {lowStock.length === 0 ? (
                    <tr><td colSpan="3" className="py-8 text-center text-surface-400">Inventory is sufficiently stocked.</td></tr>
                  ) : (
                    lowStock.map((item, i) => (
                      <tr key={i} className="hover:bg-surface-50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-surface-800">{item.name}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-red-600">{item.stock_qty}</td>
                        <td className="py-2.5 px-4 text-right text-surface-500">{item.low_stock_alert_qty}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Section 3: Split Layout (Transactions & Chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Left: Sales Chart */}
          <div className="border border-surface-200 rounded-xl flex flex-col">
            <div className="px-5 py-3 border-b border-surface-200 bg-surface-50/80 flex items-center justify-between">
              <h3 className="text-sm font-bold text-surface-800">Sales Report</h3>
              <select 
                value={chartView} 
                onChange={handleViewChange}
                className="text-xs border-surface-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="Daily">Daily (Last 7 Days)</option>
                <option value="Weekly">Weekly (Last 4 Weeks)</option>
                <option value="Monthly">Monthly (Last 6 Months)</option>
              </select>
            </div>
            <div className="p-5 flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    tickFormatter={(val) => `₹${val}`}
                    width={80}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`₹ ${Number(value).toLocaleString('en-IN')}`, 'Sales']}
                  />
                  <Bar dataKey="amount" fill="#1a56db" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right: Latest Transactions */}
          <div className="border border-surface-200 rounded-xl flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-200 bg-surface-50/80">
              <h3 className="text-sm font-bold text-surface-800">Latest Transactions</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0">
                  <tr className="border-b border-surface-100 text-xs text-surface-500 uppercase">
                    <th className="py-2 px-4 font-semibold">Date</th>
                    <th className="py-2 px-4 font-semibold">Type</th>
                    <th className="py-2 px-4 font-semibold">Party</th>
                    <th className="py-2 px-4 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-surface-100">
                  {transactions.length === 0 ? (
                    <tr><td colSpan="4" className="py-8 text-center text-surface-400">No transactions yet.</td></tr>
                  ) : (
                    transactions.map((txn) => {
                      let badgeColor = 'bg-surface-100 text-surface-600';
                      if (txn.type === 'Sales') badgeColor = 'bg-green-100 text-green-700';
                      if (txn.type === 'Purchase') badgeColor = 'bg-orange-100 text-orange-700';
                      if (txn.type === 'Quotation') badgeColor = 'bg-blue-100 text-blue-700';

                      return (
                        <tr key={`${txn.type}-${txn.id}`} className="hover:bg-surface-50 transition-colors">
                          <td className="py-2.5 px-4 whitespace-nowrap text-xs text-surface-600">{formatDateStr(txn.date)}</td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeColor}`}>
                              {txn.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-medium text-surface-800">
                            {txn.partyName}
                            <div className="text-[10px] text-surface-400 font-normal">{txn.txnNo}</div>
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-surface-900">
                            {formatAmount(txn.amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
