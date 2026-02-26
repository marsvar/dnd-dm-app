"use client";

/**
 * usePlayerSession — thin client-side hook that tracks which PC and campaign
 * the current player has selected. Intentionally isolated from AppState so
 * Phase 2 can replace this with a NextAuth `useSession()` call in one place.
 *
 * Storage key: `dnd_player_session_v2` (bumped from v1 to reset stale shape)
 */

import { useCallback, useEffect, useState } from "react";

const SESSION_KEY = "dnd_player_session_v2";

type PlayerSession = {
  selectedPcId: string | null;
  campaignId: string | null;
};

const DEFAULT_SESSION: PlayerSession = { selectedPcId: null, campaignId: null };

function readSession(): PlayerSession {
  if (typeof window === "undefined") return DEFAULT_SESSION;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return DEFAULT_SESSION;
    return JSON.parse(raw) as PlayerSession;
  } catch {
    return DEFAULT_SESSION;
  }
}

function writeSession(session: PlayerSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function usePlayerSession() {
  const [session, setSession] = useState<PlayerSession>(DEFAULT_SESSION);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate on mount (avoids SSR mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(readSession());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  const selectPc = useCallback((id: string) => {
    setSession((prev) => {
      const next = { ...prev, selectedPcId: id };
      writeSession(next);
      return next;
    });
  }, []);

  const setCampaignId = useCallback((id: string | null) => {
    setSession((prev) => {
      const next = { ...prev, campaignId: id };
      writeSession(next);
      return next;
    });
  }, []);

  const clearSession = useCallback(() => {
    writeSession(DEFAULT_SESSION);
    setSession(DEFAULT_SESSION);
  }, []);

  return {
    selectedPcId: session.selectedPcId,
    campaignId: session.campaignId,
    hydrated,
    selectPc,
    setCampaignId,
    clearSession,
  };
}
