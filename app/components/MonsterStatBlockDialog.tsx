"use client";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "./ui";
import type { Monster } from "../lib/models/types";
import { getChallengeXp } from "../lib/engine/selectors";
import { formatMod } from "../lib/engine/pcEngine";

interface Props {
  monster: Monster | null;
  open: boolean;
  onClose: () => void;
}

const ABILITY_LABELS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const ABILITY_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

export const MonsterStatBlockDialog = ({ monster, open, onClose }: Props) => {
  if (!monster) return null;

  const xp = getChallengeXp(monster.challenge);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent maxWidth="md">
        <div className="flex items-start justify-between gap-4 mb-1">
          <DialogTitle className="text-xl">{monster.name}</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" className="shrink-0 -mt-1">✕ Close</Button>
          </DialogClose>
        </div>
        <p className="text-sm text-muted mb-4">
          {monster.size} {monster.type} · CR {monster.challenge} ({xp.toLocaleString()} XP) ·{" "}
          {monster.source}
        </p>

        {/* Core stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "AC", value: monster.ac },
            { label: "HP", value: monster.hp },
            { label: "Speed", value: monster.speed },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-surface-strong p-3 text-center">
              <p className="font-mono text-xl font-semibold text-foreground">{value}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Ability scores */}
        <div className="grid grid-cols-6 gap-2 mb-5">
          {ABILITY_LABELS.map((label, i) => {
            const key = ABILITY_KEYS[i];
            const score = monster.abilities[key];
            return (
              <div key={label} className="rounded-xl bg-surface-strong p-2 text-center">
                <p className="text-xs uppercase tracking-[0.1em] text-muted">{label}</p>
                <p className="font-mono text-base font-semibold text-foreground">{score}</p>
                <p className="font-mono text-xs text-muted">{formatMod(Math.floor((score - 10) / 2))}</p>
              </div>
            );
          })}
        </div>

        {/* Senses / Languages */}
        {(monster.senses || monster.languages) && (
          <div className="mb-4 space-y-1 text-sm">
            {monster.senses && (
              <p>
                <span className="font-semibold">Senses</span>{" "}
                <span className="text-muted">{monster.senses}</span>
              </p>
            )}
            {monster.languages && (
              <p>
                <span className="font-semibold">Languages</span>{" "}
                <span className="text-muted">{monster.languages}</span>
              </p>
            )}
          </div>
        )}

        {/* Traits */}
        {monster.traits && monster.traits.length > 0 && (
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2">Traits</p>
            <div className="space-y-1.5 text-sm text-foreground">
              {monster.traits.map((t, i) => (
                <p key={i}>{t}</p>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {monster.actions && monster.actions.length > 0 && (
          <div className="mb-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2">Actions</p>
            <div className="space-y-1.5 text-sm text-foreground">
              {monster.actions.map((a, i) => (
                <p key={i}>{a}</p>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
