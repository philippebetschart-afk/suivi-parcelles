import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNombre } from "@/lib/format";
import {
  LIBELLES_MATIERE,
  MATIERES_ACTIVES,
  teneurVersSaisie,
  uniteTeneur,
  type MatiereActive,
  type Unite,
} from "@/lib/produits";

type Produit = {
  id: number;
  nom: string;
  unite: Unite;
  matiere_active: MatiereActive;
  teneur_g_par_unite: number | null;
  archive: boolean;
};

function teneur(p: Produit): string {
  if (p.teneur_g_par_unite === null) return "teneur à compléter";
  const valeur = teneurVersSaisie(p.matiere_active, Number(p.teneur_g_par_unite));
  return `${formatNombre(valeur, 3)} ${uniteTeneur(p.matiere_active, p.unite)}`;
}

export default async function Produits() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produits")
    .select("id, nom, unite, matiere_active, teneur_g_par_unite, archive");

  const tous = ((data ?? []) as Produit[]).sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr", { numeric: true }),
  );
  const produits = tous.filter((p) => !p.archive);
  const archives = tous.filter((p) => p.archive);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/" className="text-green-700 underline dark:text-green-400">
        ← Accueil
      </Link>
      <h1 className="text-2xl font-semibold">Produits</h1>

      <Link
        href="/produits/nouveau"
        className="rounded-lg bg-green-700 px-4 py-4 text-center text-lg font-semibold text-white"
      >
        + Ajouter un produit
      </Link>

      {error && (
        <p className="rounded-lg border border-red-600 bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          Impossible de charger les produits : {error.message}
        </p>
      )}

      {MATIERES_ACTIVES.map((matiere) => {
        const deLaMatiere = produits.filter((p) => p.matiere_active === matiere);
        if (deLaMatiere.length === 0) return null;
        return (
          <section key={matiere} className="flex flex-col gap-2">
            <h2 className="mt-2 text-lg font-semibold">
              {LIBELLES_MATIERE[matiere]}{" "}
              <span className="font-normal text-zinc-600 dark:text-zinc-400">
                ({deLaMatiere.length})
              </span>
            </h2>
            <ul className="flex flex-col gap-2">
              {deLaMatiere.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/produits/${p.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-300 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    <div>
                      <div className="text-lg font-medium">{p.nom}</div>
                      <div
                        className={
                          p.teneur_g_par_unite === null
                            ? "text-sm font-medium text-amber-700 dark:text-amber-400"
                            : "text-sm text-zinc-600 dark:text-zinc-400"
                        }
                      >
                        {teneur(p)}
                      </div>
                    </div>
                    <div className="text-lg whitespace-nowrap">{p.unite}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {archives.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400">
            Produits archivés ({archives.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {archives.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/produits/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                >
                  <span>{p.nom}</span>
                  <span>{LIBELLES_MATIERE[p.matiere_active]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
