-- ====================================================================
-- BILLDESK: SUPABASE SCHEMA (PART 2)
-- Run this completely in your Supabase SQL Editor.
-- ====================================================================

-- 1. Helper function for RLS (Row Level Security)
-- This allows us to securely check the current user's role without infinite recursion.
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ====================================================================
-- 2. TABLE DEFINITIONS
-- ====================================================================

-- Profiles (Updating existing table from Part 1 to include new columns if missing)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff', 'accountant')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    notes TEXT,
    balance NUMERIC DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    notes TEXT,
    balance NUMERIC DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT,
    mrp NUMERIC DEFAULT 0.00,
    selling_price NUMERIC DEFAULT 0.00,
    stock_qty NUMERIC DEFAULT 0.00,
    low_stock_alert_qty NUMERIC DEFAULT 0.00,
    barcode TEXT,
    godown_location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_no TEXT UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES customers(id),
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC DEFAULT 0.00,
    discount NUMERIC DEFAULT 0.00,
    labour_charges NUMERIC DEFAULT 0.00,
    transport_charges NUMERIC DEFAULT 0.00,
    advance_paid NUMERIC DEFAULT 0.00,
    balance_due NUMERIC DEFAULT 0.00,
    payment_mode TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bill_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES profiles(id),
    change_type TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_no TEXT UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES customers(id),
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC DEFAULT 0.00,
    discount NUMERIC DEFAULT 0.00,
    labour_charges NUMERIC DEFAULT 0.00,
    transport_charges NUMERIC DEFAULT 0.00,
    advance_paid NUMERIC DEFAULT 0.00,
    balance_due NUMERIC DEFAULT 0.00,
    payment_mode TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'cancelled')),
    converted_to_bill_id UUID REFERENCES bills(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_challans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id),
    customer_id UUID REFERENCES customers(id),
    items JSONB NOT NULL DEFAULT '[]',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    bill_id UUID REFERENCES bills(id),
    job_title TEXT,
    materials_used JSONB DEFAULT '[]',
    internal_charges NUMERIC DEFAULT 0.00,
    amount_paid NUMERIC DEFAULT 0.00,
    job_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    amount NUMERIC DEFAULT 0.00,
    payment_mode TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('present', 'absent', 'half-day')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    month TEXT NOT NULL,
    salary_amount NUMERIC DEFAULT 0.00,
    paid_amount NUMERIC DEFAULT 0.00,
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id),
    items JSONB NOT NULL DEFAULT '[]',
    total NUMERIC DEFAULT 0.00,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 3. INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_bill_no ON bills(bill_no);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date);
CREATE INDEX IF NOT EXISTS idx_bills_created_by ON bills(created_by);

CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_bill_no ON quotations(bill_no);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(date);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_carpenter_jobs_bill_id ON carpenter_jobs(bill_id);

-- ====================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ====================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpenters ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpenter_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 5. RLS POLICIES
-- ====================================================================

-- Helper macro to safely drop policies if they exist before creating
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Owner full access" ON %I;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Staff full access" ON %I;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Staff read access" ON %I;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Accountant read access" ON %I;', t);
    END LOOP;
END $$;

-- ── PROFILES ────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Owner can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Owner can update profiles" ON profiles;

CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Owner can read all profiles" ON profiles FOR SELECT USING (public.get_auth_role() = 'owner');
CREATE POLICY "Owner can update profiles" ON profiles FOR UPDATE USING (public.get_auth_role() = 'owner');

-- ── GROUP A: Core Billing & Inventory ───────────
-- (Owner: ALL, Staff: ALL, Accountant: SELECT)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY['customers', 'suppliers', 'products', 'bills', 'quotations', 'delivery_challans', 'purchase_orders'])
    LOOP
        EXECUTE format('CREATE POLICY "Owner full access" ON %I FOR ALL USING (public.get_auth_role() = ''owner'');', t);
        EXECUTE format('CREATE POLICY "Staff full access" ON %I FOR ALL USING (public.get_auth_role() = ''staff'');', t);
        EXECUTE format('CREATE POLICY "Accountant read access" ON %I FOR SELECT USING (public.get_auth_role() = ''accountant'');', t);
    END LOOP;
END $$;

-- ── GROUP B: Sensitive & Reports ────────────────
-- (Owner: ALL, Staff: NONE, Accountant: SELECT)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY['carpenters', 'carpenter_jobs', 'expenses', 'staff_attendance', 'staff_payroll', 'bill_audit_log'])
    LOOP
        EXECUTE format('CREATE POLICY "Owner full access" ON %I FOR ALL USING (public.get_auth_role() = ''owner'');', t);
        EXECUTE format('CREATE POLICY "Accountant read access" ON %I FOR SELECT USING (public.get_auth_role() = ''accountant'');', t);
    END LOOP;
END $$;

-- ── GROUP C: Shop Settings ──────────────────────
-- (Owner: ALL, Staff: SELECT, Accountant: SELECT)
CREATE POLICY "Owner full access" ON shop_settings FOR ALL USING (public.get_auth_role() = 'owner');
CREATE POLICY "Staff read access" ON shop_settings FOR SELECT USING (public.get_auth_role() = 'staff');
CREATE POLICY "Accountant read access" ON shop_settings FOR SELECT USING (public.get_auth_role() = 'accountant');

-- Insert default shop settings if empty
INSERT INTO shop_settings (id, shop_name, address, phone) 
VALUES (gen_random_uuid(), 'My Furniture & Hardware', '123 Market Road', '9999999999')
ON CONFLICT DO NOTHING;
