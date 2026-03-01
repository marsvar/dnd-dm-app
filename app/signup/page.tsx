"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import { createSupabaseClient } from "../lib/supabase/client";
import { Button, Input } from "../components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() || email },
        },
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      // If Supabase returns a user but no session, email confirmation is required.
      if (data.user && !data.session) {
        setNeedsConfirmation(true);
        return;
      }
      router.push("/select-role");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
            <Shield size={28} className="text-accent" />
          </div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted">
            D&amp;D 5e Assistant
          </p>
          <h1
            className="text-3xl font-semibold text-foreground"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Vault of Encounters
          </h1>
          <p className="text-sm text-muted">Create your account</p>
        </div>

        {/* Email confirmation notice */}
        {needsConfirmation && (
          <div className="rounded-xl border border-black/10 bg-surface-strong px-4 py-4 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">Check your inbox</p>
            <p className="text-xs text-muted">
              We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
              Click it to activate your account, then{" "}
              <Link href="/login" className="font-semibold text-accent hover:underline">sign in</Link>.
            </p>
          </div>
        )}

        {/* Form */}
        {!needsConfirmation && <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Display name"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
            <Input
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password (min. 6 characters)"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-center text-xs font-medium text-[color:var(--accent)]">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>}

        {/* Footer */}
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-accent hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
