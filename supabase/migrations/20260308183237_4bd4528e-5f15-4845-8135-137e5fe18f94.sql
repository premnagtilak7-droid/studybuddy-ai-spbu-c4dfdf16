
-- Create storage buckets for image uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('doubt-images', 'doubt-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('notes', 'notes', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

-- RLS policies for doubt-images bucket
CREATE POLICY "Users can upload doubt images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'doubt-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own doubt images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'doubt-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own doubt images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'doubt-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Public can view doubt images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'doubt-images');

-- RLS policies for notes bucket
CREATE POLICY "Users can upload notes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'notes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own notes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'notes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own notes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'notes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS policies for documents bucket
CREATE POLICY "Users can upload documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
