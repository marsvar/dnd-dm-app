"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import InviteChangedBanner from "./InviteChangedBanner";
import WizardLayout from "./WizardLayout";
import { normalizeWizardStep, shouldAllowChoose } from "./wizardState";
import { Button, Card, cn } from "../../components/ui";

type WelcomeClientProps = {
  csrf: string;
  nonce: string;
  nonceSig: string;
};

type CampaignSummary = {
  id: string;
  name: string;
  description: string | null;
} | null;

type ExchangeResponse = {
  publicId: string;
  contextId: string;
  summary: CampaignSummary;
};

const STORAGE_PREFIX = "invite-choice";

export default function WelcomeClient({ csrf, nonce, nonceSig }: WelcomeClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = normalizeWizardStep(searchParams.get("step"));
  const choiceParam = searchParams.get("choice");
  const token = searchParams.get("token");
  const contextFallback = searchParams.get("context");
  const [summary, setSummary] = useState<CampaignSummary>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteChanged, setInviteChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [choice, setChoice] = useState<string | null>(choiceParam);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const storageKey = publicId ? `${STORAGE_PREFIX}:${publicId}` : null;

  const resolvedChoice = useMemo(() => {
    if (choiceParam) return choiceParam;
    if (storageKey) {
      return sessionStorage.getItem(storageKey);
    }
    return null;
  }, [choiceParam, storageKey]);

  useEffect(() => {
    setChoice(resolvedChoice);
  }, [resolvedChoice]);

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    const exchange = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/invite/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, csrf, nonce, nonceSig }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? "Invite exchange failed");
        }

        const data = (await res.json()) as ExchangeResponse;
        if (ignore) return;
        setSummary(data.summary ?? null);
        setPublicId(data.publicId);
        setContextId(data.contextId);

        if (data.publicId) {
          const previous = sessionStorage.getItem(`${STORAGE_PREFIX}:current`);
          if (previous && previous !== data.publicId) {
            setInviteChanged(true);
            sessionStorage.removeItem(`${STORAGE_PREFIX}:${previous}`);
          }
          sessionStorage.setItem(`${STORAGE_PREFIX}:current`, data.publicId);
        }

        if (!contextFallback) {
          const next = new URL(window.location.href);
          next.searchParams.delete("token");
          window.history.replaceState({}, "", next.toString());
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Invite exchange failed");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    exchange();
    return () => {
      ignore = true;
    };
  }, [token, csrf, nonce, nonceSig, contextFallback]);

  useEffect(() => {
    if (!contextFallback && !contextId) return;
    fetch("/api/invites/heartbeat", { method: "POST" }).catch(() => null);
  }, [contextId, contextFallback]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!storageKey || !choice) return;
    sessionStorage.setItem(storageKey, choice);
  }, [storageKey, choice]);

  const handleChoice = (value: string) => {
    setChoice(value);
    const next = new URL(window.location.href);
    next.searchParams.set("choice", value);
    window.history.replaceState({}, "", next.toString());
  };

  const handleContinue = () => {
    if (!choice) return;
    const next = new URL(window.location.href);
    next.searchParams.set("step", "choose");
    next.searchParams.set("choice", choice);
    router.replace(next.pathname + next.search);
  };

  const handleBack = () => {
    const next = new URL(window.location.href);
    next.searchParams.set("step", "welcome");
    router.replace(next.pathname + next.search);
  };

  const handleRestart = () => {
    sessionStorage.removeItem(`${STORAGE_PREFIX}:current`);
    router.replace("/player/welcome");
  };

  const showChoose = shouldAllowChoose(step, Boolean(summary));
  const showWelcome = !showChoose;
  const canChoose = Boolean(summary) && !loading && !error;

  return (
    <WizardLayout
      step={showChoose ? 2 : 1}
      title={showChoose ? "Choose your path" : "You’ve been invited"}
      subtitle={
        showChoose
          ? "Create a new character or import one from D&D Beyond."
          : "Let’s get you ready to join the campaign."
      }
      showBack={showChoose}
      onBack={handleBack}
    >
      <div className="space-y-6">
        {inviteChanged ? <InviteChangedBanner onRestart={handleRestart} /> : null}

        {error ? (
          <Card className="border-red-500/40 bg-red-500/5" role="alert">
            <div className="space-y-2 text-sm text-red-700">
              <p className="font-semibold">Invite problem</p>
              <p>{error}</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-accent underline decoration-dashed underline-offset-4"
                >
                  Sign in
                </Link>
                <Link
                  href="/player/welcome"
                  className="text-sm font-semibold text-accent underline decoration-dashed underline-offset-4"
                >
                  Request new invite
                </Link>
              </div>
            </div>
          </Card>
        ) : null}

        {showWelcome ? (
          <Card className="space-y-3" aria-live="polite">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-semibold text-foreground"
            >
              Campaign details
            </h2>
            {loading ? (
              <p className="text-sm text-muted">Loading invite details…</p>
            ) : summary ? (
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">{summary.name}</p>
                {summary.description ? (
                  <p className="text-sm text-muted">{summary.description}</p>
                ) : (
                  <p className="text-sm text-muted">Your DM hasn’t added a description yet.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm text-muted">
                <p>We’ll load the campaign details once you sign in.</p>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-accent underline decoration-dashed underline-offset-4"
                >
                  Sign in to continue
                </Link>
              </div>
            )}
          </Card>
        ) : null}

        {showChoose && !canChoose ? (
          <Card className="border-red-500/40 bg-red-500/5" role="alert">
            <div className="space-y-2 text-sm text-red-700">
              <p className="font-semibold">Invite required</p>
              <p>Please reopen your invite link to continue.</p>
              <Button type="button" variant="outline" onClick={handleBack}>
                Return to welcome
              </Button>
            </div>
          </Card>
        ) : null}

        {showChoose && canChoose ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2" role="radiogroup">
              {[
                {
                  value: "create",
                  title: "Create a new character",
                  description: "Build a fresh PC for this campaign.",
                },
                {
                  value: "import",
                  title: "Import from D&D Beyond",
                  description: "Bring in a character you already play.",
                },
              ].map((option) => {
                const selected = choice === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleChoice(option.value)}
                    className={cn(
                      "flex flex-col gap-3 rounded-2xl border p-4 text-left transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                      selected
                        ? "border-accent bg-accent/10 shadow-[var(--shadow-dialog)]"
                        : "border-black/10 bg-surface hover:shadow-[var(--shadow-card)]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-foreground">
                        {option.title}
                      </span>
                      <span
                        className={cn(
                          "h-4 w-4 rounded-full border",
                          selected ? "border-accent bg-accent" : "border-black/20"
                        )}
                      />
                    </div>
                    <p className="text-sm text-muted">{option.description}</p>
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={!choice}
              onClick={() => router.push(choice === "import" ? "/player/import" : "/player/onboarding")}
            >
              Continue
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" onClick={handleContinue} disabled={loading}>
              Continue
            </Button>
            <Link
              href="/player"
              className="text-xs font-semibold text-muted underline decoration-dashed underline-offset-4"
            >
              Not you? Switch account
            </Link>
          </div>
        )}
      </div>
    </WizardLayout>
  );
}
