const fs = require('fs');
let code = fs.readFileSync('src/pages/billing/BillForm.jsx', 'utf8');

// 1. Add new state variables safely after isFullyPaid
const isFullyPaidLine = "const [isFullyPaid, setIsFullyPaid] = useState(false);";
const newStates = `const [isFullyPaid, setIsFullyPaid] = useState(false);
 const [poNumber, setPoNumber] = useState('');
 const [ewayNumber, setEwayNumber] = useState('');
 const [vehicleNumber, setVehicleNumber] = useState('');
 const [shopSettings, setShopSettings] = useState(null);`;

if (code.includes(isFullyPaidLine) && !code.includes('poNumber')) {
  code = code.replace(isFullyPaidLine, newStates);
  console.log('Added optional fields state');
}

// 2. Add shopSettings fetch to the data loading Promise.all
const promiseAll = `const [{ data: custData }, { data: prodData }, { data: carpData }] = await Promise.all([
  supabase.from('parties').select('id, name, phone:mobile, balance:current_balance').in('party_type', ['customer', 'both']).order('name'),
  supabase.from('products').select('id, name, category, unit, selling_price, stock_qty').order('name'),
  supabase.from('carpenters').select('id, name, default_commission_rate').order('name')
  ]);
  setCustomers(custData || []);
  setProducts(prodData || []);
  setCarpenters(carpData || []);`;

const newPromiseAll = `const [{ data: custData }, { data: prodData }, { data: carpData }, { data: settingsData }] = await Promise.all([
  supabase.from('parties').select('id, name, phone:mobile, balance:current_balance').in('party_type', ['customer', 'both']).order('name'),
  supabase.from('products').select('id, name, category, unit, selling_price, stock_qty').order('name'),
  supabase.from('carpenters').select('id, name, default_commission_rate').order('name'),
  supabase.from('shop_settings').select('show_po_number, show_eway_number, show_vehicle_number').limit(1).maybeSingle()
  ]);
  setCustomers(custData || []);
  setProducts(prodData || []);
  setCarpenters(carpData || []);
  if (settingsData) setShopSettings(settingsData);`;

if (code.includes(promiseAll.trim().split('\n')[0].trim()) && !code.includes("settingsData")) {
  code = code.replace(promiseAll, newPromiseAll);
  console.log('Added shopSettings fetch to Promise.all');
} else {
  // Try a simpler find
  const target = "supabase.from('carpenters').select('id, name, default_commission_rate').order('name')\n  ]);";
  if (code.includes(target)) {
    code = code.replace(target, `supabase.from('carpenters').select('id, name, default_commission_rate').order('name'),
  supabase.from('shop_settings').select('show_po_number, show_eway_number, show_vehicle_number').limit(1).maybeSingle()
  ]);
  const [custDataR, prodDataR, carpDataR, settingsDataR] = [custData, prodData, carpData];
  if (settingsData) setShopSettings(settingsData);`);
    console.log('Used alternative inject');
  } else {
    console.log('Could not find Promise.all target, trying simpler approach');
    const simpleTarget = "setCarpenters(carpData || []);";
    if (code.includes(simpleTarget)) {
      code = code.replace(simpleTarget, `setCarpenters(carpData || []);
  // Fetch shop settings for optional invoice fields
  const { data: sData } = await supabase.from('shop_settings').select('show_po_number, show_eway_number, show_vehicle_number').limit(1).maybeSingle();
  if (sData) setShopSettings(sData);`);
      console.log('Added simple shopSettings fetch after setCarpenters');
    }
  }
}

// 3. Add po_number, eway_number, vehicle_number to save payload
const payloadEnd = "commission_rate: Number(commissionRate) || 0,\n      };";
const newPayloadEnd = `commission_rate: Number(commissionRate) || 0,
        po_number: poNumber || null,
        eway_number: ewayNumber || null,
        vehicle_number: vehicleNumber || null,
      };`;
if (code.includes(payloadEnd) && !code.includes('po_number:')) {
  code = code.replace(payloadEnd, newPayloadEnd);
  console.log('Added optional fields to payload');
}

fs.writeFileSync('src/pages/billing/BillForm.jsx', code);
console.log('All done');
