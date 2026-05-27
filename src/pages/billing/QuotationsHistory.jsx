import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { HiOutlinePlus, HiOutlineDocumentText, HiOutlineSearch, HiOutlineEye } from 'react-icons/hi';

const STATUS_STYLES = {
  draft: 'bg-amber-100 text-amber-800',
  final: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function QuotationsHistory() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      setError('');
      setLoading(true);
      try {
        let query = supabase
          .from('quotations')
          .select('*, customers(name, phone)')
          .order('created_at', { ascending: false });
        if (statusFilter !== 'all') query = query.eq('status', statusFilter);
        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        setQuotations(data || []);
      } catch (err) {
        setError(err.message || 'Failed to load quotations');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [statusFilter]);

  const filtered = quotations.filter(q => {
    const s = search.toLowerCase();
    return q.bill_no?.toLowerCase().includes(s) || q.customers?.name?.toLowerCase().includes(s);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <HiOutlineDocumentText className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-800">Quotations</h1>
            <p className="text-xs text-surface-400">{filtered.length} quotation{filtered.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>
        <Link to="/quotations/new" className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors">
          <HiOutlinePlus className="w-4 h-4" /> New Quotation
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input placeholder="Search by quotation no. or customer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div className="flex gap-2">
          {['all', 'draft', 'final', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 text-xs rounded-xl font-semibold capitalize transition-colors ${statusFilter === s ? 'bg-amber-600 text-white' : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'}`}>{s}</button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in flex items-start gap-2">
          <span className="mt-0.5 text-red-400">âš </span>
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <HiOutlineDocumentText className="w-12 h-12 text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500 font-medium">No quotations found</p>
            <Link to="/quotations/new" className="inline-flex items-center gap-1 mt-4 text-sm text-amber-600 hover:underline"><HiOutlinePlus className="w-4 h-4" /> Create first quotation</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr className="text-xs text-surface-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Quotation No.</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Customer</th>
                  <th className="text-right px-5 py-3">Amount</th>
                  <th className="text-center px-5 py-3">Status</th>
                  <th className="text-center px-5 py-3">Converted</th>
                  <th className="text-center px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map(q => {
                  const total = Number(q.subtotal) - Number(q.discount) + Number(q.labour_charges) + Number(q.transport_charges);
                  return (
                    <tr key={q.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-semibold text-amber-700">{q.bill_no}</td>
                      <td className="px-5 py-3.5 text-surface-600">{new Date(q.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-surface-800">{q.customers?.name || '-'}</p>
                        {q.customers?.phone && <p className="text-xs text-surface-400">{q.customers.phone}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-surface-800">₹ {fmt(total)}</td>
                      <td className="px-5 py-3.5 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[q.status] || ''}`}>{q.status}</span></td>
                      <td className="px-5 py-3.5 text-center">
                        {q.converted_to_bill_id ? (
                          <Link to={`/billing/${q.converted_to_bill_id}`} className="text-xs text-green-600 hover:underline font-medium">View Bill â†’</Link>
                        ) : <span className="text-xs text-surface-400">-</span>}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Link to={`/quotations/${q.id}`} className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium"><HiOutlineEye className="w-3.5 h-3.5" /> View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
