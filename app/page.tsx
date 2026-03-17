"use client";

import { useMemo, useState } from "react";
import { Button, Card, Dialog, DialogClose, DialogContent, DialogTitle, LinkButton, PageShell, Pill, SectionTitle } from "./components/ui";
import { useAppStore } from "./lib/store/appStore";

export default function Home() {
  const { state, resetState } = useAppStore();
  const [isResetOpen, setIsResetOpen] = useState(false);

  const activeEncounter = useMemo(
    () => state.encounters.find((e) => e.status !== "completed") ?? null,
    [state.encounters]
  );

  return (
    <PageShell className="space-y-12">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.4em] text-muted">
            D&D 5e (2014) Assistant
          </p>
          <h1 className="text-4xl leading-tight text-foreground sm:text-5xl">
            Run encounters, track the party, and log every twist of your campaign.
          </h1>
          <p className="max-w-xl text-base text-muted sm:text-lg">
            Local-first toolkit with a fast bestiary, party overview, and encounter
            controls. Everything stays in your browser.
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/encounters">Start an encounter</LinkButton>
            <LinkButton href="/bestiary" variant="outline">
              Browse bestiary
            </LinkButton>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill label="LocalStorage persistence" />
            <Pill label="SRD/CC starter data" tone="accent" />
            <Pill label="No logins" />
          </div>
        </div>
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg">Campaign Pulse</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-black/10 bg-surface-strong p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Monsters</p>
              <p className="font-mono text-3xl font-semibold text-foreground">{state.monsters.length}</p>
            </div>
            <div className="rounded-xl border border-black/10 bg-surface-strong p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Party</p>
              <p className="font-mono text-3xl font-semibold text-foreground">{state.pcs.length}</p>
            </div>
            <div className="rounded-xl border border-black/10 bg-surface-strong p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Encounters</p>
              <p className="font-mono text-3xl font-semibold text-foreground">{state.encounters.length}</p>
            </div>
            <div className="rounded-xl border border-black/10 bg-surface-strong p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Notes</p>
              <p className="font-mono text-3xl font-semibold text-foreground">{state.notes.length}</p>
            </div>
          </div>
          <p className="text-sm text-muted">
            Add encounters and notes from the pages above. Everything here syncs
            automatically.
          </p>
        </Card>
      </section>

      <section>
        <SectionTitle
          title="Command Deck"
          subtitle="Jump to the tools you use at the table."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {activeEncounter && (
            <div
              className="md:col-span-2 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-[var(--shadow-sm)]"
              style={{
                backgroundColor: "var(--combat-active-bg)",
                color: "var(--combat-active-fg)",
              }}
            >
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] opacity-70 mb-1">
                  {activeEncounter.isRunning ? "Combat in progress" : "Encounter paused"}
                </p>
                <p className="text-lg font-semibold truncate">{activeEncounter.name}</p>
                <p className="text-sm opacity-75 mt-0.5">
                  Round {activeEncounter.round}
                  {activeEncounter.participants.length > 0
                    ? ` · ${activeEncounter.participants.length} combatants`
                    : ""}
                </p>
              </div>
              <LinkButton
                href="/encounters/player"
                variant="outline"
                className="shrink-0 border-current text-current"
              >
                Resume →
              </LinkButton>
            </div>
          )}
          {/* Keep all existing Command Deck <Card> children below — do not remove them */}
          <Card className="space-y-3">
            <h3 className="text-lg">Encounter Tracker</h3>
            <p className="text-sm text-muted">
              Build initiatives, track rounds, and keep HP and conditions in view.
            </p>
            <LinkButton href="/encounters">Open encounters</LinkButton>
          </Card>
          <Card className="space-y-3">
            <h3 className="text-lg">Bestiary</h3>
            <p className="text-sm text-muted">
              Search SRD creatures or add your own monsters and NPCs.
            </p>
            <LinkButton href="/bestiary">Open bestiary</LinkButton>
          </Card>
          <Card className="space-y-3">
            <h3 className="text-lg">Party Tracker</h3>
            <p className="text-sm text-muted">
              Track AC, HP, inspiration, and passive scores across the table.
            </p>
            <LinkButton href="/pcs">Open party</LinkButton>
          </Card>
          <Card className="space-y-3">
            <h3 className="text-lg">Notes + Log</h3>
            <p className="text-sm text-muted">
              Capture session notes and quick logs of memorable turns.
            </p>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/notes" variant="outline">
                Notes
              </LinkButton>
              <LinkButton href="/log">Log</LinkButton>
            </div>
          </Card>
        </div>
      </section>

      {/* Danger zone */}
      <section className="border-t border-black/10 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Reset all data</p>
            <p className="text-xs text-muted mt-0.5">Wipes all monsters, PCs, encounters, notes, and log entries. Cannot be undone.</p>
          </div>
          <Button variant="outline" className="shrink-0 text-[var(--diff-hard)] hover:text-[var(--diff-deadly)] border-[var(--diff-hard)]/30 hover:border-[var(--diff-deadly)]/50" onClick={() => setIsResetOpen(true)}>
            Reset data
          </Button>
        </div>
      </section>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent maxWidth="sm">
          <DialogTitle>Reset all data?</DialogTitle>
          <p className="mt-2 text-sm text-muted">
            This will permanently delete all monsters, PCs, encounters, notes, and log entries. There is no undo.
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
              className="bg-[var(--diff-hard)] hover:bg-[var(--diff-deadly)] text-white border-transparent"
            >
              Yes, reset everything
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
