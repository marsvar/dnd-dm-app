"use client";

/**
 * DmLayoutGuard
 *
 * Sits inside the root layout and guards every route that is not
 * a player route, the role-selector, or the auth pages.
 *
 * - /login, /signup    → always allowed (public auth pages)
 * - /select-role       → always allowed
 * - /player/**         → always allowed
 * - everything else    → requires authenticated user AND activeRole === "dm"
 *
 * The middleware handles the server-side auth redirect; this guard adds
 * a client-side layer that also checks the Supabase session.
 */

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import { useRoleStore } from "../lib/store/roleStore";
import { createSupabaseClient } from "../lib/supabase/client";
import { Button } from "./ui";

const ALWAYS_ALLOWED = ["/select-role", "/login", "/signup"];
const PLAYER_PREFIX = "/player";

export function DmLayoutGuard({ children }: { children: ReactNode }) {
  const { activeRole, hydrated } = useRoleStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const isPublic =
    ALWAYS_ALLOWED.includes(pathname) || pathname.startsWith(PLAYER_PREFIX);

  // Subscribe to auth state changes (fires immediately with current session).
  useEffect(() => {
    const supabase = createSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Redirect when both auth and role state are resolved.
  useEffect(() => {
    if (!hydrated || isAuthenticated === null) return;
    if (isPublic) return;
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (activeRole !== "dm") {
      router.replace("/select-role");
    }
  }, [hydrated, isAuthenticated, activeRole, isPublic, router]);

  // Render nothing on protected routes while loading.
  if (!isPublic && (isAuthenticated === null || !hydrated)) return null;

  // Public routes always render.
  if (isPublic) return <>{children}</>;

  // DM route with wrong role — show access screen while redirect is in flight.
  if (!isAuthenticated || activeRole !== "dm") {
    return (
      <div className="flex min-h-[calc(100dvh-65px)] flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <Shield size={30} className="text-accent" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">DM Area</h2>
          <p className="text-sm text-muted">
            This section is restricted to the Dungeon Master.
          </p>
        </div>
        <Link href={isAuthenticated ? "/select-role" : "/login"}>
          <Button>{isAuthenticated ? "Choose your role" : "Sign in"}</Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
