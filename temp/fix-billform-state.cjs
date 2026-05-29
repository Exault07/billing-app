const fs = require('fs');
let code = fs.readFileSync('src/pages/billing/BillForm.jsx', 'utf8');

// Check if commissionRate is missing
if (!code.includes('commissionRate')) {
  // Insert after carpenterId line
  code = code.replace(
    'const [carpenterId, setCarpenterId] = useState(\'\');',
    `const [carpenterId, setCarpenterId] = useState('');
 const [commissionRate, setCommissionRate] = useState(0);
 
 const [items, setItems] = useState([emptyItem()]);
 
 const [notes, setNotes] = useState('');
 const [terms, setTerms] = useState('1. GST will be charged additionally as applicable.');
 
 const [additionalCharges, setAdditionalCharges] = useState(0);
 const [overallDiscount, setOverallDiscount] = useState(0);
 const [autoRoundOff, setAutoRoundOff] = useState(false);
 const [amountReceived, setAmountReceived] = useState(0);
 const [isFullyPaid, setIsFullyPaid] = useState(false);`
  );
  console.log('Restored missing state variables');
} else {
  console.log('commissionRate already present');
}

// Add optional invoice fields after saving state or any UI state
if (!code.includes('poNumber')) {
  code = code.replace(
    '// Custom dropdown states',
    `// Optional invoice fields
 const [poNumber, setPoNumber] = useState('');
 const [ewayNumber, setEwayNumber] = useState('');
 const [vehicleNumber, setVehicleNumber] = useState('');
 const [shopSettings, setShopSettings] = useState(null);

 // Custom dropdown states`
  );
  console.log('Added optional invoice field states');
} else {
  console.log('poNumber already present');
}

fs.writeFileSync('src/pages/billing/BillForm.jsx', code);
console.log('Done');
