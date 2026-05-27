import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import ReportLayout from '../components/ReportLayout';
import { format } from 'date-fns';

// Staff tables do NOT exist yet in this app's schema.
// This page shows a graceful "not set up" state with instructions.

export default function StaffReports({ dateRange }) {
  const [subReport, setSubReport] = useState('attendance');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableExists, setTableExists] = useState(null); // null=checking, true/false

  useEffect(() => {
    checkAndFetch();
  }, [subReport, dateRange]);

  const checkAndFetch = async () => {
    setLoading(true);
    setData([]);
    try {
      if (subReport === 'attendance') {
        // Try fetching â€” if table doesn't exist, error will be caught gracefully
        const { data: att, error } = await supabase
          .from('staff_attendance')
          .select('id, date, staff_id, status')
          .gte('date', dateRange.start)
          .lte('date', dateRange.end)
          .limit(200);

        if (error && error.message && error.message.includes('does not exist')) {
          setTableExists(false);
          return;
        }
        if (error) throw error;
        setTableExists(true);

        // Fetch staff names separately
        const staffIds = [...new Set((att || []).map(a => a.staff_id).filter(Boolean))];
        let staffMap = {};
        if (staffIds.length > 0) {
          const { data: staffList } = await supabase.from('staff').select('id, name').in('id', staffIds);
          (staffList || []).forEach(s => staffMap[s.id] = s.name);
        }

        // Aggregate by staff
        const aggMap = {};
        (att || []).forEach(a => {
          const sId = a.staff_id;
          if (!sId) return;
          if (!aggMap[sId]) aggMap[sId] = { name: staffMap[sId] || 'Unknown', P: 0, A: 0, H: 0, L: 0, total: 0 };
          const st = a.status || 'A';
          aggMap[sId][st] = (aggMap[sId][st] || 0) + 1;
          aggMap[sId].total++;
        });
        setData(Object.values(aggMap));
      }
      else if (subReport === 'payroll') {
        const m = new Date(dateRange.start).getMonth() + 1;
        const y = new Date(dateRange.start).getFullYear();
        const { data: pr, error } = await supabase
          .from('staff_payroll')
          .select('*')
          .eq('month', m)
          .eq('year', y);
        if (error && error.message && error.message.includes('does not exist')) {
          setTableExists(false);
          return;
        }
        if (error) throw error;
        setTableExists(true);
        setData(pr || []);
      }
    } catch (err) {
      console.error(err);
      // Don't alert â€” show graceful error in UI
      setTableExists(false);
    } finally {
      setLoading(false);
    }
  };

  const NotSetup = () => (
    <div className="flex flex-col items-center justify-center h-64 text-center px-8">
      <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">ðŸ—‚ï¸</span>
      </div>
      <h3 className="text-lg font-bold text-surface-900 mb-2">Staff module not yet set up</h3>
      <p className="text-sm text-surface-500 max-w-sm">
        The <strong>staff_attendance</strong> and <strong>staff_payroll</strong> tables haven't been created in your Supabase database yet.
        Once the Staff module is built and those tables exist, this report will populate automatically.
      </p>
    </div>
  );

  const renderContent = () => {
    if (tableExists === false) return <NotSetup />;

    if (subReport === 'attendance') {
      const cols = [
        { header: 'Staff Name', accessor: r => r.name },
        { header: 'Present (P)', accessor: r => r.P || 0, className: 'text-green-600 font-bold' },
        { header: 'Absent (A)', accessor: r => r.A || 0, className: 'text-red-600 font-bold' },
        { header: 'Half Day (H)', accessor: r => r.H || 0, className: 'text-orange-500 font-bold' },
        { header: 'Leave (L)', accessor: r => r.L || 0, className: 'text-indigo-600 font-bold' },
        { header: 'Total Days', accessor: r => r.total },
        { header: 'Attendance %', accessor: r => r.total > 0 ? Math.round(((r.P + (r.H * 0.5)) / r.total) * 100) + '%' : '0%' },
      ];
      return (
        <ReportLayout
          title={'Attendance Report (' + format(new Date(dateRange.start), 'MMM yyyy') + ')'}
          loading={loading} data={data} columns={cols}
        />
      );
    }
    else if (subReport === 'payroll') {
      let totalNet = 0;
      data.forEach(d => totalNet += Number(d.net_salary || 0));
      const cols = [
        { header: 'Staff Name', accessor: r => r.name || '-' },
        { header: 'Present Days', accessor: r => r.present_days || '-' },
        { header: 'Gross Salary', accessor: r => '₹ ' + Number(r.calculated_salary || 0).toLocaleString('en-IN') },
        { header: 'Deductions', accessor: r => '₹ ' + Number(r.deductions || 0).toLocaleString('en-IN') },
        { header: 'Net Salary', accessor: r => '₹ ' + Number(r.net_salary || 0).toLocaleString('en-IN'), className: 'font-bold text-surface-900' },
        { header: 'Status', accessor: r => r.status || '-' },
      ];
      return (
        <ReportLayout
          title={'Payroll Summary (' + format(new Date(dateRange.start), 'MMM yyyy') + ')'}
          loading={loading} data={data} columns={cols}
          summaryData={[{ label: 'Total Payroll Amount', value: '₹ ' + totalNet.toLocaleString('en-IN') }]}
        />
      );
    }
    return null;
  };

  const types = [
    { id: 'attendance', label: 'Monthly Attendance' },
    { id: 'payroll', label: 'Payroll Summary' },
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
