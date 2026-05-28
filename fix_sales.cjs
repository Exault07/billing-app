const fs = require('fs');
let content = fs.readFileSync('src/pages/billing/SalesInvoices.jsx', 'utf8');

const missingCode = `
import ActionMenu from '../../components/ActionMenu';

// ─── Helper ─────────────────────────────────────────────────────────────────
async function generateBillNo() {
  const { count } = await supabase.from('bills').select('id', { count: 'exact', head: true });
  return String((count || 0) + 1);
}

`;

content = content.replace(
  "// A??,A??,A??, Add Items Modal",
  missingCode + "// A??,A??,A??, Add Items Modal"
);

fs.writeFileSync('src/pages/billing/SalesInvoices.jsx', content);
console.log('Fixed SalesInvoices.jsx');
