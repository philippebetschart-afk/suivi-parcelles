-- Étape Parcelles : création de la table et import du fichier export_parcelle.xlsx (30/09/2026)

create table public.parcelles (
  id               bigint generated always as identity primary key,
  nom              text not null unique,
  surface_ha       numeric(8,4) not null check (surface_ha > 0),
  cepage           text,          -- cépage ou culture (Verger, Jachère…)
  annee_plantation integer check (annee_plantation between 1900 and 2100),
  remarques        text,
  archivee         boolean not null default false,  -- on archive au lieu de supprimer
  cree_le          timestamptz not null default now(),
  modifie_le       timestamptz not null default now()
);

-- Met à jour automatiquement la date de modification.
create function public.maj_modifie_le() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.modifie_le = now();
  return new;
end;
$$;

create trigger parcelles_modifie_le
  before update on public.parcelles
  for each row execute function public.maj_modifie_le();

-- Sécurité : seul un utilisateur connecté peut lire et modifier.
alter table public.parcelles enable row level security;

create policy "Utilisateur connecté : accès complet"
  on public.parcelles for all
  to authenticated
  using (true) with check (true);

-- Import des 15 lignes du fichier Excel (surface = colonne « Surface »).
insert into public.parcelles (nom, surface_ha, cepage, remarques) values
  ('Parcelle 1',    0.55,   'Merlot N',     'Écartement 100 × 200 cm. Surface cadastre : 0,7530 ha.'),
  ('Parcelle 2',    0.3611, 'Verger',       'Écartement 120 × 180 cm.'),
  ('Parcelle 3',    0.28,   'Blanc',        'Écartement 120 × 200 cm. Surface cadastre : 0,5321 ha.'),
  ('Parcelle 4',    0.67,   'Jachère',      'Écartement 120 × 200 cm.'),
  ('Parcelle 5',    0.5892, 'Verger',       'Écartement 120 × 200 cm.'),
  ('Parcelle 6',    1.04,   'Merlot N',     'Écartement 120 × 200 cm.'),
  ('Parcelle 7',    0.442,  'Merlot N',     'Écartement 120 × 200 cm.'),
  ('Parcelle 8',    0.8269, 'Cab. FR N',    'Écartement 100 × 200 cm.'),
  ('Parcelle 9',    0.8067, 'Merlot N',     'Écartement 120 × 200 cm.'),
  ('Parcelle 10',   0.76,   'Cab. Sauv. N', 'Écartement 120 × 200 cm. Surface cadastre : 0,2914 ha.'),
  ('Parcelle 11',   1.087,  'Jachère',      'Écartement 100 × 200 cm.'),
  ('Parcelle 12 a', 0.7357, 'Jachère',      'Écartement 100 × 200 cm. Numéro 12 en double dans le fichier Excel.'),
  ('Parcelle 12 b', 0.7357, 'Jachère',      'Écartement 100 × 200 cm. Numéro 12 en double dans le fichier Excel.'),
  ('Parcelle 13 a', 0.7357, 'Jachère',      'Écartement 100 × 200 cm. Numéro 13 en double dans le fichier Excel.'),
  ('Parcelle 13 b', 1.5,    'Jachère',      'Écartement 100 × 200 cm. Numéro 13 en double dans le fichier Excel.');
