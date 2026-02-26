"use client";

/**
 * RoleStore – manages who is sitting at the screen right now.
 *
 * activeRole : null (not chosen) | "dm" | "player"
 *   › stored in sessionStorage so it resets when the tab/browser is closed,
 *     preventing players from accidentally reading DM info between sessions.
 *
 * dmPin : string | null
 *   › stored in localStorage so the DM doesn't have to re-set it every session.
 *   › null means no PIN has been configured yet (first-run).
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
  /** true if a DM PIN has been configured */
  hasDmPin: boolean;
  /** Verify the supplied code against the stored PIN. */
  checkDmPin: (pin: string) => boolean;
  /** Persist a new DM PIN and activate DM role immediately. */
  setDmPin: (pin: string) => void;
  /** Remove the stored DM PIN (reset). */
  clearDmPin: () => void;
  /** Activate DM role (caller is responsible for verifying PIN first). */
  activateDm: () => void;
  /** Activate Player role. */
  activatePlayer: () => void;
  /** Clear the active role (returns to role-selector). */
  clearRole: () => void;
};

const ROLE_SESSION_KEY = "dnd_active_role";
const PIN_STORAGE_KEY = "dnd_dm_pin";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const RoleStoreContext = createContext<RoleStore | null>(null);

export function RoleStoreProvider({ children }: { children: ReactNode }) {
  const [activeRole, setActiveRoleState] = useState<ActiveRole>(null);
  const [dmPin, setDmPinState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from storage once on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedRole = sessionStorage.getItem(ROLE_SESSION_KEY) as ActiveRole;
    const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
    if (storedRole === "dm" || storedRole === "player") {
      setActiveRoleState(storedRole);
    }
    if (storedPin) setDmPinState(storedPin);
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

  const checkDmPin = useCallback(
    (pin: string) => pin === dmPin,
    [dmPin]
  );

  const setDmPin = useCallback(
    (pin: string) => {
      localStorage.setItem(PIN_STORAGE_KEY, pin);
      setDmPinState(pin);
      persistRole("dm");
    },
    [persistRole]
  );

  const clearDmPin = useCallback(() => {
    localStorage.removeItem(PIN_STORAGE_KEY);
    setDmPinState(null);
    persistRole(null);
  }, [persistRole]);

  const activateDm = useCallback(() => persistRole("dm"), [persistRole]);
  const activatePlayer = useCallback(() => persistRole("player"), [persistRole]);
  const clearRole = useCallback(() => persistRole(null), [persistRole]);

  return (
    <RoleStoreContext.Provider
      value={{
        activeRole,
        hydrated,
        hasDmPin: dmPin !== null,
        checkDmPin,
        setDmPin,
        clearDmPin,
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
