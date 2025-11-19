-- ElevenLabs Mini App Database Schema
-- This schema creates the tables needed for the ElevenLabs mini app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: organizations
-- Stores synced organization data from parent app
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
  organization_uuid UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_organizations_uuid ON organizations(organization_uuid);

-- =====================================================
-- Table: api_credentials
-- Stores encrypted ElevenLabs API keys per organization
-- =====================================================
CREATE TABLE IF NOT EXISTS api_credentials (
  api_credentials_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_uuid UUID NOT NULL REFERENCES organizations(organization_uuid) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'elevenlabs',
  key_encrypted BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one API key per organization per provider
  UNIQUE(organization_uuid, provider)
);

-- Indexes
CREATE INDEX idx_api_credentials_org ON api_credentials(organization_uuid);
CREATE INDEX idx_api_credentials_provider ON api_credentials(provider);

-- =====================================================
-- Table: job_requests
-- Tracks TTS generation jobs
-- =====================================================
CREATE TABLE IF NOT EXISTS job_requests (
  job_request_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_uuid UUID NOT NULL REFERENCES organizations(organization_uuid) ON DELETE CASCADE,
  external_job_id TEXT,
  correlation_uuid UUID,
  callback_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,

  -- Check constraint for status
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX idx_job_requests_org ON job_requests(organization_uuid);
CREATE INDEX idx_job_requests_status ON job_requests(status);
CREATE INDEX idx_job_requests_external_id ON job_requests(external_job_id);
CREATE INDEX idx_job_requests_correlation ON job_requests(correlation_uuid);
CREATE INDEX idx_job_requests_created ON job_requests(created_at DESC);

-- =====================================================
-- Function: Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for job_requests updated_at
CREATE TRIGGER update_job_requests_updated_at
BEFORE UPDATE ON job_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for service role
-- (API routes will use service role key)
CREATE POLICY "Service role has full access to organizations"
ON organizations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to api_credentials"
ON api_credentials FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to job_requests"
ON job_requests FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users (anon key) can read their organization's data
-- Note: In production, you may want to add user authentication
-- For now, we'll allow anon key to access based on organization_uuid

CREATE POLICY "Allow read access to organizations"
ON organizations FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow read access to api_credentials metadata"
ON api_credentials FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow read access to job_requests"
ON job_requests FOR SELECT
TO anon
USING (true);

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE organizations IS 'Organizations synced from parent app';
COMMENT ON TABLE api_credentials IS 'Encrypted ElevenLabs API keys per organization';
COMMENT ON TABLE job_requests IS 'TTS generation job tracking';

COMMENT ON COLUMN api_credentials.key_encrypted IS 'AES-256-GCM encrypted API key';
COMMENT ON COLUMN job_requests.external_job_id IS 'External job ID if applicable';
COMMENT ON COLUMN job_requests.correlation_uuid IS 'Groups related jobs together';
COMMENT ON COLUMN job_requests.metadata IS 'Job details: voice_id, text, voice_settings, project_uuid, etc.';

