const fs = require('fs');
let code = fs.readFileSync('src/pages/billing/BillForm.jsx', 'utf8');

// Add shopSettings fetch inside the data loading useEffect
// Find where customers are fetched to inject shop settings fetch alongside it
const targetFetch = "const { data: custData } = await supabase.from('parties').select('id, name, phone, current_balance').eq('party_type', 'customer').order('name');";
const shopFetch = `const { data: settingsData } = await supabase.from('shop_settings').select('show_po_number, show_eway_number, show_vehicle_number').limit(1).maybeSingle();
      if (settingsData) setShopSettings(settingsData);

      const { data: custData } = await supabase.from('parties').select('id, name, phone, current_balance').eq('party_type', 'customer').order('name');`;

if (!code.includes("setShopSettings(settingsData)") && code.includes(targetFetch)) {
  code = code.replace(targetFetch, shopFetch);
  console.log('Added shopSettings fetch');
} else {
  console.log('shopSettings fetch already present or target not found');
  // Try alternate way
  const alt = "const { data: custData }";
  const idx = code.indexOf(alt);
  if (idx > -1) {
    console.log('Found custData at index:', idx, 'context:', code.slice(idx-10, idx+30));
  }
}

fs.writeFileSync('src/pages/billing/BillForm.jsx', code);
console.log('Done');
