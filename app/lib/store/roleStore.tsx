"use client";

/**
 * RoleStore – manages who is sitting at the screen right now.
 *
 * activeRole : null (not chosen) | "dm" | "player"
 *   › stored in sessionStorage so it resets when the tab/browser is closed,
 *     preventing players from accidentally reading DM info between sessions.
 *
 * Authentication is handled by Supabase Auth; the DM PIN system has been
 * replaced by login. This store only tracks the session-level role choice.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActiveRole = "dm" | "player" | null;

type RoleStore = {
  activeRole: ActiveRole;
  /** true once the store has read from storage (prevents flash) */
  hydrated: boolean;
  /** Activate DM role. User must be authenticated (enforced by middleware). */
  activateDm: () => void;
  /** Activate Player role. */
  activatePlayer: () => void;
  /** Clear the active role (returns to role-selector). */
  clearRole: () => void;
};

const ROLE_SESSION_KEY = "dnd_active_role";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const RoleStoreContext = createContext<RoleStore | null>(null);

export function RoleStoreProvider({ children }: { children: ReactNode }) {
  const [activeRole, setActiveRoleState] = useState<ActiveRole>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from sessionStorage once on client mount.
  // This is an intentional one-time hydration read: localStorage → React state.
  // The eslint-disable below suppresses the false-positive for this pattern.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedRole = sessionStorage.getItem(ROLE_SESSION_KEY) as ActiveRole;
    if (storedRole === "dm" || storedRole === "player") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveRoleState(storedRole);
    }
    setHydrated(true);
  }, []);

  const persistRole = useCallback((role: ActiveRole) => {
    setActiveRoleState(role);
    if (role) {
      sessionStorage.setItem(ROLE_SESSION_KEY, role);
    } else {
      sessionStorage.removeItem(ROLE_SESSION_KEY);
    }
  }, []);

  const activateDm = useCallback(() => persistRole("dm"), [persistRole]);
  const activatePlayer = useCallback(() => persistRole("player"), [persistRole]);
  const clearRole = useCallback(() => persistRole(null), [persistRole]);

  return (
    <RoleStoreContext.Provider
      value={{
        activeRole,
        hydrated,
        activateDm,
        activatePlayer,
        clearRole,
      }}
    >
      {children}
    </RoleStoreContext.Provider>
  );
}

export function useRoleStore(): RoleStore {
  const ctx = useContext(RoleStoreContext);
  if (!ctx) throw new Error("useRoleStore must be used inside <RoleStoreProvider>");
  return ctx;
}
