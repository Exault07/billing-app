import { useState, useEffect } from 'react';
import { 
  HiOutlineArrowNarrowDown, 
  HiOutlineArrowNarrowUp, 
  HiOutlineLibrary, 
  HiOutlineRefresh
} from 'react-icons/hi';
import { supabase } from '../supabaseClient';

export default function Dashboard() {
  const [stats, setStats] = useState({
    toCollect: 0,
    toPay: 0,
    cashBankBalance: 4321413.01, // Mocked for now to match screenshot design
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
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

        // 2. Fetch Latest Transactions (Merge Sales & Purchases)
        const [{ data: sales }, { data: purchases }] = await Promise.all([
          supabase.from('bills').select('*, customers(name)').order('created_at', { ascending: false }).limit(5),
          supabase.from('purchase_invoices').select('*, suppliers(name)').order('created_at', { ascending: false }).limit(5)
        ]);

        const mergedTxns = [
          ...(sales || []).map(s => ({
            id: s.id,
            date: s.date,
            type: 'Sales Invoices',
            txnNo: s.bill_no,
            partyName: s.customers?.name || 'Unknown',
            amount: s.grand_total || (Number(s.balance_due || 0) + Number(s.advance_paid || 0)),
            sortDate: new Date(s.date).getTime()
          })),
          ...(purchases || []).map(p => ({
            id: p.id,
            date: p.date,
            type: 'Purchase Invoices',
            txnNo: p.bill_no,
            partyName: p.suppliers?.name || 'Unknown',
            amount: p.grand_total || (Number(p.balance_due || 0) + Number(p.advance_paid || 0)),
            sortDate: new Date(p.date).getTime()
          }))
        ].sort((a, b) => b.sortDate - a.sortDate).slice(0, 5);

        if (!cancelled) {
          setStats(prev => ({ ...prev, toCollect, toPay }));
          setTransactions(mergedTxns);
        }
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDashboardData();
    return () => { cancelled = true; };
  }, []);

  // Format date to "DD MMM YYYY" like screenshot
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-16 animate-fade-in text-surface-900 bg-surface-50 min-h-screen">
      {/* Top Header / Title */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <h1 className="text-lg font-bold text-surface-800">Dashboard</h1>
      </div>

      {/* Main White Canvas Box */}
      <div className="bg-white rounded-md shadow-sm border border-surface-200 p-5">
        
        {/* Section 1: Business Overview */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold text-surface-800">Business Overview</h2>
          <div className="flex items-center gap-1 text-[11px] text-surface-500">
            <span>Last Update: {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            <button className="text-blue-600 hover:bg-blue-50 p-1 rounded-md ml-1"><HiOutlineRefresh className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* To Collect */}
          <div className="border border-green-200 bg-[#f8fdf9] rounded-md p-4 relative group cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <HiOutlineArrowNarrowDown className="w-4 h-4 text-green-600" />
              <span className="text-[13px] font-medium text-green-600">To Collect</span>
            </div>
            <div className="text-[22px] font-semibold text-surface-900">
              ₹ {stats.toCollect.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          
          {/* To Pay */}
          <div className="border border-red-100 bg-[#fffaf9] rounded-md p-4 relative group cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <HiOutlineArrowNarrowUp className="w-4 h-4 text-red-600" />
              <span className="text-[13px] font-medium text-red-600">To Pay</span>
            </div>
            <div className="text-[22px] font-semibold text-surface-900">
              ₹ {stats.toPay.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </div>
          </div>

          {/* Total Cash + Bank */}
          <div className="border border-surface-200 bg-white rounded-md p-4 relative group cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <HiOutlineLibrary className="w-4 h-4 text-surface-600" />
              <span className="text-[13px] font-medium text-surface-600">Total Cash + Bank Balance</span>
            </div>
            <div className="text-[22px] font-semibold text-surface-900">
              ₹ {stats.cashBankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Section 2: Split Layout (Transactions & Checklist) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          
          {/* Left: Latest Transactions */}
          <div className="lg:col-span-2 border border-surface-200 rounded-md">
            <div className="px-4 py-3 border-b border-surface-200 bg-surface-50/50">
              <h3 className="text-[14px] font-bold text-surface-800">Latest Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 text-[11px] font-bold text-surface-500 uppercase">
                    <th className="py-2.5 px-4 font-semibold">DATE</th>
                    <th className="py-2.5 px-4 font-semibold">TYPE</th>
                    <th className="py-2.5 px-4 font-semibold">TXN NO</th>
                    <th className="py-2.5 px-4 font-semibold">PARTY NAME</th>
                    <th className="py-2.5 px-4 font-semibold text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] text-surface-800">
                  {loading ? (
                    <tr><td colSpan="5" className="py-8 text-center text-surface-400">Loading transactions...</td></tr>
                  ) : transactions.length === 0 ? (
                    <tr><td colSpan="5" className="py-8 text-center text-surface-400">No transactions recorded yet.</td></tr>
                  ) : (
                    transactions.map((txn, i) => (
                      <tr key={txn.id} className={`border-b border-surface-100 hover:bg-surface-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}>
                        <td className="py-2.5 px-4 whitespace-nowrap">{formatDate(txn.date)}</td>
                        <td className="py-2.5 px-4 whitespace-nowrap">{txn.type}</td>
                        <td className="py-2.5 px-4 text-surface-500">{txn.txnNo.replace('BILL-', '').replace('POS-', '')}</td>
                        <td className="py-2.5 px-4">{txn.partyName}</td>
                        <td className="py-2.5 px-4 text-right">₹ {Number(txn.amount).toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="py-2.5 text-center border-t border-surface-200 bg-white rounded-b-md">
              <button className="text-[12px] text-blue-600 hover:underline font-medium">See All Transactions</button>
            </div>
          </div>

          {/* Right: Today's Checklist */}
          <div className="lg:col-span-1 border border-surface-200 rounded-md flex flex-col">
            <div className="px-4 py-3 border-b border-surface-200 bg-surface-50/50">
              <h3 className="text-[14px] font-bold text-surface-800">Today's Checklist</h3>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white rounded-b-md">
              {/* Traffic Cone Illustration Placeholder */}
              <div className="w-32 h-24 mb-4 relative flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full text-orange-400" fill="currentColor">
                  <path d="M50 10 L80 80 L20 80 Z" />
                  <path d="M40 30 L60 30 M35 50 L65 50" stroke="white" strokeWidth="8" />
                  <ellipse cx="50" cy="80" rx="40" ry="10" fill="#e2e8f0" />
                </svg>
              </div>
              <p className="text-[15px] font-bold text-surface-800 mb-1">Coming Soon...</p>
              <p className="text-[12px] text-surface-500 leading-tight">Smarter daily checklist for overdue and follow-ups</p>
            </div>
          </div>

        </div>

        {/* Section 3: Sales Report Chart Placeholder */}
        <div className="border border-surface-200 rounded-md p-4 h-64 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-surface-800">Sales Report - {formatDate(new Date(Date.now() - 6*24*60*60*1000))} to {formatDate(new Date())}</h3>
            <select className="border border-surface-200 rounded-md px-3 py-1.5 text-[12px] text-surface-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          <div className="flex-1 flex items-end justify-center pb-4 relative">
            <p className="absolute bottom-2 right-2 text-[11px] text-surface-400">Last 7 days sales</p>
            
            {/* Mock Chart Area */}
            <div className="w-full h-full border-b border-l border-surface-200 relative flex items-end justify-around px-8">
              {/* Y Axis labels mock */}
              <div className="absolute left-[-50px] bottom-0 h-full flex flex-col justify-between text-[10px] text-surface-400 items-end pb-2">
                <span>₹ 1,60,000</span>
                <span>₹ 1,40,000</span>
                <span>₹ 1,20,000</span>
                <span>₹ 0</span>
              </div>
              
              {/* Green Mountain Chart Mock */}
              <div className="w-32 h-24 bg-green-100 border-2 border-green-500 rounded-t-full opacity-70 relative"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
