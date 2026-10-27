-- VentureLens database tables for Supabase (rebuild plan step 10).
--
-- How to use: open the Supabase dashboard -> SQL Editor -> New query, paste
-- this whole file, and click Run. It is safe to run again: it only creates
-- what is missing and resets the read-only rules.
--
-- Who can do what:
--   * The website (and the daily keep-awake job) use the publishable key and
--     can only READ.
--   * pipeline/supabase_sync.py uses the secret key, which skips these rules,
--     so it is the only thing that can WRITE.
--
-- Everything is filled by pipeline/supabase_sync.py from the Form D pipeline's
-- output. Nothing here is typed in by hand.

begin;

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- filers: one row per company that filed a Form D (166,601 in October 2026),
-- startup or not, so the lookup can explain why a company is or isn't in the
-- benchmark.
-- ---------------------------------------------------------------------------
create table if not exists public.filers (
    cik                    text primary key,       -- SEC company ID, 10 digits
    name                   text not null,          -- name on its latest filing
    state                  text,
    industry               text,                   -- Form D industry group at its first round seen
    venture_sector         text,                   -- VentureLens sector; only for companies in the benchmark
    first_event_date       date,
    last_event_date        date,
    round_count            integer not null,
    completed_round_count  integer not null,       -- rounds with an amount sold above $0
    benchmark_status       text not null check (benchmark_status in (
                               'benchmark',             -- counted in the benchmark
                               'likely_non_startup',    -- buyout/fund vehicle, established business, or hand-reviewed
                               'not_young',             -- first round before 2010, or over ~5 years old then
                               'non_venture_industry',  -- real estate, oil and gas, investing, ...
                               'no_completed_round',    -- never reported selling anything
                               'other_legal_form'       -- e.g. a partnership or trust, not a corporation or LLC
                           )),
    status_detail          text,                   -- the reason in words, when there is one
    synced_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- filer_names: every name a company filed under, plus a few brand names
-- (pipeline/brand_aliases.csv), for the search box.
-- ---------------------------------------------------------------------------
create table if not exists public.filer_names (
    cik         text not null references public.filers (cik) on delete cascade,
    name        text not null,
    normalized  text not null,                     -- lower case, punctuation removed
    source      text not null check (source in ('filing', 'brand')),
    synced_at   timestamptz not null default now(),
    primary key (cik, name)
);

create index if not exists filer_names_normalized_trgm
    on public.filer_names using gin (normalized extensions.gin_trgm_ops);
create index if not exists filer_names_normalized_prefix
    on public.filer_names (normalized text_pattern_ops);

-- ---------------------------------------------------------------------------
-- rounds: every funding round the pipeline built for every filer
-- (rounds.parquet: offerings within 90 days merged, amendments folded in).
-- ---------------------------------------------------------------------------
create table if not exists public.rounds (
    cik                    text not null references public.filers (cik) on delete cascade,
    round_number           integer not null,       -- 1, 2, 3 ... in date order within this data
    event_date             date not null,
    event_date_source      text,                   -- SALE_DATE or FILING_DATE
    amount_sold            bigint,                 -- as reported; 0 means nothing sold yet
    amount_bucket          text,
    investor_count         integer,
    industry               text,
    revenue_range          text,
    months_since_previous  numeric(8, 2),
    months_to_next         numeric(8, 2),
    n_offerings            integer,
    synced_at              timestamptz not null default now(),
    primary key (cik, round_number)
);

-- ---------------------------------------------------------------------------
-- sync_info: one row describing the last sync. The keep-awake job reads it.
-- ---------------------------------------------------------------------------
create table if not exists public.sync_info (
    id                 integer primary key default 1 check (id = 1),
    dataset_end_date   date not null,
    filers             integer not null,
    rounds             integer not null,
    names              integer not null,
    synced_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- search_filers: the search box. Names that start with the search come
-- first, then close matches (trigram similarity), best first.
-- ---------------------------------------------------------------------------
create or replace function public.search_filers(query text, max_results integer default 20)
returns table (
    cik text,
    name text,
    matched_name text,
    state text,
    industry text,
    round_count integer,
    benchmark_status text,
    score real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
    with q as (
        select trim(regexp_replace(regexp_replace(lower(coalesce(query, '')), '[^a-z0-9 ]', '', 'g'), '\s+', ' ', 'g')) as term
    ),
    hits as (
        select distinct on (n.cik)
            n.cik,
            n.name as matched_name,
            case
                when n.normalized = q.term then 3.0
                when n.normalized like q.term || '%' then 2.0 + similarity(n.normalized, q.term)
                else similarity(n.normalized, q.term)
            end::real as score
        from public.filer_names n, q
        where length(q.term) >= 2
          and (n.normalized like q.term || '%' or n.normalized % q.term)
        order by n.cik, score desc
    )
    select f.cik, f.name, h.matched_name, f.state, f.industry, f.round_count, f.benchmark_status, h.score
    from hits h
    join public.filers f on f.cik = h.cik
    order by h.score desc, f.round_count desc, f.name
    limit least(greatest(coalesce(max_results, 20), 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- Read-only access for the website.
-- ---------------------------------------------------------------------------
alter table public.filers      enable row level security;
alter table public.filer_names enable row level security;
alter table public.rounds      enable row level security;
alter table public.sync_info   enable row level security;

drop policy if exists "Anyone can read filers" on public.filers;
create policy "Anyone can read filers" on public.filers for select to anon, authenticated using (true);
drop policy if exists "Anyone can read filer names" on public.filer_names;
create policy "Anyone can read filer names" on public.filer_names for select to anon, authenticated using (true);
drop policy if exists "Anyone can read rounds" on public.rounds;
create policy "Anyone can read rounds" on public.rounds for select to anon, authenticated using (true);
drop policy if exists "Anyone can read sync info" on public.sync_info;
create policy "Anyone can read sync info" on public.sync_info for select to anon, authenticated using (true);

revoke insert, update, delete, truncate on public.filers, public.filer_names, public.rounds, public.sync_info from anon, authenticated;
grant select on public.filers, public.filer_names, public.rounds, public.sync_info to anon, authenticated;
grant execute on function public.search_filers(text, integer) to anon, authenticated;

commit;
