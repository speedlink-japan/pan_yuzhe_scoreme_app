create table if not exists public.todo_sessions (
  user_key text primary key,
  session jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.todo_sessions enable row level security;

drop policy if exists "Allow anon todo session read" on public.todo_sessions;
create policy "Allow anon todo session read"
on public.todo_sessions
for select
to anon
using (true);

drop policy if exists "Allow anon todo session upsert" on public.todo_sessions;
create policy "Allow anon todo session upsert"
on public.todo_sessions
for insert
to anon
with check (true);

drop policy if exists "Allow anon todo session update" on public.todo_sessions;
create policy "Allow anon todo session update"
on public.todo_sessions
for update
to anon
using (true)
with check (true);
