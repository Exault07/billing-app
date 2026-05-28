-- ====================================================================
-- ADD PARTIES COLUMNS TO CUSTOMERS AND SUPPLIERS TABLES
-- ====================================================================

-- Customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0.00;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_period INTEGER DEFAULT 0;

-- Suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0.00;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS credit_period INTEGER DEFAULT 0;
