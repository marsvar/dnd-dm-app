"use client";

/**
 * /select-role — entry screen.
 * Players choose DM or Player. The DM path is PIN-gated.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, User, Lock, Eye, EyeOff, ChevronRight } from "lucide-react";
import { useRoleStore } from "../lib/store/roleStore";
import { cn, Button, Input } from "../components/ui";
import * as RadixDialog from "@radix-ui/react-dialog";

// ---------------------------------------------------------------------------
// PIN Dialog
// ---------------------------------------------------------------------------

type PinMode = "enter" | "create";

function PinDialog({
  open,
  mode,
  onSuccess,
  onCancel,
  checkPin,
  setPin,
}: {
  open: boolean;
  mode: PinMode;
  onSuccess: () => void;
  onCancel: () => void;
  checkPin: (pin: string) => boolean;
  setPin: (pin: string) => void;
}) {
  const [pin, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset fields when dialog opens
  useEffect(() => {
    if (open) {
      setPinValue("");
      setConfirmPin("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "create") {
      if (pin.length < 4) {
        setError("PIN must be at least 4 characters.");
        return;
      }
      if (pin !== confirmPin) {
        setError("PINs do not match.");
        return;
      }
      setPin(pin);
      onSuccess();
    } else {
      if (!checkPin(pin)) {
        setError("Incorrect PIN. Try again.");
        setPinValue("");
        return;
      }
      onSuccess();
    }
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={(v) => !v && onCancel()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <RadixDialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-surface p-6 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
            <div className="mb-5 flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <Lock size={22} className="text-accent" />
              </div>
              <RadixDialog.Title className="text-xl font-semibold text-foreground">
                {mode === "create" ? "Create DM PIN" : "DM Access"}
              </RadixDialog.Title>
              <p className="text-sm text-muted">
                {mode === "create"
                  ? "Set a PIN to protect DM controls from players."
                  : "Enter your DM PIN to continue."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  autoFocus
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  placeholder="PIN"
                  value={pin}
                  onChange={(e) => setPinValue(e.target.value)}
                  autoComplete="off"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {mode === "create" && (
                <Input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  placeholder="Confirm PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  autoComplete="off"
                />
              )}

              {error && (
                <p className="text-center text-xs font-medium text-[#c0392b]">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {mode === "create" ? "Set PIN & Enter" : "Unlock"}
                </Button>
              </div>
            </form>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Role card
// ---------------------------------------------------------------------------

function RoleCard({
  title,
  description,
  icon: Icon,
  locked,
  onClick,
  accent,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  locked?: boolean;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full flex-col items-start gap-5 rounded-2xl border p-8 text-left transition-all duration-200",
        "hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        accent
          ? "border-accent/30 bg-gradient-to-br from-surface to-accent/5"
          : "border-black/10 bg-surface"
      )}
    >
      {locked && (
        <div className="absolute right-5 top-5 flex items-center gap-1 rounded-full border border-black/10 bg-surface-strong px-2.5 py-1 text-xs font-medium text-muted">
          <Lock size={11} />
          PIN required
        </div>
      )}

      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
          accent
            ? "bg-accent/15 text-accent group-hover:bg-accent group-hover:text-white"
            : "bg-surface-strong text-muted group-hover:bg-accent/10 group-hover:text-accent"
        )}
      >
        <Icon size={28} />
      </div>

      <div className="flex-1 space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>

      <div
        className={cn(
          "flex items-center gap-1 text-sm font-semibold transition-colors",
          accent ? "text-accent" : "text-muted group-hover:text-accent"
        )}
      >
        Continue <ChevronRight size={16} />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SelectRolePage() {
  const { activeRole, hydrated, hasDmPin, checkDmPin, setDmPin, activateDm, activatePlayer } =
    useRoleStore();
  const router = useRouter();
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (!hydrated) return;
    if (activeRole === "dm") router.replace("/");
    if (activeRole === "player") router.replace("/player");
  }, [hydrated, activeRole, router]);

  // Don't render until hydrated (avoids flash)
  if (!hydrated) return null;
  if (activeRole) return null;

  const handleDmClick = () => setPinDialogOpen(true);

  const handlePlayerClick = () => {
    activatePlayer();
    router.push("/player");
  };

  const handlePinSuccess = () => {
    setPinDialogOpen(false);
    if (!hasDmPin) {
      // setDmPin already calls activateDm internally
    } else {
      activateDm();
    }
    router.push("/");
  };

  return (
    <>
      <div className="flex min-h-[calc(100dvh-65px)] flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl space-y-10">
          {/* Header */}
          <div className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-muted">
              D&amp;D 5e (2014) Assistant
            </p>
            <h1 className="font-display text-4xl font-semibold text-foreground sm:text-5xl">
              Vault of Encounters
            </h1>
            <p className="text-base text-muted">Who&apos;s at the table?</p>
          </div>

          {/* Role cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <RoleCard
              title="Dungeon Master"
              description="Full access — encounters, bestiary, party management, notes, and campaign tools."
              icon={Shield}
              locked
              accent
              onClick={handleDmClick}
            />
            <RoleCard
              title="Player"
              description="Character sheet, party overview, and live encounter tracker."
              icon={User}
              onClick={handlePlayerClick}
            />
          </div>
        </div>
      </div>

      <PinDialog
        open={pinDialogOpen}
        mode={hasDmPin ? "enter" : "create"}
        onSuccess={handlePinSuccess}
        onCancel={() => setPinDialogOpen(false)}
        checkPin={checkDmPin}
        setPin={setDmPin}
      />
    </>
  );
}
