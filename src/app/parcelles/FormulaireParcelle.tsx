"use client";

import { useActionState } from "react";
import { LIBELLES_TYPE, TYPES_PARCELLE, type TypeParcelle } from "@/lib/parcelles";
import type { EtatFormulaire } from "./actions";

export type ValeursParcelle = {
  nom: string;
  surface_ha: number | null;
  type_parcelle: TypeParcelle;
  cepage: string | null;
  annee_plantation: number | null;
  remarques: string | null;
};

const VIDE: ValeursParcelle = {
  nom: "",
  surface_ha: null,
  type_parcelle: "vigne",
  cepage: null,
  annee_plantation: null,
  remarques: null,
};

const CHAMP = "rounded-lg border border-zinc-400 px-3 py-3 text-lg bg-transparent";

// Libellés au singulier pour les boutons de choix du type.
const TYPE_SINGULIER: Record<TypeParcelle, string> = {
  vigne: "Vigne",
  verger: "Verger",
  jachere: "Jachère",
  autre: "Autre",
};

export default function FormulaireParcelle({
  action,
  valeurs = VIDE,
  libelleBouton,
}: {
  action: (etat: EtatFormulaire, formData: FormData) => Promise<EtatFormulaire>;
  valeurs?: ValeursParcelle;
  libelleBouton: string;
}) {
  const [etat, envoyer, enCours] = useActionState(action, null);

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span>Nom *</span>
        <input name="nom" required defaultValue={valeurs.nom} className={CHAMP} />
      </label>

      <label className="flex flex-col gap-1">
        <span>Surface (ha) *</span>
        <input
          name="surface"
          required
          inputMode="decimal"
          placeholder="ex. 0,55"
          defaultValue={
            valeurs.surface_ha === null ? "" : String(valeurs.surface_ha).replace(".", ",")
          }
          className={CHAMP}
        />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1">Type *</legend>
        <div className="grid grid-cols-2 gap-2">
          {TYPES_PARCELLE.map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 rounded-lg border border-zinc-400 px-3 py-3 text-lg has-[:checked]:border-green-700 has-[:checked]:bg-green-50 dark:has-[:checked]:bg-green-950"
            >
              <input
                type="radio"
                name="type"
                value={type}
                defaultChecked={valeurs.type_parcelle === type}
                className="h-5 w-5 accent-green-700"
              />
              {TYPE_SINGULIER[type]}
            </label>
          ))}
        </div>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Seules les {LIBELLES_TYPE.vigne.toLowerCase()} comptent dans les moyennes cuivre et
          azote du domaine.
        </span>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span>Cépage ou culture</span>
        <input name="cepage" defaultValue={valeurs.cepage ?? ""} className={CHAMP} />
      </label>

      <label className="flex flex-col gap-1">
        <span>Année de plantation</span>
        <input
          name="annee"
          inputMode="numeric"
          placeholder="ex. 1998"
          defaultValue={valeurs.annee_plantation ?? ""}
          className={CHAMP}
        />
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
