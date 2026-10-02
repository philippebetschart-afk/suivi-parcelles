import Link from "next/link";
import { aujourdhui } from "@/lib/interventions";

const CHAMP = "rounded-lg border border-zinc-400 px-3 py-3 text-lg bg-transparent";
const BOUTON = "rounded-lg bg-green-700 px-4 py-4 text-lg font-semibold text-white";

export default function Export() {
  const jour = aujourdhui();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/" className="text-green-700 underline dark:text-green-400">
        ← Accueil
      </Link>
      <h1 className="text-2xl font-semibold">Export du registre</h1>

      <form className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span>Du</span>
            <input type="date" name="du" defaultValue={`${jour.slice(0, 4)}-01-01`} className={CHAMP} />
          </label>
          <label className="flex flex-col gap-1">
            <span>Au</span>
            <input type="date" name="au" defaultValue={jour} className={CHAMP} />
          </label>
        </div>

        <button type="submit" formAction="/export/excel" className={BOUTON}>
          Télécharger en Excel
        </button>
        <button type="submit" formAction="/export/imprimer" className={BOUTON}>
          Version imprimable / PDF
        </button>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Pour le PDF : sur la page qui s&apos;ouvre, touchez « Imprimer / PDF » puis choisissez
          « Enregistrer au format PDF ».
        </p>
      </form>

      <section className="mt-4 flex flex-col gap-2 border-t border-zinc-300 pt-4 dark:border-zinc-700">
        <h2 className="text-lg font-semibold">Sauvegarde complète</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Toutes les données, depuis le début : interventions, parcelles, produits, cuivre des
          années passées et trace des modifications. À faire régulièrement et à garder en lieu
          sûr.
        </p>
        <a
          href="/export/excel"
          className="rounded-lg border border-zinc-400 px-4 py-4 text-center text-lg"
        >
          Télécharger toutes les données (Excel)
        </a>
      </section>
    </main>
  );
}
