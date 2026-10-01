"use client";

// Bouton d'archivage (ou de réactivation) avec demande de confirmation.
export default function BoutonArchivage({
  action,
  question,
  libelle,
}: {
  action: () => Promise<void>;
  question: string;
  libelle: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(question)) e.preventDefault();
      }}
      className="mt-6 border-t border-zinc-300 pt-6 dark:border-zinc-700"
    >
      <button
        type="submit"
        className="w-full rounded-lg border border-zinc-400 px-4 py-4 text-lg"
      >
        {libelle}
      </button>
    </form>
  );
}
