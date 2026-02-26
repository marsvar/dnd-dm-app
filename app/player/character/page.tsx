"use client";

/**
 * /player/character — Full player character sheet.
 * Tabs: Overview · Skills/Saves · Combat · Bio
 * Full edit access via updatePc (matches DM edit scope per design decision).
 */

import { useState } from "react";
import { useAppStore } from "../../lib/store/appStore";
import { usePlayerSession } from "../../lib/store/usePlayerSession";
import { PlayerShell } from "../../components/PlayerShell";
import {
  Card,
  Panel,
  Button,
  Input,
  Textarea,
  HpBar,
  ConditionChip,
  FieldLabel,
  cn,
} from "../../components/ui";
import {
  getAbilityMod,
  getSkillTotal,
  getSaveTotal,
  getInitiativeBonus,
  getPassivePerception,
  formatMod,
  ABILITY_ABBREV,
  ABILITY_LABELS,
  SKILL_LABELS,
  SKILL_ABILITY,
  ALL_SKILLS,
  cycleSkillProficiency,
} from "../../lib/engine/pcEngine";
import type { AbilityScores, Pc } from "../../lib/models/types";
import { SRD_CONDITIONS } from "../../lib/data/srd";
import { ParticipantAvatar } from "../../components/ParticipantAvatar";
import { Sparkles, Plus } from "lucide-react";

type Tab = "overview" | "skills" | "combat" | "bio";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "skills", label: "Skills" },
  { id: "combat", label: "Combat" },
  { id: "bio", label: "Bio" },
];

export default function PlayerCharacterPage() {
  const { selectedPcId } = usePlayerSession();
  const { state, updatePc } = useAppStore();
  const pc = state.pcs.find((p) => p.id === selectedPcId);
  const [tab, setTab] = useState<Tab>("overview");

  if (!pc) return null;

  const up = (patch: Partial<Pc>) => updatePc(pc.id, patch);

  return (
    <PlayerShell>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <ParticipantAvatar name={pc.name} visual={pc.visual} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-foreground">{pc.name}</h1>
          <p className="text-sm text-muted">
            {[pc.race, pc.className].filter(Boolean).join(" ")}
            {pc.level ? ` · Level ${pc.level}` : ""}
          </p>
        </div>
        <button
          type="button"
          title="Inspiration"
          onClick={() => up({ inspiration: !pc.inspiration })}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all",
            pc.inspiration
              ? "border-yellow-400 bg-yellow-400/10 text-yellow-500"
              : "border-black/10 text-muted hover:border-accent hover:text-accent"
          )}
        >
          <Sparkles size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-2xl border border-black/10 bg-surface-strong p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-xl py-2 text-xs font-semibold transition-all",
              tab === id
                ? "bg-accent text-white shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && <OverviewTab pc={pc} up={up} />}
      {tab === "skills" && <SkillsTab pc={pc} up={up} />}
      {tab === "combat" && <CombatTab pc={pc} up={up} />}
      {tab === "bio" && <BioTab pc={pc} up={up} />}
    </PlayerShell>
  );
}

