import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import ReportLayout from '../components/ReportLayout';
import { format } from 'date-fns';

export default function InventoryReports({ dateRange }) {
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
 if (subReport === 'summary' || subReport === 'low') {
 let query = supabase.from('products').select('*, item_categories(name)');
 
 if (subReport === 'low') {
 // Can't filter purely via Supabase if low_stock is dynamic compared to stock_qty in some complex ways,
 // but we can just filter it in JS for simplicity.
 }
 
 const { data: prods, error } = await query;
 if (error) throw error;
 
 let processed = prods || [];
 if (subReport === 'low') {
 processed = processed.filter(p => Number(p.stock_qty || 0) <= Number(p.low_stock_alert_qty || 0) && Number(p.low_stock_alert_qty || 0) > 0);
 }
 
 setData(processed);
 } 
 else if (subReport === 'adjustments') {
 const { data: adjustments, error } = await supabase
 .from('stock_adjustments')
 .select('*, products(name)')
 .gte('date', dateRange.start)
 .lte('date', dateRange.end)
 .order('date', { ascending: true })
 .order('created_at', { ascending: true });
 if (error) throw error;
 setData(adjustments || []);
 }
 else if (subReport === 'movement') {
 // Item Movement requires combining bills, purchases, and stock_adjustments for the selected period
 // For performance, we'll fetch them all in parallel for the date range
 const [ { data: bills }, { data: purchases }, { data: adjustments } ] = await Promise.all([
 supabase.from('bills').select('date, bill_no, items').gte('date', dateRange.start).lte('date', dateRange.end).eq('status', 'final'),
 supabase.from('purchase_invoices').select('date, bill_no, items').gte('date', dateRange.start).lte('date', dateRange.end),
 supabase.from('stock_adjustments').select('date, reason, adjustment_type, quantity, products(name)').gte('date', dateRange.start).lte('date', dateRange.end)
 ]);

 const movements = [];
 
 // Process Sales (OUT)
 (bills || []).forEach(b => {
 (b.items || []).forEach(i => {
 if (!i.product_id) return;
 movements.push({
 date: b.date,
 itemName: i.name,
 type: 'Sale',
 ref: b.bill_no,
 qtyIn: 0,
 qtyOut: Number(i.qty || 0)
 });
 });
 });

 // Process Purchases (IN)
 (purchases || []).forEach(p => {
 (p.items || []).forEach(i => {
 if (!i.product_id) return;
 movements.push({
 date: p.date,
 itemName: i.name,
 type: 'Purchase',
 ref: p.bill_no,
 qtyIn: Number(i.qty || 0),
 qtyOut: 0
 });
 });
 });

 // Process Adjustments (IN/OUT)
 (adjustments || []).forEach(a => {
 const qty = Number(a.quantity || 0);
 movements.push({
 date: a.date,
 itemName: a.products?.name || 'Unknown',
 type: `Adjustment (${a.reason})`,
 ref: '-',
 qtyIn: a.adjustment_type === 'Add' ? qty : 0,
 qtyOut: a.adjustment_type === 'Reduce' ? qty : 0,
 // 'Set' logic is harder to track strictly as IN/OUT without knowing prev stock, 
 // but we can display the net change if we want, or just list it as 'Set'.
 // For simplicity, we ignore 'Set' diffs here or handle them if needed.
 });
 });

 movements.sort((a, b) => new Date(a.date) - new Date(b.date));
 setData(movements);
 }
 } catch (err) {
 
 alert("Error fetching report data:" + err.message);
 } finally {
 setLoading(false);
 }
 };

 const renderContent = () => {
 if (subReport === 'summary' || subReport === 'low') {
 let totalValue = 0, lowStockCount = 0;
 data.forEach(d => {
 totalValue += Number(d.stock_qty || 0) * Number(d.selling_price || 0);
 if (Number(d.stock_qty || 0) <= Number(d.low_stock_alert_qty || 0) && Number(d.low_stock_alert_qty || 0) > 0) {
 lowStockCount++;
 }
 });

 const cols = [
 { header: 'Item Name', accessor: r => r.name },
 { header: 'Category', accessor: r => r.item_categories?.name || '-' },
 { header: 'Current Stock', accessor: r => `${r.stock_qty} ${r.unit || ''}` },
 { header: 'Alert Qty', accessor: r => r.low_stock_alert_qty || 0 },
 { header: 'Stock Value', accessor: r => `? ${(Number(r.stock_qty || 0) * Number(r.selling_price || 0)).toLocaleString('en-IN')}` },
 { header: 'Status', accessor: r => {
 if (Number(r.stock_qty || 0) === 0) return 'Out of Stock';
 if (Number(r.stock_qty || 0) <= Number(r.low_stock_alert_qty || 0) && Number(r.low_stock_alert_qty || 0) > 0) return 'Low Stock';
 return 'OK';
 } 
 },
 ];

 return (
 <ReportLayout 
 title={subReport === 'summary' ?"Stock Summary" :"Low Stock Report"}
 loading={loading}
 data={data}
 columns={cols}
 summaryData={[
 { label: 'Total Items', value: data.length },
 { label: 'Total Stock Value', value: `? ${totalValue.toLocaleString('en-IN')}` },
 { label: 'Low Stock Items', value: lowStockCount },
 ]}
 />
 );
 }
 else if (subReport === 'movement') {
 const cols = [
 { header: 'Date', accessor: r => format(new Date(r.date), 'dd MMM yyyy') },
 { header: 'Item Name', accessor: r => r.itemName },
 { header: 'Type', accessor: r => r.type },
 { header: 'Ref No.', accessor: r => r.ref },
 { header: 'Qty In', accessor: r => r.qtyIn > 0 ? r.qtyIn : '-' },
 { header: 'Qty Out', accessor: r => r.qtyOut > 0 ? r.qtyOut : '-' },
 ];

 return (
 <ReportLayout 
 title="Item Movement Report"
 loading={loading}
 data={data}
 columns={cols}
 />
 );
 }
 else if (subReport === 'adjustments') {
 const cols = [
 { header: 'Date', accessor: r => format(new Date(r.date), 'dd MMM yyyy') },
 { header: 'Item', accessor: r => r.products?.name || '-' },
 { header: 'Type', accessor: r => r.adjustment_type },
 { header: 'Qty', accessor: r => r.quantity },
 { header: 'Reason', accessor: r => r.reason || '-' },
 { header: 'Prev Stock', accessor: r => r.previous_stock },
 { header: 'New Stock', accessor: r => r.new_stock },
 ];

 return (
 <ReportLayout 
 title="Stock Adjustment Log"
 loading={loading}
 data={data}
 columns={cols}
 />
 );
 }
 };

 const types = [
 { id: 'summary', label: 'Stock Summary' },
 { id: 'low', label: 'Low Stock Report' },
 { id: 'movement', label: 'Item Movement' },
 { id: 'adjustments', label: 'Adjustment Log' },
 ];

 return (
 <div className="flex flex-col h-full animate-fade-in">
 <div className="p-4 border-b border-surface-200 bg-white flex gap-2 overflow-x-auto">
 {types.map(t => (
 <button
 key={t.id}
 onClick={() => setSubReport(t.id)}
 className={`px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-colors ${subReport === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-surface-50 text-surface-600 hover:bg-surface-100 border border-surface-200'}`}
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
