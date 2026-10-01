import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client Supabase utilisé côté serveur (pages, actions).
// La session de l'utilisateur est lue dans les cookies du navigateur.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis une page : l'écriture est impossible ici,
            // le proxy se charge de rafraîchir la session.
          }
        },
      },
    },
  );
}