// ---------------------------------------------------------------------------
// Overview tab — ability block + key stats
// ---------------------------------------------------------------------------
function OverviewTab({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
  const abilities = Object.keys(ABILITY_ABBREV) as (keyof AbilityScores)[];

  return (
    <div className="flex flex-col gap-4">
      {/* Ability block */}
      <Card>
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted">
          Ability Scores
        </p>
        <div className="grid grid-cols-3 gap-3">
          {abilities.map((ab) => {
            const score = pc.abilities[ab];
            const mod = getAbilityMod(score);
            return (
              <div
                key={ab}
                className="flex flex-col items-center gap-1 rounded-xl border border-black/10 py-3"
              >
                <span className="text-2xl font-bold text-foreground">
                  {formatMod(mod)}
                </span>
                <span className="text-xs font-semibold text-muted">
                  {ABILITY_ABBREV[ab]}
                </span>
                <input
                  type="number"
                  value={score}
                  onChange={(e) =>
                    up({
                      abilities: {
                        ...pc.abilities,
                        [ab]: Number(e.target.value),
                      },
                    })
                  }
                  className="w-12 rounded-lg border border-black/10 bg-surface-strong p-0 text-center text-xs text-muted outline-none focus:border-accent"
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Key stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "AC", value: pc.ac },
          { label: "Initiative", value: formatMod(getInitiativeBonus(pc)) },
          { label: "Speed", value: pc.speed || "—" },
        ].map(({ label, value }) => (
          <Panel key={label} className="flex flex-col items-center gap-0.5">
            <span className="text-lg font-bold text-foreground">{value}</span>
            <span className="text-xs text-muted">{label}</span>
          </Panel>
        ))}
      </div>

      {/* Derived stats */}
      <Card className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Passive Perception</FieldLabel>
          <p className="mt-1 text-xl font-bold text-foreground">
            {getPassivePerception(pc)}
          </p>
        </div>
        <div>
          <FieldLabel>Proficiency Bonus</FieldLabel>
          <p className="mt-1 text-xl font-bold text-foreground">
            {formatMod(pc.proficiencyBonus)}
          </p>
        </div>
        <div>
          <FieldLabel>Hit Dice</FieldLabel>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {pc.hitDice || "—"}
          </p>
        </div>
        <div>
          <FieldLabel>Senses</FieldLabel>
          <p className="mt-1 text-sm text-foreground">{pc.senses || "—"}</p>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skills & Saves tab
// ---------------------------------------------------------------------------
function SkillsTab({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
  const abilities = Object.keys(ABILITY_ABBREV) as (keyof AbilityScores)[];

  return (
    <div className="flex flex-col gap-4">
      {/* Saving Throws */}
      <Card>
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted">
          Saving Throws
        </p>
        <ul className="flex flex-col gap-1">
          {abilities.map((ab) => {
            const total = getSaveTotal(pc, ab);
            const prof = pc.saveProficiencies[ab];
            return (
              <li
                key={ab}
                className="flex items-center gap-3 py-1"
              >
                <button
                  type="button"
                  title="Toggle proficiency"
                  onClick={() =>
                    up({
                      saveProficiencies: {
                        ...pc.saveProficiencies,
                        [ab]: !prof,
                      },
                    })
                  }
                  className={cn(
                    "h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                    prof
                      ? "border-accent bg-accent"
                      : "border-black/20 bg-transparent"
                  )}
                />
                <span className="w-24 text-sm text-foreground">
                  {ABILITY_LABELS[ab]}
                </span>
                <span className="ml-auto font-mono text-sm font-semibold text-foreground">
                  {formatMod(total)}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Skills */}
      <Card>
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted">
          Skills
        </p>
        <ul className="flex flex-col gap-1">
          {ALL_SKILLS.map((skill) => {
            const total = getSkillTotal(pc, skill);
            const profState = pc.skillProficiencies?.[skill] ?? "none";
            const ab = SKILL_ABILITY[skill];
            return (
              <li key={skill} className="flex items-center gap-3 py-1">
                <button
                  type="button"
                  title={`Proficiency: ${profState}`}
                  onClick={() => {
                    const next = cycleSkillProficiency(profState);
                    up({
                      skillProficiencies: {
                        ...pc.skillProficiencies,
                        [skill]: next,
                      },
                    });
                  }}
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-[8px] font-black transition-colors",
                    profState === "expertise"
                      ? "border-accent bg-accent text-white"
                      : profState === "proficient"
                        ? "border-accent bg-transparent text-accent"
                        : "border-black/20 bg-transparent text-transparent"
                  )}
                >
                  {profState === "expertise" ? "E" : "•"}
                </button>
                <span className="flex-1 text-sm text-foreground">
                  {SKILL_LABELS[skill]}
                </span>
                <span className="text-xs text-muted">{ABILITY_ABBREV[ab]}</span>
                <span className="w-8 text-right font-mono text-sm font-semibold text-foreground">
                  {formatMod(total)}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Combat tab — HP tracker, AC, conditions
// ---------------------------------------------------------------------------
function CombatTab({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
  const [delta, setDelta] = useState("");
  const [conditionMenu, setConditionMenu] = useState(false);

  function applyDelta(type: "damage" | "heal") {
    const n = parseInt(delta, 10);
    if (isNaN(n) || n <= 0) return;
    const next =
      type === "damage"
        ? Math.max(0, pc.currentHp - n)
        : Math.min(pc.maxHp, pc.currentHp + n);
    up({ currentHp: next });
    setDelta("");
  }

  function removeCondition(c: string) {
    up({ conditions: pc.conditions.filter((x) => x !== c) });
  }

  function addCondition(c: string) {
    if (pc.conditions.includes(c)) return;
    up({ conditions: [...pc.conditions, c] });
    setConditionMenu(false);
  }

  const hpPct = pc.maxHp > 0 ? pc.currentHp / pc.maxHp : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* HP tracker */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <FieldLabel>Hit Points</FieldLabel>
          <span className="text-xs text-muted">
            {pc.currentHp} / {pc.maxHp}
            {pc.tempHp > 0 && (
              <span className="ml-2 text-cyan-400">+{pc.tempHp} temp</span>
            )}
          </span>
        </div>
        <HpBar current={pc.currentHp} max={pc.maxHp} className="mb-4 h-3" />

        {/* Delta controls */}
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            placeholder="Amount"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") applyDelta("heal");
            }}
          />
          <Button
            variant="outline"
            className="shrink-0 border-red-400/50 text-red-500 hover:border-red-500 hover:text-red-600"
            onClick={() => applyDelta("damage")}
          >
            Damage
          </Button>
          <Button
            variant="outline"
            className="shrink-0 border-green-400/50 text-green-600 hover:border-green-500"
            onClick={() => applyDelta("heal")}
          >
            Heal
          </Button>
        </div>

        {/* Temp HP */}
        <div className="mt-3 flex items-center gap-2">
          <FieldLabel className="shrink-0">Temp HP</FieldLabel>
          <Input
            type="number"
            min={0}
            value={pc.tempHp}
            onChange={(e) => up({ tempHp: Number(e.target.value) })}
            className="w-24"
          />
        </div>

        {/* Max HP edit */}
        <div className="mt-3 flex items-center gap-2">
          <FieldLabel className="shrink-0">Max HP</FieldLabel>
          <Input
            type="number"
            min={1}
            value={pc.maxHp}
            onChange={(e) => up({ maxHp: Number(e.target.value) })}
            className="w-24"
          />
        </div>

        {/* Death saving throw state display */}
        {hpPct === 0 && (
          <p className="mt-3 text-center text-sm font-semibold text-red-500">
            Unconscious — making death saving throws
          </p>
        )}
      </Card>

      {/* AC + Speed */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col items-center gap-1">
          <FieldLabel>Armour Class</FieldLabel>
          <Input
            type="number"
            min={0}
            value={pc.ac}
            onChange={(e) => up({ ac: Number(e.target.value) })}
            className="w-16 text-center text-lg font-bold"
          />
        </Card>
        <Card className="flex flex-col items-center gap-1">
          <FieldLabel>Speed</FieldLabel>
          <Input
            value={pc.speed}
            onChange={(e) => up({ speed: e.target.value })}
            className="w-24 text-center text-sm"
            placeholder="30 ft."
          />
        </Card>
      </div>

      {/* Conditions */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <FieldLabel>Conditions</FieldLabel>
          <button
            type="button"
            onClick={() => setConditionMenu((v) => !v)}
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <Plus size={12} /> Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {pc.conditions.length === 0 && (
            <p className="text-xs text-muted">None</p>
          )}
          {pc.conditions.map((c) => (
            <ConditionChip key={c} label={c} onRemove={() => removeCondition(c)} />
          ))}
        </div>
        {conditionMenu && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-black/5 pt-3">
            {SRD_CONDITIONS.filter((c) => !pc.conditions.includes(c)).map(
              (c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => addCondition(c)}
                  className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {c}
                </button>
              )
            )}
          </div>
        )}
      </Card>

      {/* Resources */}
      <Card>
        <FieldLabel className="mb-2">Resources</FieldLabel>
        <ul className="flex flex-col gap-1">
          {pc.resources.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <Input
                value={r}
                onChange={(e) => {
                  const next = [...pc.resources];
                  next[i] = e.target.value;
                  up({ resources: next });
                }}
                className="flex-1 text-sm"
              />
              <button
                type="button"
                onClick={() => up({ resources: pc.resources.filter((_, j) => j !== i) })}
                className="text-xs text-muted hover:text-red-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <Button
          variant="ghost"
          className="mt-2 text-xs"
          onClick={() => up({ resources: [...pc.resources, ""] })}
        >
          + Add resource
        </Button>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bio tab — background, proficiencies, equipment, notes
// ---------------------------------------------------------------------------
function BioTab({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel className="mb-1">Background</FieldLabel>
            <Input
              value={pc.background}
              onChange={(e) => up({ background: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel className="mb-1">Alignment</FieldLabel>
            <Input
              value={pc.alignment}
              onChange={(e) => up({ alignment: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel className="mb-1">Race</FieldLabel>
            <Input
              value={pc.race}
              onChange={(e) => up({ race: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel className="mb-1">Class</FieldLabel>
            <Input
              value={pc.className}
              onChange={(e) => up({ className: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel className="mb-1">Level</FieldLabel>
            <Input
              type="number"
              min={1}
              max={20}
              value={pc.level}
              onChange={(e) => up({ level: Number(e.target.value) })}
            />
          </div>
          <div>
            <FieldLabel className="mb-1">XP</FieldLabel>
            <Input
              type="number"
              min={0}
              value={pc.experiencePoints}
              onChange={(e) =>
                up({ experiencePoints: Number(e.target.value) })
              }
            />
          </div>
        </div>
      </Card>

      <Card>
        <FieldLabel className="mb-1">Proficiencies & Languages</FieldLabel>
        <Textarea
          rows={4}
          value={pc.proficiencies}
          onChange={(e) => up({ proficiencies: e.target.value })}
          placeholder="Armour, weapons, tools, languages…"
        />
      </Card>

      <Card>
        <FieldLabel className="mb-1">Equipment</FieldLabel>
        <Textarea
          rows={5}
          value={pc.equipment}
          onChange={(e) => up({ equipment: e.target.value })}
          placeholder="List inventory, money, magic items…"
        />
      </Card>

      <Card>
        <FieldLabel className="mb-1">Character Notes</FieldLabel>
        <Textarea
          rows={5}
          value={pc.notes}
          onChange={(e) => up({ notes: e.target.value })}
          placeholder="Backstory, goals, personality traits…"
        />
      </Card>
    </div>
  );
}
