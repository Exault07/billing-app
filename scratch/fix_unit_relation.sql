-- Fix relationship between products and units
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;
