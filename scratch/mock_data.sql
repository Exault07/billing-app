-- ====================================================================
-- MOCK DATA GENERATOR
-- Run this in your Supabase SQL Editor to populate test data
-- ====================================================================

DO $$
DECLARE
  cat_electronics uuid;
  cat_furniture uuid;
  party_cat_retail uuid;
  party_cat_wholesale uuid;
  customer1 uuid;
  customer2 uuid;
  supplier1 uuid;
  prod1 uuid;
  prod2 uuid;
  prod3 uuid;
  carp1 uuid;
BEGIN
  -- 1. Create categories
  INSERT INTO item_categories (name) VALUES ('Electronics') RETURNING id INTO cat_electronics;
  INSERT INTO item_categories (name) VALUES ('Furniture') RETURNING id INTO cat_furniture;
  
  -- 2. Create party categories
  INSERT INTO party_categories (name) VALUES ('Retail') RETURNING id INTO party_cat_retail;
  INSERT INTO party_categories (name) VALUES ('Wholesale') RETURNING id INTO party_cat_wholesale;
  
  -- 3. Create Parties
  INSERT INTO parties (name, mobile, party_type, category_id, current_balance, opening_balance)
  VALUES ('John Doe', '9876543210', 'customer', party_cat_retail, 30000, 0)
  RETURNING id INTO customer1;
  
  INSERT INTO parties (name, mobile, party_type, category_id, current_balance, opening_balance)
  VALUES ('Jane Smith', '9876543211', 'customer', party_cat_wholesale, 14500, 0)
  RETURNING id INTO customer2;
  
  INSERT INTO parties (name, mobile, party_type, category_id, current_balance, opening_balance)
  VALUES ('Acme Corp', '1234567890', 'supplier', party_cat_wholesale, -45000, 0)
  RETURNING id INTO supplier1;

  -- 4. Create Products
  INSERT INTO products (name, item_code, category_id, sale_price, purchase_price, stock_qty, low_stock_alert_qty)
  VALUES ('Laptop', 'LPT-01', cat_electronics, 50000, 45000, 10, 2)
  RETURNING id INTO prod1;

  INSERT INTO products (name, item_code, category_id, sale_price, purchase_price, stock_qty, low_stock_alert_qty)
  VALUES ('Office Chair', 'CHR-01', cat_furniture, 5000, 3000, 50, 5)
  RETURNING id INTO prod2;

  -- Low stock item to trigger alert
  INSERT INTO products (name, item_code, category_id, sale_price, purchase_price, stock_qty, low_stock_alert_qty)
  VALUES ('Wireless Mouse', 'MOU-01', cat_electronics, 1500, 1000, 1, 5)
  RETURNING id INTO prod3;

  -- 5. Create Carpenters
  INSERT INTO carpenters (name, mobile, current_balance)
  VALUES ('Bob Builder', '5555555555', 3000)
  RETURNING id INTO carp1;

  -- 6. Create Bills (Sales Invoices)
  -- Sale to John Doe
  INSERT INTO bills (party_id, bill_no, date, subtotal, discount, grand_total, status, items)
  VALUES (
    customer1, 'INV-001', CURRENT_DATE - INTERVAL '2 days', 50000, 0, 50000, 'final',
    ('[{"name": "Laptop", "qty": 1, "price": 50000, "total": 50000}]')::jsonb
  );

  -- Sale to Jane Smith
  INSERT INTO bills (party_id, bill_no, date, subtotal, discount, grand_total, status, items)
  VALUES (
    customer2, 'INV-002', CURRENT_DATE, 15000, 500, 14500, 'final',
    ('[{"name": "Office Chair", "qty": 3, "price": 5000, "total": 15000}]')::jsonb
  );
  
  -- 7. Create Purchase Invoices
  INSERT INTO purchase_invoices (supplier_id, bill_no, date, subtotal, discount, grand_total, status, items)
  VALUES (
    supplier1, 'PUR-001', CURRENT_DATE - INTERVAL '10 days', 45000, 0, 45000, 'final',
    ('[{"name": "Laptop", "qty": 1, "price": 45000, "total": 45000}]')::jsonb
  );

  -- 8. Create Bill Payments (Money Received from John Doe)
  INSERT INTO bill_payments (party_id, amount, date, payment_mode, notes)
  VALUES (customer1, 20000, CURRENT_DATE - INTERVAL '1 day', 'UPI', 'Partial payment for Laptop');

  -- 9. Create Expenses
  INSERT INTO expense_categories (name) VALUES ('Office Supplies');
  INSERT INTO expense_categories (name) VALUES ('Electricity');
  
  INSERT INTO expenses (category_id, amount, date, payment_mode, notes)
  SELECT id, 1200, CURRENT_DATE, 'Cash', 'Printer Ink' FROM expense_categories WHERE name = 'Office Supplies';

  -- 10. Carpenter Jobs
  INSERT INTO carpenter_jobs (carpenter_id, job_name, amount, date, status)
  VALUES (carp1, 'Fix Office Cabinets', 3000, CURRENT_DATE, 'pending');

  -- 11. Update Shop Settings
  UPDATE shop_settings SET shop_name = 'My Demo Shop', owner_name = 'Demo Owner' WHERE id = (SELECT id FROM shop_settings LIMIT 1);
END $$;
