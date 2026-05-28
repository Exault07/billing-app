-- ====================================================================
-- BILLDESK: SEED DATA (PART 2)
-- Run this in your Supabase SQL Editor AFTER running schema.sql
-- ====================================================================

-- Insert 2 Dummy Customers
INSERT INTO customers (id, name, phone, address, notes, balance) VALUES
('c0000000-0000-0000-0000-000000000001', 'Rahul Sharma', '9876543210', '123 Main St, Mumbai', 'Regular customer, prefers premium hardware', 0),
('c0000000-0000-0000-0000-000000000002', 'Priya Singh', '8765432109', '456 Elm St, Delhi', 'Wholesale buyer, bulk discounts apply', 5000.00)
ON CONFLICT DO NOTHING;

-- Insert 3 Dummy Products (Hardware & Furniture related)
INSERT INTO products (id, name, category, unit, mrp, selling_price, stock_qty, low_stock_alert_qty, barcode, godown_location) VALUES
('f0000000-0000-0000-0000-000000000001', 'Godrej Interio Ergonomic Chair', 'Furniture', 'piece', 2500.00, 2100.00, 50, 10, 'BAR001', 'A1-Row2'),
('f0000000-0000-0000-0000-000000000002', 'Century Plywood 18mm MR Grade', 'Plywood & Board', 'sqft', 120.00, 95.00, 1000, 200, 'BAR002', 'B3-Rack1'),
('f0000000-0000-0000-0000-000000000003', 'Fevicol SH 1kg Bucket', 'Adhesives & Sealants', 'kg', 350.00, 320.00, 100, 20, 'BAR003', 'C2-Shelf4')
ON CONFLICT DO NOTHING;

-- Insert 1 Dummy Carpenter
INSERT INTO carpenters (id, name, phone, notes) VALUES
('e0000000-0000-0000-0000-000000000001', 'Ramesh Mistry', '9988776655', 'Expert in modular kitchens and wardrobes. Available Mon-Sat.')
ON CONFLICT DO NOTHING;

-- Insert 2 Dummy Bills
-- Note: 'created_by' is left NULL here since your auth.users UUID is dynamically generated. 
-- In the real app, this will automatically link to the logged-in user.
INSERT INTO bills (id, bill_no, date, customer_id, items, subtotal, discount, labour_charges, transport_charges, advance_paid, balance_due, payment_mode, status) VALUES
(
    'b0000000-0000-0000-0000-000000000001', 
    'BILL-20260526-001', 
    '2026-05-26', 
    'c0000000-0000-0000-0000-000000000001', 
    '[{"product_id": "f0000000-0000-0000-0000-000000000001", "name": "Godrej Interio Ergonomic Chair", "qty": 2, "price": 2100, "total": 4200}]'::jsonb, 
    4200.00, 
    200.00, 
    0.00, 
    0.00, 
    4000.00, 
    0.00, 
    'upi', 
    'final'
),
(
    'b0000000-0000-0000-0000-000000000002', 
    'BILL-20260526-002', 
    '2026-05-26', 
    'c0000000-0000-0000-0000-000000000002', 
    '[{"product_id": "f0000000-0000-0000-0000-000000000002", "name": "Century Plywood 18mm MR Grade", "qty": 100, "price": 95, "total": 9500}]'::jsonb, 
    9500.00, 
    500.00, 
    500.00, 
    1000.00, 
    5000.00, 
    5500.00, 
    'cash', 
    'draft'
)
ON CONFLICT DO NOTHING;
