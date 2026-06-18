
insert into storage.buckets (id, name, public) values ('admin-uploads', 'admin-uploads', true)
on conflict (id) do nothing;

create policy "Public read admin-uploads"
on storage.objects for select
using (bucket_id = 'admin-uploads');

create policy "Admins upload admin-uploads"
on storage.objects for insert
to authenticated
with check (bucket_id = 'admin-uploads' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins update admin-uploads"
on storage.objects for update
to authenticated
using (bucket_id = 'admin-uploads' and has_role(auth.uid(), 'admin'::app_role));

create policy "Admins delete admin-uploads"
on storage.objects for delete
to authenticated
using (bucket_id = 'admin-uploads' and has_role(auth.uid(), 'admin'::app_role));
