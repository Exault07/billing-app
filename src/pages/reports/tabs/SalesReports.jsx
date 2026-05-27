import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import ReportLayout from '../components/ReportLayout';
import { format } from 'date-fns';

export default function SalesReports({ dateRange }) {
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
        const [{ data: bills, error }, { data: parties }] = await Promise.all([
          supabase.from('bills').select('*').gte('date', dateRange.start).lte('date', dateRange.end).eq('status', 'final').order('date', { ascending: true }),
          supabase.from('parties').select('id, name')
        ]);
        if (error) throw error;
        const pMap = {};
        (parties || []).forEach(p => pMap[p.id] = p.name);
        setData((bills || []).map(b => ({ ...b, _partyName: pMap[b.customer_id] || '-' })));
      }
      else if (subReport === 'items') {
        const { data: bills, error } = await supabase
          .from('bills').select('items, bill_no, date')
          .gte('date', dateRange.start).lte('date', dateRange.end).eq('status', 'final');
        if (error) throw error;
        const itemMap = {};
        (bills || []).forEach(bill => {
          (bill.items || []).forEach(item => {
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
      else if (subReport === 'party') {
        const [{ data: bills, error }, { data: parties }] = await Promise.all([
          supabase.from('bills').select('*').gte('date', dateRange.start).lte('date', dateRange.end).eq('status', 'final'),
          supabase.from('parties').select('id, name, mobile')
        ]);
        if (error) throw error;
        const pMap = {};
        (parties || []).forEach(p => pMap[p.id] = { name: p.name, mobile: p.mobile });
        const partyMap = {};
        (bills || []).forEach(b => {
          const pId = b.customer_id;
          if (!pId) return;
          if (!partyMap[pId]) {
            const p = pMap[pId] || {};
            partyMap[pId] = { name: p.name || 'Unknown', phone: p.mobile || '-', billsCount: 0, totalAmount: 0, paid: 0, due: 0 };
          }
          partyMap[pId].billsCount++;
          partyMap[pId].totalAmount += Number(b.grand_total || 0);
          partyMap[pId].paid += Number(b.advance_paid || 0);
          partyMap[pId].due += Number(b.balance_due || 0);
        });
        setData(Object.values(partyMap).sort((a, b) => b.totalAmount - a.totalAmount));
      }
      else if (subReport === 'payments') {
        // bill_payments uses: bill_id, amount, payment_mode, date (not payment_date/amount_paid)
        const [{ data: payments, error }, { data: billsData }, { data: parties }] = await Promise.all([
          supabase.from('bill_payments').select('*').gte('date', dateRange.start).lte('date', dateRange.end).order('date', { ascending: true }),
          supabase.from('bills').select('id, bill_no, customer_id'),
          supabase.from('parties').select('id, name')
        ]);
        if (error) throw error;
        const pMap = {};
        (parties || []).forEach(p => pMap[p.id] = p.name);
        const bMap = {};
        (billsData || []).forEach(b => { bMap[b.id] = { bill_no: b.bill_no, partyName: pMap[b.customer_id] || '-' }; });
        setData((payments || []).map(p => ({ ...p, _billNo: bMap[p.bill_id]?.bill_no || '-', _partyName: bMap[p.bill_id]?.partyName || '-' })));
      }
      else if (subReport === 'returns') {
        const [{ data: returns, error }, { data: billsData }, { data: parties }] = await Promise.all([
          supabase.from('sale_returns').select('*').gte('return_date', dateRange.start).lte('return_date', dateRange.end).order('return_date', { ascending: true }),
          supabase.from('bills').select('id, bill_no'),
          supabase.from('parties').select('id, name')
        ]);
        if (error) throw error;
        const pMap = {};
        (parties || []).forEach(p => pMap[p.id] = p.name);
        const bMap = {};
        (billsData || []).forEach(b => bMap[b.id] = b.bill_no);
        setData((returns || []).map(r => ({ ...r, _billNo: bMap[r.original_bill_id] || '-', _partyName: pMap[r.customer_id] || '-' })));
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
      let totalAmount = 0, totalCollected = 0, totalPending = 0;
      data.forEach(d => {
        totalAmount += Number(d.grand_total || 0);
        totalCollected += Number(d.advance_paid || 0);
        totalPending += Number(d.balance_due || 0);
      });
      const cols = [
        { header: 'Date', accessor: r => format(new Date(r.date), 'dd MMM yyyy') },
        { header: 'Bill No', accessor: r => r.bill_no || '-' },
        { header: 'Customer', accessor: r => r._partyName || '-' },
        { header: 'Items', accessor: r => (r.items || []).length },
        { header: 'Total Amount', accessor: r => '₹ ' + Number(r.grand_total || 0).toLocaleString('en-IN') },
        { header: 'Payment Mode', accessor: r => r.payment_mode || '-' },
        { header: 'Balance Due', accessor: r => '₹ ' + Number(r.balance_due || 0).toLocaleString('en-IN') },
      ];
      return (
        <ReportLayout
          title="Sale Summary Report" loading={loading} data={data} columns={cols}
          summaryData={[
            { label: 'Total Bills', value: data.length },
            { label: 'Total Amount', value: '₹ ' + totalAmount.toLocaleString('en-IN') },
            { label: 'Collected', value: '₹ ' + totalCollected.toLocaleString('en-IN') },
            { label: 'Pending', value: '₹ ' + totalPending.toLocaleString('en-IN') },
          ]}
        />
      );
    }
    else if (subReport === 'items') {
      let totalRevenue = 0;
      let topItem = null;
      data.forEach(d => {
        totalRevenue += Number(d.total || 0);
        if (!topItem || d.qty > topItem.qty) topItem = d;
      });
      const cols = [
        { header: 'Item Name', accessor: r => r.name },
        { header: 'Qty Sold', accessor: r => r.qty + ' ' + (r.unit || '') },
        { header: 'Avg Rate', accessor: r => '₹ ' + Number(r.avgRate || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }) },
        { header: 'Total Amount', accessor: r => '₹ ' + Number(r.total || 0).toLocaleString('en-IN') },
      ];
      return (
        <ReportLayout
          title="Item-wise Sale Report" loading={loading} data={data} columns={cols}
          summaryData={[
            { label: 'Most Sold Item', value: topItem ? topItem.name : '-' },
            { label: 'Total Revenue', value: '₹ ' + totalRevenue.toLocaleString('en-IN') },
          ]}
        />
      );
    }
    else if (subReport === 'party') {
      let totalAmount = 0, totalDue = 0;
      data.forEach(d => { totalAmount += Number(d.totalAmount || 0); totalDue += Number(d.due || 0); });
      const cols = [
        { header: 'Customer Name', accessor: r => r.name },
        { header: 'Phone', accessor: r => r.phone },
        { header: 'Total Bills', accessor: r => r.billsCount },
        { header: 'Total Amount', accessor: r => '₹ ' + Number(r.totalAmount || 0).toLocaleString('en-IN') },
        { header: 'Amount Paid', accessor: r => '₹ ' + Number(r.paid || 0).toLocaleString('en-IN') },
        { header: 'Balance Due', accessor: r => '₹ ' + Number(r.due || 0).toLocaleString('en-IN') },
      ];
      return (
        <ReportLayout
          title="Party-wise Sale Report" loading={loading} data={data} columns={cols}
          summaryData={[
            { label: 'Total Revenue', value: '₹ ' + totalAmount.toLocaleString('en-IN') },
            { label: 'Total Pending', value: '₹ ' + totalDue.toLocaleString('en-IN') },
          ]}
        />
      );
    }
    else if (subReport === 'payments') {
      // bill_payments has: amount, date, payment_mode
      const modeTotals = {};
      let totalAmount = 0;
      data.forEach(d => {
        const mode = d.payment_mode || 'Cash';
        if (!modeTotals[mode]) modeTotals[mode] = 0;
        modeTotals[mode] += Number(d.amount || 0);
        totalAmount += Number(d.amount || 0);
      });
      const cols = [
        { header: 'Date', accessor: r => r.date ? format(new Date(r.date), 'dd MMM yyyy') : '-' },
        { header: 'Customer', accessor: r => r._partyName || '-' },
        { header: 'Bill No', accessor: r => r._billNo || '-' },
        { header: 'Amount', accessor: r => '₹ ' + Number(r.amount || 0).toLocaleString('en-IN') },
        { header: 'Mode', accessor: r => r.payment_mode || '-' },
      ];
      const summary = Object.keys(modeTotals).map(k => ({ label: k + ' Total', value: '₹ ' + modeTotals[k].toLocaleString('en-IN') }));
      summary.unshift({ label: 'Total Received', value: '₹ ' + totalAmount.toLocaleString('en-IN') });
      return (
        <ReportLayout
          title="Payment Received Report" loading={loading} data={data} columns={cols}
          summaryData={summary}
        />
      );
    }
    else if (subReport === 'returns') {
      let totalAmount = 0;
      data.forEach(d => totalAmount += Number(d.total_return_amount || 0));
      const cols = [
        { header: 'Date', accessor: r => r.return_date ? format(new Date(r.return_date), 'dd MMM yyyy') : '-' },
        { header: 'Return No', accessor: r => r.return_no || (r.id ? r.id.split('-')[0].toUpperCase() : '-') },
        { header: 'Original Bill No', accessor: r => r._billNo || '-' },
        { header: 'Customer', accessor: r => r._partyName || '-' },
        { header: 'Items Returned', accessor: r => (r.items || []).reduce((sum, i) => sum + Number(i.return_qty || 0), 0) },
        { header: 'Return Amount', accessor: r => '₹ ' + Number(r.total_return_amount || 0).toLocaleString('en-IN') },
        { header: 'Reason', accessor: r => r.reason || '-' },
      ];
      return (
        <ReportLayout
          title="Sale Return Summary" loading={loading} data={data} columns={cols}
          summaryData={[
            { label: 'Total Returns', value: data.length },
            { label: 'Return Amount', value: '₹ ' + totalAmount.toLocaleString('en-IN') },
          ]}
        />
      );
    }
    return null;
  };

  const types = [
    { id: 'summary', label: 'Sale Summary' },
    { id: 'items', label: 'Item-wise Sale' },
    { id: 'party', label: 'Party-wise Sale' },
    { id: 'payments', label: 'Payment Received' },
    { id: 'returns', label: 'Sale Returns' },
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
