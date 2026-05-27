import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import ReportLayout from '../components/ReportLayout';
import { format } from 'date-fns';

export default function CustomReportBuilder({ dateRange }) {
  const [reportType, setReportType] = useState('bills');
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    const { data } = await supabase.from('parties').select('id, name, party_type').order('name');
    setParties(data || []);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setHasGenerated(true);
    setData([]);

    try {
      let query;
      if (reportType === 'bills') {
        query = supabase.from('bills').select('*').gte('date', dateRange.start).lte('date', dateRange.end);
        if (selectedParty) query = query.eq('customer_id', selectedParty);
        if (paymentMode) query = query.eq('payment_mode', paymentMode);
      } 
      else if (reportType === 'purchases') {
        query = supabase.from('purchase_invoices').select('*').gte('date', dateRange.start).lte('date', dateRange.end);
        if (selectedParty) query = query.eq('supplier_id', selectedParty);
        if (paymentMode) query = query.eq('payment_mode', paymentMode);
      }
      else if (reportType === 'expenses') {
        query = supabase.from('expenses').select('*').gte('date', dateRange.start).lte('date', dateRange.end);
        if (paymentMode) query = query.eq('payment_mode', paymentMode);
      }

      if (query) {
        const [ { data: result, error }, { data: parties } ] = await Promise.all([
          query,
          supabase.from('parties').select('id, name')
        ]);
        if (error) throw error;
        
        if (reportType === 'bills' || reportType === 'purchases') {
          const pMap = {};
          (parties || []).forEach(p => pMap[p.id] = p.name);
          const enriched = (result || []).map(r => ({
            ...r,
            parties: { name: pMap[reportType === 'bills' ? r.customer_id : r.supplier_id] }
          }));
          setData(enriched);
        } else {
          setData(result || []);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error generating report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!hasGenerated && !loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-surface-400">
          <p>Select your filters and click Generate to see the report.</p>
        </div>
      );
    }

    let cols = [];
    if (reportType === 'bills' || reportType === 'purchases') {
      cols = [
        { header: 'Date', accessor: r => format(new Date(r.date), 'dd MMM yyyy') },
        { header: 'Ref No', accessor: r => r.bill_no || '-' },
        { header: 'Party Name', accessor: r => r.parties?.name || '-' },
        { header: 'Amount', accessor: r => `₹ ${Number(r.grand_total || 0).toLocaleString('en-IN')}` },
        { header: 'Status', accessor: r => r.status },
        { header: 'Mode', accessor: r => r.payment_mode || '-' },
      ];
    } else if (reportType === 'expenses') {
      cols = [
        { header: 'Date', accessor: r => format(new Date(r.date), 'dd MMM yyyy') },
        { header: 'Category', accessor: r => r.category },
        { header: 'Description', accessor: r => r.description || '-' },
        { header: 'Amount', accessor: r => `₹ ${Number(r.amount || 0).toLocaleString('en-IN')}` },
        { header: 'Mode', accessor: r => r.payment_mode || '-' },
      ];
    }

    return (
      <ReportLayout 
        title={`Custom ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`}
        loading={loading}
        data={data}
        columns={cols}
      />
    );
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Builder Form */}
      <div className="p-6 bg-white border-b border-surface-200">
        <h3 className="text-sm font-bold text-surface-900 mb-4 uppercase tracking-wide">Report Builder</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Data Source</label>
            <select 
              value={reportType} onChange={e => { setReportType(e.target.value); setHasGenerated(false); }}
              className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500"
            >
              <option value="bills">Sales (Bills)</option>
              <option value="purchases">Purchases</option>
              <option value="expenses">Expenses</option>
            </select>
          </div>

          {(reportType === 'bills' || reportType === 'purchases') && (
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1">Filter by Party</label>
              <select 
                value={selectedParty} onChange={e => { setSelectedParty(e.target.value); setHasGenerated(false); }}
                className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Parties</option>
                {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1">Filter by Payment Mode</label>
            <select 
              value={paymentMode} onChange={e => { setPaymentMode(e.target.value); setHasGenerated(false); }}
              className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Credit">Credit</option>
            </select>
          </div>

          <div>
            <button 
              onClick={handleGenerate}
              className="w-full px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>
      
      {/* Report Area */}
      <div className="flex-1 bg-surface-50">
        {renderContent()}
      </div>
    </div>
  );
}
