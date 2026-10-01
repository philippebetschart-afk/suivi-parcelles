"use client";

import { useActionState, useState } from "react";
import { nombreVersSaisie, type EtatFormulaire } from "@/lib/formulaire";
import {
  LIBELLES_MATIERE,
  MATIERES_ACTIVES,
  UNITES,
  teneurVersSaisie,
  uniteTeneur,
  type MatiereActive,
  type Unite,
} from "@/lib/produits";

export type ValeursProduit = {
  nom: string;
  unite: Unite;
  matiere_active: MatiereActive;
  teneur_g_par_unite: number | null;
  remarques: string | null;
};

const VIDE: ValeursProduit = {
  nom: "",
  unite: "L",
  matiere_active: "cuivre",
  teneur_g_par_unite: null,
  remarques: null,
};

const CHAMP = "rounded-lg border border-zinc-400 px-3 py-3 text-lg bg-transparent";
const CHOIX =
  "flex items-center gap-2 rounded-lg border border-zinc-400 px-3 py-3 text-lg has-[:checked]:border-green-700 has-[:checked]:bg-green-50 dark:has-[:checked]:bg-green-950";

export default function FormulaireProduit({
  action,
  valeurs = VIDE,
  libelleBouton,
}: {
  action: (etat: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  valeurs?: ValeursProduit;
  libelleBouton: string;
}) {
  const [etat, envoyer, enCours] = useActionState(action, null);
  // Le libellé de la teneur dépend de la matière active et de l'unité choisies.
  const [matiere, setMatiere] = useState(valeurs.matiere_active);
  const [unite, setUnite] = useState(valeurs.unite);
  const teneurInitiale =
    valeurs.teneur_g_par_unite === null
      ? null
      : teneurVersSaisie(valeurs.matiere_active, Number(valeurs.teneur_g_par_unite));

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span>Nom *</span>
        <input name="nom" required defaultValue={valeurs.nom} className={CHAMP} />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1">Matière active *</legend>
        <div className="grid grid-cols-2 gap-2">
          {MATIERES_ACTIVES.map((m) => (
            <label key={m} className={CHOIX}>
              <input
                type="radio"
                name="matiere"
                value={m}
                checked={matiere === m}
                onChange={() => setMatiere(m)}
                className="h-5 w-5 accent-green-700"
              />
              {LIBELLES_MATIERE[m]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1">Unité du produit *</legend>
        <div className="grid grid-cols-2 gap-2">
          {UNITES.map((u) => (
            <label key={u} className={CHOIX}>
              <input
                type="radio"
                name="unite"
                value={u}
                checked={unite === u}
                onChange={() => setUnite(u)}
                className="h-5 w-5 accent-green-700"
              />
              {u === "L" ? "Litre (L)" : "Kilo (kg)"}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span>
          Teneur en {LIBELLES_MATIERE[matiere].toLowerCase()} ({uniteTeneur(matiere, unite)})
        </span>
        <input
          name="teneur"
          inputMode="decimal"
          placeholder={matiere === "azote" ? "ex. 4" : "ex. 400"}
          defaultValue={nombreVersSaisie(teneurInitiale)}
          className={CHAMP}
        />
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {matiere === "azote"
            ? "Unités d'azote pour 100 kg de produit (= % d'azote)."
            : `Grammes de matière active par ${unite === "L" ? "litre" : "kilo"} de produit.`}{" "}
          Laisser vide si inconnue.
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span>Remarques</span>
        <textarea
          name="remarques"
          rows={3}
          defaultValue={valeurs.remarques ?? ""}
          className={CHAMP}
        />
      </label>

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
