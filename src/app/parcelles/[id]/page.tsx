import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNombre } from "@/lib/format";
import { LIBELLES_TYPE, type TypeParcelle } from "@/lib/parcelles";
import { LIBELLES_MATIERE, type MatiereActive } from "@/lib/produits";
import {
  LIBELLES_INTERVENTION,
  TYPES_INTERVENTION,
  formatDate,
  type TypeIntervention,
} from "@/lib/interventions";
import {
  NB_ANNEES_LISSAGE,
  chargerParametres,
  anneeEnCours,
  cumulsParAnnee,
  kgMatiereParHa,
} from "@/lib/bilans";

type Parcelle = {
  nom: string;
  surface_ha: number;
  type_parcelle: TypeParcelle;
  cepage: string | null;
  annee_plantation: number | null;
  remarques: string | null;
  archivee: boolean;
};

type Intervention = {
  id: number;
  date_intervention: string;
  type: TypeIntervention;
  cible: string | null;
  remarques: string | null;
  intervention_parcelles: { surface_ha: number }[];
  intervention_produits: {
    id: number;
    dose_par_ha: number;
    numero_lot: string | null;
    unite: string;
    matiere_active: MatiereActive;
    teneur_g_par_unite: number | null;
    produits: { nom: string } | null;
  }[];
};

const CHAMP = "rounded-lg border border-zinc-400 px-3 py-2 text-base bg-transparent";

function texte(valeur: string | string[] | undefined): string {
  return typeof valeur === "string" ? valeur : "";
}

