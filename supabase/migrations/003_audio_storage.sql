-- Create storage bucket for temporary audio files
-- Note: Audio files are uploaded directly to parent app, but we may need temporary storage
-- for processing or caching purposes

INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for audio files bucket
-- Allow authenticated users to upload to their organization folder
CREATE POLICY "Allow authenticated uploads to own org folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all audio files
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-files');

-- Allow users to delete their own organization's files
CREATE POLICY "Allow users to delete own org files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

