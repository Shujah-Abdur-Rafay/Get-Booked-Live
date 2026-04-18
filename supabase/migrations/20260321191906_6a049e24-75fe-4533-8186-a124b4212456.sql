
DROP POLICY IF EXISTS "Authenticated users can upload venue photos" ON storage.objects;

CREATE POLICY "Venue owners can upload photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'venue-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
