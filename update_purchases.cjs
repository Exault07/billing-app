const fs = require('fs');
let content = fs.readFileSync('src/pages/purchases/PurchaseList.jsx', 'utf8');

// 1. Add imports
content = content.replace(
  'HiDotsVertical\n} from \'react-icons/hi\';',
  'HiDotsVertical,\n HiOutlinePencilAlt,\n HiOutlineDocumentDuplicate,\n HiOutlineReceiptRefund,\n HiOutlineBan,\n HiOutlineTrash\n} from \'react-icons/hi\';\nimport ActionMenu from \'../../components/ActionMenu\';'
);

// 2. Add handlers
const handlers = `
  const handleCancelBill = async (bill) => {
    if (bill.status === 'cancelled') return alert('Already cancelled.');
    if (!window.confirm('Are you sure you want to cancel Purchase Invoice ' + bill.bill_no + '?')) return;
    try {
      const unpaid = Number(bill.balance_due);
      if (unpaid > 0 && bill.supplier_id) {
        const { data: party } = await supabase.from('parties').select('current_balance').eq('id', bill.supplier_id).single();
        if (party) {
          await supabase.from('parties').update({ current_balance: Number(party.current_balance) - unpaid }).eq('id', bill.supplier_id);
        }
      }
      const { error } = await supabase.from('purchase_invoices').update({ status: 'cancelled' }).eq('id', bill.id);
      if (error) throw error;
      alert('Invoice cancelled successfully.');
      fetchData();
    } catch (err) {
      alert('Error cancelling: ' + err.message);
    }
  };

  const handleDeleteBill = async (bill) => {
    if (!window.confirm('Are you sure you want to delete Invoice ' + bill.bill_no + '? This cannot be undone.')) return;
    try {
      if (bill.status !== 'cancelled') {
        const unpaid = Number(bill.balance_due);
        if (unpaid > 0 && bill.supplier_id) {
          const { data: party } = await supabase.from('parties').select('current_balance').eq('id', bill.supplier_id).single();
          if (party) {
            await supabase.from('parties').update({ current_balance: Number(party.current_balance) - unpaid }).eq('id', bill.supplier_id);
          }
        }
        await supabase.from('purchase_invoices').update({ status: 'cancelled' }).eq('id', bill.id);
      }
      await supabase.from('purchase_payments').delete().eq('invoice_id', bill.id);
      const { error } = await supabase.from('purchase_invoices').delete().eq('id', bill.id);
      if (error) throw error;
      alert('Invoice deleted successfully.');
      fetchData();
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  const buildMenuOptions = (inv) => [
    { label: 'Edit', icon: <HiOutlinePencilAlt />, onClick: () => navigate('/purchases/' + inv.id + '/edit') },
    { label: 'Duplicate', icon: <HiOutlineDocumentDuplicate />, onClick: () => navigate('/purchases/new', { state: { duplicateFrom: inv.id } }) },
    { label: 'Issue Debit Note', icon: <HiOutlineReceiptRefund />, onClick: () => navigate('/purchases/returns/new', { state: { selectedInvoiceId: inv.id } }) },
    { divider: true },
    { label: 'Cancel Invoice', icon: <HiOutlineBan />, onClick: () => handleCancelBill(inv), danger: true },
    { label: 'Delete', icon: <HiOutlineTrash />, onClick: () => handleDeleteBill(inv), danger: true }
  ];
`;

content = content.replace('const handleSort = (field) => {', handlers + '\n  const handleSort = (field) => {');

// 3. Render action menu
content = content.replace(
  '<button className="p-1 hover:bg-gray-100 rounded-md transition-colors" onClick={(e) => { e.stopPropagation(); \nnavigate(`/purchases/${inv.id}/edit`); }}>\n   <HiDotsVertical className="w-5 h-5" />\n   </button>',
  '<ActionMenu options={buildMenuOptions(inv)} />'
);

fs.writeFileSync('src/pages/purchases/PurchaseList.jsx', content);
console.log('Updated PurchaseList.jsx');
