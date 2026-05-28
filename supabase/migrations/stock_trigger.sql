-- ============================================================
-- STOCK AUTO-DEDUCTION TRIGGER
-- Runs when a bill is inserted or updated to 'final'
-- ============================================================

CREATE OR REPLACE FUNCTION public.deduct_stock_on_bill_final()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item jsonb;
    prod_id uuid;
    prod_qty numeric;
BEGIN
    -- Only deduct stock if status changes to 'final'
    -- (Either inserting as final, or updating from draft to final)
    IF NEW.status = 'final' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'final')) THEN
        -- Loop through the JSONB items array
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
        LOOP
            -- Extract product ID and quantity cast to appropriate types
            prod_id := (item->>'product_id')::uuid;
            prod_qty := (item->>'qty')::numeric;
            
            -- Deduct the stock
            UPDATE products
            SET stock_qty = stock_qty - prod_qty
            WHERE id = prod_id;
        END LOOP;
    END IF;

    -- Handle restoring stock if bill is cancelled from final
    IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status = 'final' THEN
        FOR item IN SELECT * FROM jsonb_array_elements(OLD.items)
        LOOP
            prod_id := (item->>'product_id')::uuid;
            prod_qty := (item->>'qty')::numeric;
            
            -- Restore the stock
            UPDATE products
            SET stock_qty = stock_qty + prod_qty
            WHERE id = prod_id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_deduct_stock ON bills;

-- Create trigger on bills table
CREATE TRIGGER trg_deduct_stock
AFTER INSERT OR UPDATE ON bills
FOR EACH ROW
EXECUTE FUNCTION public.deduct_stock_on_bill_final();
