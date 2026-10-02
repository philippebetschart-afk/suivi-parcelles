import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNombre } from "@/lib/format";
import { chargerRegistre, type LigneRegistre } from "@/lib/registre";
import { chargerBilanDomaine } from "@/lib/bilan-domaine";
import { NB_ANNEES_LISSAGE } from "@/lib/bilans";
import { LIBELLES_INTERVENTION, aujourdhui, formatDate } from "@/lib/interventions";
import { LIBELLES_MATIERE } from "@/lib/produits";
import BoutonImprimer from "./BoutonImprimer";

const TH = "border border-zinc-400 px-1 py-0.5 text-left align-top";
const TD = "border border-zinc-400 px-1 py-0.5 align-top";

function texte(valeur: string | string[] | undefined): string {
  return typeof valeur === "string" ? valeur : "";
}

// Regroupe les lignes du registre par intervention (une ligne imprimée par intervention).
function parIntervention(lignes: LigneRegistre[]) {
  const groupes = new Map<number, LigneRegistre[]>();
  for (const l of lignes) {
    const g = groupes.get(l.interventionId) ?? [];
    g.push(l);
    groupes.set(l.interventionId, g);
  }
  return [...groupes.values()].map((g) => {
    const parcelles = [...new Map(g.map((l) => [l.parcelle, l.surfaceHa])).entries()];
    const produits = [
      ...new Map(
        g.filter((l) => l.produit).map((l) => [`${l.produit}|${l.numeroLot}|${l.doseParHa}`, l]),
      ).values(),
    ];
    return { premiere: g[0], parcelles, produits };
  });
}

export default async function Imprimer(props: PageProps<"/export/imprimer">) {
  const filtres = await props.searchParams;
  const du = texte(filtres.du);
  const au = texte(filtres.au);

  const supabase = await createClient();
  const [registre, bilan] = await Promise.all([
    chargerRegistre(supabase, du, au),
    chargerBilanDomaine(supabase),
  ]);
  const erreur = registre.erreur ?? bilan.erreur;
  const interventions = parIntervention(registre.lignes);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 bg-white px-4 py-6 text-sm text-black">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link href="/export" className="text-green-700 underline">
          ← Export
        </Link>
        <BoutonImprimer />
      </div>

      <header>
        <h1 className="text-xl font-semibold">
          Registre des interventions – Domaine de Viaud
        </h1>
        <div>
          Période : {du ? formatDate(du) : "début"} au {au ? formatDate(au) : "aujourd'hui"} ·{" "}
          {registre.nbInterventions} intervention{registre.nbInterventions > 1 ? "s" : ""} ·
          édité le {formatDate(aujourdhui())}
        </div>
      </header>

      {erreur && <p className="text-red-700">Données incomplètes : {erreur.message}</p>}

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-zinc-100">
            <th className={TH}>Date</th>
            <th className={TH}>Type</th>
            <th className={TH}>Produits (dose /ha · lot · matière active)</th>
            <th className={TH}>Parcelles (surface)</th>
            <th className={TH}>Cible</th>
            <th className={TH}>Remarques</th>
          </tr>
        </thead>
        <tbody>
          {interventions.map(({ premiere, parcelles, produits }) => {
            const surface = parcelles.reduce((t, [, s]) => t + s, 0);
            return (
              <tr key={premiere.interventionId} className="break-inside-avoid">
                <td className={TD + " whitespace-nowrap"}>{formatDate(premiere.date)}</td>
                <td className={TD}>{LIBELLES_INTERVENTION[premiere.type]}</td>
                <td className={TD}>
                  {produits.length === 0
                    ? "—"
                    : produits.map((p, i) => (
                        <div key={i}>
                          {p.produit} · {formatNombre(p.doseParHa!, 3)} {p.unite}/ha
                          {p.numeroLot ? ` · lot ${p.numeroLot}` : ""}
                          {p.matiere && p.matiere !== "autre"
                            ? ` · ${LIBELLES_MATIERE[p.matiere].toLowerCase()} ${
                                p.kgMatiereParHa === null
                                  ? "teneur inconnue"
                                  : `${formatNombre(p.kgMatiereParHa, 3)} kg/ha`
                              }`
                            : ""}
                        </div>
                      ))}
                </td>
                <td className={TD}>
                  {parcelles.map(([nom, s]) => `${nom} (${formatNombre(s)})`).join(", ")}
                  <div className="text-zinc-600">Total : {formatNombre(surface)} ha</div>
                </td>
                <td className={TD}>{premiere.cible ?? ""}</td>
                <td className={TD}>
                  {premiere.remarques ?? ""}
                  {premiere.derniereModification && (
                    <div className="text-zinc-600">
                      Modifiée le {formatDate(premiere.derniereModification.slice(0, 10))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="break-inside-avoid">
        <h2 className="mt-4 text-base font-semibold">Cumuls par parcelle (sur la période)</h2>
        <table className="mt-1 border-collapse">
          <thead>
            <tr className="bg-zinc-100">
              <th className={TH}>Parcelle</th>
              <th className={TH}>Année</th>
              <th className={TH}>Cuivre (kg/ha)</th>
              <th className={TH}>Azote (unités N/ha)</th>
            </tr>
          </thead>
          <tbody>
            {registre.cumulsParcelles.map((c) => (
              <tr key={`${c.parcelle}-${c.annee}`}>
                <td className={TD}>{c.parcelle}</td>
                <td className={TD}>{c.annee}</td>
                <td className={TD + " text-right"}>
                  {formatNombre(c.cuivre, 2)}
                  {c.teneursInconnues > 0 ? " *" : ""}
                </td>
                <td className={TD + " text-right"}>{formatNombre(c.azote, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {registre.cumulsParcelles.some((c) => c.teneursInconnues > 0) && (
          <p className="mt-1">* certains produits sans teneur connue ne sont pas comptés.</p>
        )}
      </section>

      <section className="break-inside-avoid">
        <h2 className="mt-4 text-base font-semibold">
          Bilan cuivre du domaine sur {NB_ANNEES_LISSAGE} ans ({bilan.premiereAnnee}–{bilan.annee})
          · vignes : {formatNombre(bilan.surfaceVignes)} ha
        </h2>
        <table className="mt-1 border-collapse">
          <thead>
            <tr className="bg-zinc-100">
              <th className={TH}>Année</th>
              <th className={TH}>Cuivre (kg/ha)</th>
              <th className={TH}>Source</th>
            </tr>
          </thead>
          <tbody>
            {[...bilan.lignes7ans].reverse().map((l) => (
              <tr key={l.annee}>
                <td className={TD}>{l.annee}</td>
                <td className={TD + " text-right"}>{l.vide ? "—" : formatNombre(l.retenu, 2)}</td>
                <td className={TD}>
                  {l.saisie !== undefined
                    ? "valeur déclarée"
                    : l.calcule !== undefined
                      ? "interventions"
                      : "aucune donnée"}
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className={TD}>Total</td>
              <td className={TD + " text-right"}>{formatNombre(bilan.total7ans, 2)}</td>
              <td className={TD}>
                plafond {formatNombre(bilan.parametres.plafond_cuivre_7ans)} kg/ha · moyenne{" "}
                {formatNombre(bilan.total7ans / NB_ANNEES_LISSAGE, 2)} kg/ha/an
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
