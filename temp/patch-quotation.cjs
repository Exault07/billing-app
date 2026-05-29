const fs = require('fs');

let content = fs.readFileSync('src/pages/billing/BillForm.jsx', 'utf8');

content = content.replace(/BillForm/g, 'QuotationForm');
content = content.replace(/generateBillNo/g, 'generateQuotationNo');
content = content.replace(/from\('bills'\)/g, 'from(\'quotations\')');
content = content.replace(/BILL-/g, 'QUOT-');
content = content.replace(/Sales Invoice/g, 'Quotation');
content = content.replace(/status: balanceDue <= 0 \? 'paid' : 'final',/g, "status: 'draft',");

// Remove the billType dynamically added stuff
content = content.replace(/const searchParams = new URLSearchParams\(location\.search\);\s*const \[billType, setBillType\] = useState\(searchParams\.get\('type'\) \|\| 'invoice'\);/g, '');
content = content.replace(/bill_type: billType,/g, '');

// Clean up the dynamic labels
content = content.replace(/\{billType === 'proforma' \? 'Proforma Invoice' : 'Quotation'\}/g, "'Quotation'");
content = content.replace(/\{billType === 'proforma' \? 'Proforma' : 'Quotation'\}/g, "'Quotation'");

fs.writeFileSync('src/pages/billing/QuotationForm.jsx', content);
console.log('QuotationForm patched successfully.');
