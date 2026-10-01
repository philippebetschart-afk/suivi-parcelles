import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FormulaireParcelle, { type ValeursParcelle } from "../FormulaireParcelle";
import { changerArchivage, modifierParcelle } from "../actions";
import BoutonArchivage from "./BoutonArchivage";

export default async function ModifierParcelle(props: PageProps<"/parcelles/[id]">) {
  const { id } = await props.params;
  const idParcelle = Number(id);
  if (!Number.isInteger(idParcelle)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("parcelles")
    .select("nom, surface_ha, type_parcelle, cepage, annee_plantation, remarques, archivee")
    .eq("id", idParcelle)
    .maybeSingle();
  if (!data) notFound();

  const parcelle = data as ValeursParcelle & { archivee: boolean };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/parcelles" className="text-green-700 underline dark:text-green-400">
        ← Parcelles
      </Link>
      <h1 className="text-2xl font-semibold">Modifier {parcelle.nom}</h1>

      {parcelle.archivee && (
        <p className="rounded-lg border border-amber-600 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Cette parcelle est archivée : elle n&apos;apparaît plus dans la liste ni dans les
          nouvelles interventions.
        </p>
      )}

      <FormulaireParcelle
        action={modifierParcelle.bind(null, idParcelle)}
        valeurs={{ ...parcelle, surface_ha: Number(parcelle.surface_ha) }}
        libelleBouton="Enregistrer les modifications"
      />

      <BoutonArchivage
        action={changerArchivage.bind(null, idParcelle, !parcelle.archivee)}
        archivee={parcelle.archivee}
        nom={parcelle.nom}
      />
    </main>
  );
}
