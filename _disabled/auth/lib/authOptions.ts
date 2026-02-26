import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client (service role key).
 * Only used inside NextAuth callbacks — never sent to the browser.
 */
function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const supabase = createServerSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email:    credentials.email,
          password: credentials.password,
        });

        if (error || !data.user) return null;

        return {
          id:    data.user.id,
          email: data.user.email ?? credentials.email,
          name:  data.user.user_metadata?.name ?? credentials.email,
        };
      },
    }),
  ],
  callbacks: {
    // Persist the Supabase user ID into the JWT
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    // Expose the ID on the session object so client code can read it
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as typeof session.user & { id: string }).id = token.sub;
      }
      return session;
    },
  },
};
