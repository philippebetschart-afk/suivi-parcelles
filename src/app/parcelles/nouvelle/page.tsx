import Link from "next/link";
import FormulaireParcelle from "../FormulaireParcelle";
import { creerParcelle } from "../actions";

export default function NouvelleParcelle() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/parcelles" className="text-green-700 underline dark:text-green-400">
        ← Parcelles
      </Link>
      <h1 className="text-2xl font-semibold">Nouvelle parcelle</h1>
      <FormulaireParcelle action={creerParcelle} libelleBouton="Ajouter la parcelle" />
    </main>
  );
}
