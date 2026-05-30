-- ==========================================
-- 00_MASTER_SCHEMA.SQL
-- Run this in Supabase SQL Editor to wipe and reset your database
-- ==========================================

-- 1. Wipe everything to start fresh
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. CORE TABLES
-- ==========================================

CREATE TABLE shop_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_name TEXT DEFAULT '',
    owner_name TEXT DEFAULT '',
    address_line1 TEXT DEFAULT '',
    address_line2 TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    pincode TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    alternate_phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    gstin TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    tagline TEXT DEFAULT '',
    terms_conditions TEXT DEFAULT '',
    bank_name TEXT DEFAULT '',
    account_name TEXT DEFAULT '',
    account_number TEXT DEFAULT '',
    ifsc_code TEXT DEFAULT '',
    upi_id TEXT DEFAULT '',
    signature_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE item_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE party_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified Parties Table
CREATE TABLE parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_type TEXT NOT NULL, -- 'customer', 'supplier', or 'both'
    name TEXT NOT NULL,
    mobile TEXT,
    email TEXT,
    pan_number TEXT,
    opening_balance NUMERIC DEFAULT 0,
    balance_type TEXT DEFAULT 'receive', -- 'receive' or 'pay'
    current_balance NUMERIC DEFAULT 0,
    billing_address TEXT,
    shipping_address JSONB,
    credit_period INTEGER DEFAULT 0,
    credit_limit NUMERIC DEFAULT 0,
    notes TEXT,
    category_id UUID REFERENCES party_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES item_categories(id) ON DELETE SET NULL,
    unit TEXT,
    barcode TEXT,
    selling_price NUMERIC DEFAULT 0,
    purchase_price NUMERIC DEFAULT 0,
    tax_rate NUMERIC DEFAULT 0,
    stock_qty NUMERIC DEFAULT 0,
    low_stock_alert_qty NUMERIC DEFAULT 0,
    min_stock NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. SALES & BILLING
-- ==========================================

CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES parties(id),
    bill_no TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    grand_total NUMERIC DEFAULT 0,
    balance_due NUMERIC DEFAULT 0,
    payment_mode TEXT,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bill_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    party_id UUID REFERENCES parties(id),
    payment_no TEXT,
    amount NUMERIC DEFAULT 0,
    payment_mode TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_advance BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sale_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_no TEXT NOT NULL,
    original_bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES parties(id),
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    additional_charges NUMERIC DEFAULT 0,
    total_return_amount NUMERIC NOT NULL DEFAULT 0,
    amount_refunded NUMERIC DEFAULT 0,
    refund_mode TEXT,
    reason TEXT,
    status TEXT DEFAULT 'Completed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES parties(id),
    bill_no TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    grand_total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE delivery_challans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES parties(id),
    challan_no TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    items JSONB NOT NULL DEFAULT '[]',
    vehicle_no TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. PURCHASES
-- ==========================================

CREATE TABLE purchase_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES parties(id),
    bill_no TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    grand_total NUMERIC DEFAULT 0,
    balance_due NUMERIC DEFAULT 0,
    payment_mode TEXT,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES purchase_invoices(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES parties(id),
    payment_no TEXT,
    amount NUMERIC DEFAULT 0,
    payment_mode TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_advance BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_no TEXT,
    original_purchase_id UUID REFERENCES purchase_invoices(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES parties(id),
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    items JSONB NOT NULL DEFAULT '[]',
    total_return_amount NUMERIC DEFAULT 0,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. CARPENTERS
-- ==========================================

CREATE TABLE carpenters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    default_commission_rate NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE carpenter_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carpenter_id UUID REFERENCES carpenters(id) ON DELETE CASCADE,
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    job_title TEXT,
    materials_used JSONB DEFAULT '[]',
    internal_charges NUMERIC DEFAULT 0,
    amount_paid NUMERIC DEFAULT 0,
    job_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 6. EXPENSES & HR
-- ==========================================

CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    amount NUMERIC DEFAULT 0,
    payment_mode TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS for all tables
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpenters ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpenter_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create generic open policies for authenticated users
CREATE POLICY "allow_auth_all" ON shop_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON item_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON party_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON units FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON parties FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON bills FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON bill_payments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON sale_returns FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON quotations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON delivery_challans FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON purchase_invoices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON purchase_payments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON purchase_returns FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON carpenters FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON carpenter_jobs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON expense_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_auth_all" ON expenses FOR ALL USING (auth.role() = 'authenticated');
