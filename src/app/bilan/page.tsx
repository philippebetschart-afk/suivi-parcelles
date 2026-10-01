import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNombre } from "@/lib/format";
import type { TypeParcelle } from "@/lib/parcelles";
import type { MatiereActive } from "@/lib/produits";
import {
  NB_ANNEES_LISSAGE,
  anneeEnCours,
  chargerParametres,
  cumulsDomaineParAnnee,
  kgMatiereParHa,
} from "@/lib/bilans";
import { FormulaireHistorique, FormulaireParametres } from "./Formulaires";

type Intervention = {
  date_intervention: string;
  intervention_parcelles: {
    parcelle_id: number;
    surface_ha: number;
    parcelles: { nom: string; type_parcelle: TypeParcelle } | null;
  }[];
  intervention_produits: {
    dose_par_ha: number;
    matiere_active: MatiereActive;
    teneur_g_par_unite: number | null;
  }[];
};

type Historique = { annee: number; kg_cu_par_ha: number; remarques: string | null };

const ALERTE =
  "rounded-lg border border-red-600 bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200";
const NORMAL = "rounded-lg border border-green-600 bg-green-50 p-4 dark:bg-green-950";

export default async function Bilan() {
  const annee = anneeEnCours();
  const premiereAnnee = annee - NB_ANNEES_LISSAGE + 1;

  const supabase = await createClient();
  const [parametres, vignesRes, ivRes, histRes] = await Promise.all([
    chargerParametres(supabase),
    supabase
      .from("parcelles")
      .select("surface_ha")
      .eq("archivee", false)
      .eq("type_parcelle", "vigne"),
    supabase
      .from("interventions")
      .select(
        `date_intervention,
         intervention_parcelles (parcelle_id, surface_ha, parcelles (nom, type_parcelle)),
         intervention_produits (dose_par_ha, matiere_active, teneur_g_par_unite)`,
      )
      .gte("date_intervention", `${premiereAnnee}-01-01`),
    supabase
      .from("cuivre_historique")
      .select("annee, kg_cu_par_ha, remarques")
      .order("annee", { ascending: false }),
  ]);

  const erreur = vignesRes.error ?? ivRes.error ?? histRes.error;
  const { seuil_alerte_cuivre: seuil, plafond_cuivre_7ans: plafond } = parametres;
  const surfaceVignes = (vignesRes.data ?? []).reduce((t, p) => t + Number(p.surface_ha), 0);
  const interventions = (ivRes.data ?? []) as unknown as Intervention[];
  const historique = (histRes.data ?? []) as Historique[];
  const saisies = new Map(historique.map((h) => [h.annee, Number(h.kg_cu_par_ha)]));

  // Calculé à partir des interventions saisies dans l'application.
  const calcules = cumulsDomaineParAnnee(
    interventions.map((iv) => ({
      date_intervention: iv.date_intervention,
      parcelles: iv.intervention_parcelles.map((p) => ({
        surface_ha: p.surface_ha,
        est_vigne: p.parcelles?.type_parcelle === "vigne",
      })),
      produits: iv.intervention_produits,
    })),
    surfaceVignes,
  );

  // Pour chaque année des 7 ans : la valeur saisie (déclarée au certificateur) est prioritaire,
  // sinon la valeur calculée à partir des interventions.
  const lignes7ans = Array.from({ length: NB_ANNEES_LISSAGE }, (_, i) => annee - i).map((a) => {
    const saisie = saisies.get(a);
    const calcule = calcules.get(a);
    return {
      annee: a,
      saisie,
      calcule,
      retenu: saisie ?? calcule?.cuivre ?? 0,
      vide: saisie === undefined && calcule === undefined,
    };
  });
  const total7ans = lignes7ans.reduce((t, l) => t + l.retenu, 0);
  const cuivreAnnee = lignes7ans[0].retenu;
  const resteDisponible = plafond - total7ans;
  const anneesManquantes = lignes7ans.filter((l) => l.vide && l.annee !== annee);

  // Cuivre de l'année par parcelle de vigne (pour signaler celles qui dépassent le seuil).
  const parParcelle = new Map<number, { nom: string; cuivre: number }>();
  for (const iv of interventions) {
    if (Number(iv.date_intervention.slice(0, 4)) !== annee) continue;
    const kgCuivre = iv.intervention_produits
      .filter((l) => l.matiere_active === "cuivre")
      .reduce((t, l) => t + (kgMatiereParHa(l) ?? 0), 0);
    for (const p of iv.intervention_parcelles) {
      if (p.parcelles?.type_parcelle !== "vigne") continue;
      const actuel = parParcelle.get(p.parcelle_id) ?? { nom: p.parcelles.nom, cuivre: 0 };
      actuel.cuivre += kgCuivre;
      parParcelle.set(p.parcelle_id, actuel);
    }
  }
  const parcellesAuDessus = [...parParcelle.entries()]
    .filter(([, p]) => p.cuivre >= seuil)
    .sort((a, b) => b[1].cuivre - a[1].cuivre);

  const anneesAzote = [...calcules.keys()].sort((a, b) => b - a);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/" className="text-green-700 underline dark:text-green-400">
        ← Accueil
      </Link>
      <h1 className="text-2xl font-semibold">Bilan du domaine</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Moyennes calculées sur les vignes seulement : {formatNombre(surfaceVignes)} ha.
      </p>

      {erreur && (
        <p className={ALERTE}>Impossible de charger le bilan : {erreur.message}</p>
      )}

      {/* Cuivre de l'année */}
      <div className={cuivreAnnee >= seuil ? ALERTE : NORMAL}>
        <div className="text-lg font-semibold">
          Cuivre {annee} : {formatNombre(cuivreAnnee, 2)} kg/ha
        </div>
        {cuivreAnnee >= seuil ? (
          <div>⚠ Seuil d&apos;alerte de {formatNombre(seuil)} kg/ha atteint.</div>
        ) : (
          <div className="text-sm">
            Seuil d&apos;alerte : {formatNombre(seuil)} kg/ha (encore{" "}
            {formatNombre(seuil - cuivreAnnee, 2)} kg/ha).
          </div>
        )}
        {(calcules.get(annee)?.teneursInconnues ?? 0) > 0 && (
          <div className="text-sm text-amber-700 dark:text-amber-400">
            Attention : des produits sans teneur ne sont pas comptés.
          </div>
        )}
      </div>

      {parcellesAuDessus.length > 0 && (
        <div className={ALERTE}>
          <div className="font-semibold">
            Parcelles au-dessus de {formatNombre(seuil)} kg/ha en {annee} :
          </div>
          <ul>
            {parcellesAuDessus.map(([id, p]) => (
              <li key={id}>
                <Link href={`/parcelles/${id}`} className="underline">
                  {p.nom}
                </Link>{" "}
                : {formatNombre(p.cuivre, 2)} kg/ha
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sur 7 ans */}
      <section className="flex flex-col gap-2">
        <h2 className="mt-2 text-lg font-semibold">
          Cuivre sur {NB_ANNEES_LISSAGE} ans ({premiereAnnee}–{annee})
        </h2>
        <div className={total7ans >= plafond ? ALERTE : NORMAL}>
          <div className="text-lg font-semibold">
            {formatNombre(total7ans, 2)} kg/ha sur {formatNombre(plafond)} kg/ha autorisés
          </div>
          <div className="text-sm">
            Moyenne : {formatNombre(total7ans / NB_ANNEES_LISSAGE, 2)} kg/ha/an (plafond{" "}
            {formatNombre(plafond / NB_ANNEES_LISSAGE, 2)} kg/ha/an).
          </div>
          <div className="text-sm">
            {resteDisponible > 0
              ? `Reste disponible : ${formatNombre(resteDisponible, 2)} kg/ha.`
              : `⚠ Plafond dépassé de ${formatNombre(-resteDisponible, 2)} kg/ha.`}
          </div>
        </div>
        {anneesManquantes.length > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Années sans donnée, comptées à 0 :{" "}
            {anneesManquantes.map((l) => l.annee).join(", ")}. Saisissez-les plus bas.
          </p>
        )}
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-300 dark:border-zinc-700">
              <th className="py-1">Année</th>
              <th className="py-1 text-right">Cuivre (kg/ha)</th>
              <th className="py-1 pl-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {lignes7ans.map((l) => (
              <tr key={l.annee} className="border-b border-zinc-200 dark:border-zinc-800">
                <td className="py-1">{l.annee}</td>
                <td className="py-1 text-right">{l.vide ? "—" : formatNombre(l.retenu, 2)}</td>
                <td className="py-1 pl-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {l.saisie !== undefined
                    ? "saisie"
                    : l.calcule !== undefined
                      ? "interventions"
                      : "aucune"}
                  {l.saisie !== undefined && l.calcule !== undefined && (
                    <span className="block text-xs">
                      (interventions : {formatNombre(l.calcule.cuivre, 2)})
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Azote */}
      <section className="flex flex-col gap-2">
        <h2 className="mt-2 text-lg font-semibold">Azote (unités N/ha, moyenne des vignes)</h2>
        {anneesAzote.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">Aucun apport enregistré.</p>
        ) : (
          <table className="w-full text-left">
            <tbody>
              {anneesAzote.map((a) => (
                <tr key={a} className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-1">{a}</td>
                  <td className="py-1 text-right">{formatNombre(calcules.get(a)!.azote, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Années passées */}
      <section className="mt-4 flex flex-col gap-3 border-t border-zinc-300 pt-4 dark:border-zinc-700">
        <h2 className="text-lg font-semibold">Cuivre des années passées</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Moyenne du domaine en kg/ha, telle que déclarée à Ecocert. Quand une année est saisie
          ici, c&apos;est cette valeur qui compte dans le calcul sur 7 ans.
        </p>
        {historique.length > 0 && (
          <ul className="flex flex-col gap-1">
            {historique.map((h) => (
              <li key={h.annee} className="flex justify-between gap-2 border-b border-zinc-200 py-1 dark:border-zinc-800">
                <span>
                  {h.annee}
                  {h.remarques && (
                    <span className="block text-sm text-zinc-600 dark:text-zinc-400">
                      {h.remarques}
                    </span>
                  )}
                </span>
                <span>{formatNombre(Number(h.kg_cu_par_ha), 3)} kg/ha</span>
              </li>
            ))}
          </ul>
        )}
        <FormulaireHistorique anneeProposee={anneesManquantes[0]?.annee ?? annee - 1} />
      </section>

      {/* Réglages */}
      <section className="mt-4 flex flex-col gap-3 border-t border-zinc-300 pt-4 dark:border-zinc-700">
        <h2 className="text-lg font-semibold">Réglages</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Valeurs à confirmer avec Ecocert.
        </p>
        <FormulaireParametres seuil={seuil} plafond={plafond} />
      </section>
    </main>
  );
}
