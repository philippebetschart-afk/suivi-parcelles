"use client";

import { useActionState, useState } from "react";
import { formatNombre } from "@/lib/format";
import { lireNombre, type EtatFormulaire } from "@/lib/formulaire";
import { LIBELLES_TYPE, TYPES_PARCELLE, type TypeParcelle } from "@/lib/parcelles";
import { LIBELLES_MATIERE, MATIERES_ACTIVES, type MatiereActive, type Unite } from "@/lib/produits";
import {
  CIBLES_COURANTES,
  LIBELLES_INTERVENTION,
  TYPES_INTERVENTION,
  aujourdhui,
  lotObligatoire,
  type TypeIntervention,
} from "@/lib/interventions";

export type ParcelleChoix = {
  id: number;
  nom: string;
  surface_ha: number;
  type_parcelle: TypeParcelle;
};

export type ProduitChoix = {
  id: number;
  nom: string;
  unite: Unite;
  matiere_active: MatiereActive;
  teneur_g_par_unite: number | null;
};

type Ligne = { cle: number; produitId: string; dose: string; lot: string };

// Valeurs de départ quand on modifie une intervention existante.
export type ValeursIntervention = {
  date: string;
  type: TypeIntervention;
  cible: string;
  remarques: string;
  parcelles: number[];
  produits: { produitId: string; dose: string; lot: string }[];
};

const CHAMP = "rounded-lg border border-zinc-400 px-3 py-3 text-lg bg-transparent";
const CHOIX =
  "flex items-center gap-2 rounded-lg border border-zinc-400 px-3 py-3 text-lg has-[:checked]:border-green-700 has-[:checked]:bg-green-50 dark:has-[:checked]:bg-green-950";
const PETIT_BOUTON = "rounded-lg border border-zinc-400 px-3 py-2";

