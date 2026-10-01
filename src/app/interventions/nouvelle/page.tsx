import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FormulaireIntervention, {
  type ParcelleChoix,
  type ProduitChoix,
} from "../FormulaireIntervention";
import { creerIntervention } from "../actions";

const parNom = (a: { nom: string }, b: { nom: string }) =>
  a.nom.localeCompare(b.nom, "fr", { numeric: true });

export default async function NouvelleIntervention() {
  const supabase = await createClient();
  const [parcelles, produits, lots] = await Promise.all([
    supabase
      .from("parcelles")
      .select("id, nom, surface_ha, type_parcelle")
      .eq("archivee", false),
    supabase
      .from("produits")
      .select("id, nom, unite, matiere_active, teneur_g_par_unite")
      .eq("archive", false),
    supabase
      .from("intervention_produits")
      .select("produit_id, numero_lot")
      .not("numero_lot", "is", null)
      .order("id", { ascending: false })
      .limit(500),
  ]);

  const erreur = parcelles.error ?? produits.error ?? lots.error;

  // Dernier numéro de lot saisi pour chaque produit (les lignes arrivent de la plus récente à la plus ancienne).
  const derniersLots: Record<number, string> = {};
  for (const l of lots.data ?? []) {
    derniersLots[l.produit_id] ??= l.numero_lot;
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/" className="text-green-700 underline dark:text-green-400">
        ← Accueil
      </Link>
      <h1 className="text-2xl font-semibold">Nouvelle intervention</h1>

      {erreur ? (
        <p className="rounded-lg border border-red-600 bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          Impossible de charger les données : {erreur.message}
        </p>
      ) : (
        <FormulaireIntervention
          action={creerIntervention}
          parcelles={((parcelles.data ?? []) as ParcelleChoix[]).sort(parNom)}
          produits={((produits.data ?? []) as ProduitChoix[]).sort(parNom)}
          derniersLots={derniersLots}
        />
      )}
    </main>
  );
}
