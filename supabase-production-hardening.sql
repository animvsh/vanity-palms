begin;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default gen_random_uuid()::text,
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  provider_id text not null references public.providers(id) on delete cascade,
  procedure_id text not null references public.procedures(id) on delete cascade,
  patient_email text not null,
  patient_name text not null,
  stage text not null default 'consultation' check (stage in ('consultation', 'procedure', 'follow_up')),
  expires_at timestamptz not null default now() + interval '30 days',
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_whitelist (
  email text primary key,
  note text not null default '',
  created_at timestamptz not null default now(),
  invited_by uuid references public.admins(user_id) on delete set null
);

alter table public.admins enable row level security;
alter table public.review_requests enable row level security;
alter table public.provider_whitelist enable row level security;

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = check_user_id
  );
$$;

create or replace function public.is_approved_provider(target_provider_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.providers
    where id = target_provider_id
      and status = 'approved'
  );
$$;

create or replace function public.is_whitelisted_email(target_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.provider_whitelist
    where lower(email) = lower(target_email)
  );
$$;

create or replace function public.admin_update_provider_status(
  provider_id text,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  if new_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Invalid provider status';
  end if;

  update public.providers
  set status = new_status
  where id = provider_id;

  if not found then
    raise exception 'Provider not found';
  end if;
end;
$$;

create or replace function public.admin_update_provider_subscription(
  provider_id text,
  new_tier text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  if new_tier not in ('free', 'premium') then
    raise exception 'Invalid subscription tier';
  end if;

  update public.providers
  set subscription_tier = new_tier
  where id = provider_id;

  if not found then
    raise exception 'Provider not found';
  end if;
end;
$$;

create or replace function public.admin_delete_review(review_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  delete from public.reviews
  where id = review_id;
end;
$$;

create or replace function public.deactivate_own_provider_account(
  provider_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.providers
  set status = 'rejected'
  where id = provider_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Provider not found';
  end if;
end;
$$;

create or replace function public.create_review_request(
  target_consultation_id uuid,
  target_procedure_id text,
  target_stage text default 'consultation'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  consultation_row public.consultations%rowtype;
  created_token text;
begin
  if target_stage not in ('consultation', 'procedure', 'follow_up') then
    raise exception 'Invalid review stage';
  end if;

  select c.*
  into consultation_row
  from public.consultations c
  join public.providers p on p.id = c.provider_id
  where c.id = target_consultation_id
    and p.user_id = auth.uid()
    and c.status = 'booked';

  if not found then
    raise exception 'Booked consultation not found';
  end if;

  if not exists (
    select 1
    from public.provider_procedures
    where provider_id = consultation_row.provider_id
      and procedure_id = target_procedure_id
  ) then
    raise exception 'Procedure is not configured for this provider';
  end if;

  insert into public.review_requests (
    consultation_id,
    provider_id,
    procedure_id,
    patient_email,
    patient_name,
    stage
  )
  values (
    consultation_row.id,
    consultation_row.provider_id,
    target_procedure_id,
    consultation_row.email,
    consultation_row.patient_name,
    target_stage
  )
  returning token into created_token;

  return created_token;
end;
$$;

create or replace function public.get_review_request(public_token text)
returns table (
  provider_id text,
  provider_name text,
  procedure_id text,
  procedure_name text,
  patient_name text,
  stage text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rr.provider_id,
    p.name as provider_name,
    rr.procedure_id,
    pr.name as procedure_name,
    rr.patient_name,
    rr.stage
  from public.review_requests rr
  join public.providers p on p.id = rr.provider_id
  join public.procedures pr on pr.id = rr.procedure_id
  where rr.token = public_token
    and rr.used_at is null
    and rr.expires_at > now();
$$;

create or replace function public.submit_review_request(
  public_token text,
  review_rating integer,
  review_body text,
  review_consult_rating integer default null,
  review_results_rating integer default null,
  review_recovery_rating integer default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.review_requests%rowtype;
  created_review_id text;
begin
  select *
  into request_row
  from public.review_requests
  where token = public_token
    and used_at is null
    and expires_at > now();

  if not found then
    raise exception 'Review request is invalid or expired';
  end if;

  created_review_id := gen_random_uuid()::text;

  insert into public.reviews (
    id,
    provider_id,
    procedure_id,
    rating,
    body,
    patient_name,
    date,
    stage,
    consult_rating,
    results_rating,
    recovery_rating
  )
  values (
    created_review_id,
    request_row.provider_id,
    request_row.procedure_id,
    review_rating,
    review_body,
    request_row.patient_name,
    current_date,
    request_row.stage,
    review_consult_rating,
    review_results_rating,
    review_recovery_rating
  );

  update public.review_requests
  set used_at = now()
  where id = request_row.id;

  return created_review_id;
end;
$$;

create or replace function public.get_public_consultation(public_token text)
returns table (
  id uuid,
  patient_name text,
  email text,
  status text,
  scheduled_at timestamptz,
  meeting_mode text,
  meeting_location text,
  booking_notes text,
  provider_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.patient_name,
    c.email,
    c.status,
    c.scheduled_at,
    c.meeting_mode,
    c.meeting_location,
    c.booking_notes,
    p.name as provider_name
  from public.consultations c
  join public.providers p on p.id = c.provider_id
  where c.access_token = public_token;
$$;

create or replace function public.get_public_consultation_messages(public_token text)
returns table (
  id uuid,
  consultation_id uuid,
  sender_type text,
  sender_name text,
  body text,
  read_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cm.id,
    cm.consultation_id,
    cm.sender_type,
    cm.sender_name,
    cm.body,
    cm.read_at,
    cm.created_at
  from public.consultation_messages cm
  join public.consultations c on c.id = cm.consultation_id
  where c.access_token = public_token
  order by cm.created_at asc;
$$;

create or replace function public.send_public_consultation_message(
  public_token text,
  patient_name text,
  message_body text
)
returns table (
  id uuid,
  consultation_id uuid,
  sender_type text,
  sender_name text,
  body text,
  read_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_consultation_id uuid;
begin
  select c.id
  into target_consultation_id
  from public.consultations c
  where c.access_token = public_token;

  if not found then
    raise exception 'Consultation not found';
  end if;

  return query
  insert into public.consultation_messages (
    consultation_id,
    sender_type,
    sender_name,
    body
  )
  values (
    target_consultation_id,
    'patient',
    patient_name,
    message_body
  )
  returning
    consultation_messages.id,
    consultation_messages.consultation_id,
    consultation_messages.sender_type,
    consultation_messages.sender_name,
    consultation_messages.body,
    consultation_messages.read_at,
    consultation_messages.created_at;
end;
$$;

create or replace function public.admin_add_provider_whitelist(
  target_email text,
  target_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  insert into public.provider_whitelist (email, note, invited_by)
  values (lower(trim(target_email)), coalesce(target_note, ''), auth.uid())
  on conflict (email) do update
  set note = excluded.note,
      invited_by = excluded.invited_by;
end;
$$;

create or replace function public.admin_remove_provider_whitelist(
  target_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  delete from public.provider_whitelist
  where lower(email) = lower(trim(target_email));
end;
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated;
grant execute on function public.is_approved_provider(text) to anon, authenticated;
grant execute on function public.is_whitelisted_email(text) to anon, authenticated;
grant execute on function public.admin_update_provider_status(text, text) to authenticated;
grant execute on function public.admin_update_provider_subscription(text, text) to authenticated;
grant execute on function public.admin_delete_review(text) to authenticated;
grant execute on function public.deactivate_own_provider_account(text) to authenticated;
grant execute on function public.admin_add_provider_whitelist(text, text) to authenticated;
grant execute on function public.admin_remove_provider_whitelist(text) to authenticated;
grant execute on function public.create_review_request(uuid, text, text) to authenticated;
grant execute on function public.get_review_request(text) to anon, authenticated;
grant execute on function public.submit_review_request(text, integer, text, integer, integer, integer) to anon, authenticated;
grant execute on function public.get_public_consultation(text) to anon, authenticated;
grant execute on function public.get_public_consultation_messages(text) to anon, authenticated;
grant execute on function public.send_public_consultation_message(text, text, text) to anon, authenticated;

revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;
revoke all on public.review_requests from anon, authenticated;
revoke all on public.provider_whitelist from anon, authenticated;
drop policy if exists "review_requests_select_own_or_admin" on public.review_requests;
drop policy if exists "provider_whitelist_admin_read" on public.provider_whitelist;
create policy "review_requests_select_own_or_admin"
on public.review_requests
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or provider_id in (
    select id
    from public.providers
    where user_id = auth.uid()
  )
);

create policy "provider_whitelist_admin_read"
on public.provider_whitelist
for select
to authenticated
using (public.is_admin(auth.uid()));

grant select on public.provider_whitelist to authenticated;

create unique index if not exists providers_user_id_key
on public.providers (user_id)
where user_id is not null;

drop policy if exists "admins_read_own" on public.admins;
drop policy if exists "admins_read_all" on public.admins;
create policy "admins_read_own"
on public.admins
for select
to authenticated
using (user_id = auth.uid());

create policy "admins_read_all"
on public.admins
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "Provider read own profile" on public.providers;
drop policy if exists "Public read providers" on public.providers;
drop policy if exists "Provider update own profile" on public.providers;
drop policy if exists "providers_insert_auth" on public.providers;
drop policy if exists "providers_update_own" on public.providers;
drop policy if exists "providers_public_read_approved" on public.providers;
drop policy if exists "providers_select_own" on public.providers;
drop policy if exists "providers_select_admin" on public.providers;
drop policy if exists "providers_insert_self" on public.providers;
drop policy if exists "providers_update_self" on public.providers;

create policy "providers_public_read_approved"
on public.providers
for select
to anon
using (status = 'approved');

create policy "providers_select_own"
on public.providers
for select
to authenticated
using (user_id = auth.uid());

create policy "providers_select_admin"
on public.providers
for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "providers_insert_self"
on public.providers
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and subscription_tier = 'premium'
  and coalesce(email, '') = coalesce(auth.jwt() ->> 'email', '')
  and public.is_whitelisted_email(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "providers_update_self"
on public.providers
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke all on public.providers from anon, authenticated;
revoke select on public.providers from anon, authenticated;
revoke insert on public.providers from authenticated;
revoke update on public.providers from authenticated;
grant select (
  id,
  name,
  photo,
  specialty,
  rating,
  review_count,
  distance,
  response_time,
  years_experience,
  gender,
  certifications,
  bio,
  location,
  consultation_type,
  languages,
  instagram_url,
  subscription_tier
) on public.providers to anon;
grant select on public.providers to authenticated;
grant insert (
  id,
  user_id,
  name,
  email,
  practice_name,
  status,
  subscription_tier,
  consultation_type,
  languages
) on public.providers to authenticated;
grant update (
  name,
  photo,
  specialty,
  response_time,
  years_experience,
  gender,
  certifications,
  bio,
  location,
  consultation_type,
  practice_name,
  phone,
  address,
  city_state,
  languages,
  instagram_url,
  notification_preferences
) on public.providers to authenticated;

drop policy if exists "Public read provider_procedures" on public.provider_procedures;
drop policy if exists "provider_procedures_insert_auth" on public.provider_procedures;
drop policy if exists "provider_procedures_update_auth" on public.provider_procedures;
drop policy if exists "provider_procedures_delete_auth" on public.provider_procedures;
drop policy if exists "provider_procedures_public_read" on public.provider_procedures;
drop policy if exists "provider_procedures_select_own_or_admin" on public.provider_procedures;
drop policy if exists "provider_procedures_write_own_or_admin" on public.provider_procedures;

create policy "provider_procedures_public_read"
on public.provider_procedures
for select
to anon
using (true);

create policy "provider_procedures_select_own_or_admin"
on public.provider_procedures
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or provider_id in (
    select id
    from public.providers
    where user_id = auth.uid()
  )
);

create policy "provider_procedures_write_own_or_admin"
on public.provider_procedures
for all
to authenticated
using (
  public.is_admin(auth.uid())
  or provider_id in (
    select id
    from public.providers
    where user_id = auth.uid()
  )
)
with check (
  public.is_admin(auth.uid())
  or provider_id in (
    select id
    from public.providers
    where user_id = auth.uid()
  )
);

revoke all on public.provider_procedures from anon, authenticated;
grant select on public.provider_procedures to anon, authenticated;
grant insert on public.provider_procedures to authenticated;
grant update (price) on public.provider_procedures to authenticated;
grant delete on public.provider_procedures to authenticated;

drop policy if exists "Public read reviews" on public.reviews;
drop policy if exists "Public insert reviews" on public.reviews;
drop policy if exists "Admin delete reviews" on public.reviews;
drop policy if exists "reviews_public_read" on public.reviews;
drop policy if exists "reviews_public_insert" on public.reviews;
drop policy if exists "reviews_admin_delete" on public.reviews;
drop policy if exists "reviews_admin_read" on public.reviews;

create policy "reviews_public_read"
on public.reviews
for select
to anon
using (true);

create policy "reviews_admin_read"
on public.reviews
for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "reviews_admin_delete"
on public.reviews
for delete
to authenticated
using (public.is_admin(auth.uid()));

revoke all on public.reviews from anon, authenticated;
revoke insert on public.reviews from anon, authenticated;
grant select on public.reviews to anon, authenticated;

drop policy if exists "Public insert consultations" on public.consultations;
drop policy if exists "Provider read own consultations" on public.consultations;
drop policy if exists "Provider update own consultations" on public.consultations;
drop policy if exists "Admin read all consultations" on public.consultations;
drop policy if exists "consultations_public_insert" on public.consultations;
drop policy if exists "consultations_select_own_or_admin" on public.consultations;
drop policy if exists "consultations_update_own_or_admin" on public.consultations;

create policy "consultations_public_insert"
on public.consultations
for insert
to anon, authenticated
with check (
  public.is_approved_provider(provider_id)
);

create policy "consultations_select_own_or_admin"
on public.consultations
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or provider_id in (
    select id
    from public.providers
    where user_id = auth.uid()
  )
);

create policy "consultations_update_own_or_admin"
on public.consultations
for update
to authenticated
using (
  public.is_admin(auth.uid())
  or provider_id in (
    select id
    from public.providers
    where user_id = auth.uid()
  )
)
with check (
  public.is_admin(auth.uid())
  or provider_id in (
    select id
    from public.providers
    where user_id = auth.uid()
  )
);

revoke all on public.consultations from anon, authenticated;
grant insert on public.consultations to anon, authenticated;
grant select on public.consultations to authenticated;
grant update (status) on public.consultations to authenticated;

drop policy if exists "Public insert analytics" on public.analytics_events;
drop policy if exists "Provider read own analytics" on public.analytics_events;
drop policy if exists "analytics_public_read" on public.analytics_events;
drop policy if exists "analytics_public_insert" on public.analytics_events;
drop policy if exists "analytics_select_own_or_admin" on public.analytics_events;

create policy "analytics_public_insert"
on public.analytics_events
for insert
to anon, authenticated
with check (
  provider_id is null
  or public.is_approved_provider(provider_id)
);

create policy "analytics_select_own_or_admin"
on public.analytics_events
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or provider_id in (
    select id
    from public.providers
    where user_id = auth.uid()
  )
);

revoke all on public.analytics_events from anon, authenticated;
grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;

drop policy if exists "Authenticated upload provider images" on storage.objects;
drop policy if exists "Authenticated delete provider images" on storage.objects;
drop policy if exists "Public read provider images" on storage.objects;
drop policy if exists "storage_auth_upload" on storage.objects;
drop policy if exists "storage_auth_delete" on storage.objects;
drop policy if exists "storage_public_read" on storage.objects;
drop policy if exists "storage_provider_images_insert" on storage.objects;
drop policy if exists "storage_provider_images_delete" on storage.objects;
drop policy if exists "storage_provider_images_read" on storage.objects;

create policy "storage_provider_images_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'provider-images');

create policy "storage_provider_images_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'provider-images'
  and (
    public.is_admin(auth.uid())
    or (storage.foldername(name))[1] in (
      select id
      from public.providers
      where user_id = auth.uid()
    )
  )
);

create policy "storage_provider_images_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'provider-images'
  and (
    public.is_admin(auth.uid())
    or (storage.foldername(name))[1] in (
      select id
      from public.providers
      where user_id = auth.uid()
    )
  )
);

update storage.buckets
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'provider-images';

alter table public.providers alter column subscription_tier set default 'premium';
update public.providers set subscription_tier = 'premium' where subscription_tier <> 'premium';

insert into public.admins (user_id, email)
select id, email
from auth.users
where email = 'aalang@ucsc.edu'
on conflict (user_id) do update
set email = excluded.email;

commit;
