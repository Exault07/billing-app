const fs = require('fs');

let content = fs.readFileSync('src/pages/billing/SalesInvoices.jsx', 'utf8');

// 1. Remove the wrongly placed handlers
const handlersRegex = /\s*const handleCancelBill = async \(bill\) => \{[\s\S]*?const buildMenuOptions = \(bill\) => \[[\s\S]*?\];\s*/;
content = content.replace(handlersRegex, '\n');

// 2. Add handlers correctly inside SalesInvoices, using fetchAll() instead of fetchBills()
const newHandlers = `
  const handleCancelBill = async (bill) => {
    if (bill.status === 'cancelled') return alert('Already cancelled.');
    if (!window.confirm('Are you sure you want to cancel Invoice ' + bill.bill_no + '?')) return;
    try {
      const unpaid = Number(bill.balance_due);
      if (unpaid > 0 && bill.customer_id) {
        const { data: party } = await supabase.from('parties').select('current_balance').eq('id', bill.customer_id).single();
        if (party) {
          await supabase.from('parties').update({ current_balance: Number(party.current_balance) - unpaid }).eq('id', bill.customer_id);
        }
      }
      const { error } = await supabase.from('bills').update({ status: 'cancelled' }).eq('id', bill.id);
      if (error) throw error;
      alert('Invoice cancelled successfully.');
      fetchAll();
    } catch (err) {
      alert('Error cancelling: ' + err.message);
    }
  };

  const handleDeleteBill = async (bill) => {
    if (!window.confirm('Are you sure you want to delete Invoice ' + bill.bill_no + '? This cannot be undone.')) return;
    try {
      if (bill.status !== 'cancelled') {
        const unpaid = Number(bill.balance_due);
        if (unpaid > 0 && bill.customer_id) {
          const { data: party } = await supabase.from('parties').select('current_balance').eq('id', bill.customer_id).single();
          if (party) {
            await supabase.from('parties').update({ current_balance: Number(party.current_balance) - unpaid }).eq('id', bill.customer_id);
          }
        }
        await supabase.from('bills').update({ status: 'cancelled' }).eq('id', bill.id);
      }
      await supabase.from('bill_payments').delete().eq('bill_id', bill.id);
      const { error } = await supabase.from('bills').delete().eq('id', bill.id);
      if (error) throw error;
      alert('Invoice deleted successfully.');
      fetchAll();
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  const buildMenuOptions = (bill) => [
    { label: 'Edit', icon: <HiOutlinePencilAlt />, onClick: () => navigate('/billing/' + bill.id + '/edit') },
    { label: 'Duplicate', icon: <HiOutlineDocumentDuplicate />, onClick: () => navigate('/billing/new', { state: { duplicateFrom: bill.id } }) },
    { label: 'Issue Credit Note', icon: <HiOutlineReceiptRefund />, onClick: () => navigate('/sales/returns', { state: { selectedBillId: bill.id } }) },
    { divider: true },
    { label: 'Cancel Invoice', icon: <HiOutlineBan />, onClick: () => handleCancelBill(bill), danger: true },
    { label: 'Delete', icon: <HiOutlineTrash />, onClick: () => handleDeleteBill(bill), danger: true }
  ];
`;

content = content.replace(
  "export default function SalesInvoices() {\n  const navigate = useNavigate();",
  "export default function SalesInvoices() {\n  const navigate = useNavigate();" + newHandlers
);

fs.writeFileSync('src/pages/billing/SalesInvoices.jsx', content);
console.log('Fixed SalesInvoices.jsx');
