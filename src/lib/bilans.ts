// Calculs des cumuls de cuivre et d'azote.

import type { MatiereActive } from "@/lib/produits";

import type { SupabaseClient } from "@supabase/supabase-js";

export const NB_ANNEES_LISSAGE = 7; // année en cours + 6 précédentes

export type Parametres = { seuil_alerte_cuivre: number; plafond_cuivre_7ans: number };

// Réglages enregistrés (valeurs par défaut si la table n'est pas encore créée).
export async function chargerParametres(supabase: SupabaseClient): Promise<Parametres> {
  const { data } = await supabase
    .from("parametres")
    .select("seuil_alerte_cuivre, plafond_cuivre_7ans")
    .eq("id", 1)
    .maybeSingle();
  return {
    seuil_alerte_cuivre: Number(data?.seuil_alerte_cuivre ?? 3),
    plafond_cuivre_7ans: Number(data?.plafond_cuivre_7ans ?? 28),
  };
}

// Une ligne produit d'une intervention, telle qu'enregistrée (copie de la fiche produit).
export type LigneProduit = {
  dose_par_ha: number;
  matiere_active: MatiereActive;
  teneur_g_par_unite: number | null;
};

// kg de matière active par hectare = dose (L ou kg/ha) × teneur (g par L ou kg) ÷ 1000.
// null si la teneur n'est pas connue.
export function kgMatiereParHa(ligne: LigneProduit): number | null {
  if (ligne.teneur_g_par_unite === null) return null;
  return (Number(ligne.dose_par_ha) * Number(ligne.teneur_g_par_unite)) / 1000;
}

export type Cumul = { cuivre: number; azote: number; teneursInconnues: number };

// Cumul par année civile des kg/ha de cuivre et d'azote.
export function cumulsParAnnee(
  interventions: { date_intervention: string; produits: LigneProduit[] }[],
): Map<number, Cumul> {
  const cumuls = new Map<number, Cumul>();
  for (const iv of interventions) {
    const annee = Number(iv.date_intervention.slice(0, 4));
    const cumul = cumuls.get(annee) ?? { cuivre: 0, azote: 0, teneursInconnues: 0 };
    for (const ligne of iv.produits) {
      if (ligne.matiere_active !== "cuivre" && ligne.matiere_active !== "azote") continue;
      const kg = kgMatiereParHa(ligne);
      if (kg === null) cumul.teneursInconnues++;
      else cumul[ligne.matiere_active] += kg;
    }
    cumuls.set(annee, cumul);
  }
  return cumuls;
}

// Cumul du domaine (vignes seulement) : pour chaque année,
// total des kg de matière active de toutes les parcelles de vigne ÷ surface de vigne.
export function cumulsDomaineParAnnee(
  interventions: {
    date_intervention: string;
    parcelles: { surface_ha: number; est_vigne: boolean }[];
    produits: LigneProduit[];
  }[],
  surfaceVignes: number,
): Map<number, Cumul> {
  const totaux = new Map<number, Cumul>();
  for (const iv of interventions) {
    const annee = Number(iv.date_intervention.slice(0, 4));
    const surfaceTraitee = iv.parcelles
      .filter((p) => p.est_vigne)
      .reduce((t, p) => t + Number(p.surface_ha), 0);
    if (surfaceTraitee === 0) continue;
    const total = totaux.get(annee) ?? { cuivre: 0, azote: 0, teneursInconnues: 0 };
    for (const ligne of iv.produits) {
      if (ligne.matiere_active !== "cuivre" && ligne.matiere_active !== "azote") continue;
      const kg = kgMatiereParHa(ligne);
      if (kg === null) total.teneursInconnues++;
      else total[ligne.matiere_active] += kg * surfaceTraitee; // kg sur le domaine
    }
    totaux.set(annee, total);
  }
  // Passage des kg totaux aux kg/ha de vigne.
  for (const total of totaux.values()) {
    total.cuivre = surfaceVignes > 0 ? total.cuivre / surfaceVignes : 0;
    total.azote = surfaceVignes > 0 ? total.azote / surfaceVignes : 0;
  }
  return totaux;
}

// Année en cours (heure française).
export function anneeEnCours(): number {
  return Number(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 4));
}
