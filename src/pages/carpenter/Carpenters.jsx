import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import {
  HiOutlineUser,
  HiOutlinePlus,
  HiOutlineBriefcase,
  HiOutlineX,
  HiOutlinePencilAlt
} from 'react-icons/hi';

export default function Carpenters() {
  const navigate = useNavigate();
  
  const [carpenters, setCarpenters] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: cData }, { data: jData }] = await Promise.all([
        supabase.from('carpenters').select('*').order('name'),
        supabase.from('carpenter_jobs')
          .select(`
            *,
            carpenters (name),
            bills (bill_no, customer_id)
          `)
          .order('job_date', { ascending: false })
      ]);
      setCarpenters(cData || []);
      setJobs(jData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCarpenter = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('carpenters').insert([formData]);
      if (error) throw error;
      
      setShowModal(false);
      setFormData({ name: '', phone: '', notes: '' });
      fetchData(); // reload
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-16">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <HiOutlineBriefcase className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-800">Carpenter & Worker Management</h1>
            <p className="text-xs text-surface-400">Track internal labor costs and material usage (Hidden from customer bills).</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-surface-300 text-surface-700 hover:bg-surface-50 transition-colors"
          >
            <HiOutlineUser className="w-4 h-4" /> Add Worker
          </button>
          <button 
            onClick={() => navigate('/carpenters/jobs/new')}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-sm"
          >
            <HiOutlinePlus className="w-4 h-4" /> New Job Card
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Left Column: Worker Roster ── */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-surface-200 bg-surface-50 flex justify-between items-center">
            <h2 className="font-bold text-surface-800 text-sm">Worker Profiles</h2>
            <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">{carpenters.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
            {loading ? (
              <p className="text-sm text-surface-400 text-center mt-4">Loading...</p>
            ) : carpenters.length === 0 ? (
              <p className="text-sm text-surface-400 text-center mt-4">No workers added yet.</p>
            ) : (
              carpenters.map(c => (
                <div key={c.id} className="p-3 border border-surface-200 rounded-xl hover:border-orange-300 transition-colors bg-surface-50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-white border border-surface-200 flex items-center justify-center shrink-0">
                      <HiOutlineUser className="w-4 h-4 text-surface-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-surface-800">{c.name}</p>
                      <p className="text-[11px] text-surface-500">{c.phone || 'No phone'}</p>
                    </div>
                  </div>
                  {c.notes && <p className="text-xs text-surface-500 bg-white p-2 rounded-lg border border-surface-100">{c.notes}</p>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right Column: Job Cards ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-surface-200 bg-surface-50 flex justify-between items-center">
            <h2 className="font-bold text-surface-800 text-sm">Internal Job Cards Tracker</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading ? (
              <p className="text-sm text-surface-400 text-center mt-10">Loading jobs...</p>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-surface-400">
                <HiOutlineBriefcase className="w-12 h-12 mb-3 opacity-20" />
                <p>No job cards recorded yet.</p>
                <button onClick={() => navigate('/carpenters/jobs/new')} className="mt-4 text-sm font-medium text-orange-600 hover:text-orange-700">Create the first Job Card</button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map(job => (
                  <div key={job.id} className="border border-surface-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-surface-900">{job.job_title || 'Untitled Job'}</h3>
                        <p className="text-[11px] text-surface-500 mt-0.5">Assigned to: <span className="font-semibold text-surface-700">{job.carpenters?.name}</span> • Date: {job.job_date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.bills && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                            Linked: {job.bills.bill_no}
                          </span>
                        )}
                        <button onClick={() => navigate(`/carpenters/jobs/${job.id}/edit`)} className="p-1.5 text-surface-400 hover:text-primary-600 transition-colors">
                          <HiOutlinePencilAlt className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-surface-100">
                      <div>
                        <p className="text-[10px] text-surface-400 uppercase tracking-wide mb-1">Materials Used</p>
                        <ul className="text-xs text-surface-700 space-y-0.5">
                          {job.materials_used && job.materials_used.length > 0 ? (
                            job.materials_used.map((m, i) => (
                              <li key={i}>• {m.name} ({m.qty} {m.unit})</li>
                            ))
                          ) : (
                            <li className="text-surface-400 italic">No materials logged</li>
                          )}
                        </ul>
                      </div>
                      <div className="text-right">
                        <div className="mb-2">
                          <p className="text-[10px] text-surface-400 uppercase tracking-wide">Internal Labor Cost</p>
                          <p className="text-sm font-bold text-surface-800">₹{Number(job.internal_charges).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-surface-400 uppercase tracking-wide">Amount Paid</p>
                          <p className="text-sm font-bold text-green-600">₹{Number(job.amount_paid).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                    
                    {job.notes && (
                      <div className="mt-3 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                        <p className="text-xs text-amber-900"><span className="font-semibold">Private Notes:</span> {job.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Modal: Create Carpenter ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-surface-200">
              <h2 className="text-lg font-bold text-surface-800">Add Worker Profile</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5">
              <form id="carpenter-form" onSubmit={handleSaveCarpenter} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Full Name *</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Phone Number</label>
                  <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Skills / Notes</label>
                  <textarea rows="3" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="e.g., Expert in polishing, daily rate ₹800..." className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-surface-200 bg-surface-50 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 text-sm font-medium text-surface-600 hover:bg-surface-200 rounded-xl transition-colors">Cancel</button>
              <button form="carpenter-form" type="submit" disabled={saving} className="px-5 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Worker'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
