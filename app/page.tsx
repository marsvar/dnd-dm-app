"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Skull, Users, Swords, ScrollText, ChevronRight, Flame, Shield } from "lucide-react";
import { Button, Card, Dialog, DialogClose, DialogContent, DialogTitle, LinkButton, PageShell } from "./components/ui";
import { useAppStore } from "./lib/store/appStore";
import { cn } from "./components/ui";

// ── Stat tile — clickable, icon + number ─────────────────────────────────────
function StatTile({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-black/10 bg-surface-strong p-4 transition-all duration-150 hover:border-accent/30 hover:bg-surface"
    >
      <div className="flex items-center justify-between">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-muted">
          {label}
        </span>
        <Icon
          size={14}
          className="text-muted/40 transition-colors duration-150 group-hover:text-accent/70"
        />
      </div>
      <p className="font-display text-3xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </Link>
  );
}

// ── Command card — full-card link, icon + live stat ───────────────────────────
function CommandCard({
  icon: Icon,
  title,
  description,
  stat,
  statLabel,
  href,
  primary,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  stat?: number;
  statLabel?: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border p-6 transition-all duration-150",
        "hover:-translate-y-px hover:shadow-[var(--shadow-dialog)]",
        primary
          ? "border-accent/30 bg-accent/5 hover:border-accent/50 hover:bg-accent/8"
          : "border-black/10 bg-surface hover:border-accent/25"
      )}
    >
      {/* Icon badge */}
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150",
          primary
            ? "bg-accent/15 group-hover:bg-accent/20"
            : "bg-foreground/6 group-hover:bg-accent/10"
        )}
      >
        <Icon
          size={21}
          className={cn(
            "transition-colors duration-150",
            primary ? "text-accent" : "text-foreground/60 group-hover:text-accent"
          )}
        />
      </div>

      {/* Text */}
      <div className="flex-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
      </div>

      {/* Live stat */}
      {stat !== undefined && statLabel && (
        <p className="text-xs text-muted/70">
          <span className="font-semibold tabular-nums text-foreground">{stat}</span>{" "}
          {statLabel}
        </p>
      )}

      {/* Chevron */}
      <ChevronRight
        size={15}
        className="absolute right-5 top-5 text-muted/30 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-accent/60"
      />
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const { state, resetState } = useAppStore();
  const [isResetOpen, setIsResetOpen] = useState(false);

  const activeEncounter = useMemo(
    () => state.encounters.find((e) => e.status !== "completed") ?? null,
    [state.encounters]
  );

  const runningEncounter = useMemo(
    () => state.encounters.find((e) => e.isRunning) ?? null,
    [state.encounters]
  );

  const activeParticipants = activeEncounter?.participants.length ?? 0;

  return (
    <PageShell className="space-y-14">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        {/* Left: headline + CTAs */}
        <div className="space-y-7">
          <div className="space-y-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-accent">
              D&amp;D 5e · Dungeon Master Toolkit
            </p>
            <h1 className="font-display text-4xl leading-[1.15] text-foreground sm:text-5xl">
              Run encounters.<br />
              Track the party.<br />
              <span className="text-accent">Stay in the moment.</span>
            </h1>
          </div>
          <p className="max-w-lg text-base leading-relaxed text-muted sm:text-lg">
            Fast, local-first tools for every moment at the table — from rolling
            initiative to logging the final killing blow.
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/encounters">
              <Swords size={15} className="mr-2 inline-block" />
              Open encounters
            </LinkButton>
            <LinkButton href="/pcs" variant="outline">
              <Users size={15} className="mr-2 inline-block" />
              View party
            </LinkButton>
          </div>
        </div>

        {/* Right: Campaign Pulse */}
        <div className="space-y-3">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-muted">
            Campaign Pulse
          </p>
          <div className="grid grid-cols-2 gap-3">
            <StatTile icon={Swords} label="Encounters" value={state.encounters.length} href="/encounters" />
            <StatTile icon={Users} label="Party" value={state.pcs.length} href="/pcs" />
            <StatTile icon={Skull} label="Monsters" value={state.monsters.length} href="/bestiary" />
            <StatTile icon={ScrollText} label="Notes" value={state.notes.length} href="/notes" />
          </div>
        </div>
      </section>

      {/* ── Active encounter banner ───────────────────────────────────── */}
      {activeEncounter && (
        <section
          className="rounded-2xl p-5"
          style={{
            backgroundColor: "var(--combat-bg)",
            border: "1px solid var(--combat-border)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Live dot */}
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "var(--combat-surface-raised)" }}>
                <Flame
                  size={18}
                  style={{ color: runningEncounter ? "var(--combat-live-dot)" : "var(--combat-fg-muted)" }}
                />
                {runningEncounter && (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: "var(--combat-live-dot)" }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className="text-[0.6rem] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: "var(--combat-fg-muted)" }}
                >
                  {runningEncounter ? "Combat in progress" : "Encounter paused"}
                </p>
                <p
                  className="text-lg font-semibold truncate"
                  style={{ color: "var(--combat-fg)" }}
                >
                  {activeEncounter.name}
                </p>
                <p className="text-sm" style={{ color: "var(--combat-fg-muted)" }}>
                  Round {activeEncounter.round}
                  {activeParticipants > 0
                    ? ` · ${activeParticipants} combatant${activeParticipants !== 1 ? "s" : ""}`
                    : ""}
                </p>
              </div>
            </div>
            <Link
              href="/encounters/player"
              className="shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 hover:opacity-90"
              style={{
                backgroundColor: "var(--combat-active-border)",
                color: "var(--combat-bg)",
              }}
            >
              Resume
              <ChevronRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* ── Command Deck ─────────────────────────────────────────────── */}
      <section>
        <div className="mb-6 flex items-baseline gap-3">
          <h2 className="font-display text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
            Command Deck
          </h2>
          <span className="text-xs uppercase tracking-[0.3em] text-muted">
            Jump straight in
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <CommandCard
            icon={Swords}
            title="Encounter Tracker"
            description="Build initiatives, roll HP, track rounds, conditions, and combatants from prep to final blow."
            stat={state.encounters.length}
            statLabel={state.encounters.length === 1 ? "encounter" : "encounters"}
            href="/encounters"
            primary
          />
          <CommandCard
            icon={Users}
            title="Party Tracker"
            description="AC, HP, inspiration, passive perception, death saves — every stat across the whole table."
            stat={state.pcs.length}
            statLabel={state.pcs.length === 1 ? "character" : "characters"}
            href="/pcs"
          />
          <CommandCard
            icon={Skull}
            title="Bestiary"
            description="Search SRD creatures or build your own custom monsters and NPCs with stat blocks."
            stat={state.monsters.length}
            statLabel={state.monsters.length === 1 ? "creature" : "creatures"}
            href="/bestiary"
          />
          <CommandCard
            icon={ScrollText}
            title="Notes &amp; Log"
            description="Session notes, plot threads, and a turn-by-turn combat log of every memorable moment."
            stat={state.notes.length}
            statLabel={state.notes.length === 1 ? "note" : "notes"}
            href="/notes"
          />
        </div>
      </section>

      {/* ── Danger zone ──────────────────────────────────────────────── */}
      <section className="border-t border-black/10 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Reset all data</p>
            <p className="mt-0.5 text-xs text-muted">
              Wipes all monsters, PCs, encounters, notes, and log entries. Cannot be undone.
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0"
            style={{
              color: "var(--diff-hard)",
              borderColor: "var(--diff-hard)",
              opacity: 0.7,
            }}
            onClick={() => setIsResetOpen(true)}
          >
            Reset data
          </Button>
        </div>
      </section>

      {/* ── Reset dialog ─────────────────────────────────────────────── */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent maxWidth="sm">
          <DialogTitle>Reset all data?</DialogTitle>
          <p className="mt-2 text-sm text-muted">
            This will permanently delete all monsters, PCs, encounters, notes, and log entries.
            There is no undo.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                resetState();
                setIsResetOpen(false);
              }}
              style={{
                backgroundColor: "var(--diff-hard)",
                color: "#fff",
                borderColor: "transparent",
              }}
            >
              Yes, reset everything
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
