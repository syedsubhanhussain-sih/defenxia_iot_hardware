-- DEFENXIA TrustChain: Blockchain Scan Evidence Table
CREATE TABLE IF NOT EXISTS public.blockchain_scan_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES public.virus_scan_results(id) ON DELETE CASCADE,
    session_id TEXT,
    file_hash TEXT NOT NULL,
    evidence_hash TEXT NOT NULL,
    virus_total_verdict TEXT NOT NULL,
    blockchain_status TEXT NOT NULL DEFAULT 'anchored',
    blockchain_network TEXT NOT NULL DEFAULT 'DEFENXIA TrustChain (Demo Provider)',
    transaction_reference TEXT NOT NULL,
    anchored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verification_status TEXT NOT NULL DEFAULT 'verified',
    verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    canonical_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by file hash and evidence hash
CREATE INDEX IF NOT EXISTS idx_blockchain_scan_evidence_file_hash ON public.blockchain_scan_evidence(file_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_scan_evidence_evidence_hash ON public.blockchain_scan_evidence(evidence_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_scan_evidence_session_id ON public.blockchain_scan_evidence(session_id);

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blockchain_scan_evidence TO anon, authenticated;
GRANT ALL ON public.blockchain_scan_evidence TO service_role;

-- Row Level Security
ALTER TABLE public.blockchain_scan_evidence ENABLE ROW LEVEL SECURITY;

-- Session-based RLS Policies
CREATE POLICY "Session-based read access for blockchain_scan_evidence"
ON public.blockchain_scan_evidence FOR SELECT
TO public
USING (
    session_id = current_setting('app.current_session_id', true)
    OR session_id IS NULL
);

CREATE POLICY "Session-based insert access for blockchain_scan_evidence"
ON public.blockchain_scan_evidence FOR INSERT
TO public
WITH CHECK (
    session_id = current_setting('app.current_session_id', true)
    OR session_id IS NULL
);
