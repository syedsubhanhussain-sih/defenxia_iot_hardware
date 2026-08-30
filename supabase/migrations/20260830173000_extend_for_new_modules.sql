-- Extend cyber news cache with image, description, author
ALTER TABLE IF EXISTS cyber_news_cache ADD COLUMN IF NOT EXISTS image text;
ALTER TABLE IF EXISTS cyber_news_cache ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE IF EXISTS cyber_news_cache ADD COLUMN IF NOT EXISTS author text;

-- RFID Cards Table for Secure Banking Mode
CREATE TABLE IF NOT EXISTS public.rfid_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uid text NOT NULL UNIQUE,
    owner_name text NOT NULL DEFAULT 'Primary User Card',
    owner text NOT NULL DEFAULT 'Primary User Card',
    status text NOT NULL DEFAULT 'active',
    session_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE on public.rfid_cards to anon, authenticated; 
GRANT ALL to service_role;

ALTER TABLE public.rfid_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read and insert rfid_cards" 
ON public.rfid_cards FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- Seed default demo RFID card
INSERT INTO public.rfid_cards (uid, owner_name, owner, status) 
VALUES ('DEMO_CARD_001', 'DEFENXIA Master KeyCard', 'DEFENXIA Master KeyCard', 'active') 
ON CONFLICT (uid) DO UPDATE SET status = 'active';
