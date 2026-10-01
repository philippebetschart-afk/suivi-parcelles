"use client";

// Bouton d'archivage avec demande de confirmation.
export default function BoutonArchivage({
  action,
  archivee,
  nom,
}: {
  action: () => Promise<void>;
  archivee: boolean;
  nom: string;
}) {
  const question = archivee
    ? `Réactiver ${nom} ? Elle réapparaîtra dans la liste des parcelles.`
    : `Archiver ${nom} ? Elle disparaîtra de la liste, mais son historique est conservé.`;

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
        {archivee ? "Réactiver la parcelle" : "Archiver la parcelle"}
      </button>
    </form>
  );
}
