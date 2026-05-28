const fs = require('fs');
let content = fs.readFileSync('src/pages/purchases/PurchaseForm.jsx', 'utf8');

// Add useLocation import
content = content.replace(
  "import { useParams, useNavigate } from 'react-router-dom';",
  "import { useParams, useNavigate, useLocation } from 'react-router-dom';"
);

// Add useLocation hook inside the component
content = content.replace(
  "const navigate = useNavigate();",
  "const navigate = useNavigate();\n  const location = useLocation();"
);

// Add duplicate logic
const duplicateEffect = `
  useEffect(() => {
    if (location.state?.duplicateFrom) {
      const fetchDuplicate = async () => {
        setLoadingData(true);
        try {
          const { data, error } = await supabase.from('purchase_invoices').select('*').eq('id', location.state.duplicateFrom).single();
          if (error) throw error;
          
          setSupplierId(data.supplier_id);
          if (data.items) setItems(data.items);
          setSubtotal(data.subtotal || 0);
          setDiscount(data.discount || 0);
          setAdditionalCharges(data.additional_charges || 0);
          setGrandTotal(data.total_amount || 0);
          setNotes(data.notes || '');
          
          setDate(new Date().toISOString().split('T')[0]);
          // keep invoice_no empty so user can fill it
          setInvoiceNo('');
        } catch (err) {
          console.error('Error duplicating purchase bill', err);
        } finally {
          setLoadingData(false);
        }
      };
      fetchDuplicate();
    }
  }, [location.state?.duplicateFrom]);
`;

content = content.replace(
  "useEffect(() => {\n    if (!isEditing) return;",
  duplicateEffect + "\n  useEffect(() => {\n    if (!isEditing) return;"
);

fs.writeFileSync('src/pages/purchases/PurchaseForm.jsx', content);
console.log('Updated PurchaseForm.jsx');
