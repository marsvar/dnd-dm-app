"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import { createSupabaseClient } from "../lib/supabase/client";
import { Button, Input } from "../components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError("Invalid email or password. Please try again.");
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
          <p className="text-sm text-muted">Sign in to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
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
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-accent hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
