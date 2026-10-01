import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNombre } from "@/lib/format";
import { nombreVersSaisie } from "@/lib/formulaire";
import { LIBELLES_INTERVENTION, formatDate, type TypeIntervention } from "@/lib/interventions";
import FormulaireIntervention from "../FormulaireIntervention";
import { modifierIntervention } from "../actions";
import { chargerChoix } from "../choix";

type Intervention = {
  date_intervention: string;
  type: TypeIntervention;
  cible: string | null;
  remarques: string | null;
  intervention_parcelles: { parcelle_id: number }[];
  intervention_produits: {
    id: number;
    produit_id: number;
    dose_par_ha: number;
    numero_lot: string | null;
  }[];
};

// Copie de l'intervention telle qu'elle était avant une modification.
type AncienneValeur = {
  date_intervention: string;
  type: TypeIntervention;
  cible: string | null;
  remarques: string | null;
  parcelles: { nom: string }[];
  produits: { nom: string; dose_par_ha: number; unite: string; numero_lot: string | null }[];
};

type Modification = { id: number; modifie_le: string; ancienne_valeur: AncienneValeur };

function formatHorodatage(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ModifierIntervention(props: PageProps<"/interventions/[id]">) {
  const { id } = await props.params;
  const idIntervention = Number(id);
  if (!Number.isInteger(idIntervention)) notFound();

  const supabase = await createClient();
  const [{ data }, { data: modifs }] = await Promise.all([
    supabase
      .from("interventions")
      .select(
        `date_intervention, type, cible, remarques,
         intervention_parcelles (parcelle_id),
         intervention_produits (id, produit_id, dose_par_ha, numero_lot)`,
      )
      .eq("id", idIntervention)
      .maybeSingle(),
    supabase
      .from("intervention_modifications")
      .select("id, modifie_le, ancienne_valeur")
      .eq("intervention_id", idIntervention)
      .order("modifie_le", { ascending: false }),
  ]);
  if (!data) notFound();

  const iv = data as unknown as Intervention;
  const lignes = [...iv.intervention_produits].sort((a, b) => a.id - b.id);
  const modifications = (modifs ?? []) as Modification[];

  const { erreur, parcelles, produits, derniersLots } = await chargerChoix({
    parcelles: iv.intervention_parcelles.map((p) => p.parcelle_id),
    produits: lignes.map((l) => l.produit_id),
  });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/interventions" className="text-green-700 underline dark:text-green-400">
        ← Interventions
      </Link>
      <h1 className="text-2xl font-semibold">
        Modifier : {LIBELLES_INTERVENTION[iv.type].toLowerCase()} du{" "}
        {formatDate(iv.date_intervention)}
      </h1>

      {erreur ? (
        <p className="rounded-lg border border-red-600 bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          Impossible de charger les données : {erreur.message}
        </p>
      ) : (
        <FormulaireIntervention
          action={modifierIntervention.bind(null, idIntervention)}
          parcelles={parcelles}
          produits={produits}
          derniersLots={derniersLots}
          libelleBouton="Enregistrer les modifications"
          valeurs={{
            date: iv.date_intervention,
            type: iv.type,
            cible: iv.cible ?? "",
            remarques: iv.remarques ?? "",
            parcelles: iv.intervention_parcelles.map((p) => p.parcelle_id),
            produits: lignes.map((l) => ({
              produitId: String(l.produit_id),
              dose: nombreVersSaisie(Number(l.dose_par_ha)),
              lot: l.numero_lot ?? "",
            })),
          }}
        />
      )}

      <section className="mt-6 flex flex-col gap-3 border-t border-zinc-300 pt-6 dark:border-zinc-700">
        <h2 className="text-lg font-semibold">Historique des modifications</h2>
        {modifications.length === 0 && (
          <p className="text-zinc-600 dark:text-zinc-400">Jamais modifiée.</p>
        )}
        {modifications.map((m) => {
          const a = m.ancienne_valeur;
          return (
            <div
              key={m.id}
              className="flex flex-col gap-1 rounded-lg border border-dashed border-zinc-400 p-3 text-sm"
            >
              <div className="font-medium">
                Modifiée le {formatHorodatage(m.modifie_le)}. Version d&apos;avant :
              </div>
              <div>
                {LIBELLES_INTERVENTION[a.type]} du {formatDate(a.date_intervention)}
                {a.cible ? ` · cible : ${a.cible}` : ""}
              </div>
              {a.produits.map((p, i) => (
                <div key={i}>
                  {p.nom} · {formatNombre(Number(p.dose_par_ha), 3)} {p.unite}/ha
                  {p.numero_lot ? ` · lot ${p.numero_lot}` : ""}
                </div>
              ))}
              <div className="text-zinc-600 dark:text-zinc-400">
                Parcelles : {a.parcelles.map((p) => p.nom).join(", ")}
              </div>
              {a.remarques && (
                <div className="text-zinc-600 dark:text-zinc-400">Remarques : {a.remarques}</div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
