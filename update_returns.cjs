const fs = require('fs');

function addLocation(file, searchKey, dbTable) {
  let content = fs.readFileSync(file, 'utf8');

  // Add useLocation import
  if (!content.includes('useLocation')) {
    content = content.replace(
      "import { useNavigate } from 'react-router-dom';",
      "import { useNavigate, useLocation } from 'react-router-dom';"
    );
    if (!content.includes('useLocation')) {
      content = content.replace(
        "import { useState, useEffect } from 'react';",
        "import { useState, useEffect } from 'react';\nimport { useNavigate, useLocation } from 'react-router-dom';"
      );
    }
  }

  // Add location hook
  if (!content.includes('const location = useLocation();')) {
    content = content.replace(
      "const navigate = useNavigate();",
      "const navigate = useNavigate();\n  const location = useLocation();"
    );
    // fallback if no navigate
    if (!content.includes('const location = useLocation();')) {
      content = content.replace(
        "const [step, setStep] = useState(1);",
        "const navigate = useNavigate();\n  const location = useLocation();\n  const [step, setStep] = useState(1);"
      );
    }
  }

  // Add effect
  const effect = `
  useEffect(() => {
    if (location.state?.${searchKey}) {
      const billId = location.state.${searchKey};
      const selectBill = async () => {
        try {
          const { data, error } = await supabase.from('${dbTable}').select('*').eq('id', billId).single();
          if (data) {
            handleSelectBill(data);
          }
        } catch (err) {
          console.error(err);
        }
      };
      selectBill();
    }
  }, [location.state?.${searchKey}]);
  `;

  content = content.replace(
    "const handleSelectBill = (bill) => {",
    effect + "\n  const handleSelectBill = (bill) => {"
  );

  fs.writeFileSync(file, content);
  console.log('Updated', file);
}

addLocation('src/pages/sales/SaleReturn.jsx', 'selectedBillId', 'bills');
addLocation('src/pages/purchases/PurchaseReturn.jsx', 'selectedInvoiceId', 'purchase_invoices');
