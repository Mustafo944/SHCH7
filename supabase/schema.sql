-- Foydalanuvchilar
create table if not exists users (
  id text primary key,
  login text unique not null,
  password text not null,
  full_name text not null,
  role text not null check (role in ('dispatcher', 'worker')),
  position text not null default 'katta_elektromexanik',
  station_id text,
  phone text,
  created_at timestamptz default now()
);

-- Dispatcher seed (bir marta)
insert into users (id, login, password, full_name, role, station_id, phone)
values ('dispatcher_1', 'dispetcher', 'admin123', 'Aloqa dispetcher', 'dispatcher', null, '+998901234567')
on conflict (id) do nothing;

-- Oylik hisobotlar
create table if not exists work_reports (
  id text primary key,
  worker_id text not null references users(id) on delete cascade,
  worker_name text not null,
  worker_phone text,
  station_id text not null,
  station_name text not null,
  week_label text not null,
  month text not null,
  year text not null,
  entries jsonb not null default '[]',
  submitted_at timestamptz default now(),
  confirmed_at timestamptz,
  confirmed_by text
);

-- Premiya hisobotlari
create table if not exists premiya_reports (
  id text primary key,
  worker_id text not null references users(id) on delete cascade,
  worker_name text not null,
  station_id text not null,
  station_name text not null,
  sex text,
  month text not null,
  year text not null,
  entries jsonb not null default '[]',
  submitted_at timestamptz default now(),
  confirmed_at timestamptz,
  confirmed_by text
);

-- Bekat sxemalari (PDF fayl yo'llari)
create table if not exists station_schemas (
  id uuid primary key default gen_random_uuid(),
  station_id text not null,
  schema_type text not null check (schema_type in ('bir_ipli', 'ikki_ipli')),
  file_path text not null,
  file_name text not null,
  uploaded_at timestamptz default now(),
  uploaded_by text
);

-- RLS (Row Level Security) — hozircha ochiq, keyinchalik sozlanadi
alter table users enable row level security;
alter table work_reports enable row level security;
alter table premiya_reports enable row level security;
alter table station_schemas enable row level security;

create policy "allow all" on users for all using (true);
create policy "allow all" on work_reports for all using (true);
create policy "allow all" on premiya_reports for all using (true);
create policy "allow all" on station_schemas for all using (true);

-- Storage bucket for schemas
insert into storage.buckets (id, name, public)
values ('sxemalar', 'sxemalar', true)
on conflict do nothing;

create policy "Public Access" on storage.objects
for select using (bucket_id = 'sxemalar');

create policy "Auth Upload" on storage.objects
for insert with check (bucket_id = 'sxemalar');
