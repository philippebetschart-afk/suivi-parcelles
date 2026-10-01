// Affichage des nombres à la française (virgule décimale).
export function formatNombre(valeur: number, decimalesMax = 4): string {
  return valeur.toLocaleString("fr-FR", { maximumFractionDigits: decimalesMax });
}
