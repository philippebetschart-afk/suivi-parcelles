"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TYPES_PARCELLE, type TypeParcelle } from "@/lib/parcelles";
import { lireNombre, texteOuNull, type EtatFormulaire } from "@/lib/formulaire";

// Vérifie le formulaire et renvoie soit les données, soit un message d'erreur.
function lireParcelle(formData: FormData) {
  const nom = String(formData.get("nom") ?? "").trim();
  const surface = lireNombre(formData.get("surface"));
  const annee = lireNombre(formData.get("annee"));
  const type = String(formData.get("type") ?? "") as TypeParcelle;

  if (nom === "") return { erreur: "Le nom est obligatoire." };
  if (surface === null || Number.isNaN(surface) || surface <= 0) {
    return { erreur: "La surface doit être un nombre supérieur à 0 (ex. 0,55)." };
  }
  if (surface >= 10000) return { erreur: "La surface semble trop grande." };
  if (!TYPES_PARCELLE.includes(type)) return { erreur: "Choisissez un type de parcelle." };
  if (
    annee !== null &&
    (Number.isNaN(annee) || !Number.isInteger(annee) || annee < 1900 || annee > 2100)
  ) {
    return { erreur: "L'année de plantation doit être une année sur 4 chiffres (ex. 1998)." };
  }

  return {
    donnees: {
      nom,
      surface_ha: Math.round(surface * 10000) / 10000,
      type_parcelle: type,
      cepage: texteOuNull(formData.get("cepage")),
      annee_plantation: annee,
      remarques: texteOuNull(formData.get("remarques")),
    },
  };
}

function messageErreur(code: string | undefined, message: string): string {
  if (code === "23505") return "Une parcelle porte déjà ce nom.";
  return `Enregistrement impossible : ${message}`;
}

export async function creerParcelle(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const lu = lireParcelle(formData);
  if ("erreur" in lu) return { erreur: lu.erreur! };

  const supabase = await createClient();
  const { error } = await supabase.from("parcelles").insert(lu.donnees);
  if (error) return { erreur: messageErreur(error.code, error.message) };

  revalidatePath("/parcelles");
  redirect("/parcelles");
}

export async function modifierParcelle(
  id: number,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const lu = lireParcelle(formData);
  if ("erreur" in lu) return { erreur: lu.erreur! };

  const supabase = await createClient();
  const { error } = await supabase.from("parcelles").update(lu.donnees).eq("id", id);
  if (error) return { erreur: messageErreur(error.code, error.message) };

  revalidatePath("/parcelles");
  redirect("/parcelles");
}

// Archiver ne supprime rien : la parcelle disparaît de la liste mais garde son historique.
export async function changerArchivage(id: number, archivee: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("parcelles").update({ archivee }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/parcelles");
  redirect("/parcelles");
}
