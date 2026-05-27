-- ====================================================================
-- PART 4.5: SALES & PURCHASE DEEP REFACTOR SCHEMA UPDATES
-- Run this in your Supabase SQL Editor.
-- ====================================================================

-- 1. ADD NEW COLUMNS TO BILLS
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS po_number TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS eway_bill_number TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS round_off NUMERIC DEFAULT 0.00;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS payment_in_discount NUMERIC DEFAULT 0.00;

-- 2. ADD NEW COLUMNS TO QUOTATIONS (to mirror Bills)
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS po_number TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS eway_bill_number TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS round_off NUMERIC DEFAULT 0.00;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS payment_in_discount NUMERIC DEFAULT 0.00;

-- 3. CREATE PURCHASE INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_no TEXT UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    supplier_id UUID REFERENCES public.suppliers(id),
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC DEFAULT 0.00,
    discount NUMERIC DEFAULT 0.00,
    labour_charges NUMERIC DEFAULT 0.00,
    transport_charges NUMERIC DEFAULT 0.00,
    round_off NUMERIC DEFAULT 0.00,
    payment_in_discount NUMERIC DEFAULT 0.00,
    advance_paid NUMERIC DEFAULT 0.00,
    balance_due NUMERIC DEFAULT 0.00,
    payment_mode TEXT,
    po_number TEXT,
    eway_bill_number TEXT,
    vehicle_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: purchase_orders table was already defined in Part 2, but let's ensure it has all needed fields:
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS po_number TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0.00;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0.00;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS advance_paid NUMERIC DEFAULT 0.00;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0.00;

-- 4. ENABLE RLS FOR NEW TABLE
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR PURCHASE INVOICES (Owner full access, Staff full access, Accountant read access)
DROP POLICY IF EXISTS "Owner full access" ON public.purchase_invoices;
DROP POLICY IF EXISTS "Staff full access" ON public.purchase_invoices;
DROP POLICY IF EXISTS "Accountant read access" ON public.purchase_invoices;

CREATE POLICY "Owner full access" ON public.purchase_invoices FOR ALL USING (public.get_auth_role() = 'owner');
CREATE POLICY "Staff full access" ON public.purchase_invoices FOR ALL USING (public.get_auth_role() = 'staff');
CREATE POLICY "Accountant read access" ON public.purchase_invoices FOR SELECT USING (public.get_auth_role() = 'accountant');

-- 6. STOCK ADDITION TRIGGER FOR PURCHASE INVOICES
-- ============================================================
-- Runs when a purchase invoice is inserted or updated to 'final'
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_purchase_stock_addition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item RECORD;
    prod_id UUID;
    qty NUMERIC;
BEGIN
    -- Scenario 1: Invoice newly created as 'final', OR updated from 'draft' to 'final'
    IF NEW.status = 'final' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'final')) THEN
        -- Loop through items JSONB array and ADD stock
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
            prod_id := (item.value->>'id')::UUID;
            qty := (item.value->>'qty')::NUMERIC;
            
            IF prod_id IS NOT NULL THEN
                UPDATE public.products 
                SET stock_qty = stock_qty + qty 
                WHERE id = prod_id;
            END IF;
        END LOOP;
    END IF;

    -- Scenario 2: Invoice was 'final' and is now 'cancelled' (reverse the addition -> subtract stock)
    IF TG_OP = 'UPDATE' AND OLD.status = 'final' AND NEW.status = 'cancelled' THEN
        -- Loop through items JSONB array and RESTORE (subtract) stock
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
            prod_id := (item.value->>'id')::UUID;
            qty := (item.value->>'qty')::NUMERIC;
            
            IF prod_id IS NOT NULL THEN
                UPDATE public.products 
                SET stock_qty = stock_qty - qty 
                WHERE id = prod_id;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_stock_addition ON public.purchase_invoices;
CREATE TRIGGER trg_purchase_stock_addition
    AFTER INSERT OR UPDATE OF status 
    ON public.purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_purchase_stock_addition();
