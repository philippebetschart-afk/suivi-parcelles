import { createClient } from "@/lib/supabase/server";
import type { ParcelleChoix, ProduitChoix } from "./FormulaireIntervention";

const parNom = (a: { nom: string }, b: { nom: string }) =>
  a.nom.localeCompare(b.nom, "fr", { numeric: true });

// Filtre « non archivé », ou déjà utilisé dans l'intervention qu'on modifie.
function actifsOu(colonne: string, ids: number[]): string {
  return ids.length > 0 ? `${colonne}.eq.false,id.in.(${ids.join(",")})` : `${colonne}.eq.false`;
}

// Charge ce qu'il faut pour remplir le formulaire d'intervention.
export async function chargerChoix(dejaUtilises?: { parcelles: number[]; produits: number[] }) {
  const supabase = await createClient();
  const [parcelles, produits, lots] = await Promise.all([
    supabase
      .from("parcelles")
      .select("id, nom, surface_ha, type_parcelle")
      .or(actifsOu("archivee", dejaUtilises?.parcelles ?? [])),
    supabase
      .from("produits")
      .select("id, nom, unite, matiere_active, teneur_g_par_unite")
      .or(actifsOu("archive", dejaUtilises?.produits ?? [])),
    supabase
      .from("intervention_produits")
      .select("produit_id, numero_lot")
      .not("numero_lot", "is", null)
      .order("id", { ascending: false })
      .limit(500),
  ]);

  // Dernier numéro de lot saisi pour chaque produit (les lignes arrivent de la plus récente à la plus ancienne).
  const derniersLots: Record<number, string> = {};
  for (const l of lots.data ?? []) {
    derniersLots[l.produit_id] ??= l.numero_lot;
  }

  return {
    erreur: parcelles.error ?? produits.error ?? lots.error,
    parcelles: ((parcelles.data ?? []) as ParcelleChoix[]).sort(parNom),
    produits: ((produits.data ?? []) as ProduitChoix[]).sort(parNom),
    derniersLots,
  };
}
