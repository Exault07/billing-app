-- ==========================================
-- 03_DISABLE_RLS.SQL
-- Run this in your Supabase SQL Editor
-- ==========================================

-- Disable RLS on all tables temporarily to ensure there are no authentication blocks
ALTER TABLE shop_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE units DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE party_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE parties DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_challans DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE carpenters DISABLE ROW LEVEL SECURITY;
ALTER TABLE carpenter_jobs DISABLE ROW LEVEL SECURITY;

-- If you still get "permission denied", you must also run 02_fix_permissions.sql again!
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
