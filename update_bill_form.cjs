const fs = require('fs');
let content = fs.readFileSync('src/pages/billing/BillForm.jsx', 'utf8');

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

// Add duplicate logic inside the fetchBill useEffect
// We will look for `const { id } = useParams();` and add logic there, or just add a new useEffect.
const duplicateEffect = `
  useEffect(() => {
    if (location.state?.duplicateFrom) {
      const fetchDuplicate = async () => {
        setLoadingData(true);
        try {
          const { data, error } = await supabase.from('bills').select('*').eq('id', location.state.duplicateFrom).single();
          if (error) throw error;
          
          setCustomerId(data.customer_id);
          if (data.items) setItems(data.items);
          setSubtotal(data.subtotal || 0);
          setDiscount(data.discount || 0);
          setAdditionalCharges(data.additional_charges || 0);
          setGrandTotal(data.total_amount || 0);
          setPaymentTerms(data.payment_terms || 0);
          setCarpenterId(data.carpenter_id || '');
          setCarpenterCommission(data.carpenter_commission || 0);
          setNotes(data.notes || '');
          
          // Generate new bill no
          const newNo = await generateBillNo();
          setBillNo(newNo);
          setDate(new Date().toISOString().split('T')[0]);
        } catch (err) {
          console.error('Error duplicating bill', err);
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

fs.writeFileSync('src/pages/billing/BillForm.jsx', content);
console.log('Updated BillForm.jsx');
