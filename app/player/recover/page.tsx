"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, SectionTitle } from "../../components/ui";

type RecoveryAttempt = {
  id: string;
  pcId: string;
  pcName: string;
  campaignId: string;
  campaignName: string;
  acceptedAt: string | null;
  updatedAt: string;
};

export default function PlayerRecoverPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<RecoveryAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/invites/recover");
        if (!res.ok) {
          throw new Error("Unable to load recovery attempts");
        }
        const data = (await res.json()) as { attempts: RecoveryAttempt[] };
        setAttempts(data.attempts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load recovery attempts");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleRecover = async (attemptId: string) => {
    setSubmitting(attemptId);
    setError(null);
    try {
      const res = await fetch("/api/invites/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Recovery failed");
      }
      router.push("/player");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recovery failed");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pb-16 pt-12">
      <SectionTitle
        title="Finish your assignment"
        subtitle="Pick the character that needs to be assigned to you."
      />

      {loading ? <Card className="text-sm text-muted">Loading recovery options…</Card> : null}
      {error ? <Card className="border-red-500/40 bg-red-500/5 text-sm text-red-700">{error}</Card> : null}

      {!loading && attempts.length === 0 ? (
        <Card className="text-sm text-muted">No pending assignments found.</Card>
      ) : null}

      <div className="space-y-3">
        {attempts.map((attempt) => (
          <Card key={attempt.id} className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-foreground">{attempt.pcName}</p>
              <p className="text-sm text-muted">{attempt.campaignName || "Unknown campaign"}</p>
            </div>
            <Button
              type="button"
              onClick={() => handleRecover(attempt.id)}
              disabled={submitting === attempt.id}
            >
              {submitting === attempt.id ? "Assigning…" : "Assign to me"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
