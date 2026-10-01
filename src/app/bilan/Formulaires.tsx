"use client";

import { useActionState } from "react";
import { nombreVersSaisie } from "@/lib/formulaire";
import { enregistrerHistorique, enregistrerParametres, type EtatBilan } from "./actions";

const CHAMP = "rounded-lg border border-zinc-400 px-3 py-3 text-lg bg-transparent w-full";
const BOUTON =
  "rounded-lg bg-green-700 px-4 py-3 text-lg font-semibold text-white disabled:opacity-60";

function Message({ etat }: { etat: EtatBilan }) {
  if (!etat) return null;
  if ("ok" in etat) {
    return <p className="text-green-800 dark:text-green-300">✓ {etat.ok}</p>;
  }
  return (
    <p className="rounded-lg border border-red-600 bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">
      {etat.erreur}
    </p>
  );
}

export function FormulaireHistorique({ anneeProposee }: { anneeProposee: number }) {
  const [etat, envoyer, enCours] = useActionState(enregistrerHistorique, null);
  return (
    <form action={envoyer} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span>Année</span>
          <input
            name="annee"
            inputMode="numeric"
            defaultValue={anneeProposee}
            required
            className={CHAMP}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Cuivre (kg/ha)</span>
          <input name="kg" inputMode="decimal" placeholder="ex. 2,85" required className={CHAMP} />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span>Remarques</span>
        <input name="remarques" placeholder="ex. déclaré à Ecocert" className={CHAMP} />
      </label>
      <Message etat={etat} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Enregistrement…" : "Enregistrer cette année"}
      </button>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Pour corriger une année déjà saisie, saisissez-la de nouveau : la valeur est remplacée.
      </p>
    </form>
  );
}

export function FormulaireParametres({
  seuil,
  plafond,
}: {
  seuil: number;
  plafond: number;
}) {
  const [etat, envoyer, enCours] = useActionState(enregistrerParametres, null);
  return (
    <form action={envoyer} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span>Seuil d&apos;alerte cuivre sur l&apos;année (kg/ha)</span>
        <input
          name="seuil"
          inputMode="decimal"
          defaultValue={nombreVersSaisie(seuil)}
          required
          className={CHAMP}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>Plafond cuivre sur 7 ans (kg/ha)</span>
        <input
          name="plafond"
          inputMode="decimal"
          defaultValue={nombreVersSaisie(plafond)}
          required
          className={CHAMP}
        />
      </label>
      <Message etat={etat} />
      <button type="submit" disabled={enCours} className={BOUTON}>
        {enCours ? "Enregistrement…" : "Enregistrer les réglages"}
      </button>
    </form>
  );
}
