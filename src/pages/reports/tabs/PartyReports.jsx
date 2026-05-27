import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import ReportLayout from '../components/ReportLayout';
import { format, differenceInDays } from 'date-fns';

export default function PartyReports({ dateRange }) {
  const [subReport, setSubReport] = useState('ledger');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');

  useEffect(() => {
    if (subReport === 'ledger') {
      fetchParties();
    }
  }, [subReport]);

  useEffect(() => {
    fetchData();
  }, [subReport, dateRange, selectedPartyId]);

  const fetchParties = async () => {
    const { data } = await supabase.from('parties').select('id, name, party_type').order('name');
    setParties(data || []);
  };

  const fetchData = async () => {
    if (subReport === 'ledger' && !selectedPartyId) {
      setData([]);
      return;
    }
    setLoading(true);
    setData([]);
    try {
      if (subReport === 'ledger') {
        const party = parties.find(p => p.id === selectedPartyId);
        if (!party) { setLoading(false); return; }

        const [{ data: bills }, { data: purchases }, { data: bp }, { data: pp }] = await Promise.all([
          supabase.from('bills').select('created_at, date, bill_no, grand_total').eq('customer_id', selectedPartyId).gte('date', dateRange.start).lte('date', dateRange.end).eq('status', 'final'),
          supabase.from('purchase_invoices').select('created_at, date, bill_no, total_amount').eq('supplier_id', selectedPartyId).gte('date', dateRange.start).lte('date', dateRange.end),
          supabase.from('bill_payments').select('created_at, date, amount, payment_mode').eq('bill_id', bills?.[0]?.id || '00000000-0000-0000-0000-000000000000').gte('date', dateRange.start).lte('date', dateRange.end),
          supabase.from('purchase_payments').select('created_at, date, amount, payment_mode').gte('date', dateRange.start).lte('date', dateRange.end)
        ]);

        // Simpler ledger: fetch all bills & purchase invoices for this party directly
        // Re-fetch bill_payments by joining in JS
        const billIds = (bills || []).map(b => b.id);
        let billPayments = [];
        if (billIds.length > 0) {
          const { data: bpData } = await supabase.from('bill_payments').select('created_at, date, amount, payment_mode, bill_id').in('bill_id', billIds).gte('date', dateRange.start).lte('date', dateRange.end);
          billPayments = bpData || [];
        }

        const purIds = (purchases || []).map(p => p.id);
        let purchasePayments = [];
        if (purIds.length > 0) {
          const { data: ppData } = await supabase.from('purchase_payments').select('created_at, date, amount, payment_mode, purchase_id').in('purchase_id', purIds).gte('date', dateRange.start).lte('date', dateRange.end);
          purchasePayments = ppData || [];
        }

        const transactions = [];
        (bills || []).forEach(b => {
          transactions.push({ time: b.created_at, date: b.date, type: 'Sale Invoice', ref: b.bill_no, debit: Number(b.grand_total || 0), credit: 0 });
        });
        (purchases || []).forEach(p => {
          transactions.push({ time: p.created_at, date: p.date, type: 'Purchase Invoice', ref: p.bill_no, debit: 0, credit: Number(p.total_amount || 0) });
        });
        billPayments.forEach(p => {
          transactions.push({ time: p.created_at, date: p.date, type: 'Payment Recv (' + (p.payment_mode || '') + ')', ref: '-', debit: 0, credit: Number(p.amount || 0) });
        });
        purchasePayments.forEach(p => {
          transactions.push({ time: p.created_at, date: p.date, type: 'Payment Made (' + (p.payment_mode || '') + ')', ref: '-', debit: Number(p.amount || 0), credit: 0 });
        });

        transactions.sort((a, b) => new Date(a.time) - new Date(b.time));
        let runningBalance = 0;
        const enriched = transactions.map(t => {
          runningBalance += (t.debit - t.credit);
          return { ...t, balance: runningBalance };
        });
        setData(enriched);
      }
      else if (subReport === 'outstanding') {
        const { data: pts, error } = await supabase.from('parties').select('*').gt('current_balance', 0).order('current_balance', { ascending: false });
        if (error) throw error;
        setData(pts || []);
      }
      else if (subReport === 'ageing') {
        const [{ data: bills, error }, { data: pts }] = await Promise.all([
          supabase.from('bills').select('*').gt('balance_due', 0).eq('status', 'final'),
          supabase.from('parties').select('id, name')
        ]);
        if (error) throw error;
        const pMap = {};
        (pts || []).forEach(p => pMap[p.id] = p.name);
        const partyMap = {};
        const today = new Date();
        (bills || []).forEach(b => {
          const pId = b.customer_id;
          if (!pId) return;
          if (!partyMap[pId]) partyMap[pId] = { name: pMap[pId] || 'Unknown', total: 0, '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };
          const dueAmount = Number(b.balance_due || 0);
          const billDate = new Date(b.due_date || b.date);
          const daysOverdue = differenceInDays(today, billDate);
          partyMap[pId].total += dueAmount;
          if (daysOverdue <= 30) partyMap[pId]['0_30'] += dueAmount;
          else if (daysOverdue <= 60) partyMap[pId]['31_60'] += dueAmount;
          else if (daysOverdue <= 90) partyMap[pId]['61_90'] += dueAmount;
          else partyMap[pId]['90_plus'] += dueAmount;
        });
        setData(Object.values(partyMap).sort((a, b) => b.total - a.total));
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching report data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (subReport === 'ledger') {
      const cols = [
        { header: 'Date', accessor: r => r.date ? format(new Date(r.date), 'dd MMM yyyy') : '-' },
        { header: 'Type', accessor: r => r.type },
        { header: 'Ref No', accessor: r => r.ref || '-' },
        { header: 'Debit (+)', accessor: r => r.debit > 0 ? '₹ ' + Number(r.debit).toLocaleString('en-IN') : '-' },
        { header: 'Credit (-)', accessor: r => r.credit > 0 ? '₹ ' + Number(r.credit).toLocaleString('en-IN') : '-' },
        { header: 'Balance', accessor: r => '₹ ' + Number(r.balance || 0).toLocaleString('en-IN') },
      ];
      return (
        <div className="flex flex-col h-full">
          <div className="p-4 bg-white border-b border-surface-200">
            <label className="block text-sm font-medium text-surface-700 mb-1">Select Party</label>
            <select
              value={selectedPartyId}
              onChange={e => setSelectedPartyId(e.target.value)}
              className="w-full max-w-sm border border-surface-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- Choose Party --</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.party_type})</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <ReportLayout
              title={selectedPartyId ? 'Ledger: ' + (parties.find(p => p.id === selectedPartyId)?.name || '') : 'Party Ledger'}
              loading={loading} data={data} columns={cols}
            />
          </div>
        </div>
      );
    }
    else if (subReport === 'outstanding') {
      let totalCustomer = 0, totalSupplier = 0;
      data.forEach(d => {
        if (d.party_type === 'customer') totalCustomer += Number(d.current_balance || 0);
        else totalSupplier += Number(d.current_balance || 0);
      });
      const cols = [
        { header: 'Party Name', accessor: r => r.name },
        { header: 'Type', accessor: r => r.party_type },
        { header: 'Phone', accessor: r => r.mobile || '-' },
        { header: 'Balance Due', accessor: r => '₹ ' + Number(r.current_balance || 0).toLocaleString('en-IN') },
      ];
      return (
        <ReportLayout
          title="Party-wise Outstanding" loading={loading} data={data} columns={cols}
          summaryData={[
            { label: 'Customer Due (To Collect)', value: '₹ ' + totalCustomer.toLocaleString('en-IN') },
            { label: 'Supplier Due (To Pay)', value: '₹ ' + totalSupplier.toLocaleString('en-IN') },
          ]}
        />
      );
    }
    else if (subReport === 'ageing') {
      const cols = [
        { header: 'Party Name', accessor: r => r.name },
        { header: '0-30 Days', accessor: r => '₹ ' + Number(r['0_30'] || 0).toLocaleString('en-IN') },
        { header: '31-60 Days', accessor: r => '₹ ' + Number(r['31_60'] || 0).toLocaleString('en-IN') },
        { header: '61-90 Days', accessor: r => '₹ ' + Number(r['61_90'] || 0).toLocaleString('en-IN') },
        { header: '90+ Days', accessor: r => '₹ ' + Number(r['90_plus'] || 0).toLocaleString('en-IN'), className: 'text-red-600 font-bold' },
        { header: 'Total Overdue', accessor: r => '₹ ' + Number(r.total || 0).toLocaleString('en-IN') },
      ];
      return (
        <ReportLayout title="Ageing Report (Receivables)" loading={loading} data={data} columns={cols} />
      );
    }
    return null;
  };

  const types = [
    { id: 'ledger', label: 'Party Ledger' },
    { id: 'outstanding', label: 'Party-wise Outstanding' },
    { id: 'ageing', label: 'Ageing Report' },
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
