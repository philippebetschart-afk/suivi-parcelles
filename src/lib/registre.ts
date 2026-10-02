// Registre des interventions pour l'export (Excel et PDF) : une ligne par parcelle et par produit.

import type { SupabaseClient } from "@supabase/supabase-js";
import { kgMatiereParHa, cumulsParAnnee, type Cumul } from "@/lib/bilans";
import type { TypeParcelle } from "@/lib/parcelles";
import type { MatiereActive, Unite } from "@/lib/produits";
import type { TypeIntervention } from "@/lib/interventions";

type Intervention = {
  id: number;
  date_intervention: string;
  type: TypeIntervention;
  cible: string | null;
  remarques: string | null;
  intervention_parcelles: {
    parcelle_id: number;
    surface_ha: number;
    parcelles: { nom: string; cepage: string | null; type_parcelle: TypeParcelle } | null;
  }[];
  intervention_produits: {
    id: number;
    dose_par_ha: number;
    numero_lot: string | null;
    unite: Unite;
    matiere_active: MatiereActive;
    teneur_g_par_unite: number | null;
    produits: { nom: string } | null;
  }[];
  intervention_modifications: { modifie_le: string }[];
};

export type LigneRegistre = {
  interventionId: number;
  date: string; // AAAA-MM-JJ
  type: TypeIntervention;
  parcelle: string;
  cepage: string | null;
  surfaceHa: number;
  produit: string | null;
  numeroLot: string | null;
  doseParHa: number | null;
  unite: Unite | null;
  quantite: number | null; // dose × surface
  matiere: MatiereActive | null;
  kgMatiereParHa: number | null; // null si teneur inconnue ou pas de produit
  cible: string | null;
  remarques: string | null;
  derniereModification: string | null; // horodatage ISO
};

export type CumulParcelle = { parcelle: string; annee: number } & Cumul;

const parNom = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });

// du / au au format AAAA-MM-JJ ; chaînes vides = pas de limite.
export async function chargerRegistre(supabase: SupabaseClient, du: string, au: string) {
  let requete = supabase
    .from("interventions")
    .select(
      `id, date_intervention, type, cible, remarques,
       intervention_parcelles (parcelle_id, surface_ha, parcelles (nom, cepage, type_parcelle)),
       intervention_produits (id, dose_par_ha, numero_lot, unite, matiere_active,
                              teneur_g_par_unite, produits (nom)),
       intervention_modifications (modifie_le)`,
    )
    .order("date_intervention", { ascending: true })
    .order("id", { ascending: true });
  if (du) requete = requete.gte("date_intervention", du);
  if (au) requete = requete.lte("date_intervention", au);

  const { data, error } = await requete;
  const interventions = (data ?? []) as unknown as Intervention[];

  const lignes: LigneRegistre[] = [];
  // Interventions de chaque parcelle, pour les cumuls.
  const parParcelle = new Map<string, Parameters<typeof cumulsParAnnee>[0]>();

  for (const iv of interventions) {
    const modifs = iv.intervention_modifications.map((m) => m.modifie_le).sort();
    const produits = [...iv.intervention_produits].sort((a, b) => a.id - b.id);
    const parcelles = [...iv.intervention_parcelles].sort((a, b) =>
      parNom(a.parcelles?.nom ?? "", b.parcelles?.nom ?? ""),
    );

    for (const p of parcelles) {
      const nom = p.parcelles?.nom ?? "?";
      const surface = Number(p.surface_ha);
      const commun = {
        interventionId: iv.id,
        date: iv.date_intervention,
        type: iv.type,
        parcelle: nom,
        cepage: p.parcelles?.cepage ?? null,
        surfaceHa: surface,
        cible: iv.cible,
        remarques: iv.remarques,
        derniereModification: modifs.at(-1) ?? null,
      };

      if (produits.length === 0) {
        lignes.push({
          ...commun,
          produit: null,
          numeroLot: null,
          doseParHa: null,
          unite: null,
          quantite: null,
          matiere: null,
          kgMatiereParHa: null,
        });
      }
      for (const pr of produits) {
        const dose = Number(pr.dose_par_ha);
        lignes.push({
          ...commun,
          produit: pr.produits?.nom ?? "?",
          numeroLot: pr.numero_lot,
          doseParHa: dose,
          unite: pr.unite,
          quantite: dose * surface,
          matiere: pr.matiere_active,
          kgMatiereParHa: kgMatiereParHa(pr),
        });
      }

      const liste = parParcelle.get(nom) ?? [];
      liste.push({ date_intervention: iv.date_intervention, produits });
      parParcelle.set(nom, liste);
    }
  }

  const cumulsParcelles: CumulParcelle[] = [];
  for (const nom of [...parParcelle.keys()].sort(parNom)) {
    const cumuls = cumulsParAnnee(parParcelle.get(nom)!);
    for (const annee of [...cumuls.keys()].sort()) {
      cumulsParcelles.push({ parcelle: nom, annee, ...cumuls.get(annee)! });
    }
  }

  return { erreur: error, lignes, cumulsParcelles, nbInterventions: interventions.length };
}
