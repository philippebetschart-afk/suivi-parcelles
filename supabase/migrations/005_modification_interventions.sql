-- Étape Interventions : modification avec trace (01/10/2026)
--
-- Chaque modification conserve une copie complète de l'intervention telle qu'elle était
-- avant (date, type, cible, remarques, parcelles, produits, doses, lots).

create table public.intervention_modifications (
  id               bigint generated always as identity primary key,
  intervention_id  bigint not null references public.interventions (id) on delete restrict,
  modifie_le       timestamptz not null default now(),
  ancienne_valeur  jsonb not null
);

create index intervention_modifications_intervention
  on public.intervention_modifications (intervention_id);

-- Sécurité : lecture et ajout seulement (une trace ne se modifie pas et ne s'efface pas).
alter table public.intervention_modifications enable row level security;

create policy "Utilisateur connecté : lecture"
  on public.intervention_modifications for select to authenticated using (true);
create policy "Utilisateur connecté : ajout"
  on public.intervention_modifications for insert to authenticated with check (true);

-- Photo complète d'une intervention, lisible telle quelle (noms compris).
create function public.photo_intervention(p_id bigint) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'date_intervention', i.date_intervention,
    'type', i.type,
    'cible', i.cible,
    'remarques', i.remarques,
    'parcelles', coalesce((
      select jsonb_agg(jsonb_build_object(
               'parcelle_id', ip.parcelle_id, 'nom', p.nom, 'surface_ha', ip.surface_ha)
             order by p.nom)
      from public.intervention_parcelles ip
      join public.parcelles p on p.id = ip.parcelle_id
      where ip.intervention_id = i.id), '[]'::jsonb),
    'produits', coalesce((
      select jsonb_agg(jsonb_build_object(
               'produit_id', ipr.produit_id, 'nom', pr.nom, 'dose_par_ha', ipr.dose_par_ha,
               'unite', ipr.unite, 'numero_lot', ipr.numero_lot,
               'matiere_active', ipr.matiere_active, 'teneur_g_par_unite', ipr.teneur_g_par_unite)
             order by ipr.id)
      from public.intervention_produits ipr
      join public.produits pr on pr.id = ipr.produit_id
      where ipr.intervention_id = i.id), '[]'::jsonb)
  )
  from public.interventions i
  where i.id = p_id;
$$;

-- Modifie une intervention : garde la trace de l'ancienne version, puis enregistre la nouvelle.
-- Tout se fait en une seule fois (soit tout, soit rien).
-- Pour les parcelles et produits déjà présents, on garde la surface et la teneur d'origine
-- (sauf si la teneur était inconnue : on prend alors celle de la fiche produit actuelle).
create function public.modifier_intervention(
  p_id         bigint,
  p_date       date,
  p_type       text,
  p_cible      text,
  p_remarques  text,
  p_parcelles  bigint[],
  p_produits   jsonb
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ancienne jsonb;
begin
  if coalesce(array_length(p_parcelles, 1), 0) = 0 then
    raise exception 'Aucune parcelle sélectionnée.';
  end if;

  v_ancienne := public.photo_intervention(p_id);
  if v_ancienne is null then
    raise exception 'Intervention introuvable.';
  end if;

  insert into public.intervention_modifications (intervention_id, ancienne_valeur)
  values (p_id, v_ancienne);

  update public.interventions
  set date_intervention = p_date, type = p_type, cible = p_cible, remarques = p_remarques
  where id = p_id;

  -- Parcelles : on retire celles qui ne sont plus cochées, on ajoute les nouvelles.
  delete from public.intervention_parcelles
  where intervention_id = p_id and not (parcelle_id = any (p_parcelles));

  insert into public.intervention_parcelles (intervention_id, parcelle_id, surface_ha)
  select p_id, p.id, p.surface_ha
  from public.parcelles p
  where p.id = any (p_parcelles)
  on conflict (intervention_id, parcelle_id) do nothing;

  -- Produits : on remplace les lignes, en reprenant la fiche d'origine quand elle existait.
  delete from public.intervention_produits where intervention_id = p_id;

  insert into public.intervention_produits
    (intervention_id, produit_id, dose_par_ha, numero_lot, unite, matiere_active, teneur_g_par_unite)
  select p_id, pr.id, (l ->> 'dose_par_ha')::numeric, nullif(trim(l ->> 'numero_lot'), ''),
         coalesce(ancien.unite, pr.unite),
         coalesce(ancien.matiere_active, pr.matiere_active),
         coalesce(ancien.teneur, pr.teneur_g_par_unite)
  from jsonb_array_elements(coalesce(p_produits, '[]'::jsonb)) as l
  join public.produits pr on pr.id = (l ->> 'produit_id')::bigint
  left join lateral (
    select a ->> 'unite' as unite,
           a ->> 'matiere_active' as matiere_active,
           (a ->> 'teneur_g_par_unite')::numeric as teneur
    from jsonb_array_elements(v_ancienne -> 'produits') as a
    where (a ->> 'produit_id')::bigint = pr.id
    limit 1
  ) ancien on true;
end;
$$;
