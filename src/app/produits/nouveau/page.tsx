import Link from "next/link";
import FormulaireProduit from "../FormulaireProduit";
import { creerProduit } from "../actions";

export default function NouveauProduit() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/produits" className="text-green-700 underline dark:text-green-400">
        ← Produits
      </Link>
      <h1 className="text-2xl font-semibold">Nouveau produit</h1>
      <FormulaireProduit action={creerProduit} libelleBouton="Ajouter le produit" />
    </main>
  );
}
