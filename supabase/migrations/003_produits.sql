-- Étape Produits : référentiel des produits et import du fichier « prdouit phyto.xlsx » (01/10/2026)

create table public.produits (
  id                  bigint generated always as identity primary key,
  nom                 text not null unique,
  unite               text not null check (unite in ('L', 'kg')),
  matiere_active      text not null check (matiere_active in ('cuivre', 'azote', 'soufre', 'autre')),
  -- Grammes de matière active par litre ou par kilo de produit.
  -- Pour l'azote, la saisie se fait en unités pour 100 kg (= %) puis × 10.
  -- Vide = teneur pas encore connue.
  teneur_g_par_unite  numeric(10,3) check (teneur_g_par_unite >= 0),
  remarques           text,
  archive             boolean not null default false,  -- on archive au lieu de supprimer
  cree_le             timestamptz not null default now(),
  modifie_le          timestamptz not null default now()
);

-- Réutilise la fonction créée à l'étape Parcelles.
create trigger produits_modifie_le
  before update on public.produits
  for each row execute function public.maj_modifie_le();

-- Sécurité : seul un utilisateur connecté peut lire et modifier.
alter table public.produits enable row level security;

create policy "Utilisateur connecté : accès complet"
  on public.produits for all
  to authenticated
  using (true) with check (true);

-- Import des 8 lignes du fichier Excel.
insert into public.produits (nom, unite, matiere_active, teneur_g_par_unite, remarques) values
  ('Nordox',         'kg', 'cuivre', 750,  null),
  ('BB Equal',       'kg', 'cuivre', 200,  null),
  ('Yucca',          'L',  'cuivre', null, 'Teneur absente du fichier Excel : à compléter ou à vérifier.'),
  ('Héliocuivre',    'L',  'cuivre', 400,  null),
  ('Kocide 35 DF',   'kg', 'cuivre', 250,  null),
  ('Champflo Ampli', 'kg', 'cuivre', 350,  null),
  ('Soufre poudre',  'kg', 'soufre', 800,  null),
  ('Héliosoufre',    'L',  'soufre', 600,  null);
