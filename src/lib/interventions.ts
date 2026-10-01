export const TYPES_INTERVENTION = [
  "traitement",
  "sol",
  "amendement",
  "taille",
  "biodynamie",
  "autre",
] as const;
export type TypeIntervention = (typeof TYPES_INTERVENTION)[number];

export const LIBELLES_INTERVENTION: Record<TypeIntervention, string> = {
  traitement: "Traitement",
  sol: "Sol",
  amendement: "Amendement",
  taille: "Taille",
  biodynamie: "Biodynamie",
  autre: "Autre",
};

// Cibles proposées en un clic ; la saisie libre reste possible.
export const CIBLES_COURANTES = ["Mildiou", "Oïdium", "Black-rot", "Botrytis", "Vers de la grappe"];

// Pour un traitement, chaque produit doit avoir son numéro de lot.
export function lotObligatoire(type: TypeIntervention): boolean {
  return type === "traitement";
}

// Date du jour au format AAAA-MM-JJ (celui des champs date), à l'heure française.
export function aujourdhui(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
}

// AAAA-MM-JJ → JJ/MM/AAAA
export function formatDate(iso: string): string {
  const [annee, mois, jour] = iso.split("-");
  return `${jour}/${mois}/${annee}`;
}