export default async function FicheParcelle(props: PageProps<"/parcelles/[id]">) {
  const { id } = await props.params;
  const idParcelle = Number(id);
  if (!Number.isInteger(idParcelle)) notFound();

  // Filtres (dans l'adresse de la page, pour pouvoir revenir dessus).
  const filtres = await props.searchParams;
  const filtreType = texte(filtres.type);
  const du = texte(filtres.du);
  const au = texte(filtres.au);

  const supabase = await createClient();
  const { seuil_alerte_cuivre: seuil } = await chargerParametres(supabase);
  const [{ data: parcelleData }, { data: ivData, error }] = await Promise.all([
    supabase
      .from("parcelles")
      .select("nom, surface_ha, type_parcelle, cepage, annee_plantation, remarques, archivee")
      .eq("id", idParcelle)
      .maybeSingle(),
    supabase
      .from("interventions")
      .select(
        `id, date_intervention, type, cible, remarques,
         intervention_parcelles!inner (surface_ha),
         intervention_produits (id, dose_par_ha, numero_lot, unite, matiere_active,
                                teneur_g_par_unite, produits (nom))`,
      )
      .eq("intervention_parcelles.parcelle_id", idParcelle)
      .order("date_intervention", { ascending: false })
      .order("id", { ascending: false }),
  ]);
  if (!parcelleData) notFound();

  const parcelle = parcelleData as Parcelle;
  const toutes = (ivData ?? []) as unknown as Intervention[];

  // Les cumuls portent toujours sur toutes les interventions, quels que soient les filtres.
  const cumuls = cumulsParAnnee(
    toutes.map((iv) => ({ date_intervention: iv.date_intervention, produits: iv.intervention_produits })),
  );
  const annee = anneeEnCours();
  const annees = [...cumuls.keys()].sort((a, b) => b - a);
  const cuivreAnnee = cumuls.get(annee)?.cuivre ?? 0;
  const premiereAnnee = annee - NB_ANNEES_LISSAGE + 1;
  const cuivre7ans = annees
    .filter((a) => a >= premiereAnnee && a <= annee)
    .reduce((t, a) => t + (cumuls.get(a)?.cuivre ?? 0), 0);

  const affichees = toutes.filter(
    (iv) =>
      (filtreType === "" || iv.type === filtreType) &&
      (du === "" || iv.date_intervention >= du) &&
      (au === "" || iv.date_intervention <= au),
  );
  const filtreActif = filtreType !== "" || du !== "" || au !== "";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/parcelles" className="text-green-700 underline dark:text-green-400">
        ← Parcelles
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{parcelle.nom}</h1>
        <div className="text-zinc-600 dark:text-zinc-400">
          {LIBELLES_TYPE[parcelle.type_parcelle]} · {formatNombre(Number(parcelle.surface_ha))} ha
          {parcelle.cepage ? ` · ${parcelle.cepage}` : ""}
          {parcelle.annee_plantation ? ` · plantée en ${parcelle.annee_plantation}` : ""}
        </div>
        {parcelle.remarques && (
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{parcelle.remarques}</div>
        )}
        {parcelle.archivee && (
          <div className="mt-2 rounded-lg border border-amber-600 bg-amber-50 p-2 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Parcelle archivée.
          </div>
        )}
      </div>

      <Link
        href={`/parcelles/${idParcelle}/modifier`}
        className="rounded-lg border border-zinc-400 px-4 py-3 text-center text-lg"
      >
        Modifier la parcelle
      </Link>

      {error && (
        <p className="rounded-lg border border-red-600 bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          Impossible de charger l&apos;historique : {error.message}
        </p>
      )}

      {/* Cumuls cuivre et azote */}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Cuivre et azote (kg/ha)</h2>

        <div
          className={
            cuivreAnnee >= seuil
              ? "rounded-lg border border-red-600 bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200"
              : "rounded-lg border border-green-600 bg-green-50 p-3 dark:bg-green-950"
          }
        >
          <div className="text-lg font-semibold">
            Cuivre {annee} : {formatNombre(cuivreAnnee, 2)} kg/ha
          </div>
          {cuivreAnnee >= seuil && (
            <div>⚠ Seuil d&apos;alerte de {formatNombre(seuil)} kg/ha atteint.</div>
          )}
          <div className="text-sm">
            Sur {NB_ANNEES_LISSAGE} ans ({premiereAnnee}–{annee}) : {formatNombre(cuivre7ans, 2)}{" "}
            kg/ha, soit {formatNombre(cuivre7ans / NB_ANNEES_LISSAGE, 2)} kg/ha/an en moyenne.
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Pour information : le plafond réglementaire se calcule sur la moyenne du domaine.
          </div>
        </div>

        {annees.length > 0 && (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-300 dark:border-zinc-700">
                <th className="py-1">Année</th>
                <th className="py-1 text-right">Cuivre</th>
                <th className="py-1 text-right">Azote (N)</th>
              </tr>
            </thead>
            <tbody>
              {annees.map((a) => {
                const c = cumuls.get(a)!;
                return (
                  <tr key={a} className="border-b border-zinc-200 dark:border-zinc-800">
                    <td className="py-1">
                      {a}
                      {c.teneursInconnues > 0 && (
                        <span className="block text-xs text-amber-700 dark:text-amber-400">
                          {c.teneursInconnues} produit(s) sans teneur, non compté(s)
                        </span>
                      )}
                    </td>
                    <td className="py-1 text-right">{formatNombre(c.cuivre, 2)}</td>
                    <td className="py-1 text-right">{formatNombre(c.azote, 1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Historique des interventions */}
      <section className="flex flex-col gap-3">
        <h2 className="mt-2 text-lg font-semibold">Historique des interventions</h2>

        <form className="flex flex-col gap-2 rounded-lg border border-zinc-300 p-3 dark:border-zinc-700">
          <select name="type" defaultValue={filtreType} className={CHAMP}>
            <option value="">Tous les types</option>
            {TYPES_INTERVENTION.map((t) => (
              <option key={t} value={t}>
                {LIBELLES_INTERVENTION[t]}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col text-sm">
              Du
              <input type="date" name="du" defaultValue={du} className={CHAMP} />
            </label>
            <label className="flex flex-col text-sm">
              Au
              <input type="date" name="au" defaultValue={au} className={CHAMP} />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-green-700 px-3 py-2 font-semibold text-white"
            >
              Filtrer
            </button>
            {filtreActif && (
              <Link
                href={`/parcelles/${idParcelle}`}
                className="flex-1 rounded-lg border border-zinc-400 px-3 py-2 text-center"
              >
                Tout afficher
              </Link>
            )}
          </div>
        </form>

        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {affichees.length} intervention{affichees.length > 1 ? "s" : ""}
          {filtreActif ? ` (sur ${toutes.length})` : ""}
        </div>

        <ul className="flex flex-col gap-3">
          {affichees.map((iv) => {
            const surface = Number(iv.intervention_parcelles[0]?.surface_ha ?? parcelle.surface_ha);
            const lignes = [...iv.intervention_produits].sort((a, b) => a.id - b.id);
            return (
              <li key={iv.id}>
                <Link
                  href={`/interventions/${iv.id}`}
                  className="flex flex-col gap-1 rounded-lg border border-zinc-300 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-lg font-medium">{LIBELLES_INTERVENTION[iv.type]}</span>
                    <span className="text-lg">{formatDate(iv.date_intervention)}</span>
                  </div>
                  {iv.cible && <div>Cible : {iv.cible}</div>}
                  {lignes.map((l) => {
                    const kg = kgMatiereParHa(l);
                    const avecMatiere = l.matiere_active === "cuivre" || l.matiere_active === "azote";
                    return (
                      <div key={l.id} className="text-sm">
                        {l.produits?.nom ?? "?"} · {formatNombre(Number(l.dose_par_ha), 3)} {l.unite}
                        /ha · {formatNombre(Number(l.dose_par_ha) * surface, 2)} {l.unite} sur la
                        parcelle
                        {l.numero_lot ? ` · lot ${l.numero_lot}` : ""}
                        {avecMatiere && (
                          <span className="block text-zinc-600 dark:text-zinc-400">
                            {LIBELLES_MATIERE[l.matiere_active]} :{" "}
                            {kg === null ? "teneur inconnue" : `${formatNombre(kg, 3)} kg/ha`}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {iv.remarques && (
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">{iv.remarques}</div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
