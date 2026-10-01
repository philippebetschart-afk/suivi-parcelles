-- Étape Bilan du domaine : réglages cuivre et historique des années passées (01/10/2026)

-- Réglages de l'application (une seule ligne).
create table public.parametres (
  id                    integer primary key default 1 check (id = 1),
  seuil_alerte_cuivre   numeric(6,2) not null default 3 check (seuil_alerte_cuivre > 0),   -- kg/ha sur l'année
  plafond_cuivre_7ans   numeric(6,2) not null default 28 check (plafond_cuivre_7ans > 0),  -- kg/ha sur 7 ans
  modifie_le            timestamptz not null default now()
);

create trigger parametres_modifie_le
  before update on public.parametres
  for each row execute function public.maj_modifie_le();

insert into public.parametres (id) values (1);

-- Cuivre des années passées (avant l'application) : moyenne du domaine en kg/ha,
-- telle que déclarée au certificateur. Utilisée dans la moyenne sur 7 ans.
create table public.cuivre_historique (
  annee         integer primary key check (annee between 1990 and 2100),
  kg_cu_par_ha  numeric(6,3) not null check (kg_cu_par_ha >= 0),
  remarques     text,
  cree_le       timestamptz not null default now(),
  modifie_le    timestamptz not null default now()
);

create trigger cuivre_historique_modifie_le
  before update on public.cuivre_historique
  for each row execute function public.maj_modifie_le();

-- Sécurité : seul un utilisateur connecté peut lire et modifier.
alter table public.parametres enable row level security;
alter table public.cuivre_historique enable row level security;

create policy "Utilisateur connecté : lecture"
  on public.parametres for select to authenticated using (true);
create policy "Utilisateur connecté : modification"
  on public.parametres for update to authenticated using (true) with check (true);

create policy "Utilisateur connecté : accès complet"
  on public.cuivre_historique for all to authenticated using (true) with check (true);
