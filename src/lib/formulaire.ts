// Outils partagés pour lire les formulaires.

export type EtatFormulaire = { erreur: string } | null;

// Lit un nombre saisi à la française (virgule ou point).
// Renvoie null si le champ est vide, NaN s'il n'est pas un nombre.
export function lireNombre(valeur: FormDataEntryValue | null): number | null {
  const texte = String(valeur ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (texte === "") return null;
  const nombre = Number(texte);
  return Number.isFinite(nombre) ? nombre : NaN;
}

export function texteOuNull(valeur: FormDataEntryValue | null): string | null {
  const texte = String(valeur ?? "").trim();
  return texte === "" ? null : texte;
}

// Nombre affiché dans un champ de saisie, avec virgule.
export function nombreVersSaisie(valeur: number | null): string {
  return valeur === null ? "" : String(valeur).replace(".", ",");
}
