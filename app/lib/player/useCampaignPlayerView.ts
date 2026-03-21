"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseClient } from "../supabase/client";
import type { PlayerViewSnapshot } from "../engine/playerViewProjection";
import { buildCueState, diffPlayerView, type CueState } from "./playerCue";

export type PlayerViewStatus = "loading" | "live" | "stale" | "paused";

const CUE_DURATION_MS = 1500;
const STALE_THRESHOLD_MS = 30000;
const STALE_CHECK_INTERVAL_MS = 5000;

const EMPTY_CUES: CueState = { participantIds: [], partyPcIds: [], expiresAt: null };

export function useCampaignPlayerView(campaignId: string | null) {
  const [payload, setPayload] = useState<PlayerViewSnapshot | null>(null);
  const [status, setStatus] = useState<PlayerViewStatus>(campaignId ? "loading" : "paused");
  const [cues, setCues] = useState<CueState>(EMPTY_CUES);

  const payloadRef = useRef<PlayerViewSnapshot | null>(null);
  const updatedAtRef = useRef<number | null>(null);
  const cuesRef = useRef<CueState>(EMPTY_CUES);
  const statusRef = useRef<PlayerViewStatus>(status);
  const cueTimeoutRef = useRef<number | null>(null);
  const refetchRef = useRef<() => void>(() => {});

  const supabase = useMemo(() => createSupabaseClient(), []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const clearCueTimeout = useCallback(() => {
    if (cueTimeoutRef.current !== null) {
      window.clearTimeout(cueTimeoutRef.current);
      cueTimeoutRef.current = null;
    }
  }, []);

  const clearCues = useCallback(() => {
    cuesRef.current = EMPTY_CUES;
    setCues(EMPTY_CUES);
    clearCueTimeout();
  }, [clearCueTimeout]);

  const scheduleCueClear = useCallback(
    (expiresAt: number | null) => {
      clearCueTimeout();
      if (!expiresAt) return;
      const delay = Math.max(0, expiresAt - Date.now());
      cueTimeoutRef.current = window.setTimeout(() => {
        if (cuesRef.current.expiresAt && Date.now() >= cuesRef.current.expiresAt) {
          clearCues();
        }
      }, delay + Math.min(10, CUE_DURATION_MS));
    },
    [clearCueTimeout, clearCues]
  );

  const applyPayload = useCallback(
    (nextPayload: PlayerViewSnapshot | null, updatedAt: string | null | undefined) => {
      updatedAtRef.current = updatedAt ? Date.parse(updatedAt) : null;

      if (nextPayload && payloadRef.current) {
        const diff = diffPlayerView(payloadRef.current, nextPayload);
        const nextCues = buildCueState(diff, Date.now());
        cuesRef.current = nextCues;
        setCues(nextCues);
        scheduleCueClear(nextCues.expiresAt);
      } else {
        clearCues();
      }

      payloadRef.current = nextPayload;
      setPayload(nextPayload);

      if (!nextPayload) {
        setStatus("paused");
        return;
      }

      const updatedAtMs = updatedAtRef.current;
      const isStale = updatedAtMs ? Date.now() - updatedAtMs > STALE_THRESHOLD_MS : false;
      setStatus(isStale ? "stale" : "live");
    },
    [clearCues, scheduleCueClear]
  );

  const refetch = useCallback(async () => {
    if (!campaignId) return;
    const { data, error } = await supabase
      .from("campaign_player_view")
      .select("payload, updated_at")
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (error) {
      setStatus("paused");
      return;
    }

    const nextPayload = (data?.payload ?? null) as PlayerViewSnapshot | null;
    applyPayload(nextPayload, data?.updated_at ?? null);
  }, [campaignId, supabase, applyPayload]);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(() => {
    if (!campaignId) {
      setStatus("paused");
      setPayload(null);
      payloadRef.current = null;
      updatedAtRef.current = null;
      clearCues();
      return;
    }

    setPayload(null);
    payloadRef.current = null;
    updatedAtRef.current = null;
    clearCues();
    setStatus("loading");

    const channel = supabase
      .channel(`campaign-player-view-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_player_view",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          refetchRef.current();
        }
      )
      .subscribe((event) => {
        if (event === "SUBSCRIBED") {
          refetchRef.current();
        }
        if (event === "CLOSED" || event === "CHANNEL_ERROR") {
          setStatus("paused");
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [campaignId, supabase, clearCues]);

  useEffect(() => {
    if (!campaignId) return;
    const intervalId = window.setInterval(() => {
      if (statusRef.current === "paused") return;
      const updatedAtMs = updatedAtRef.current;
      if (!updatedAtMs) return;
      const isStale = Date.now() - updatedAtMs > STALE_THRESHOLD_MS;
      const nextStatus: PlayerViewStatus = isStale ? "stale" : "live";
      if (statusRef.current !== nextStatus) {
        setStatus(nextStatus);
      }
    }, STALE_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [campaignId]);

  useEffect(() => {
    return () => {
      clearCueTimeout();
    };
  }, [clearCueTimeout]);

  return { payload, status, cues };
}
