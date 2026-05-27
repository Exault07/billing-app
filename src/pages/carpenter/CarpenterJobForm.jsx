import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineBriefcase,
  HiOutlineSave,
  HiOutlinePlus,
  HiOutlineTrash
} from 'react-icons/hi';

const emptyMaterial = () => ({ name: '', qty: 1, unit: 'pcs' });

export default function CarpenterJobForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = Boolean(id);

  const [carpenters, setCarpenters] = useState([]);
  const [bills, setBills] = useState([]); // for linking to a customer bill

  // Form State
  const [carpenterId, setCarpenterId] = useState('');
  const [billId, setBillId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDate, setJobDate] = useState(new Date().toISOString().split('T')[0]);
  const [materials, setMaterials] = useState([emptyMaterial()]);
  const [internalCharges, setInternalCharges] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Load dropdowns
      const [{ data: cData }, { data: bData }] = await Promise.all([
        supabase.from('carpenters').select('*').order('name'),
        supabase.from('bills').select('id, bill_no, customer_id, customers(name)').order('created_at', { ascending: false }).limit(50)
      ]);
      setCarpenters(cData || []);
      setBills(bData || []);

      if (isEditing) {
        const { data: jobData, error: jobErr } = await supabase
          .from('carpenter_jobs')
          .select('*')
          .eq('id', id)
          .single();
        if (jobErr) throw jobErr;

        setCarpenterId(jobData.carpenter_id);
        setBillId(jobData.bill_id || '');
        setJobTitle(jobData.job_title || '');
        setJobDate(jobData.job_date);
        setMaterials(jobData.materials_used?.length ? jobData.materials_used : [emptyMaterial()]);
        setInternalCharges(jobData.internal_charges || 0);
        setAmountPaid(jobData.amount_paid || 0);
        setNotes(jobData.notes || '');
      }
    } catch (err) {
      setError('Error loading data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addMaterial = () => setMaterials([...materials, emptyMaterial()]);
  
  const removeMaterial = (idx) => {
    setMaterials(materials.length > 1 ? materials.filter((_, i) => i !== idx) : [emptyMaterial()]);
  };

  const updateMaterial = (idx, field, value) => {
    const updated = [...materials];
    updated[idx][field] = value;
    setMaterials(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!carpenterId) return setError('Please select a worker.');

    setSaving(true);
    try {
      const payload = {
        carpenter_id: carpenterId,
        bill_id: billId || null,
        job_title: jobTitle,
        job_date: jobDate,
        materials_used: materials.filter(m => m.name.trim() !== ''),
        internal_charges: Number(internalCharges),
        amount_paid: Number(amountPaid),
        notes: notes
      };

      if (isEditing) {
        const { error } = await supabase.from('carpenter_jobs').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('carpenter_jobs').insert([payload]);
        if (error) throw error;
      }
      
      navigate('/carpenters');
    } catch (err) {
      setError('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-surface-500">Loading Job Card...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <HiOutlineBriefcase className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-800">
              {isEditing ? 'Edit Job Card' : 'Create Internal Job Card'}
            </h1>
            <p className="text-xs text-surface-400">Track worker labor and hidden material costs.</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50"
        >
          <HiOutlineSave className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Job Card'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">⚠ {error}</div>}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Basic Details */}
        <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
          <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide mb-4">Job Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Job Title / Description</label>
              <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g., Wardrobe Polish Job" className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Date</label>
              <input type="date" value={jobDate} onChange={e => setJobDate(e.target.value)} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Assign Worker *</label>
              <select required value={carpenterId} onChange={e => setCarpenterId(e.target.value)} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500">
                <option value="">— Select Worker —</option>
                {carpenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Link to Customer Bill (Optional)</label>
              <select value={billId} onChange={e => setBillId(e.target.value)} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500">
                <option value="">— Not Linked to Bill —</option>
                {bills.map(b => (
                  <option key={b.id} value={b.id}>{b.bill_no} - {b.customers?.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-surface-400 mt-1">Links this cost to a specific customer invoice without showing it on their printout.</p>
            </div>
          </div>
        </div>

        {/* Materials Tracker */}
        <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide">Internal Materials Used</h2>
            <button type="button" onClick={addMaterial} className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700">
              <HiOutlinePlus className="w-4 h-4" /> Add Material
            </button>
          </div>
          <p className="text-xs text-surface-400 mb-4">Record items consumed by the worker (e.g., Fevicol, Nails, Polish) to track your true job margins.</p>
          
          <div className="space-y-2">
            {materials.map((mat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input 
                  placeholder="Material Name" 
                  value={mat.name} 
                  onChange={e => updateMaterial(idx, 'name', e.target.value)} 
                  className="flex-1 px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                />
                <input 
                  type="number" 
                  min="0.01" step="0.01" 
                  placeholder="Qty" 
                  value={mat.qty} 
                  onChange={e => updateMaterial(idx, 'qty', e.target.value)} 
                  className="w-24 px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                />
                <select 
                  value={mat.unit} 
                  onChange={e => updateMaterial(idx, 'unit', e.target.value)} 
                  className="w-24 px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                >
                  <option value="pcs">Pcs</option>
                  <option value="kg">Kg</option>
                  <option value="ltr">Ltr</option>
                  <option value="box">Box</option>
                  <option value="ft">Ft</option>
                </select>
                <button type="button" onClick={() => removeMaterial(idx)} className="p-2 text-surface-400 hover:text-red-500 transition-colors">
                  <HiOutlineTrash className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Costs & Notes */}
        <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
          <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wide mb-4">Labor Cost & Notes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Internal Labor Charge (₹)</label>
              <input type="number" step="0.01" value={internalCharges} onChange={e => setInternalCharges(e.target.value)} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 font-semibold" />
              <p className="text-[10px] text-surface-400 mt-1">What you agreed to pay the worker for this job.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Amount Paid Now (₹)</label>
              <input type="number" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 font-semibold bg-green-50/20 text-green-700" />
              <p className="text-[10px] text-surface-400 mt-1">How much you actually handed to them today.</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Private Job Notes</label>
            <textarea rows="3" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Job delayed due to rain. Quality check pending..." className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

      </form>
    </div>
  );
}
