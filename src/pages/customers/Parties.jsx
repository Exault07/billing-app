import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import {
  HiOutlineUserGroup,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineTrendingDown,
  HiOutlineTrendingUp,
  HiOutlineX,
  HiOutlineDocumentText
} from 'react-icons/hi';

export default function Parties() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSuppliers = location.pathname.includes('/suppliers');
  
  const [activeTab, setActiveTab] = useState(isSuppliers ? 'suppliers' : 'customers');
  
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', shipping_address: '',
    credit_limit: 0, credit_period: 0, balance: 0, notes: ''
  });

  // Totals
  const totalReceivables = customers.reduce((sum, c) => sum + Number(c.balance || 0), 0);
  const totalPayables = suppliers.reduce((sum, s) => sum + Number(s.balance || 0), 0);

  useEffect(() => {
    // If URL changes via sidebar, update tab
    if (location.pathname.includes('/suppliers')) setActiveTab('suppliers');
    else if (location.pathname.includes('/customers')) setActiveTab('customers');
  }, [location.pathname]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: cData }, { data: sData }] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name')
      ]);
      setCustomers(cData || []);
      setSuppliers(sData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/${tab}`);
  };

  const handleSaveParty = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const table = activeTab === 'customers' ? 'customers' : 'suppliers';
      const { error } = await supabase.from(table).insert([formData]);
      if (error) throw error;
      
      setShowModal(false);
      setFormData({ name: '', phone: '', email: '', address: '', shipping_address: '', credit_limit: 0, credit_period: 0, balance: 0, notes: '' });
      fetchData(); // reload
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const listToRender = activeTab === 'customers' ? customers : suppliers;
  const filteredList = listToRender.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.phone && p.phone.includes(searchTerm))
  );

  return (
    <div className="max-w-6xl mx-auto pb-16">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <HiOutlineUserGroup className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-800">Parties Registry</h1>
            <p className="text-xs text-surface-400">Manage Customers, Suppliers, and Ledger Balances.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <HiOutlinePlus className="w-4 h-4" /> Add {activeTab === 'customers' ? 'Customer' : 'Supplier'}
        </button>
      </div>

      {/* ── Metrics Bar ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
            <HiOutlineTrendingDown className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-surface-500 uppercase tracking-wide">To Collect (Receivables)</p>
            <p className="text-2xl font-bold text-surface-900">₹{totalReceivables.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <HiOutlineTrendingUp className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-surface-500 uppercase tracking-wide">To Pay (Payables)</p>
            <p className="text-2xl font-bold text-surface-900">₹{totalPayables.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* ── Main View ── */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        
        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-surface-200 gap-4">
          <div className="flex bg-surface-100 p-1 rounded-xl">
            <button
              onClick={() => handleTabChange('customers')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'customers' ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              Customers ({customers.length})
            </button>
            <button
              onClick={() => handleTabChange('suppliers')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'suppliers' ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              Suppliers ({suppliers.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 text-surface-500 uppercase tracking-wide text-xs">
                <th className="text-left py-3 px-4 font-medium">Party Name</th>
                <th className="text-left py-3 px-4 font-medium">Contact</th>
                <th className="text-right py-3 px-4 font-medium">Opening Balance (₹)</th>
                <th className="text-center py-3 px-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                <tr><td colSpan="4" className="py-8 text-center text-surface-400">Loading...</td></tr>
              ) : filteredList.length === 0 ? (
                <tr><td colSpan="4" className="py-8 text-center text-surface-400">No records found.</td></tr>
              ) : (
                filteredList.map(party => (
                  <tr key={party.id} className="hover:bg-surface-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-surface-800">{party.name}</p>
                      <p className="text-[11px] text-surface-400 max-w-[200px] truncate">{party.address}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-surface-700">{party.phone || '—'}</p>
                      {party.email && <p className="text-[11px] text-surface-400">{party.email}</p>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${Number(party.balance) > 0 ? (activeTab === 'customers' ? 'text-red-600' : 'text-green-600') : 'text-surface-600'}`}>
                        {Number(party.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => navigate(`/${activeTab}/${party.id}`)}
                        className="px-3 py-1.5 bg-surface-100 text-surface-700 text-xs font-semibold rounded-lg hover:bg-surface-200 transition-colors"
                      >
                        View Ledger
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Create Party ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-surface-200">
              <h2 className="text-lg font-bold text-surface-800">Add New {activeTab === 'customers' ? 'Customer' : 'Supplier'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar">
              <form id="party-form" onSubmit={handleSaveParty} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Party Name *</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Phone Number</label>
                    <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Opening Balance (₹)</label>
                    <input type="number" step="0.01" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Credit Limit (₹)</label>
                    <input type="number" step="0.01" value={formData.credit_limit} onChange={e => setFormData({...formData, credit_limit: e.target.value})} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Credit Period (Days)</label>
                    <input type="number" value={formData.credit_period} onChange={e => setFormData({...formData, credit_period: e.target.value})} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Billing Address</label>
                    <textarea rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Shipping Address</label>
                    <textarea rows="2" value={formData.shipping_address} onChange={e => setFormData({...formData, shipping_address: e.target.value})} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Notes</label>
                  <textarea rows="2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" />
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-surface-200 bg-surface-50 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 text-sm font-medium text-surface-600 hover:bg-surface-200 rounded-xl transition-colors">Cancel</button>
              <button form="party-form" type="submit" disabled={saving} className="px-5 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Party'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
