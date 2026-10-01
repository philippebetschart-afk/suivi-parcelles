"use client";

import { useActionState } from "react";
import { seConnecter } from "./actions";

export default function Connexion() {
  const [etat, action, enCours] = useActionState(seConnecter, null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Suivi parcellaire</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Domaine de Viaud</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span>E-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-lg border border-zinc-400 px-3 py-3 text-lg"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span>Mot de passe</span>
          <input
            name="motDePasse"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-lg border border-zinc-400 px-3 py-3 text-lg"
          />
        </label>

        {etat?.erreur && (
          <p className="rounded-lg border border-red-600 bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200">
            {etat.erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={enCours}
          className="rounded-lg bg-green-700 px-4 py-4 text-lg font-semibold text-white disabled:opacity-60"
        >
          {enCours ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
