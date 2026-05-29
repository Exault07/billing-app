-- Invoice Settings: Add all new columns to shop_settings
-- Run this in your Supabase SQL Editor

ALTER TABLE shop_settings
  ADD COLUMN IF NOT EXISTS invoice_theme TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS invoice_color TEXT DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS invoice_size TEXT DEFAULT 'A4',
  ADD COLUMN IF NOT EXISTS show_party_balance BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_free_item_qty BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_item_description BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_alternate_unit BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_phone_on_invoice BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_time_on_invoice BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_price_history BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_luxury_theme BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS inv_industry_type TEXT DEFAULT 'Hardware',
  ADD COLUMN IF NOT EXISTS show_po_number BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_eway_number BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_vehicle_number BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS inv_party_show_address BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS inv_party_show_gstin BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS inv_party_show_mobile BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS inv_col_show_price BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS inv_col_show_qty BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS inv_col_show_batch BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS inv_col_show_expiry BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS inv_col_show_mfg BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS inv_col_show_discount BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS inv_col_show_tax BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_received_amount BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_balance_amount BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_terms BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_signature BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_thankyou BOOLEAN DEFAULT true;

-- Add optional invoice number fields to bills table
ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS po_number TEXT,
  ADD COLUMN IF NOT EXISTS eway_number TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
