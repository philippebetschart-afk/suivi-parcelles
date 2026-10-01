import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BoutonArchivage from "@/components/BoutonArchivage";
import FormulaireProduit, { type ValeursProduit } from "../FormulaireProduit";
import { changerArchivageProduit, modifierProduit } from "../actions";

export default async function ModifierProduit(props: PageProps<"/produits/[id]">) {
  const { id } = await props.params;
  const idProduit = Number(id);
  if (!Number.isInteger(idProduit)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("produits")
    .select("nom, unite, matiere_active, teneur_g_par_unite, remarques, archive")
    .eq("id", idProduit)
    .maybeSingle();
  if (!data) notFound();

  const produit = data as ValeursProduit & { archive: boolean };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/produits" className="text-green-700 underline dark:text-green-400">
        ← Produits
      </Link>
      <h1 className="text-2xl font-semibold">Modifier {produit.nom}</h1>

      {produit.archive && (
        <p className="rounded-lg border border-amber-600 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Ce produit est archivé : il n&apos;est plus proposé dans les nouvelles interventions.
        </p>
      )}

      <FormulaireProduit
        action={modifierProduit.bind(null, idProduit)}
        valeurs={produit}
        libelleBouton="Enregistrer les modifications"
      />

      <BoutonArchivage
        action={changerArchivageProduit.bind(null, idProduit, !produit.archive)}
        libelle={produit.archive ? "Réactiver le produit" : "Archiver le produit"}
        question={
          produit.archive
            ? `Réactiver ${produit.nom} ? Il sera de nouveau proposé dans les interventions.`
            : `Archiver ${produit.nom} ? Il ne sera plus proposé, mais les interventions passées le conservent.`
        }
      />
    </main>
  );
}
