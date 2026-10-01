import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { seDeconnecter } from "./connexion/actions";

// Page d'accueil provisoire : accessible seulement une fois connecté.
export default async function Accueil() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Suivi parcellaire</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Domaine de Viaud</p>
      </div>

      <div className="rounded-lg border border-green-600 bg-green-50 p-4 text-lg text-green-800 dark:bg-green-950 dark:text-green-200">
        ✅ Connecté en tant que <strong>{email}</strong>
      </div>

      <Link
        href="/parcelles"
        className="rounded-lg bg-green-700 px-4 py-4 text-center text-lg font-semibold text-white"
      >
        Parcelles
      </Link>

      <Link
        href="/produits"
        className="rounded-lg bg-green-700 px-4 py-4 text-center text-lg font-semibold text-white"
      >
        Produits
      </Link>

      <form action={seDeconnecter}>
        <button
          type="submit"
          className="w-full rounded-lg border border-zinc-400 px-4 py-4 text-lg"
        >
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
