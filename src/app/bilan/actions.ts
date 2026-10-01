"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { lireNombre, texteOuNull } from "@/lib/formulaire";

// Message d'erreur, ou de réussite (on reste sur la page après l'enregistrement).
export type EtatBilan = { erreur: string } | { ok: string } | null;

export async function enregistrerParametres(
  _etat: EtatBilan,
  formData: FormData,
): Promise<EtatBilan> {
  const seuil = lireNombre(formData.get("seuil"));
  const plafond = lireNombre(formData.get("plafond"));
  if (seuil === null || Number.isNaN(seuil) || seuil <= 0) {
    return { erreur: "Le seuil d'alerte doit être un nombre supérieur à 0 (ex. 3)." };
  }
  if (plafond === null || Number.isNaN(plafond) || plafond <= 0) {
    return { erreur: "Le plafond sur 7 ans doit être un nombre supérieur à 0 (ex. 28)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("parametres")
    .update({ seuil_alerte_cuivre: seuil, plafond_cuivre_7ans: plafond })
    .eq("id", 1);
  if (error) return { erreur: `Enregistrement impossible : ${error.message}` };

  revalidatePath("/", "layout");
  return { ok: "Réglages enregistrés." };
}

// Ajoute ou remplace la moyenne cuivre d'une année passée.
export async function enregistrerHistorique(
  _etat: EtatBilan,
  formData: FormData,
): Promise<EtatBilan> {
  const annee = lireNombre(formData.get("annee"));
  const kg = lireNombre(formData.get("kg"));
  if (annee === null || !Number.isInteger(annee) || annee < 1990 || annee > 2100) {
    return { erreur: "Indiquez l'année sur 4 chiffres (ex. 2023)." };
  }
  if (kg === null || Number.isNaN(kg) || kg < 0) {
    return { erreur: "Indiquez le cuivre en kg/ha (ex. 2,85)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cuivre_historique").upsert({
    annee,
    kg_cu_par_ha: kg,
    remarques: texteOuNull(formData.get("remarques")),
  });
  if (error) return { erreur: `Enregistrement impossible : ${error.message}` };

  revalidatePath("/bilan");
  return { ok: `Cuivre ${annee} enregistré.` };
}
