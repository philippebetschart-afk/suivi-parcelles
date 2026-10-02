// Bilan cuivre et azote du domaine (vignes seulement), utilisé par la page Bilan et par l'export.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TypeParcelle } from "@/lib/parcelles";
import type { MatiereActive } from "@/lib/produits";
import {
  NB_ANNEES_LISSAGE,
  anneeEnCours,
  chargerParametres,
  cumulsDomaineParAnnee,
  kgMatiereParHa,
  type Cumul,
} from "@/lib/bilans";

type Intervention = {
  date_intervention: string;
  intervention_parcelles: {
    parcelle_id: number;
    surface_ha: number;
    parcelles: { nom: string; type_parcelle: TypeParcelle } | null;
  }[];
  intervention_produits: {
    dose_par_ha: number;
    matiere_active: MatiereActive;
    teneur_g_par_unite: number | null;
  }[];
};

export type Historique = { annee: number; kg_cu_par_ha: number; remarques: string | null };

export type LigneSeptAns = {
  annee: number;
  saisie: number | undefined; // valeur déclarée au certificateur
  calcule: Cumul | undefined; // calcul à partir des interventions
  retenu: number; // valeur utilisée dans le total
  vide: boolean;
};

export async function chargerBilanDomaine(supabase: SupabaseClient) {
  const annee = anneeEnCours();
  const premiereAnnee = annee - NB_ANNEES_LISSAGE + 1;

  const [parametres, vignesRes, ivRes, histRes] = await Promise.all([
    chargerParametres(supabase),
    supabase
      .from("parcelles")
      .select("surface_ha")
      .eq("archivee", false)
      .eq("type_parcelle", "vigne"),
    supabase
      .from("interventions")
      .select(
        `date_intervention,
         intervention_parcelles (parcelle_id, surface_ha, parcelles (nom, type_parcelle)),
         intervention_produits (dose_par_ha, matiere_active, teneur_g_par_unite)`,
      )
      .gte("date_intervention", `${premiereAnnee}-01-01`),
    supabase
      .from("cuivre_historique")
      .select("annee, kg_cu_par_ha, remarques")
      .order("annee", { ascending: false }),
  ]);

  const erreur = vignesRes.error ?? ivRes.error ?? histRes.error;
  const surfaceVignes = (vignesRes.data ?? []).reduce((t, p) => t + Number(p.surface_ha), 0);
  const interventions = (ivRes.data ?? []) as unknown as Intervention[];
  const historique = (histRes.data ?? []) as Historique[];
  const saisies = new Map(historique.map((h) => [h.annee, Number(h.kg_cu_par_ha)]));

  // Calculé à partir des interventions saisies dans l'application.
  const calcules = cumulsDomaineParAnnee(
    interventions.map((iv) => ({
      date_intervention: iv.date_intervention,
      parcelles: iv.intervention_parcelles.map((p) => ({
        surface_ha: p.surface_ha,
        est_vigne: p.parcelles?.type_parcelle === "vigne",
      })),
      produits: iv.intervention_produits,
    })),
    surfaceVignes,
  );

  // Pour chaque année des 7 ans : la valeur saisie (déclarée au certificateur) est prioritaire,
  // sinon la valeur calculée à partir des interventions.
  const lignes7ans: LigneSeptAns[] = Array.from(
    { length: NB_ANNEES_LISSAGE },
    (_, i) => annee - i,
  ).map((a) => {
    const saisie = saisies.get(a);
    const calcule = calcules.get(a);
    return {
      annee: a,
      saisie,
      calcule,
      retenu: saisie ?? calcule?.cuivre ?? 0,
      vide: saisie === undefined && calcule === undefined,
    };
  });
  const total7ans = lignes7ans.reduce((t, l) => t + l.retenu, 0);

  // Cuivre de l'année par parcelle de vigne (pour signaler celles qui dépassent le seuil).
  const parParcelle = new Map<number, { nom: string; cuivre: number }>();
  for (const iv of interventions) {
    if (Number(iv.date_intervention.slice(0, 4)) !== annee) continue;
    const kgCuivre = iv.intervention_produits
      .filter((l) => l.matiere_active === "cuivre")
      .reduce((t, l) => t + (kgMatiereParHa(l) ?? 0), 0);
    for (const p of iv.intervention_parcelles) {
      if (p.parcelles?.type_parcelle !== "vigne") continue;
      const actuel = parParcelle.get(p.parcelle_id) ?? { nom: p.parcelles.nom, cuivre: 0 };
      actuel.cuivre += kgCuivre;
      parParcelle.set(p.parcelle_id, actuel);
    }
  }
  const parcellesAuDessus = [...parParcelle.entries()]
    .filter(([, p]) => p.cuivre >= parametres.seuil_alerte_cuivre)
    .sort((a, b) => b[1].cuivre - a[1].cuivre);

  return {
    erreur,
    annee,
    premiereAnnee,
    parametres,
    surfaceVignes,
    historique,
    calcules,
    lignes7ans,
    total7ans,
    cuivreAnnee: lignes7ans[0].retenu,
    parcellesAuDessus,
  };
}
