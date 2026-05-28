import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import ReportLayout from '../components/ReportLayout';
import { format } from 'date-fns';

// Real table: purchase_invoices (columns: bill_no, date, supplier_id, total_amount, advance_paid, balance_due, status, items)
// Real payments table: purchase_payments (columns: purchase_id, amount, date, payment_mode, notes)

export default function PurchaseReports({ dateRange }) {
 const [subReport, setSubReport] = useState('summary');
 const [data, setData] = useState([]);
 const [loading, setLoading] = useState(false);

 useEffect(() => {
 fetchData();
 }, [subReport, dateRange]);

 const fetchData = async () => {
 setLoading(true);
 setData([]);
 try {
 if (subReport === 'summary') {
 const [{ data: purchases, error }, { data: parties }] = await Promise.all([
 supabase.from('purchase_invoices').select('*').gte('date', dateRange.start).lte('date', dateRange.end).order('date', { ascending: true }),
 supabase.from('parties').select('id, name')
 ]);
 if (error) throw error;
 const pMap = {};
 (parties || []).forEach(p => pMap[p.id] = p.name);
 setData((purchases || []).map(p => ({ ...p, _partyName: pMap[p.supplier_id] || '-' })));
 }
 else if (subReport === 'items') {
 const { data: purchases, error } = await supabase
 .from('purchase_invoices').select('items, bill_no, date')
 .gte('date', dateRange.start).lte('date', dateRange.end);
 if (error) throw error;
 const itemMap = {};
 (purchases || []).forEach(purchase => {
 (purchase.items || []).forEach(item => {
 if (!item.product_id) return;
 if (!itemMap[item.product_id]) {
 itemMap[item.product_id] = { name: item.name || '', unit: item.unit || '', qty: 0, total: 0 };
 }
 itemMap[item.product_id].qty += Number(item.qty || 0);
 itemMap[item.product_id].total += Number(item.total || 0);
 });
 });
 const processed = Object.values(itemMap).map(i => ({
 ...i,
 avgRate: i.qty > 0 ? (i.total / i.qty) : 0
 })).sort((a, b) => b.qty - a.qty);
 setData(processed);
 }
 else if (subReport === 'supplier') {
 const [{ data: purchases, error }, { data: parties }] = await Promise.all([
 supabase.from('purchase_invoices').select('*').gte('date', dateRange.start).lte('date', dateRange.end),
 supabase.from('parties').select('id, name, mobile')
 ]);
 if (error) throw error;
 const pMap = {};
 (parties || []).forEach(p => pMap[p.id] = { name: p.name, mobile: p.mobile });
 const suppMap = {};
 (purchases || []).forEach(b => {
 const sId = b.supplier_id;
 if (!sId) return;
 if (!suppMap[sId]) {
 const p = pMap[sId] || {};
 suppMap[sId] = { name: p.name || 'Unknown', count: 0, totalAmount: 0, paid: 0, due: 0 };
 }
 suppMap[sId].count++;
 suppMap[sId].totalAmount += Number(b.total_amount || 0);
 suppMap[sId].paid += Number(b.advance_paid || 0);
 suppMap[sId].due += Number(b.balance_due || 0);
 });
 setData(Object.values(suppMap).sort((a, b) => b.totalAmount - a.totalAmount));
 }
 else if (subReport === 'payments') {
 // purchase_payments columns: purchase_id, amount, date, payment_mode, notes
 const [{ data: payments, error }, { data: purchasesData }, { data: parties }] = await Promise.all([
 supabase.from('purchase_payments').select('*').gte('date', dateRange.start).lte('date', dateRange.end).order('date', { ascending: true }),
 supabase.from('purchase_invoices').select('id, bill_no, supplier_id'),
 supabase.from('parties').select('id, name')
 ]);
 if (error) throw error;
 const pMap = {};
 (parties || []).forEach(p => pMap[p.id] = p.name);
 const purMap = {};
 (purchasesData || []).forEach(p => { purMap[p.id] = { bill_no: p.bill_no, partyName: pMap[p.supplier_id] || '-' }; });
 setData((payments || []).map(p => ({ ...p, _billNo: purMap[p.purchase_id]?.bill_no || '-', _partyName: purMap[p.purchase_id]?.partyName || '-' })));
 }
 } catch (err) {
 
 alert('Error fetching report data: ' + err.message);
 } finally {
 setLoading(false);
 }
 };

 const renderContent = () => {
 if (subReport === 'summary') {
 let totalAmount = 0, totalPaid = 0, totalBalance = 0;
 data.forEach(d => {
 totalAmount += Number(d.total_amount || 0);
 totalPaid += Number(d.advance_paid || 0);
 totalBalance += Number(d.balance_due || 0);
 });
 const cols = [
 { header: 'Date', accessor: r => r.date ? format(new Date(r.date), 'dd MMM yyyy') : '-' },
 { header: 'Purchase No', accessor: r => r.bill_no || '-' },
 { header: 'Supplier', accessor: r => r._partyName || '-' },
 { header: 'Total Amount', accessor: r => '₹ ' + Number(r.total_amount || 0).toLocaleString('en-IN') },
 { header: 'Paid', accessor: r => '₹ ' + Number(r.advance_paid || 0).toLocaleString('en-IN') },
 { header: 'Balance', accessor: r => '₹ ' + Number(r.balance_due || 0).toLocaleString('en-IN') },
 ];
 return (
 <ReportLayout
 title="Purchase Summary" loading={loading} data={data} columns={cols}
 summaryData={[
 { label: 'Total Purchases', value: data.length },
 { label: 'Total Amount', value: '₹ ' + totalAmount.toLocaleString('en-IN') },
 { label: 'Total Paid', value: '₹ ' + totalPaid.toLocaleString('en-IN') },
 { label: 'Total Balance', value: '₹ ' + totalBalance.toLocaleString('en-IN') },
 ]}
 />
 );
 }
 else if (subReport === 'items') {
 let totalAmount = 0;
 data.forEach(d => totalAmount += Number(d.total || 0));
 const cols = [
 { header: 'Item Name', accessor: r => r.name },
 { header: 'Qty Purchased', accessor: r => r.qty + ' ' + (r.unit || '') },
 { header: 'Avg Rate', accessor: r => '₹ ' + Number(r.avgRate || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }) },
 { header: 'Total Amount', accessor: r => '₹ ' + Number(r.total || 0).toLocaleString('en-IN') },
 ];
 return (
 <ReportLayout
 title="Item-wise Purchase" loading={loading} data={data} columns={cols}
 summaryData={[
 { label: 'Total Items Bought', value: data.length },
 { label: 'Total Purchase Cost', value: '₹ ' + totalAmount.toLocaleString('en-IN') },
 ]}
 />
 );
 }
 else if (subReport === 'supplier') {
 let totalAmount = 0, totalDue = 0;
 data.forEach(d => { totalAmount += Number(d.totalAmount || 0); totalDue += Number(d.due || 0); });
 const cols = [
 { header: 'Supplier Name', accessor: r => r.name },
 { header: 'Total Purchases', accessor: r => r.count },
 { header: 'Total Amount', accessor: r => '₹ ' + Number(r.totalAmount || 0).toLocaleString('en-IN') },
 { header: 'Amount Paid', accessor: r => '₹ ' + Number(r.paid || 0).toLocaleString('en-IN') },
 { header: 'Balance Due', accessor: r => '₹ ' + Number(r.due || 0).toLocaleString('en-IN') },
 ];
 return (
 <ReportLayout
 title="Supplier-wise Purchase" loading={loading} data={data} columns={cols}
 summaryData={[
 { label: 'Total Amount', value: '₹ ' + totalAmount.toLocaleString('en-IN') },
 { label: 'Total Due', value: '₹ ' + totalDue.toLocaleString('en-IN') },
 ]}
 />
 );
 }
 else if (subReport === 'payments') {
 let totalPaid = 0;
 data.forEach(d => totalPaid += Number(d.amount || 0));
 const cols = [
 { header: 'Date', accessor: r => r.date ? format(new Date(r.date), 'dd MMM yyyy') : '-' },
 { header: 'Supplier', accessor: r => r._partyName || '-' },
 { header: 'Purchase No', accessor: r => r._billNo || '-' },
 { header: 'Amount', accessor: r => '₹ ' + Number(r.amount || 0).toLocaleString('en-IN') },
 { header: 'Mode', accessor: r => r.payment_mode || '-' },
 ];
 return (
 <ReportLayout
 title="Payments Made to Suppliers" loading={loading} data={data} columns={cols}
 summaryData={[
 { label: 'Total Payments Made', value: '₹ ' + totalPaid.toLocaleString('en-IN') },
 ]}
 />
 );
 }
 return null;
 };

 const types = [
 { id: 'summary', label: 'Purchase Summary' },
 { id: 'items', label: 'Item-wise Purchase' },
 { id: 'supplier', label: 'Supplier-wise Purchase' },
 { id: 'payments', label: 'Payments Made' },
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
