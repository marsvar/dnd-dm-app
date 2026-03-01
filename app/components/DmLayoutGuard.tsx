"use client";

/**
 * DmLayoutGuard
 *
 * Sits inside the root layout and guards every route that is not
 * a player route or the role-selector.
 *
 * - /select-role      → always allowed
 * - /player/**        → always allowed
 * - everything else   → requires activeRole === "dm"
 *
 * When the role hasn't been chosen yet the guard redirects to /select-role.
 * While storage is hydrating it renders nothing to prevent a flash.
 */

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import { useRoleStore } from "../lib/store/roleStore";
import { Button } from "./ui";

const ALWAYS_ALLOWED = ["/select-role"];
const PLAYER_PREFIX = "/player";

export function DmLayoutGuard({ children }: { children: ReactNode }) {
  const { activeRole, hydrated } = useRoleStore();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic =
    ALWAYS_ALLOWED.includes(pathname) || pathname.startsWith(PLAYER_PREFIX);

  // Redirect unauthenticated visitors on DM routes to the role selector
  useEffect(() => {
    if (!hydrated) return;
    if (!isPublic && activeRole !== "dm") {
      router.replace("/select-role");
    }
  }, [hydrated, activeRole, isPublic, router]);

  // Prevent flash while reading storage
  if (!hydrated) return null;

  // Public routes always render
  if (isPublic) return <>{children}</>;

  // DM route – show an access screen while the redirect is in flight
  if (activeRole !== "dm") {
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
        <Link href="/select-role">
          <Button>Choose your role</Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
