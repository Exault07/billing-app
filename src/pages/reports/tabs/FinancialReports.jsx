import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import ReportLayout from '../components/ReportLayout';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

// purchase_invoices: bill_no, date, supplier_id, total_amount, advance_paid, balance_due, items
// purchase_payments: purchase_id, amount, date, payment_mode
// bill_payments: bill_id, amount, date, payment_mode
// expenses: date, amount, payment_mode, category, description

export default function FinancialReports({ dateRange }) {
 const [subReport, setSubReport] = useState('pnl');
 const [data, setData] = useState([]);
 const [loading, setLoading] = useState(false);
 const [chartData, setChartData] = useState([]);

 useEffect(() => {
 fetchData();
 }, [subReport, dateRange]);

 const fetchData = async () => {
 setLoading(true);
 setData([]);
 setChartData([]);
 try {
 if (subReport === 'pnl') {
 const [{ data: bills }, { data: purchases }, { data: expenses }] = await Promise.all([
 supabase.from('bills').select('date, grand_total').gte('date', dateRange.start).lte('date', dateRange.end).eq('status', 'final'),
 supabase.from('purchase_invoices').select('date, total_amount').gte('date', dateRange.start).lte('date', dateRange.end),
 supabase.from('expenses').select('date, amount').gte('date', dateRange.start).lte('date', dateRange.end)
 ]);

 let totalSales = 0, totalPurchases = 0, totalExpenses = 0;
 const monthly = {};

 (bills || []).forEach(b => {
 totalSales += Number(b.grand_total || 0);
 const month = format(new Date(b.date), 'MMM yyyy');
 if (!monthly[month]) monthly[month] = { name: month, Sales: 0, Purchases: 0, Expenses: 0 };
 monthly[month].Sales += Number(b.grand_total || 0);
 });
 (purchases || []).forEach(p => {
 totalPurchases += Number(p.total_amount || 0);
 const month = format(new Date(p.date), 'MMM yyyy');
 if (!monthly[month]) monthly[month] = { name: month, Sales: 0, Purchases: 0, Expenses: 0 };
 monthly[month].Purchases += Number(p.total_amount || 0);
 });
 (expenses || []).forEach(e => {
 totalExpenses += Number(e.amount || 0);
 const month = format(new Date(e.date), 'MMM yyyy');
 if (!monthly[month]) monthly[month] = { name: month, Sales: 0, Purchases: 0, Expenses: 0 };
 monthly[month].Expenses += Number(e.amount || 0);
 });

 const grossProfit = totalSales - totalPurchases;
 const netProfit = grossProfit - totalExpenses;
 setData([
 { metric: 'Total Sales', amount: totalSales },
 { metric: 'Total Purchase Cost', amount: totalPurchases },
 { metric: 'Gross Profit', amount: grossProfit },
 { metric: 'Total Expenses', amount: totalExpenses },
 { metric: 'Net Profit', amount: netProfit },
 ]);
 setChartData(Object.values(monthly));
 }
 else if (subReport === 'daybook') {
 const [{ data: bills }, { data: purchases }, { data: bill_payments }, { data: pur_payments }, { data: exp }, { data: parties }] = await Promise.all([
 supabase.from('bills').select('created_at, date, bill_no, advance_paid, customer_id').gte('date', dateRange.start).lte('date', dateRange.end).eq('status', 'final'),
 supabase.from('purchase_invoices').select('created_at, date, bill_no, advance_paid, supplier_id').gte('date', dateRange.start).lte('date', dateRange.end),
 supabase.from('bill_payments').select('created_at, date, amount, payment_mode, bill_id').gte('date', dateRange.start).lte('date', dateRange.end),
 supabase.from('purchase_payments').select('created_at, date, amount, payment_mode, purchase_id').gte('date', dateRange.start).lte('date', dateRange.end),
 supabase.from('expenses').select('created_at, date, amount, payment_mode, category, description').gte('date', dateRange.start).lte('date', dateRange.end),
 supabase.from('parties').select('id, name')
 ]);

 const pMap = {};
 (parties || []).forEach(p => pMap[p.id] = p.name);

 const bMap = {};
 (bills || []).forEach(b => bMap[b.id] = { bill_no: b.bill_no, party_name: pMap[b.customer_id] });
 const purMap = {};
 (purchases || []).forEach(p => purMap[p.id] = { bill_no: p.bill_no, party_name: pMap[p.supplier_id] });

 const transactions = [];
 (bills || []).forEach(b => {
 if (Number(b.advance_paid) > 0) {
 transactions.push({ time: b.created_at, date: b.date, type: 'Sale Advance', ref: b.bill_no, party: pMap[b.customer_id] || '-', amountIn: Number(b.advance_paid), amountOut: 0, mode: '-' });
 }
 });
 (purchases || []).forEach(p => {
 if (Number(p.advance_paid) > 0) {
 transactions.push({ time: p.created_at, date: p.date, type: 'Purchase Advance', ref: p.bill_no, party: pMap[p.supplier_id] || '-', amountIn: 0, amountOut: Number(p.advance_paid), mode: '-' });
 }
 });
 (bill_payments || []).forEach(bp => {
 const ref = bMap[bp.bill_id] || {};
 transactions.push({ time: bp.created_at, date: bp.date, type: 'Payment In', ref: ref.bill_no || '-', party: ref.party_name || '-', amountIn: Number(bp.amount), amountOut: 0, mode: bp.payment_mode });
 });
 (pur_payments || []).forEach(pp => {
 const ref = purMap[pp.purchase_id] || {};
 transactions.push({ time: pp.created_at, date: pp.date, type: 'Payment Out', ref: ref.bill_no || '-', party: ref.party_name || '-', amountIn: 0, amountOut: Number(pp.amount), mode: pp.payment_mode });
 });
 (exp || []).forEach(e => {
 transactions.push({ time: e.created_at, date: e.date, type: 'Expense (' + (e.category || '') + ')', ref: '-', party: e.description || '-', amountIn: 0, amountOut: Number(e.amount), mode: e.payment_mode });
 });
 transactions.sort((a, b) => new Date(a.time) - new Date(b.time));
 setData(transactions);
 }
 else if (subReport === 'cashflow') {
 const [{ data: bill_payments }, { data: pur_payments }, { data: exp }] = await Promise.all([
 supabase.from('bill_payments').select('date, amount').gte('date', dateRange.start).lte('date', dateRange.end),
 supabase.from('purchase_payments').select('date, amount').gte('date', dateRange.start).lte('date', dateRange.end),
 supabase.from('expenses').select('date, amount').gte('date', dateRange.start).lte('date', dateRange.end)
 ]);

 const daily = {};
 const ensureDay = (d) => { if (!daily[d]) daily[d] = { date: d, In: 0, Out: 0, Net: 0 }; };
 (bill_payments || []).forEach(bp => { ensureDay(bp.date); daily[bp.date].In += Number(bp.amount || 0); });
 (pur_payments || []).forEach(pp => { ensureDay(pp.date); daily[pp.date].Out += Number(pp.amount || 0); });
 (exp || []).forEach(e => { ensureDay(e.date); daily[e.date].Out += Number(e.amount || 0); });

 const arr = Object.values(daily).map(d => ({ ...d, Net: d.In - d.Out })).sort((a, b) => new Date(a.date) - new Date(b.date));
 setData(arr);
 setChartData(arr);
 }
 else if (subReport === 'receivables' || subReport === 'payables') {
 const type = subReport === 'receivables' ? 'customer' : 'supplier';
 const { data: pts, error } = await supabase.from('parties').select('*').eq('party_type', type).gt('current_balance', 0).order('current_balance', { ascending: false });
 if (error) throw error;
 setData(pts || []);
 }
 } catch (err) {
 
 alert('Error fetching report data: ' + err.message);
 } finally {
 setLoading(false);
 }
 };

 const renderContent = () => {
 if (subReport === 'pnl') {
 const cols = [
 { header: 'Metric', accessor: r => r.metric },
 { header: 'Amount', accessor: r => '₹ ' + Number(r.amount || 0).toLocaleString('en-IN') },
 ];
 return (
 <div className="flex flex-col h-full">
 <div className="h-64 p-4 bg-white border-b border-surface-200">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={v => '₹' + (v / 1000) + 'k'} />
 <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
 <Bar dataKey="Sales" fill="#10b981" radius={[4, 4, 0, 0]} />
 <Bar dataKey="Purchases" fill="#f43f5e" radius={[4, 4, 0, 0]} />
 <Bar dataKey="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 <div className="flex-1">
 <ReportLayout title="Profit & Loss Statement" loading={loading} data={data} columns={cols} />
 </div>
 </div>
 );
 }
 else if (subReport === 'daybook') {
 let totalIn = 0, totalOut = 0;
 data.forEach(d => { totalIn += Number(d.amountIn || 0); totalOut += Number(d.amountOut || 0); });
 const cols = [
 { header: 'Date', accessor: r => r.date ? format(new Date(r.date), 'dd MMM yyyy') : '-' },
 { header: 'Type', accessor: r => r.type },
 { header: 'Ref No', accessor: r => r.ref || '-' },
 { header: 'Party / Desc', accessor: r => r.party },
 { header: 'Money In', accessor: r => r.amountIn > 0 ? '₹ ' + Number(r.amountIn).toLocaleString('en-IN') : '-' },
 { header: 'Money Out', accessor: r => r.amountOut > 0 ? '₹ ' + Number(r.amountOut).toLocaleString('en-IN') : '-' },
 { header: 'Mode', accessor: r => r.mode || '-' },
 ];
 return (
 <ReportLayout
 title="Day Book" loading={loading} data={data} columns={cols}
 summaryData={[
 { label: 'Total Money In', value: '₹ ' + totalIn.toLocaleString('en-IN') },
 { label: 'Total Money Out', value: '₹ ' + totalOut.toLocaleString('en-IN') },
 { label: 'Net for Period', value: '₹ ' + (totalIn - totalOut).toLocaleString('en-IN') },
 ]}
 />
 );
 }
 else if (subReport === 'cashflow') {
 let totalIn = 0, totalOut = 0;
 data.forEach(d => { totalIn += Number(d.In || 0); totalOut += Number(d.Out || 0); });
 const cols = [
 { header: 'Date', accessor: r => r.date ? format(new Date(r.date), 'dd MMM yyyy') : '-' },
 { header: 'Money In', accessor: r => '₹ ' + Number(r.In || 0).toLocaleString('en-IN') },
 { header: 'Money Out', accessor: r => '₹ ' + Number(r.Out || 0).toLocaleString('en-IN') },
 { header: 'Net Cash Flow', accessor: r => '₹ ' + Number(r.Net || 0).toLocaleString('en-IN') },
 ];
 return (
 <div className="flex flex-col h-full">
 <div className="h-64 p-4 bg-white border-b border-surface-200">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={v => { try { return format(new Date(v), 'dd MMM'); } catch { return v; } }} />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={v => '₹' + (v / 1000) + 'k'} />
 <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
 <Line type="monotone" dataKey="Net" stroke="#4f46e5" strokeWidth={3} dot={false} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 <div className="flex-1">
 <ReportLayout
 title="Cash Flow Report" loading={loading} data={data} columns={cols}
 summaryData={[
 { label: 'Total Inflow', value: '₹ ' + totalIn.toLocaleString('en-IN') },
 { label: 'Total Outflow', value: '₹ ' + totalOut.toLocaleString('en-IN') },
 { label: 'Net Cash Flow', value: '₹ ' + (totalIn - totalOut).toLocaleString('en-IN') },
 ]}
 />
 </div>
 </div>
 );
 }
 else if (subReport === 'receivables' || subReport === 'payables') {
 let total = 0;
 data.forEach(d => total += Number(d.current_balance || 0));
 const cols = [
 { header: 'Party Name', accessor: r => r.name },
 { header: 'Phone', accessor: r => r.mobile || '-' },
 { header: 'Balance Due', accessor: r => '₹ ' + Number(r.current_balance || 0).toLocaleString('en-IN') },
 ];
 return (
 <ReportLayout
 title={subReport === 'receivables' ? 'Outstanding Receivables' : 'Outstanding Payables'}
 loading={loading} data={data} columns={cols}
 summaryData={[
 { label: 'Total Outstanding', value: '₹ ' + total.toLocaleString('en-IN') },
 ]}
 />
 );
 }
 return null;
 };

 const types = [
 { id: 'pnl', label: 'Profit & Loss' },
 { id: 'daybook', label: 'Day Book' },
 { id: 'cashflow', label: 'Cash Flow' },
 { id: 'receivables', label: 'Outstanding Receivables' },
 { id: 'payables', label: 'Outstanding Payables' },
 ];

 return (
 <div className="flex flex-col h-full animate-fade-in">
 <div className="p-4 border-b border-surface-200 bg-white flex gap-2 overflow-x-auto">
 {types.map(t => (
 <button
 key={t.id}
 onClick={() => setSubReport(t.id)}
 className={'px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-colors ' + (subReport === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-surface-50 text-surface-600 hover:bg-surface-100 border border-surface-200')}
 >
 {t.label}
 </button>
 ))}
 </div>
 <div className="flex-1 bg-surface-50">
 {renderContent()}
 </div>
 </div>
 );
}
