-- Type de parcelle : seules les vignes comptent dans les moyennes du domaine (30/09/2026)

alter table public.parcelles
  add column type_parcelle text not null default 'vigne'
  check (type_parcelle in ('vigne', 'verger', 'jachere', 'autre'));

update public.parcelles set type_parcelle = 'verger'  where cepage = 'Verger';
update public.parcelles set type_parcelle = 'jachere' where cepage = 'Jachère';
