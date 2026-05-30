-- ==========================================
-- COMPREHENSIVE MOCK DATA GENERATOR
-- Run this in your Supabase SQL Editor
-- ==========================================

DO $$
DECLARE
  cat_elec uuid;
  cat_furn uuid;
  p_cat_ret uuid;
  p_cat_wh uuid;
  cust1 uuid;
  cust2 uuid;
  supp1 uuid;
  prod1 uuid;
  prod2 uuid;
  prod3 uuid;
  carp1 uuid;
  bill1 uuid;
  bill2 uuid;
  pur1 uuid;
BEGIN
  -- 1. Update Shop Settings
  UPDATE shop_settings SET shop_name = 'SVE', owner_name = 'Umang Agrawal' WHERE id = (SELECT id FROM shop_settings LIMIT 1);
  -- If empty for some reason, insert it
  INSERT INTO shop_settings (shop_name, owner_name) 
  SELECT 'SVE', 'Umang Agrawal' 
  WHERE NOT EXISTS (SELECT 1 FROM shop_settings);

  -- 2. Item Categories
  INSERT INTO item_categories (name) VALUES ('Electronics') RETURNING id INTO cat_elec;
  INSERT INTO item_categories (name) VALUES ('Furniture') RETURNING id INTO cat_furn;

  -- 3. Party Categories
  INSERT INTO party_categories (name) VALUES ('Retail Customer') RETURNING id INTO p_cat_ret;
  INSERT INTO party_categories (name) VALUES ('Wholesale Supplier') RETURNING id INTO p_cat_wh;

  -- 4. Parties
  INSERT INTO parties (name, mobile, party_type, category_id, current_balance, opening_balance)
  VALUES ('Rahul Sharma', '9876543210', 'customer', p_cat_ret, 15000, 0) RETURNING id INTO cust1;
  
  INSERT INTO parties (name, mobile, party_type, category_id, current_balance, opening_balance)
  VALUES ('Neha Gupta', '9876543211', 'customer', p_cat_ret, 5000, 0) RETURNING id INTO cust2;

  INSERT INTO parties (name, mobile, party_type, category_id, current_balance, opening_balance)
  VALUES ('Tech Distributors Ltd', '1234567890', 'supplier', p_cat_wh, -45000, 0) RETURNING id INTO supp1;

  -- 5. Products
  INSERT INTO products (name, item_code, category_id, sale_price, purchase_price, stock_qty, low_stock_alert_qty)
  VALUES ('Dell XPS 15', 'LPT-001', cat_elec, 120000, 110000, 5, 2) RETURNING id INTO prod1;

  INSERT INTO products (name, item_code, category_id, sale_price, purchase_price, stock_qty, low_stock_alert_qty)
  VALUES ('Ergonomic Chair', 'CHR-001', cat_furn, 8000, 5000, 20, 5) RETURNING id INTO prod2;

  INSERT INTO products (name, item_code, category_id, sale_price, purchase_price, stock_qty, low_stock_alert_qty)
  VALUES ('Wireless Mouse', 'MOU-001', cat_elec, 1500, 900, 1, 5) RETURNING id INTO prod3;

  -- 6. Quotation
  INSERT INTO quotations (party_id, quotation_no, date, subtotal, discount, grand_total, status, items)
  VALUES (
    cust1, 'QT-001', CURRENT_DATE - INTERVAL '5 days', 120000, 0, 120000, 'pending',
    ('[{"name": "Dell XPS 15", "qty": 1, "price": 120000, "total": 120000}]')::jsonb
  );

  -- 7. Proforma Invoice (Stored as bill with status 'proforma')
  INSERT INTO bills (party_id, bill_no, date, subtotal, discount, grand_total, status, items)
  VALUES (
    cust2, 'PROF-001', CURRENT_DATE - INTERVAL '3 days', 8000, 0, 8000, 'proforma',
    ('[{"name": "Ergonomic Chair", "qty": 1, "price": 8000, "total": 8000}]')::jsonb
  );

  -- 8. Sales Invoices (Bills)
  INSERT INTO bills (party_id, bill_no, date, subtotal, discount, grand_total, status, items)
  VALUES (
    cust1, 'INV-001', CURRENT_DATE - INTERVAL '2 days', 121500, 1500, 120000, 'final',
    ('[{"name": "Dell XPS 15", "qty": 1, "price": 120000, "total": 120000}, {"name": "Wireless Mouse", "qty": 1, "price": 1500, "total": 1500}]')::jsonb
  ) RETURNING id INTO bill1;

  INSERT INTO bills (party_id, bill_no, date, subtotal, discount, grand_total, status, items)
  VALUES (
    cust2, 'INV-002', CURRENT_DATE, 16000, 1000, 15000, 'final',
    ('[{"name": "Ergonomic Chair", "qty": 2, "price": 8000, "total": 16000}]')::jsonb
  ) RETURNING id INTO bill2;

  -- 9. Sales Return
  INSERT INTO sale_returns (customer_id, return_date, total_return_amount, items, reason)
  VALUES (
    cust1, CURRENT_DATE, 1500, 
    ('[{"name": "Wireless Mouse", "qty": 1, "price": 1500, "total": 1500}]')::jsonb,
    'Defective mouse'
  );

  -- 10. Delivery Challan
  INSERT INTO delivery_challans (party_id, challan_no, date, status, items)
  VALUES (
    cust1, 'CH-001', CURRENT_DATE - INTERVAL '1 day', 'Delivered',
    ('[{"name": "Dell XPS 15", "qty": 1}]')::jsonb
  );

  -- 11. Payment In (Bill Payments)
  INSERT INTO bill_payments (party_id, amount, date, payment_mode, notes)
  VALUES (cust1, 50000, CURRENT_DATE - INTERVAL '1 day', 'UPI', 'Advance payment');

  -- 12. Purchase Invoices
  INSERT INTO purchase_invoices (supplier_id, bill_no, date, subtotal, discount, grand_total, status, items)
  VALUES (
    supp1, 'PUR-001', CURRENT_DATE - INTERVAL '10 days', 559000, 9000, 550000, 'final',
    ('[{"name": "Dell XPS 15", "qty": 5, "price": 110000, "total": 550000}, {"name": "Wireless Mouse", "qty": 10, "price": 900, "total": 9000}]')::jsonb
  ) RETURNING id INTO pur1;

  -- 13. Purchase Return
  INSERT INTO purchase_returns (original_purchase_id, supplier_id, return_date, total_return_amount, items, reason)
  VALUES (
    pur1, supp1, CURRENT_DATE - INTERVAL '8 days', 900,
    ('[{"name": "Wireless Mouse", "qty": 1, "price": 900, "total": 900}]')::jsonb,
    'Damaged in transit'
  );

  -- 14. Payment Out (Purchase Payments)
  INSERT INTO purchase_payments (party_id, amount, date, payment_mode, notes)
  VALUES (supp1, 100000, CURRENT_DATE - INTERVAL '5 days', 'Bank Transfer', 'First Installment');

  -- 15. Expenses
  INSERT INTO expense_categories (name) VALUES ('Electricity Bill'), ('Office Rent');
  
  INSERT INTO expenses (category_id, amount, date, payment_mode, notes)
  SELECT id, 2500, CURRENT_DATE - INTERVAL '2 days', 'UPI', 'May Electricity' FROM expense_categories WHERE name = 'Electricity Bill';

  INSERT INTO expenses (category_id, amount, date, payment_mode, notes)
  SELECT id, 15000, CURRENT_DATE - INTERVAL '1 day', 'Bank Transfer', 'June Rent' FROM expense_categories WHERE name = 'Office Rent';

  -- 16. Carpenters & Jobs
  INSERT INTO carpenters (name, mobile, current_balance) VALUES ('Ramesh Woodworks', '7777777777', 12000) RETURNING id INTO carp1;

  INSERT INTO carpenter_jobs (carpenter_id, job_name, amount, date, status)
  VALUES (carp1, 'Make 5 Custom Tables', 12000, CURRENT_DATE - INTERVAL '4 days', 'in-progress');
  
  INSERT INTO carpenter_payments (carpenter_id, amount, date, payment_mode)
  VALUES (carp1, 5000, CURRENT_DATE - INTERVAL '1 day', 'Cash');

END $$;
