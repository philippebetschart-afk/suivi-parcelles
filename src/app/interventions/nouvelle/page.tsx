import Link from "next/link";
import FormulaireIntervention from "../FormulaireIntervention";
import { creerIntervention } from "../actions";
import { chargerChoix } from "../choix";

export default async function NouvelleIntervention() {
  const { erreur, parcelles, produits, derniersLots } = await chargerChoix();

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
          parcelles={parcelles}
          produits={produits}
          derniersLots={derniersLots}
        />
      )}
    </main>
  );
}
