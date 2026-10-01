export const TYPES_PARCELLE = ["vigne", "verger", "jachere", "autre"] as const;
export type TypeParcelle = (typeof TYPES_PARCELLE)[number];

export const LIBELLES_TYPE: Record<TypeParcelle, string> = {
  vigne: "Vignes",
  verger: "Vergers",
  jachere: "Jachères",
  autre: "Autres",
};
