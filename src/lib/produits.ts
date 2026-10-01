export const MATIERES_ACTIVES = ["cuivre", "azote", "soufre", "autre"] as const;
export type MatiereActive = (typeof MATIERES_ACTIVES)[number];

export const UNITES = ["L", "kg"] as const;
export type Unite = (typeof UNITES)[number];

export const LIBELLES_MATIERE: Record<MatiereActive, string> = {
  cuivre: "Cuivre",
  azote: "Azote",
  soufre: "Soufre",
  autre: "Autre",
};

// L'azote se saisit en unités pour 100 kg (= %) ; on stocke des g/kg.
export function teneurVersSaisie(matiere: MatiereActive, gParUnite: number): number {
  return matiere === "azote" ? gParUnite / 10 : gParUnite;
}

export function saisieVersTeneur(matiere: MatiereActive, saisie: number): number {
  return matiere === "azote" ? saisie * 10 : saisie;
}

export function uniteTeneur(matiere: MatiereActive, unite: Unite): string {
  return matiere === "azote" ? `unités N / 100 ${unite}` : `g/${unite}`;
}
