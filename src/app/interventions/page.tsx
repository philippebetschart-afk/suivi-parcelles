import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNombre } from "@/lib/format";
import { LIBELLES_INTERVENTION, formatDate, type TypeIntervention } from "@/lib/interventions";

type Intervention = {
  id: number;
  date_intervention: string;
  type: TypeIntervention;
  cible: string | null;
  intervention_parcelles: { surface_ha: number; parcelles: { nom: string } | null }[];
  intervention_produits: {
    id: number;
    dose_par_ha: number;
    numero_lot: string | null;
    unite: string;
    produits: { nom: string } | null;
  }[];
  intervention_modifications: { id: number }[];
};

// Liste provisoire des dernières interventions (l'historique complet viendra ensuite).
export default async function Interventions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interventions")
    .select(
      `id, date_intervention, type, cible,
       intervention_parcelles (surface_ha, parcelles (nom)),
       intervention_produits (id, dose_par_ha, numero_lot, unite, produits (nom)),
       intervention_modifications (id)`,
    )
    .order("date_intervention", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);

  const interventions = (data ?? []) as unknown as Intervention[];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/" className="text-green-700 underline dark:text-green-400">
        ← Accueil
      </Link>
      <h1 className="text-2xl font-semibold">Interventions</h1>

      <Link
        href="/interventions/nouvelle"
        className="rounded-lg bg-green-700 px-4 py-4 text-center text-lg font-semibold text-white"
      >
        + Nouvelle intervention
      </Link>

      {error && (
        <p className="rounded-lg border border-red-600 bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          Impossible de charger les interventions : {error.message}
        </p>
      )}

      {!error && interventions.length === 0 && (
        <p className="text-zinc-600 dark:text-zinc-400">Aucune intervention enregistrée.</p>
      )}

      <ul className="flex flex-col gap-3">
        {interventions.map((iv) => {
          const noms = iv.intervention_parcelles
            .map((p) => p.parcelles?.nom ?? "?")
            .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
          const surface = iv.intervention_parcelles.reduce((t, p) => t + Number(p.surface_ha), 0);
          return (
            <li key={iv.id}>
              <Link
                href={`/interventions/${iv.id}`}
                className="flex flex-col gap-1 rounded-lg border border-zinc-300 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-lg font-medium">
                    {LIBELLES_INTERVENTION[iv.type]}
                    {iv.intervention_modifications.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-amber-700 dark:text-amber-400">
                        modifiée
                      </span>
                    )}
                  </span>
                  <span className="text-lg">{formatDate(iv.date_intervention)}</span>
                </div>
                {iv.cible && <div>Cible : {iv.cible}</div>}
                {iv.intervention_produits.map((pr) => (
                  <div key={pr.id} className="text-sm">
                    {pr.produits?.nom ?? "?"} · {formatNombre(Number(pr.dose_par_ha), 3)} {pr.unite}/ha
                    {pr.numero_lot ? ` · lot ${pr.numero_lot}` : ""}
                  </div>
                ))}
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {noms.length} parcelle{noms.length > 1 ? "s" : ""} ({formatNombre(surface)} ha) :{" "}
                  {noms.join(", ")}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
