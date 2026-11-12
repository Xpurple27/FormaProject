insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos','progress-photos',false,3145728,array['image/jpeg']::text[]);

create policy progress_photos_read on storage.objects for select to authenticated
using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy progress_photos_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and name ~ '^[0-9a-f-]{36}/[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9a-f-]{36}[.]jpg$'
);
create policy progress_photos_delete on storage.objects for delete to authenticated
using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
