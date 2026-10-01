import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNombre } from "@/lib/format";
import { LIBELLES_TYPE, TYPES_PARCELLE, type TypeParcelle } from "@/lib/parcelles";

type Parcelle = {
  id: number;
  nom: string;
  surface_ha: number;
  cepage: string | null;
  annee_plantation: number | null;
  type_parcelle: TypeParcelle;
  archivee: boolean;
};

function surface(parcelles: Parcelle[]): number {
  return parcelles.reduce((total, p) => total + Number(p.surface_ha), 0);
}

export default async function Parcelles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parcelles")
    .select("id, nom, surface_ha, cepage, annee_plantation, type_parcelle, archivee");

  const toutes = ((data ?? []) as Parcelle[]).sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr", { numeric: true }),
  );
  const parcelles = toutes.filter((p) => !p.archivee);
  const archivees = toutes.filter((p) => p.archivee);
  const vignes = parcelles.filter((p) => p.type_parcelle === "vigne");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/" className="text-green-700 underline dark:text-green-400">
        ← Accueil
      </Link>
      <h1 className="text-2xl font-semibold">Parcelles</h1>

      <Link
        href="/parcelles/nouvelle"
        className="rounded-lg bg-green-700 px-4 py-4 text-center text-lg font-semibold text-white"
      >
        + Ajouter une parcelle
      </Link>

      {error && (
        <p className="rounded-lg border border-red-600 bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          Impossible de charger les parcelles : {error.message}
        </p>
      )}

      <div className="rounded-lg border border-green-600 bg-green-50 p-4 dark:bg-green-950">
        <div className="text-lg font-semibold text-green-800 dark:text-green-200">
          {formatNombre(surface(vignes))} ha de vigne
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Surface utilisée pour les moyennes cuivre et azote · {parcelles.length} parcelles,{" "}
          {formatNombre(surface(parcelles))} ha au total
        </div>
      </div>

      {TYPES_PARCELLE.map((type) => {
        const duType = parcelles.filter((p) => p.type_parcelle === type);
        if (duType.length === 0) return null;
        return (
          <section key={type} className="flex flex-col gap-2">
            <h2 className="mt-2 text-lg font-semibold">
              {LIBELLES_TYPE[type]}{" "}
              <span className="font-normal text-zinc-600 dark:text-zinc-400">
                ({duType.length} · {formatNombre(surface(duType))} ha)
              </span>
            </h2>
            <ul className="flex flex-col gap-2">
              {duType.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/parcelles/${p.id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-300 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    <div>
                      <div className="text-lg font-medium">{p.nom}</div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        {p.cepage ?? "—"}
                        {p.annee_plantation ? ` · plantée en ${p.annee_plantation}` : ""}
                      </div>
                    </div>
                    <div className="text-lg whitespace-nowrap">
                      {formatNombre(Number(p.surface_ha))} ha
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {archivees.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400">
            Parcelles archivées ({archivees.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {archivees.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/parcelles/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                >
                  <span>{p.nom}</span>
                  <span>{formatNombre(Number(p.surface_ha))} ha</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
