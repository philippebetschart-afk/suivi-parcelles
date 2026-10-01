"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function seConnecter(
  _etat: { erreur: string } | null,
  formData: FormData,
): Promise<{ erreur: string } | null> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("motDePasse") ?? ""),
  });

  if (error) {
    return { erreur: "E-mail ou mot de passe incorrect." };
  }
  redirect("/");
}

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
