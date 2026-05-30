-- ==========================================
-- 04_ADD_MISSING_BILLING_COLUMNS.SQL
-- ==========================================

-- Add missing columns to bills (Sales Invoices)
ALTER TABLE bills 
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS labour_charges NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_charges NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_off NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_paid NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bill_type TEXT DEFAULT 'invoice',
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS carpenter_id UUID,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0;

-- Add missing columns to purchase_invoices
ALTER TABLE purchase_invoices
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS labour_charges NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_charges NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_off NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_paid NUMERIC DEFAULT 0;

-- Add missing columns to quotations (just in case they share similar payloads)
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS labour_charges NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_charges NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_off NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_paid NUMERIC DEFAULT 0;

-- Optionally refresh schema cache if you are using PostgREST / Supabase
NOTIFY pgrst, 'reload schema';
