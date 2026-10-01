-- Étape Interventions : saisie d'une intervention (01/10/2026)
--
-- Une intervention concerne une ou plusieurs parcelles et utilise zéro, un ou plusieurs produits.
-- Pour que le registre ne change jamais après coup, on recopie au moment de la saisie :
--   - la surface de chaque parcelle,
--   - l'unité, la matière active et la teneur de chaque produit.
-- Ainsi, modifier une parcelle ou un produit plus tard ne modifie pas les interventions passées.

create table public.interventions (
  id                 bigint generated always as identity primary key,
  date_intervention  date not null,
  type               text not null
    check (type in ('sol', 'traitement', 'amendement', 'taille', 'biodynamie', 'autre')),
  cible              text,   -- justification / cible (ex. mildiou)
  remarques          text,
  cree_le            timestamptz not null default now(),
  modifie_le         timestamptz not null default now()
);

create trigger interventions_modifie_le
  before update on public.interventions
  for each row execute function public.maj_modifie_le();

-- Parcelles concernées par une intervention.
create table public.intervention_parcelles (
  intervention_id  bigint not null references public.interventions (id) on delete restrict,
  parcelle_id      bigint not null references public.parcelles (id) on delete restrict,
  surface_ha       numeric(8,4) not null check (surface_ha > 0),  -- surface au jour de l'intervention
  primary key (intervention_id, parcelle_id)
);

-- Produits utilisés dans une intervention (même dose par hectare sur toutes les parcelles).
create table public.intervention_produits (
  id                  bigint generated always as identity primary key,
  intervention_id     bigint not null references public.interventions (id) on delete restrict,
  produit_id          bigint not null references public.produits (id) on delete restrict,
  dose_par_ha         numeric(10,3) not null check (dose_par_ha > 0),  -- L/ha ou kg/ha
  numero_lot          text,
  -- Copie de la fiche produit au jour de l'intervention :
  unite               text not null check (unite in ('L', 'kg')),
  matiere_active      text not null check (matiere_active in ('cuivre', 'azote', 'soufre', 'autre')),
  teneur_g_par_unite  numeric(10,3)
);

create index intervention_parcelles_parcelle on public.intervention_parcelles (parcelle_id);
create index intervention_produits_intervention on public.intervention_produits (intervention_id);

-- Sécurité : seul un utilisateur connecté peut lire et modifier.
alter table public.interventions enable row level security;
alter table public.intervention_parcelles enable row level security;
alter table public.intervention_produits enable row level security;

create policy "Utilisateur connecté : accès complet"
  on public.interventions for all to authenticated using (true) with check (true);
create policy "Utilisateur connecté : accès complet"
  on public.intervention_parcelles for all to authenticated using (true) with check (true);
create policy "Utilisateur connecté : accès complet"
  on public.intervention_produits for all to authenticated using (true) with check (true);

-- Enregistre une intervention complète en une seule fois :
-- soit tout est enregistré, soit rien (pas d'intervention à moitié saisie).
-- p_produits : liste JSON de { "produit_id": 1, "dose_par_ha": 2.5, "numero_lot": "A123" }.
create function public.creer_intervention(
  p_date       date,
  p_type       text,
  p_cible      text,
  p_remarques  text,
  p_parcelles  bigint[],
  p_produits   jsonb
) returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if coalesce(array_length(p_parcelles, 1), 0) = 0 then
    raise exception 'Aucune parcelle sélectionnée.';
  end if;

  insert into public.interventions (date_intervention, type, cible, remarques)
  values (p_date, p_type, p_cible, p_remarques)
  returning id into v_id;

  insert into public.intervention_parcelles (intervention_id, parcelle_id, surface_ha)
  select v_id, p.id, p.surface_ha
  from public.parcelles p
  where p.id = any (p_parcelles);

  insert into public.intervention_produits
    (intervention_id, produit_id, dose_par_ha, numero_lot, unite, matiere_active, teneur_g_par_unite)
  select v_id, pr.id, (l ->> 'dose_par_ha')::numeric, nullif(trim(l ->> 'numero_lot'), ''),
         pr.unite, pr.matiere_active, pr.teneur_g_par_unite
  from jsonb_array_elements(coalesce(p_produits, '[]'::jsonb)) as l
  join public.produits pr on pr.id = (l ->> 'produit_id')::bigint;

  return v_id;
end;
$$;
