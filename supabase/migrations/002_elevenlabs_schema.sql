-- ElevenLabs-specific schema additions
-- This migration adds any ElevenLabs-specific fields to job_requests

-- Note: Most ElevenLabs-specific data is stored in the metadata JSONB column
-- This includes:
-- - voice_id: ElevenLabs voice ID
-- - text: Text that was converted to speech
-- - model_id: ElevenLabs model ID (e.g., 'eleven_multilingual_v2')
-- - voice_settings: JSON object with stability, similarity_boost, style, use_speaker_boost
-- - project_uuid: UUID from parent app
-- - audio_generated: Boolean flag when audio is ready
-- - audio_size: Size of generated audio in bytes

-- If you need to add specific columns for better querying, add them here
-- For now, the JSONB metadata column is flexible enough for our needs

-- Example: If you want to add a dedicated voice_id column for faster queries:
-- ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS voice_id TEXT;
-- CREATE INDEX IF NOT EXISTS idx_job_requests_voice_id ON job_requests(voice_id);

-- Example: If you want to add a dedicated project_uuid column:
-- ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS project_uuid UUID;
-- CREATE INDEX IF NOT EXISTS idx_job_requests_project_uuid ON job_requests(project_uuid);

