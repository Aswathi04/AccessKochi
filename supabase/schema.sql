-- AccessKochi host dashboard schema. Run in Supabase: SQL Editor > New query > paste > Run. Safe to run again after updates.
-- Every table has RLS on and no policies: the browser can't read or write them directly.
-- All access goes through the Next.js API routes, which use the service-role key and check permissions in code.

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('owner', 'manager', 'staff')),
  proof_type text not null check (proof_type in ('trade_licence', 'gst', 'fssai', 'video', 'other')),
  proof_path text,              -- file in the host-evidence bucket
  proof_note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'more_info')),
  dispute boolean not null default false, -- another approved claim already exists for this venue
  admin_note text,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists claims_venue_idx on claims (venue_id);
create index if not exists claims_user_idx on claims (user_id);

create table if not exists checklist_answers (
  venue_id text not null,
  item_id text not null,
  answer text not null check (answer in ('yes', 'no', 'not_sure', 'na')),
  reason text,                  -- required when answer = 'na'
  values jsonb not null default '{}'::jsonb, -- measured numbers, e.g. {"door_width_mm": 950}
  photo_path text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (venue_id, item_id)
);

create table if not exists live_status (
  venue_id text not null,
  kind text not null check (kind in ('lift_out_of_order', 'ramp_blocked', 'toilet_closed')),
  until timestamptz not null,
  note text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (venue_id, kind)
);

create table if not exists audit_log (
  id bigserial primary key,
  actor text not null,          -- email
  action text not null,         -- e.g. claim.create, claim.approve, checklist.save, status.set
  venue_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table claims enable row level security;
alter table checklist_answers enable row level security;
alter table live_status enable row level security;
alter table audit_log enable row level security;

-- Private bucket for claim proofs and checklist photos. Viewed only through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit)
values ('host-evidence', 'host-evidence', false, 52428800)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Added later (documents, visitor reports, insights, AI photo check). Safe to re-run this whole file.

-- AI reading of a checklist photo: {verdict: agrees|disagrees|unclear, detail, at}
alter table checklist_answers add column if not exists ai_check jsonb;

-- Documents a host uploads. An admin checks each one; only approved, unexpired documents count.
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('access_audit', 'aic_audit', 'building_permit', 'occupancy_cert', 'completion_cert', 'lift_licence', 'fire_noc')),
  ref_no text,                  -- permit / licence / registration number
  issued_by text,               -- auditor, authority or inspectorate
  issued_on date,
  expires_on date,              -- required for lift licence and fire NOC
  sections text[] not null default '{}', -- checklist sections the document covers
  file_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists documents_venue_idx on documents (venue_id);

-- Visitor photo reports (visitor track). Hosts can reply; a reply never changes the verdict.
create table if not exists visitor_reports (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null,
  feature text not null,
  attributes jsonb not null default '{}'::jsonb,
  reading_confidence text not null,
  measurement_method text not null,
  source_type text not null,
  reasons text[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  host_reply text,
  host_reply_by text,
  host_reply_at timestamptz
);
create index if not exists visitor_reports_venue_idx on visitor_reports (venue_id, created_at desc);

-- A venue left out of someone's search because it doesn't suit their profile (for host insights).
create table if not exists skip_events (
  id bigserial primary key,
  venue_id text not null,
  profile text not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists skip_events_venue_idx on skip_events (venue_id, created_at desc);

alter table documents enable row level security;
alter table visitor_reports enable row level security;
alter table skip_events enable row level security;
