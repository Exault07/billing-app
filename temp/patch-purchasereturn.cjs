const fs = require('fs');
let content = fs.readFileSync('src/pages/sales/SaleReturn.jsx', 'utf8');

// Replacements
content = content.replace(/SaleReturn/g, 'PurchaseReturn');
content = content.replace(/Sales Return/g, 'Purchase Return');
content = content.replace(/sale_returns/g, 'purchase_returns');
content = content.replace(/customer/g, 'supplier');
content = content.replace(/Customer/g, 'Supplier');
content = content.replace(/customers/g, 'suppliers');
content = content.replace(/bills/g, 'purchase_invoices');
content = content.replace(/billsRes/g, 'invoicesRes');
content = content.replace(/original_bill_id/g, 'original_purchase_id');
content = content.replace(/bill_no/g, 'invoice_number');
content = content.replace(/SR-/g, 'PR-');
content = content.replace(/'customer', 'both'/g, "'supplier', 'both'");

fs.writeFileSync('src/pages/purchases/PurchaseReturn.jsx', content);
console.log('PurchaseReturn.jsx rewritten.');
