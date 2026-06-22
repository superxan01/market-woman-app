create policy "order attachment owners and operations can read files" on storage.objects
  for select to authenticated using (
    bucket_id = 'order-attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.can_assign_orders())
  );
