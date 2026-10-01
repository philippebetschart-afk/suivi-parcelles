"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { lireNombre, texteOuNull, type EtatFormulaire } from "@/lib/formulaire";
import {
  LIBELLES_INTERVENTION,
  TYPES_INTERVENTION,
  lotObligatoire,
  type TypeIntervention,
} from "@/lib/interventions";

// Vérifie le formulaire et renvoie soit les paramètres à enregistrer, soit un message d'erreur.
function lireIntervention(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const type = String(formData.get("type") ?? "") as TypeIntervention;
  const parcelles = formData.getAll("parcelle").map(Number).filter(Number.isInteger);

  // Les lignes produits arrivent dans l'ordre : produit, dose et lot de même rang.
  const idsProduits = formData.getAll("produit_id").map(String);
  const doses = formData.getAll("dose");
  const lots = formData.getAll("lot").map((l) => String(l).trim());

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { erreur: "Indiquez la date." };
  if (!TYPES_INTERVENTION.includes(type)) return { erreur: "Choisissez le type d'intervention." };
  if (parcelles.length === 0) return { erreur: "Cochez au moins une parcelle." };

  const produits = [];
  for (let i = 0; i < idsProduits.length; i++) {
    const rang = idsProduits.length > 1 ? ` (produit n° ${i + 1})` : "";
    const dose = lireNombre(doses[i]);
    if (idsProduits[i] === "") {
      // Ligne laissée vide : on l'ignore si rien n'y a été saisi.
      if (dose === null && lots[i] === "") continue;
      return { erreur: `Choisissez le produit${rang}.` };
    }
    if (dose === null || Number.isNaN(dose) || dose <= 0) {
      return { erreur: `Indiquez la dose par hectare${rang}, par exemple 2,5.` };
    }
    if (lotObligatoire(type) && lots[i] === "") {
      return { erreur: `Indiquez le numéro de lot${rang}.` };
    }
    produits.push({ produit_id: Number(idsProduits[i]), dose_par_ha: dose, numero_lot: lots[i] });
  }

  if (type === "traitement" && produits.length === 0) {
    return { erreur: `Un ${LIBELLES_INTERVENTION.traitement.toLowerCase()} doit comporter au moins un produit.` };
  }

  return {
    params: {
      p_date: date,
      p_type: type,
      p_cible: texteOuNull(formData.get("cible")),
      p_remarques: texteOuNull(formData.get("remarques")),
      p_parcelles: parcelles,
      p_produits: produits,
    },
  };
}

export async function creerIntervention(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const lu = lireIntervention(formData);
  if ("erreur" in lu) return { erreur: lu.erreur! };

  const supabase = await createClient();
  const { error } = await supabase.rpc("creer_intervention", lu.params);
  if (error) return { erreur: `Enregistrement impossible : ${error.message}` };

  revalidatePath("/interventions");
  redirect("/interventions");
}

export async function modifierIntervention(
  id: number,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const lu = lireIntervention(formData);
  if ("erreur" in lu) return { erreur: lu.erreur! };

  const supabase = await createClient();
  const { error } = await supabase.rpc("modifier_intervention", { p_id: id, ...lu.params });
  if (error) return { erreur: `Enregistrement impossible : ${error.message}` };

  revalidatePath("/interventions");
  redirect("/interventions");
}
