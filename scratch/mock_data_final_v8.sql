-- ==========================================
-- FINAL BULLETPROOF MOCK DATA GENERATOR (V8)
-- Run this in your Supabase SQL Editor
-- ==========================================

DO $$
DECLARE
  cat_elec uuid;
  cat_furn uuid;
  p_cat_ret uuid;
  p_cat_wh uuid;
  
  -- Use static UUIDs so we can mirror them across old and new tables
  cust1 uuid := 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1';
  cust2 uuid := 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2';
  supp1 uuid := 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1';
  
  prod1 uuid;
  prod2 uuid;
  prod3 uuid;
  carp1 uuid;
  bill1 uuid;
  bill2 uuid;
  pur1 uuid;
BEGIN
  -- FIX: Remove strict status constraints so the frontend can freely use 'pending', 'proforma', etc.
  ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_status_check;
  ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='purchase_invoices') THEN
    ALTER TABLE purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_status_check;
  END IF;

  -- FIX: Recreate Carpenter tables if they were lost during a previous database reset
  CREATE TABLE IF NOT EXISTS carpenters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      phone TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  CREATE TABLE IF NOT EXISTS carpenter_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      carpenter_id UUID REFERENCES carpenters(id),
      job_title TEXT,
      amount_paid NUMERIC DEFAULT 0.00,
      job_date DATE NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 1. Update Shop Settings
  UPDATE shop_settings SET shop_name = 'SVE', owner_name = 'Umang Agrawal' WHERE id = (SELECT id FROM shop_settings LIMIT 1);
  INSERT INTO shop_settings (shop_name, owner_name) 
  SELECT 'SVE', 'Umang Agrawal' WHERE NOT EXISTS (SELECT 1 FROM shop_settings);

  -- 2. Item Categories
  INSERT INTO item_categories (name) VALUES ('Electronics (Demo)') RETURNING id INTO cat_elec;
  INSERT INTO item_categories (name) VALUES ('Furniture (Demo)') RETURNING id INTO cat_furn;

  -- 3. Party Categories
  INSERT INTO party_categories (name) VALUES ('Retail (Demo)') RETURNING id INTO p_cat_ret;
  INSERT INTO party_categories (name) VALUES ('Wholesale (Demo)') RETURNING id INTO p_cat_wh;

  -- 4. INSERT INTO OLD CUSTOMERS/SUPPLIERS TABLES (For backward compatibility)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='customers') THEN
    INSERT INTO customers (id, name, phone, balance) VALUES (cust1, 'Rahul Sharma', '9876543210', 15000) ON CONFLICT (id) DO NOTHING;
    INSERT INTO customers (id, name, phone, balance) VALUES (cust2, 'Neha Gupta', '9876543211', 5000) ON CONFLICT (id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='suppliers') THEN
    INSERT INTO suppliers (id, name, phone, balance) VALUES (supp1, 'Tech Distributors Ltd', '1234567890', -45000) ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 5. INSERT INTO NEW PARTIES TABLE (For forward compatibility)
  INSERT INTO parties (id, name, mobile, party_type, category_id, current_balance, opening_balance)
  VALUES (cust1, 'Rahul Sharma', '9876543210', 'customer', p_cat_ret, 15000, 0) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO parties (id, name, mobile, party_type, category_id, current_balance, opening_balance)
  VALUES (cust2, 'Neha Gupta', '9876543211', 'customer', p_cat_ret, 5000, 0) ON CONFLICT (id) DO NOTHING;

  INSERT INTO parties (id, name, mobile, party_type, category_id, current_balance, opening_balance)
  VALUES (supp1, 'Tech Distributors Ltd', '1234567890', 'supplier', p_cat_wh, -45000, 0) ON CONFLICT (id) DO NOTHING;

  -- 6. Products 
  INSERT INTO products (name, barcode, category_id, selling_price, stock_qty, low_stock_alert_qty)
  VALUES ('Dell XPS 15', 'LPT-001', cat_elec, 120000, 5, 2) RETURNING id INTO prod1;

  INSERT INTO products (name, barcode, category_id, selling_price, stock_qty, low_stock_alert_qty)
  VALUES ('Ergonomic Chair', 'CHR-001', cat_furn, 8000, 20, 5) RETURNING id INTO prod2;

  INSERT INTO products (name, barcode, category_id, selling_price, stock_qty, low_stock_alert_qty)
  VALUES ('Wireless Mouse', 'MOU-001', cat_elec, 1500, 1, 5) RETURNING id INTO prod3;

  -- 7. Quotation
  INSERT INTO quotations (customer_id, bill_no, date, subtotal, discount, status, items)
  VALUES (
    cust1, 'QT-001', CURRENT_DATE - INTERVAL '5 days', 120000, 0, 'pending',
    ('[{"name": "Dell XPS 15", "qty": 1, "price": 120000, "total": 120000}]')::jsonb
  );

  -- 8. Proforma Invoice
  INSERT INTO bills (customer_id, bill_no, date, subtotal, discount, status, items)
  VALUES (
    cust2, 'PROF-001', CURRENT_DATE - INTERVAL '3 days', 8000, 0, 'proforma',
    ('[{"name": "Ergonomic Chair", "qty": 1, "price": 8000, "total": 8000}]')::jsonb
  );

  -- 9. Sales Invoices
  INSERT INTO bills (customer_id, bill_no, date, subtotal, discount, status, items)
  VALUES (
    cust1, 'INV-001', CURRENT_DATE - INTERVAL '2 days', 121500, 1500, 'final',
    ('[{"name": "Dell XPS 15", "qty": 1, "price": 120000, "total": 120000}, {"name": "Wireless Mouse", "qty": 1, "price": 1500, "total": 1500}]')::jsonb
  ) RETURNING id INTO bill1;

  INSERT INTO bills (customer_id, bill_no, date, subtotal, discount, status, items)
  VALUES (
    cust2, 'INV-002', CURRENT_DATE, 16000, 1000, 'final',
    ('[{"name": "Ergonomic Chair", "qty": 2, "price": 8000, "total": 16000}]')::jsonb
  ) RETURNING id INTO bill2;

  -- 10. Sales Return
  INSERT INTO sale_returns (customer_id, return_date, total_return_amount, items, reason, return_no)
  VALUES (
    cust1, CURRENT_DATE, 1500, 
    ('[{"name": "Wireless Mouse", "qty": 1, "price": 1500, "total": 1500}]')::jsonb,
    'Defective mouse', 'RTN-001'
  );

  -- 11. Payment In
  INSERT INTO bill_payments (party_id, amount, date, payment_mode, notes, payment_no)
  VALUES (cust1, 50000, CURRENT_DATE - INTERVAL '1 day', 'UPI', 'Advance payment', 'PAY-IN-001');

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

  -- 14. Expenses
  INSERT INTO expenses (category, amount, date, payment_mode, notes)
  VALUES ('Electricity Bill', 2500, CURRENT_DATE - INTERVAL '2 days', 'UPI', 'May Electricity');
  
  INSERT INTO expenses (category, amount, date, payment_mode, notes)
  VALUES ('Office Rent', 15000, CURRENT_DATE - INTERVAL '1 day', 'Bank Transfer', 'June Rent');

  -- 15. Carpenters & Jobs
  INSERT INTO carpenters (name, phone, notes) VALUES ('Ramesh Woodworks', '7777777777', 'Demo Carpenter') RETURNING id INTO carp1;

  INSERT INTO carpenter_jobs (carpenter_id, job_title, amount_paid, job_date, notes)
  VALUES (carp1, 'Make 5 Custom Tables', 5000, CURRENT_DATE - INTERVAL '4 days', 'in-progress');

END $$;
