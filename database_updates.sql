-- Please run this SQL in your Supabase SQL Editor:

-- Sale Returns
CREATE TABLE IF NOT EXISTS sale_returns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  return_no text NOT NULL,
  original_bill_id uuid REFERENCES bills(id) ON DELETE SET NULL,
  party_id uuid REFERENCES parties(id),
  return_date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric DEFAULT 0,
  additional_charges numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total_return_amount numeric NOT NULL DEFAULT 0,
  refund_mode text DEFAULT 'cash',
  amount_refunded numeric DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sale_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated" ON sale_returns
  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_sale_returns_party ON sale_returns(party_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_date ON sale_returns(return_date);

-- Bill Payments Update
ALTER TABLE bill_payments
  ADD COLUMN IF NOT EXISTS payment_no text,
  ADD COLUMN IF NOT EXISTS is_advance boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS party_id uuid REFERENCES parties(id);

CREATE INDEX IF NOT EXISTS idx_bill_payments_party ON bill_payments(party_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_date ON bill_payments(date);
