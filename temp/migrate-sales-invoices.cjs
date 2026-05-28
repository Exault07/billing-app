const fs = require('fs');
let code = fs.readFileSync('src/pages/billing/SalesInvoices.jsx', 'utf8');

// 1. Update initial state
const initialStateRegex = /const \[invoiceSettings, setInvoiceSettings\] = useState\(\(\) => \{[\s\S]*?\}\);/;
code = code.replace(initialStateRegex, 'const [invoiceSettings, setInvoiceSettings] = useState({ showPurchasePrice: true, priceHistory: true, invoiceTheme: "Billbook(A5)" });');

// 2. Add fetch logic inside fetchAll
const fetchAllRegex = /(const fetchAll = async \(\) => \{[\s\S]*?try \{)(\s*setLoading\(true\);)/;
const settingsFetch = `
      // Fetch Quick Settings
      const { data: settingsData } = await supabase.from('shop_settings').select('invoice_theme, show_purchase_price, show_price_history').limit(1).maybeSingle();
      if (settingsData) {
        const newSettings = {
          showPurchasePrice: settingsData.show_purchase_price !== false,
          priceHistory: settingsData.show_price_history !== false,
          invoiceTheme: settingsData.invoice_theme || 'Billbook(A5)'
        };
        setInvoiceSettings(newSettings);
        setSettingsDraft(newSettings);
      }
`;
code = code.replace(fetchAllRegex, '$1$2' + settingsFetch);

// 3. Update saveInvoiceSettings
const saveSettingsRegex = /const saveInvoiceSettings = \(\) => \{[\s\S]*?setShowSettings\(false\);\n\s*\};/;
const newSaveSettings = `const saveInvoiceSettings = async () => {
    setInvoiceSettings(settingsDraft);
    setShowSettings(false);
    try {
      const { data: existing } = await supabase.from('shop_settings').select('id').limit(1).maybeSingle();
      if (existing) {
        await supabase.from('shop_settings').update({
          invoice_theme: settingsDraft.invoiceTheme,
          show_purchase_price: settingsDraft.showPurchasePrice,
          show_price_history: settingsDraft.priceHistory
        }).eq('id', existing.id);
      } else {
        await supabase.from('shop_settings').insert([{
          shop_name: 'My Shop',
          invoice_theme: settingsDraft.invoiceTheme,
          show_purchase_price: settingsDraft.showPurchasePrice,
          show_price_history: settingsDraft.priceHistory
        }]);
      }
    } catch (err) {
      console.error('Failed to save invoice settings:', err);
    }
  };`;
code = code.replace(saveSettingsRegex, newSaveSettings);

fs.writeFileSync('src/pages/billing/SalesInvoices.jsx', code);
console.log('Migrated SalesInvoices to Supabase');
