"use client";

export default function BoutonImprimer() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-green-700 px-4 py-3 text-lg font-semibold text-white"
    >
      Imprimer / PDF
    </button>
  );
}
