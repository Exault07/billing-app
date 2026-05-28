import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import ReportLayout from '../components/ReportLayout';
import { format } from 'date-fns';

// Real tables: carpenters, carpenter_payments (columns: id, carpenter_id, payment_date, amount, payment_mode, notes)
// NO carpenter_jobs table exists â€” carpenter work is tracked via bills.carpenter_id

export default function CarpenterReports({ dateRange }) {
 const [subReport, setSubReport] = useState('bills');
 const [data, setData] = useState([]);
 const [loading, setLoading] = useState(false);

 useEffect(() => {
 fetchData();
 }, [subReport, dateRange]);

 const fetchData = async () => {
 setLoading(true);
 setData([]);
 try {
 if (subReport === 'bills') {
 // Bills linked to carpenters via carpenter_id
 const [{ data: bills, error }, { data: carpenters }, { data: parties }] = await Promise.all([
 supabase.from('bills').select('*').not('carpenter_id', 'is', null).gte('date', dateRange.start).lte('date', dateRange.end).eq('status', 'final').order('date', { ascending: true }),
 supabase.from('carpenters').select('id, name'),
 supabase.from('parties').select('id, name')
 ]);
 if (error) throw error;
 const carpMap = {};
 (carpenters || []).forEach(c => carpMap[c.id] = c.name);
 const pMap = {};
 (parties || []).forEach(p => pMap[p.id] = p.name);
 setData((bills || []).map(b => ({ ...b, _carpenterName: carpMap[b.carpenter_id] || '-', _customerName: pMap[b.customer_id] || '-' })));
 }
 else if (subReport === 'payments') {
 // carpenter_payments: carpenter_id, payment_date, amount, payment_mode, notes
 const [{ data: payments, error }, { data: carpenters }] = await Promise.all([
 supabase.from('carpenter_payments').select('*').gte('payment_date', dateRange.start).lte('payment_date', dateRange.end).order('payment_date', { ascending: true }),
 supabase.from('carpenters').select('id, name')
 ]);
 if (error) throw error;
 const carpMap = {};
 (carpenters || []).forEach(c => carpMap[c.id] = c.name);
 setData((payments || []).map(p => ({ ...p, _carpenterName: carpMap[p.carpenter_id] || '-' })));
 }
 else if (subReport === 'summary') {
 // Aggregate by carpenter
 const [{ data: bills }, { data: payments }, { data: carpenters }] = await Promise.all([
 supabase.from('bills').select('carpenter_id, grand_total, commission_rate').not('carpenter_id', 'is', null).gte('date', dateRange.start).lte('date', dateRange.end).eq('status', 'final'),
 supabase.from('carpenter_payments').select('carpenter_id, amount').gte('payment_date', dateRange.start).lte('payment_date', dateRange.end),
 supabase.from('carpenters').select('id, name')
 ]);
 const carpMap = {};
 (carpenters || []).forEach(c => carpMap[c.id] = c.name);

 const aggMap = {};
 (bills || []).forEach(b => {
 const cId = b.carpenter_id;
 if (!cId) return;
 if (!aggMap[cId]) aggMap[cId] = { name: carpMap[cId] || 'Unknown', billCount: 0, totalSales: 0, totalCommission: 0, totalPaid: 0 };
 aggMap[cId].billCount++;
 aggMap[cId].totalSales += Number(b.grand_total || 0);
 const commRate = Number(b.commission_rate || 0);
 aggMap[cId].totalCommission += Number(b.grand_total || 0) * commRate / 100;
 });
 (payments || []).forEach(p => {
 const cId = p.carpenter_id;
 if (!cId || !aggMap[cId]) return;
 aggMap[cId].totalPaid += Number(p.amount || 0);
 });

 setData(Object.values(aggMap).map(d => ({ ...d, pending: d.totalCommission - d.totalPaid })).sort((a, b) => b.totalSales - a.totalSales));
 }
 } catch (err) {
 console.error(err);
 alert('Error fetching report data: ' + err.message);
 } finally {
 setLoading(false);
 }
 };

 const renderContent = () => {
 if (subReport === 'summary') {
 let totalCommission = 0, totalPaid = 0, totalPending = 0;
 data.forEach(d => {
 totalCommission += Number(d.totalCommission || 0);
 totalPaid += Number(d.totalPaid || 0);
 totalPending += Number(d.pending || 0);
 });
 const cols = [
 { header: 'Carpenter Name', accessor: r => r.name },
 { header: 'Bills', accessor: r => r.billCount },
 { header: 'Total Sales', accessor: r => '₹ ' + Number(r.totalSales || 0).toLocaleString('en-IN') },
 { header: 'Commission Earned', accessor: r => '₹ ' + Number(r.totalCommission || 0).toLocaleString('en-IN') },
 { header: 'Amount Paid', accessor: r => '₹ ' + Number(r.totalPaid || 0).toLocaleString('en-IN') },
 { header: 'Pending', accessor: r => '₹ ' + Number(r.pending || 0).toLocaleString('en-IN'), className: 'text-red-600 font-bold' },
 ];
 return (
 <ReportLayout
 title="Carpenter Summary" loading={loading} data={data} columns={cols}
 summaryData={[
 { label: 'Total Commission', value: '₹ ' + totalCommission.toLocaleString('en-IN') },
 { label: 'Total Paid', value: '₹ ' + totalPaid.toLocaleString('en-IN') },
 { label: 'Total Pending', value: '₹ ' + totalPending.toLocaleString('en-IN') },
 ]}
 />
 );
 }
 else if (subReport === 'bills') {
 const cols = [
 { header: 'Date', accessor: r => r.date ? format(new Date(r.date), 'dd MMM yyyy') : '-' },
 { header: 'Bill No', accessor: r => r.bill_no || '-' },
 { header: 'Carpenter', accessor: r => r._carpenterName },
 { header: 'Customer', accessor: r => r._customerName },
 { header: 'Bill Amount', accessor: r => '₹ ' + Number(r.grand_total || 0).toLocaleString('en-IN') },
 { header: 'Commission %', accessor: r => (r.commission_rate || 0) + '%' },
 { header: 'Commission Amt', accessor: r => '₹ ' + (Number(r.grand_total || 0) * Number(r.commission_rate || 0) / 100).toLocaleString('en-IN') },
 ];
 return (
 <ReportLayout title="Bills by Carpenter" loading={loading} data={data} columns={cols} />
 );
 }
 else if (subReport === 'payments') {
 let totalPaid = 0;
 data.forEach(d => totalPaid += Number(d.amount || 0));
 const cols = [
 { header: 'Date', accessor: r => r.payment_date ? format(new Date(r.payment_date), 'dd MMM yyyy') : '-' },
 { header: 'Carpenter Name', accessor: r => r._carpenterName },
 { header: 'Amount', accessor: r => '₹ ' + Number(r.amount || 0).toLocaleString('en-IN') },
 { header: 'Payment Mode', accessor: r => r.payment_mode || '-' },
 { header: 'Notes', accessor: r => r.notes || '-' },
 ];
 return (
 <ReportLayout
 title="Payments to Carpenters" loading={loading} data={data} columns={cols}
 summaryData={[{ label: 'Total Paid', value: '₹ ' + totalPaid.toLocaleString('en-IN') }]}
 />
 );
 }
 return null;
 };

 const types = [
 { id: 'summary', label: 'Carpenter Summary' },
 { id: 'bills', label: 'Bills by Carpenter' },
 { id: 'payments', label: 'Payments to Carpenters' },
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
