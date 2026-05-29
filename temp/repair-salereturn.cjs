const fs = require('fs');
let content = fs.readFileSync('src/pages/sales/SaleReturn.jsx', 'utf8');

const newListComponent = `
// List Component
export default function SaleReturn() {
  const [returns, setReturns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [retRes, custRes, billsRes, prodRes] = await Promise.all([
        supabase.from('sale_returns').select('*, parties(name)').order('created_at', { ascending: false }),
        supabase.from('parties').select('*').in('party_type', ['customer', 'both']).order('name'),
        supabase.from('bills').select('*, customers:parties(name)').order('date', { ascending: false }),
        supabase.from('products').select('*').order('name')
      ]);
      setReturns(retRes.data || []);
      setCustomers(custRes.data || []);
      setBills(billsRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (showForm) {
    return (
      <div className="bg-surface-50 overflow-y-auto animate-fade-in relative z-10 w-full min-h-[calc(100vh-6rem)]">
        <div className="max-w-[1400px] mx-auto px-4 pb-16">
          <CreateReturnForm
            customers={customers}
            products={products}
            bills={bills}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); fetchAll(); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-16 animate-fade-in text-surface-900">
      
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in flex items-start gap-2 mt-4">
          <span className="mt-0.5 text-red-400">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <h1 className="text-xl font-bold text-surface-800">Sales Returns</h1>
        <div className="flex items-center gap-2">
          <button className="px-4 py-1.5 text-[13px] font-semibold border border-[#e5e7eb] rounded text-blue-600 flex items-center gap-1 hover:bg-surface-50">
            <HiOutlineDocumentText className="w-4 h-4" /> Reports
          </button>
          <button className="p-1.5 border border-[#e5e7eb] rounded text-surface-500 hover:bg-surface-50">
            <HiOutlineCog className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Box */}
      <div className="bg-white rounded-md shadow-sm border border-surface-200 p-0 overflow-hidden mt-4">
        {/* Controls */}
        <div className="px-4 py-3 flex flex-wrap gap-3 items-center justify-between border-b border-surface-200">
          <div className="relative w-64">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search returns..."
              className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-surface-200 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-1.5 text-[13px] font-bold bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded shadow-sm flex items-center gap-1"
          >
            <HiOutlinePlus className="w-4 h-4" /> Create Return
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-[#f9fafb] border-b border-surface-200 text-[12px] font-bold text-surface-700">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Return Number</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="text-[13px] text-surface-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-surface-400">Loading...</td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-surface-500">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mb-3">
                        <HiOutlineDocumentText className="w-8 h-8 text-surface-400" />
                      </div>
                      <p className="text-base font-semibold text-surface-700">No returns yet</p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-4 px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm font-semibold hover:bg-[#4338ca]"
                      >
                        + Create Sales Return
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                returns.map(r => (
                  <tr key={r.id} className="border-b border-surface-100 hover:bg-surface-50 group cursor-pointer">
                    <td className="py-3 px-4 whitespace-nowrap">{formatDate(r.return_date)}</td>
                    <td className="py-3 px-4 text-surface-600 font-bold">{r.return_no}</td>
                    <td className="py-3 px-4">{r.parties?.name || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold">
                      ₹ {Number(r.total_return_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase border bg-green-100 text-green-700 border-green-200">
                        {r.status || 'Completed'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button className="text-surface-400 hover:text-surface-800">
                        <HiOutlineDotsVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`;

const listComponentStart = content.indexOf('\n// List Component');
if (listComponentStart !== -1) {
    const newContent = content.substring(0, listComponentStart) + newListComponent;
    fs.writeFileSync('src/pages/sales/SaleReturn.jsx', newContent);
    console.log("Repaired SaleReturn.jsx list component.");
} else {
    console.error("List component start not found.");
}
