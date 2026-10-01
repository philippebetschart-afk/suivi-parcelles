"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { lireNombre, texteOuNull, type EtatFormulaire } from "@/lib/formulaire";
import {
  MATIERES_ACTIVES,
  UNITES,
  saisieVersTeneur,
  type MatiereActive,
  type Unite,
} from "@/lib/produits";

// Vérifie le formulaire et renvoie soit les données, soit un message d'erreur.
function lireProduit(formData: FormData) {
  const nom = String(formData.get("nom") ?? "").trim();
  const unite = String(formData.get("unite") ?? "") as Unite;
  const matiere = String(formData.get("matiere") ?? "") as MatiereActive;
  const teneur = lireNombre(formData.get("teneur"));

  if (nom === "") return { erreur: "Le nom est obligatoire." };
  if (!UNITES.includes(unite)) return { erreur: "Choisissez l'unité (L ou kg)." };
  if (!MATIERES_ACTIVES.includes(matiere)) return { erreur: "Choisissez la matière active." };
  if (teneur !== null && (Number.isNaN(teneur) || teneur < 0)) {
    return { erreur: "La teneur doit être un nombre positif (ex. 400 ou 4,5)." };
  }
  if (matiere === "azote" && teneur !== null && teneur > 100) {
    return { erreur: "Pour l'azote, la teneur est en unités pour 100 kg : 100 au maximum." };
  }

  return {
    donnees: {
      nom,
      unite,
      matiere_active: matiere,
      teneur_g_par_unite:
        teneur === null ? null : Math.round(saisieVersTeneur(matiere, teneur) * 1000) / 1000,
      remarques: texteOuNull(formData.get("remarques")),
    },
  };
}

function messageErreur(code: string | undefined, message: string): string {
  if (code === "23505") return "Un produit porte déjà ce nom.";
  return `Enregistrement impossible : ${message}`;
}

export async function creerProduit(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const lu = lireProduit(formData);
  if ("erreur" in lu) return { erreur: lu.erreur! };

  const supabase = await createClient();
  const { error } = await supabase.from("produits").insert(lu.donnees);
  if (error) return { erreur: messageErreur(error.code, error.message) };

  revalidatePath("/produits");
  redirect("/produits");
}

export async function modifierProduit(
  id: number,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const lu = lireProduit(formData);
  if ("erreur" in lu) return { erreur: lu.erreur! };

  const supabase = await createClient();
  const { error } = await supabase.from("produits").update(lu.donnees).eq("id", id);
  if (error) return { erreur: messageErreur(error.code, error.message) };

  revalidatePath("/produits");
  redirect("/produits");
}

// Archiver ne supprime rien : le produit n'est plus proposé mais reste dans l'historique.
export async function changerArchivageProduit(id: number, archive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("produits").update({ archive }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/produits");
  redirect("/produits");
}