export default function FormulaireIntervention({
  action,
  parcelles,
  produits,
  derniersLots,
  valeurs,
  libelleBouton = "Enregistrer l'intervention",
}: {
  action: (etat: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  parcelles: ParcelleChoix[];
  produits: ProduitChoix[];
  derniersLots: Record<number, string>;
  valeurs?: ValeursIntervention;
  libelleBouton?: string;
}) {
  const [etat, envoyer, enCours] = useActionState(action, null);
  const [type, setType] = useState<TypeIntervention>(valeurs?.type ?? "traitement");
  const [cochees, setCochees] = useState<Set<number>>(new Set(valeurs?.parcelles));
  const [cible, setCible] = useState(valeurs?.cible ?? "");
  const [lignes, setLignes] = useState<Ligne[]>(
    valeurs && valeurs.produits.length > 0
      ? valeurs.produits.map((p, i) => ({ cle: i, ...p }))
      : [{ cle: 0, produitId: "", dose: "", lot: "" }],
  );

  const lotRequis = lotObligatoire(type);
  const produitsParId = new Map(produits.map((p) => [p.id, p]));
  const choisies = parcelles.filter((p) => cochees.has(p.id));
  const surfaceTotale = choisies.reduce((t, p) => t + Number(p.surface_ha), 0);

  function basculer(id: number) {
    const suivant = new Set(cochees);
    if (suivant.has(id)) suivant.delete(id);
    else suivant.add(id);
    setCochees(suivant);
  }

  function modifierLigne(cle: number, champs: Partial<Ligne>) {
    setLignes(lignes.map((l) => (l.cle === cle ? { ...l, ...champs } : l)));
  }

  function choisirProduit(ligne: Ligne, produitId: string) {
    // Propose le dernier numéro de lot utilisé pour ce produit.
    const lot = ligne.lot === "" ? (derniersLots[Number(produitId)] ?? "") : ligne.lot;
    modifierLigne(ligne.cle, { produitId, lot });
  }

  function ajouterLigne() {
    const cle = Math.max(0, ...lignes.map((l) => l.cle)) + 1;
    setLignes([...lignes, { cle, produitId: "", dose: "", lot: "" }]);
  }

  return (
    <form action={envoyer} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span>Date *</span>
        <input
          type="date"
          name="date"
          required
          defaultValue={valeurs?.date ?? aujourdhui()}
          className={CHAMP}
        />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1">Type *</legend>
        <div className="grid grid-cols-2 gap-2">
          {TYPES_INTERVENTION.map((t) => (
            <label key={t} className={CHOIX}>
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="h-5 w-5 accent-green-700"
              />
              {LIBELLES_INTERVENTION[t]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1">
          Parcelles *{" "}
          <span className="text-zinc-600 dark:text-zinc-400">
            ({choisies.length} · {formatNombre(surfaceTotale)} ha)
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={PETIT_BOUTON}
            onClick={() =>
              setCochees(
                new Set(parcelles.filter((p) => p.type_parcelle === "vigne").map((p) => p.id)),
              )
            }
          >
            Toutes les vignes
          </button>
          <button
            type="button"
            className={PETIT_BOUTON}
            onClick={() => setCochees(new Set(parcelles.map((p) => p.id)))}
          >
            Tout
          </button>
          <button type="button" className={PETIT_BOUTON} onClick={() => setCochees(new Set())}>
            Aucune
          </button>
        </div>
        {TYPES_PARCELLE.map((tp) => {
          const duType = parcelles.filter((p) => p.type_parcelle === tp);
          if (duType.length === 0) return null;
          return (
            <div key={tp} className="flex flex-col gap-2">
              <div className="mt-1 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                {LIBELLES_TYPE[tp]}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {duType.map((p) => (
                  <label key={p.id} className={CHOIX}>
                    <input
                      type="checkbox"
                      name="parcelle"
                      value={p.id}
                      checked={cochees.has(p.id)}
                      onChange={() => basculer(p.id)}
                      className="h-5 w-5 shrink-0 accent-green-700"
                    />
                    <span className="leading-tight">
                      {p.nom}
                      <span className="block text-sm text-zinc-600 dark:text-zinc-400">
                        {formatNombre(Number(p.surface_ha))} ha
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1">
          Produits {type === "traitement" ? "*" : "(facultatif)"}
        </legend>
        {lignes.map((ligne, i) => {
          const produit = produitsParId.get(Number(ligne.produitId));
          return (
            <div
              key={ligne.cle}
              className="flex flex-col gap-2 rounded-lg border border-zinc-300 p-3 dark:border-zinc-700"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Produit {i + 1}</span>
                {lignes.length > 1 && (
                  <button
                    type="button"
                    className="text-red-700 underline dark:text-red-400"
                    onClick={() => setLignes(lignes.filter((l) => l.cle !== ligne.cle))}
                  >
                    Retirer
                  </button>
                )}
              </div>
              <select
                name="produit_id"
                value={ligne.produitId}
                onChange={(e) => choisirProduit(ligne, e.target.value)}
                className={CHAMP}
              >
                <option value="">— Choisir un produit —</option>
                {MATIERES_ACTIVES.map((m) => {
                  const deLaMatiere = produits.filter((p) => p.matiere_active === m);
                  if (deLaMatiere.length === 0) return null;
                  return (
                    <optgroup key={m} label={LIBELLES_MATIERE[m]}>
                      {deLaMatiere.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nom}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <label className="flex flex-col gap-1">
                <span>Dose par hectare ({produit ? `${produit.unite}/ha` : "L/ha ou kg/ha"})</span>
                <input
                  name="dose"
                  inputMode="decimal"
                  placeholder="ex. 2,5"
                  value={ligne.dose}
                  onChange={(e) => modifierLigne(ligne.cle, { dose: e.target.value })}
                  className={CHAMP}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>N° de lot {lotRequis ? "*" : "(facultatif)"}</span>
                <input
                  name="lot"
                  value={ligne.lot}
                  onChange={(e) => modifierLigne(ligne.cle, { lot: e.target.value })}
                  className={CHAMP}
                />
              </label>
            </div>
          );
        })}
        <button type="button" className={PETIT_BOUTON + " py-3"} onClick={ajouterLigne}>
          + Ajouter un produit
        </button>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span>Cible / justification</span>
          <input
            name="cible"
            value={cible}
            onChange={(e) => setCible(e.target.value)}
            placeholder="ex. mildiou"
            className={CHAMP}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {CIBLES_COURANTES.map((c) => (
            <button key={c} type="button" className={PETIT_BOUTON} onClick={() => setCible(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span>Remarques</span>
        <textarea
          name="remarques"
          rows={3}
          defaultValue={valeurs?.remarques ?? ""}
          className={CHAMP}
        />
      </label>

      <Recapitulatif lignes={lignes} produitsParId={produitsParId} parcelles={choisies} />

      {etat?.erreur && (
        <p className="rounded-lg border border-red-600 bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          {etat.erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="rounded-lg bg-green-700 px-4 py-4 text-lg font-semibold text-white disabled:opacity-60"
      >
        {enCours ? "Enregistrement…" : libelleBouton}
      </button>
    </form>
  );
}

// Calculs automatiques : quantité de produit (dose × surface) et matière active par hectare.
function Recapitulatif({
  lignes,
  produitsParId,
  parcelles,
}: {
  lignes: Ligne[];
  produitsParId: Map<number, ProduitChoix>;
  parcelles: ParcelleChoix[];
}) {
  const utilises = lignes
    .map((l) => ({ produit: produitsParId.get(Number(l.produitId)), dose: lireNombre(l.dose) }))
    .filter(
      (u): u is { produit: ProduitChoix; dose: number } =>
        u.produit !== undefined && u.dose !== null && !Number.isNaN(u.dose) && u.dose > 0,
    );
  if (utilises.length === 0 || parcelles.length === 0) return null;

  const surfaceTotale = parcelles.reduce((t, p) => t + Number(p.surface_ha), 0);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-green-600 bg-green-50 p-4 dark:bg-green-950">
      <div className="font-semibold text-green-800 dark:text-green-200">Récapitulatif</div>
      {utilises.map(({ produit, dose }, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="font-medium">
            {produit.nom} · {formatNombre(dose, 3)} {produit.unite}/ha
          </div>
          <div className="text-sm">
            Total à préparer : {formatNombre(dose * surfaceTotale, 2)} {produit.unite} pour{" "}
            {formatNombre(surfaceTotale)} ha
          </div>
          {produit.matiere_active !== "autre" && (
            <div className="text-sm">
              {produit.teneur_g_par_unite === null ? (
                <span className="text-amber-700 dark:text-amber-400">
                  Teneur en {LIBELLES_MATIERE[produit.matiere_active].toLowerCase()} inconnue :
                  à compléter dans la fiche produit.
                </span>
              ) : (
                <>
                  {LIBELLES_MATIERE[produit.matiere_active]} :{" "}
                  {formatNombre((dose * Number(produit.teneur_g_par_unite)) / 1000, 3)} kg/ha
                </>
              )}
            </div>
          )}
          <details className="text-sm">
            <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400">
              Détail par parcelle
            </summary>
            <ul className="mt-1">
              {parcelles.map((p) => (
                <li key={p.id}>
                  {p.nom} ({formatNombre(Number(p.surface_ha))} ha) :{" "}
                  {formatNombre(dose * Number(p.surface_ha), 2)} {produit.unite}
                </li>
              ))}
            </ul>
          </details>
        </div>
      ))}
    </div>
  );
}
