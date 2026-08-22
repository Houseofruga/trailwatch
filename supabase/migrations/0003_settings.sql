-- Settings: let users pause the weekly digest. Defaults to on, so existing
-- users keep receiving it. The digest job filters on this; the toggle is
-- written by a server action (service role), never trusted from the client.
alter table public.users
  add column if not exists digest_enabled boolean not null default true;
