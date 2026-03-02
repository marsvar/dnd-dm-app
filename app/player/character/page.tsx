"use client";

/**
 * /player/character — Full player character sheet.
 * v8 redesign: 6 tabs (Overview · Skills · Combat · Bio · Features · Spells)
 * with a CSS-only desktop 2-column layout matching the D&D 5e sheet feel.
 *
 * Desktop (md+): two-column grid always visible.
 * Mobile:        bottom tab bar + single active panel shown at a time.
 */

import { useMemo, useState } from "react";
import { useAppStore } from "../../lib/store/appStore";
import { usePlayerSession } from "../../lib/store/usePlayerSession";
import { PlayerShell } from "../../components/PlayerShell";
import {
  Card,
  Panel,
  Button,
  Input,
  Textarea,
  Select,
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
  getSpellSaveDc,
  getSpellAttackBonus,
  getWeaponDiceFormula,
  formatMod,
  ABILITY_ABBREV,
  ABILITY_LABELS,
  SKILL_LABELS,
  SKILL_ABILITY,
  ALL_SKILLS,
  cycleSkillProficiency,
} from "../../lib/engine/pcEngine";
import type {
  AbilityScores,
  DeathSaves,
  Feature,
  Pc,
  SpellSlot,
  Weapon,
} from "../../lib/models/types";
import { SRD_CONDITIONS } from "../../lib/data/srd";
import { ParticipantAvatar } from "../../components/ParticipantAvatar";
import { Sparkles, Plus, Trash2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Tab = "overview" | "skills" | "combat" | "bio" | "features" | "spells";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "skills", label: "Skills" },
  { id: "combat", label: "Combat" },
  { id: "bio", label: "Bio" },
  { id: "features", label: "Feats" },
  { id: "spells", label: "Spells" },
];

/** Coin display metadata (in display order). */
const COIN_META: { key: keyof Pc["currency"]; label: string; color: string }[] = [
  { key: "cp", label: "CP", color: "#b87333" },
  { key: "sp", label: "SP", color: "#9e9e9e" },
  { key: "ep", label: "EP", color: "#c8b400" },
  { key: "gp", label: "GP", color: "#d4a017" },
  { key: "pp", label: "PP", color: "#aaaaaa" },
];

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------

export default function PlayerCharacterPage() {
  const { selectedPcId } = usePlayerSession();
  const { state, updatePc } = useAppStore();
  const pc = state.pcs.find((p) => p.id === selectedPcId);
  const [tab, setTab] = useState<Tab>("overview");

  if (!pc) return null;

  const up = (patch: Partial<Pc>) => updatePc(pc.id, patch);

  return (
    <PlayerShell wide>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-4">
        <ParticipantAvatar name={pc.name} visual={pc.visual} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-foreground">{pc.name}</h1>
          <p className="text-sm text-muted">
            {[pc.race, pc.className].filter(Boolean).join(" ")}
            {pc.level ? ` · Level ${pc.level}` : ""}
            {pc.background ? ` · ${pc.background}` : ""}
          </p>
        </div>
        {/* Inspiration toggle */}
        <button
          type="button"
          title={pc.inspiration ? "Remove inspiration" : "Grant inspiration"}
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

      {/* ── Mobile tab bar — hidden on md+ ────────────────────────────────── */}
      <div className="mb-4 flex gap-0.5 overflow-x-auto rounded-2xl border border-black/10 bg-surface-strong p-1 md:hidden">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-xl px-2 py-2 text-xs font-semibold transition-all",
              tab === id
                ? "bg-accent text-white shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Two-column desktop grid ────────────────────────────────────────── */}
      <div className="md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] md:items-start md:gap-5">

        {/* ══ LEFT COLUMN ════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4">

          {/* Overview: ability scores + key stats */}
          <div className={cn("flex flex-col gap-4", tab !== "overview" && "hidden md:flex")}>
            <AbilityScoreBlock pc={pc} up={up} />
            <KeyStatsRow pc={pc} up={up} />
          </div>

          {/* Combat: HP + death saves + conditions + weapons + currency */}
          <div className={cn("flex flex-col gap-4", tab !== "combat" && "hidden md:flex")}>
            <HpPanel pc={pc} up={up} />
            <WeaponsPanel pc={pc} up={up} />
          </div>

          {/* Features & Traits */}
          <div className={cn("flex flex-col gap-4", tab !== "features" && "hidden md:flex")}>
            <FeaturesPanel pc={pc} up={up} />
          </div>
        </div>

        {/* ══ RIGHT COLUMN ═══════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4">

          {/* Skills: saves + skill list */}
          <div className={cn("flex flex-col gap-4", tab !== "skills" && "hidden md:flex")}>
            <SavesPanel pc={pc} up={up} />
            <SkillsPanel pc={pc} up={up} />
          </div>

          {/* Bio: personality traits + background info */}
          <div className={cn("flex flex-col gap-4", tab !== "bio" && "hidden md:flex")}>
            <PersonalityPanel pc={pc} up={up} />
            <BioInfoPanel pc={pc} up={up} />
          </div>

          {/* Spells: spell slots + spellcasting header */}
          <div className={cn("flex flex-col gap-4", tab !== "spells" && "hidden md:flex")}>
            <SpellsPanel pc={pc} up={up} />
          </div>
        </div>
      </div>
    </PlayerShell>
  );
}

// ---------------------------------------------------------------------------
// Ability Score Block — pentagon boxes
// ---------------------------------------------------------------------------
function AbilityScoreBlock({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
  const abilities = Object.keys(ABILITY_ABBREV) as (keyof AbilityScores)[];

  return (
    <Card>
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted">Ability Scores</p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 md:grid-cols-3">
        {abilities.map((ab) => {
          const score = pc.abilities[ab];
          const mod = getAbilityMod(score);
          return (
            <div key={ab} className="flex flex-col items-center">
              {/* Pentagon shape */}
              <div
                className="relative flex w-full flex-col items-center justify-center border-2 border-black/20 bg-surface-strong pb-3 pt-3"
                style={{
                  clipPath: "polygon(0% 0%, 100% 0%, 100% 76%, 50% 100%, 0% 76%)",
                  minHeight: 88,
                }}
              >
                {/* Large modifier */}
                <span className="text-2xl font-black leading-none text-foreground">
                  {formatMod(mod)}
                </span>
                {/* Score input */}
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={score}
                  onChange={(e) =>
                    up({ abilities: { ...pc.abilities, [ab]: Number(e.target.value) } })
                  }
                  className="mt-1 w-10 rounded border border-black/20 bg-surface p-0 text-center text-xs font-semibold text-muted outline-none focus:border-accent"
                />
              </div>
              {/* Abbrev badge at the pentagon "point" */}
              <span className="mt-1 rounded-full border border-black/20 bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                {ABILITY_ABBREV[ab]}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Key stats row — AC, Initiative, Speed, Passive Perception, Proficiency Bonus
// ---------------------------------------------------------------------------
function KeyStatsRow({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-3">
      {/* AC */}
      <Panel className="flex flex-col items-center gap-0.5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">AC</span>
        <input
          type="number"
          min={0}
          value={pc.ac}
          onChange={(e) => up({ ac: Number(e.target.value) })}
          className="w-14 bg-transparent text-center text-2xl font-black text-foreground outline-none"
        />
      </Panel>
      {/* Initiative */}
      <Panel className="flex flex-col items-center gap-0.5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Init</span>
        <span className="text-2xl font-black text-foreground">
          {formatMod(getInitiativeBonus(pc))}
        </span>
      </Panel>
      {/* Speed */}
      <Panel className="flex flex-col items-center gap-0.5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Speed</span>
        <input
          value={pc.speed}
          onChange={(e) => up({ speed: e.target.value })}
          className="w-full bg-transparent text-center text-sm font-bold text-foreground outline-none"
          placeholder="30 ft."
        />
      </Panel>
      {/* Passive Perception */}
      <Panel className="flex flex-col items-center gap-0.5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">PP</span>
        <span className="text-2xl font-black text-foreground">{getPassivePerception(pc)}</span>
      </Panel>
      {/* Proficiency Bonus */}
      <Panel className="flex flex-col items-center gap-0.5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Prof</span>
        <span className="text-2xl font-black text-foreground">
          {formatMod(pc.proficiencyBonus)}
        </span>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HP Panel — tracker, death saves, conditions
// ---------------------------------------------------------------------------
function HpPanel({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
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

  return (
    <Card>
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between">
        <FieldLabel>Hit Points</FieldLabel>
        <span className="text-xs text-muted">
          {pc.currentHp} / {pc.maxHp}
          {pc.tempHp > 0 && <span className="ml-2 text-cyan-500">+{pc.tempHp} temp</span>}
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
          onKeyDown={(e) => { if (e.key === "Enter") applyDelta("heal"); }}
        />
        <Button
          variant="outline"
          className="shrink-0 border-red-400/50 text-red-500 hover:border-red-500"
          onClick={() => applyDelta("damage")}
        >
          Dmg
        </Button>
        <Button
          variant="outline"
          className="shrink-0 border-green-400/50 text-green-600 hover:border-green-500"
          onClick={() => applyDelta("heal")}
        >
          Heal
        </Button>
      </div>

      {/* Temp HP + Max HP */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <FieldLabel className="shrink-0">Temp</FieldLabel>
          <Input
            type="number"
            min={0}
            value={pc.tempHp}
            onChange={(e) => up({ tempHp: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <FieldLabel className="shrink-0">Max</FieldLabel>
          <Input
            type="number"
            min={1}
            value={pc.maxHp}
            onChange={(e) => up({ maxHp: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>

      {/* Death saves — shown only when at 0 HP */}
      {pc.currentHp === 0 && (
        <DeathSaveCircles
          value={pc.deathSaves}
          onChange={(next) => up({ deathSaves: next })}
        />
      )}

      {/* Hit Dice */}
      <div className="mt-3 flex items-center gap-2">
        <FieldLabel className="shrink-0">Hit Dice</FieldLabel>
        <Input
          value={pc.hitDice}
          onChange={(e) => up({ hitDice: e.target.value })}
          className="flex-1 text-sm"
          placeholder="3d10"
        />
      </div>

      {/* Conditions */}
      <div className="mt-4 border-t border-black/5 pt-3">
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
          {pc.conditions.length === 0 && <p className="text-xs text-muted">None</p>}
          {pc.conditions.map((c) => (
            <ConditionChip
              key={c}
              label={c}
              onRemove={() => up({ conditions: pc.conditions.filter((x) => x !== c) })}
            />
          ))}
        </div>
        {conditionMenu && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-black/5 pt-3">
            {SRD_CONDITIONS.filter((c) => !pc.conditions.includes(c)).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  up({ conditions: [...pc.conditions, c] });
                  setConditionMenu(false);
                }}
                className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Death Save Circles — 3 successes (green) + 3 failures (red)
// ---------------------------------------------------------------------------
function DeathSaveCircles({
  value,
  onChange,
}: {
  value: DeathSaves;
  onChange: (next: DeathSaves) => void;
}) {
  function toggle(type: "successes" | "failures", index: number) {
    const current = value[type];
    // Clicking the last filled pip removes it; otherwise fill up to that pip.
    const next = current > index ? index : index + 1;
    const clamped = Math.min(3, Math.max(0, next));
    onChange({
      ...value,
      [type]: clamped,
      stable: type === "successes" && clamped >= 3 ? true : value.stable,
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-black/10 bg-surface-strong p-3">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-muted">
        Death Saving Throws
      </p>
      <div className="flex items-center justify-center gap-8">
        {/* Successes */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-semibold text-green-600">Successes</span>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggle("successes", i)}
                className={cn(
                  "h-5 w-5 rounded-full border-2 transition-colors",
                  i < value.successes
                    ? "border-green-500 bg-green-500"
                    : "border-black/20"
                )}
              />
            ))}
          </div>
        </div>
        {/* Failures */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-semibold text-red-500">Failures</span>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggle("failures", i)}
                className={cn(
                  "h-5 w-5 rounded-full border-2 transition-colors",
                  i < value.failures
                    ? "border-red-500 bg-red-500"
                    : "border-black/20"
                )}
              />
            ))}
          </div>
        </div>
      </div>
      {value.stable && (
        <p className="mt-2 text-center text-xs font-semibold text-green-600">✓ Stable</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weapons Panel — attack rows + currency
// ---------------------------------------------------------------------------
function WeaponsPanel({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
  function updateWeapon(id: string, patch: Partial<Weapon>) {
    up({ weapons: pc.weapons.map((w) => (w.id === id ? { ...w, ...patch } : w)) });
  }

  function addWeapon() {
    const id = `weapon-${Date.now()}`;
    up({
      weapons: [
        ...pc.weapons,
        { id, name: "", attackBonus: 0, damageDice: "1d6", damageBonus: 0, damageType: "", range: "5 ft.", notes: "" },
      ],
    });
  }

  return (
    <Card>
      {/* Attacks header */}
      <div className="mb-3 flex items-center justify-between">
        <FieldLabel>Attacks & Weapons</FieldLabel>
        <button
          type="button"
          onClick={addWeapon}
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {pc.weapons.length === 0 && (
        <p className="mb-3 text-xs text-muted">No weapons — tap + to add.</p>
      )}

      {/* Column headers */}
      {pc.weapons.length > 0 && (
        <div className="mb-1 grid grid-cols-[1fr_52px_80px_22px] gap-1 text-[10px] uppercase tracking-wider text-muted">
          <span>Name</span>
          <span className="text-center">Atk</span>
          <span className="text-center">Damage</span>
          <span />
        </div>
      )}

      {pc.weapons.map((w) => (
        <div key={w.id} className="mb-3 border-b border-black/5 pb-3 last:mb-0 last:border-0 last:pb-0">
          {/* Main row */}
          <div className="mb-1 grid grid-cols-[1fr_52px_80px_22px] items-center gap-1">
            <Input
              value={w.name}
              onChange={(e) => updateWeapon(w.id, { name: e.target.value })}
              placeholder="Weapon name"
              className="text-sm"
            />
            {/* Attack bonus */}
            <div className="flex items-center justify-center rounded-xl border border-black/10 bg-surface-strong px-1 py-1.5">
              <span className="text-[10px] text-muted">+</span>
              <input
                type="number"
                value={w.attackBonus}
                onChange={(e) => updateWeapon(w.id, { attackBonus: Number(e.target.value) })}
                className="w-7 bg-transparent text-center text-sm font-semibold text-foreground outline-none"
              />
            </div>
            {/* Damage formula display */}
            <div
              title={`Roll: ${getWeaponDiceFormula(w)}`}
              className="truncate rounded-xl border border-black/10 bg-surface-strong px-2 py-1.5 text-center text-xs font-semibold text-foreground"
            >
              {w.damageDice}
              {w.damageBonus !== 0
                ? w.damageBonus > 0
                  ? `+${w.damageBonus}`
                  : `${w.damageBonus}`
                : ""}
            </div>
            {/* Remove */}
            <button
              type="button"
              onClick={() => up({ weapons: pc.weapons.filter((x) => x.id !== w.id) })}
              className="flex items-center justify-center text-muted hover:text-red-500"
            >
              <Trash2 size={13} />
            </button>
          </div>
          {/* Detail row: type | range | notes */}
          <div className="grid grid-cols-3 gap-1">
            <Input
              value={w.damageType}
              onChange={(e) => updateWeapon(w.id, { damageType: e.target.value })}
              placeholder="slashing"
              className="text-xs"
            />
            <Input
              value={w.range}
              onChange={(e) => updateWeapon(w.id, { range: e.target.value })}
              placeholder="5 ft."
              className="text-xs"
            />
            <Input
              value={w.notes}
              onChange={(e) => updateWeapon(w.id, { notes: e.target.value })}
              placeholder="notes…"
              className="text-xs"
            />
          </div>
        </div>
      ))}

      {/* Currency */}
      <div className="mt-4 border-t border-black/5 pt-3">
        <FieldLabel className="mb-2">Currency</FieldLabel>
        <div className="grid grid-cols-5 gap-1">
          {COIN_META.map(({ key, label, color }) => (
            <div key={key} className="flex flex-col items-center gap-0.5">
              <input
                type="number"
                min={0}
                value={pc.currency[key]}
                onChange={(e) =>
                  up({ currency: { ...pc.currency, [key]: Number(e.target.value) } })
                }
                className="w-full rounded-xl border border-black/10 bg-surface-strong py-1.5 text-center text-sm font-semibold text-foreground outline-none focus:border-accent"
              />
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Saving Throws
// ---------------------------------------------------------------------------
function SavesPanel({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
  const abilities = Object.keys(ABILITY_ABBREV) as (keyof AbilityScores)[];

  return (
    <Card>
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted">Saving Throws</p>
      <ul className="flex flex-col gap-0.5">
        {abilities.map((ab) => {
          const prof = pc.saveProficiencies[ab];
          const total = getSaveTotal(pc, ab);
          return (
            <li key={ab} className="flex items-center gap-3 py-0.5">
              <button
                type="button"
                title="Toggle save proficiency"
                onClick={() =>
                  up({ saveProficiencies: { ...pc.saveProficiencies, [ab]: !prof } })
                }
                className={cn(
                  "h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                  prof ? "border-accent bg-accent" : "border-black/20"
                )}
              />
              <span className="flex-1 text-sm text-foreground">{ABILITY_LABELS[ab]}</span>
              <span className="font-mono text-sm font-semibold text-foreground">
                {formatMod(total)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------
function SkillsPanel({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
  return (
    <Card>
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted">Skills</p>
      <ul className="flex flex-col gap-0.5">
        {ALL_SKILLS.map((skill) => {
          const total = getSkillTotal(pc, skill);
          const profState = pc.skillProficiencies?.[skill] ?? "none";
          const ab = SKILL_ABILITY[skill];
          return (
            <li key={skill} className="flex items-center gap-2 py-0.5">
              {/* Proficiency dot: empty / filled (proficient) / E (expertise) */}
              <button
                type="button"
                title={`Proficiency: ${profState}`}
                onClick={() =>
                  up({
                    skillProficiencies: {
                      ...pc.skillProficiencies,
                      [skill]: cycleSkillProficiency(profState),
                    },
                  })
                }
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
              <span className="flex-1 text-sm text-foreground">{SKILL_LABELS[skill]}</span>
              <span className="text-[10px] text-muted">{ABILITY_ABBREV[ab]}</span>
              <span className="w-7 text-right font-mono text-sm font-semibold text-foreground">
                {formatMod(total)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Personality Panel — Traits / Ideals / Bonds / Flaws (fieldset boxes)
// ---------------------------------------------------------------------------
function PersonalityPanel({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
  const fields: {
    key: keyof Pick<Pc, "personalityTraits" | "ideals" | "bonds" | "flaws">;
    label: string;
  }[] = [
    { key: "personalityTraits", label: "Personality Traits" },
    { key: "ideals", label: "Ideals" },
    { key: "bonds", label: "Bonds" },
    { key: "flaws", label: "Flaws" },
  ];

  return (
    <Card>
      <div className="flex flex-col gap-3">
        {fields.map(({ key, label }) => (
          <fieldset
            key={key}
            className="rounded-xl border border-black/15 px-3 pb-2 pt-0"
          >
            <legend className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted">
              {label}
            </legend>
            <Textarea
              rows={2}
              value={pc[key] as string}
              onChange={(e) => up({ [key]: e.target.value })}
              className="border-0 bg-transparent px-0 py-1 shadow-none focus:ring-0"
              placeholder={`Enter ${label.toLowerCase()}…`}
            />
          </fieldset>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Bio Info Panel — character details + proficiencies + equipment + notes
// ---------------------------------------------------------------------------
function BioInfoPanel({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
  return (
    <Card>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { key: "className", label: "Class" },
            { key: "race", label: "Race" },
            { key: "background", label: "Background" },
            { key: "alignment", label: "Alignment" },
          ] as { key: keyof Pc; label: string }[]
        ).map(({ key, label }) => (
          <div key={key}>
            <FieldLabel className="mb-1">{label}</FieldLabel>
            <Input
              value={pc[key] as string}
              onChange={(e) => up({ [key]: e.target.value })}
            />
          </div>
        ))}
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
            onChange={(e) => up({ experiencePoints: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="mt-4">
        <FieldLabel className="mb-1">Proficiencies & Languages</FieldLabel>
        <Textarea
          rows={3}
          value={pc.proficiencies}
          onChange={(e) => up({ proficiencies: e.target.value })}
          placeholder="Armour, weapons, tools, languages…"
        />
      </div>
      <div className="mt-3">
        <FieldLabel className="mb-1">Equipment</FieldLabel>
        <Textarea
          rows={4}
          value={pc.equipment}
          onChange={(e) => up({ equipment: e.target.value })}
          placeholder="List inventory…"
        />
      </div>
      <div className="mt-3">
        <FieldLabel className="mb-1">Notes</FieldLabel>
        <Textarea
          rows={3}
          value={pc.notes}
          onChange={(e) => up({ notes: e.target.value })}
          placeholder="Backstory, goals…"
        />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Features & Traits Panel
// ---------------------------------------------------------------------------
function FeaturesPanel({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
  function updateFeature(id: string, patch: Partial<Feature>) {
    up({ features: pc.features.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  }

  function addFeature() {
    const id = `feat-${Date.now()}`;
    up({ features: [...pc.features, { id, name: "", description: "" }] });
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <FieldLabel>Features & Traits</FieldLabel>
        <button
          type="button"
          onClick={addFeature}
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {pc.features.length === 0 && (
        <p className="text-xs text-muted">No features yet — tap + to add.</p>
      )}

      <div className="flex flex-col gap-3">
        {pc.features.map((f) => (
          <div key={f.id} className="rounded-xl border border-black/10 p-3">
            {/* Name row */}
            <div className="mb-2 flex gap-2">
              <Input
                value={f.name}
                onChange={(e) => updateFeature(f.id, { name: e.target.value })}
                placeholder="Feature name"
                className="flex-1 text-sm font-semibold"
              />
              <button
                type="button"
                onClick={() =>
                  up({ features: pc.features.filter((x) => x.id !== f.id) })
                }
                className="text-muted hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
            </div>
            {/* Description */}
            <Textarea
              rows={2}
              value={f.description}
              onChange={(e) => updateFeature(f.id, { description: e.target.value })}
              placeholder="Description…"
              className="text-xs"
            />
            {/* Limited uses pips */}
            {f.maxUses !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted">Uses</span>
                <div className="flex gap-1">
                  {Array.from({ length: f.maxUses }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        updateFeature(f.id, {
                          uses: i < (f.uses ?? 0) ? i : i + 1,
                        })
                      }
                      className={cn(
                        "h-4 w-4 rounded-full border-2 transition-colors",
                        i < (f.uses ?? 0)
                          ? "border-accent bg-accent"
                          : "border-black/20"
                      )}
                    />
                  ))}
                </div>
                {f.recharge && (
                  <span className="text-[10px] text-muted">/ {f.recharge}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Class Resources (legacy) */}
      <div className="mt-4 border-t border-black/5 pt-3">
        <FieldLabel className="mb-2">Class Resources</FieldLabel>
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
                onClick={() =>
                  up({ resources: pc.resources.filter((_, j) => j !== i) })
                }
                className="text-xs text-muted hover:text-red-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <Button
          variant="ghost"
          className="mt-1 text-xs"
          onClick={() => up({ resources: [...pc.resources, ""] })}
        >
          + Add resource
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Spells Panel — spellcasting header + spell slot pips
// ---------------------------------------------------------------------------
function SpellsPanel({ pc, up }: { pc: Pc; up: (p: Partial<Pc>) => void }) {
  const sc = pc.spellcasting;
  const dc = getSpellSaveDc(pc);
  const atk = getSpellAttackBonus(pc);
  const abilities = Object.keys(ABILITY_ABBREV) as (keyof AbilityScores)[];

  function updateSlot(level: number, patch: Partial<SpellSlot>) {
    up({
      spellcasting: {
        ...sc,
        spellSlots: sc.spellSlots.map((s) =>
          s.level === level ? { ...s, ...patch } : s
        ),
      },
    });
  }

  function addSlotLevel() {
    const existing = new Set(sc.spellSlots.map((s) => s.level));
    for (let lvl = 1; lvl <= 9; lvl++) {
      if (!existing.has(lvl)) {
        up({
          spellcasting: {
            ...sc,
            spellSlots: [...sc.spellSlots, { level: lvl, total: 2, used: 0 }].sort(
              (a, b) => a.level - b.level
            ),
          },
        });
        return;
      }
    }
  }

  return (
    <Card>
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted">Spellcasting</p>

      {/* Spellcasting ability + derived stats */}
      <div className="mb-4">
        <FieldLabel className="mb-1">Spellcasting Ability</FieldLabel>
        <Select
          value={sc.spellcastingAbility ?? ""}
          onChange={(e) =>
            up({
              spellcasting: {
                ...sc,
                spellcastingAbility:
                  (e.target.value as keyof AbilityScores) || null,
              },
            })
          }
        >
          <option value="">— None —</option>
          {abilities.map((ab) => (
            <option key={ab} value={ab}>
              {ABILITY_LABELS[ab]}
            </option>
          ))}
        </Select>

        {sc.spellcastingAbility && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Panel className="flex flex-col items-center gap-0 py-2">
              <span className="text-[10px] text-muted">Spell Save DC</span>
              <span className="text-2xl font-black text-foreground">{dc ?? "—"}</span>
            </Panel>
            <Panel className="flex flex-col items-center gap-0 py-2">
              <span className="text-[10px] text-muted">Spell Attack</span>
              <span className="text-2xl font-black text-foreground">
                {atk !== null ? formatMod(atk) : "—"}
              </span>
            </Panel>
          </div>
        )}
      </div>

      {/* Spell Slots */}
      <div className="mb-3 flex items-center justify-between">
        <FieldLabel>Spell Slots</FieldLabel>
        <button
          type="button"
          onClick={addSlotLevel}
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          <Plus size={12} /> Level
        </button>
      </div>

      {sc.spellSlots.length === 0 && (
        <p className="text-xs text-muted">No spell slots — tap + Level to add.</p>
      )}

      <div className="flex flex-col gap-3">
        {sc.spellSlots.map((slot) => (
          <div key={slot.level} className="flex items-center gap-2">
            <span className="w-14 text-xs font-semibold text-foreground">
              Level {slot.level}
            </span>
            {/* Pip row — filled = available, empty = expended */}
            <div className="flex flex-1 flex-wrap gap-1">
              {Array.from({ length: slot.total }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  title={i < slot.used ? "Restore slot" : "Expend slot"}
                  onClick={() =>
                    updateSlot(slot.level, {
                      used: i < slot.used ? i : i + 1,
                    })
                  }
                  className={cn(
                    "h-5 w-5 rounded-full border-2 transition-colors",
                    i < slot.used
                      ? "border-black/20 bg-transparent"
                      : "border-accent bg-accent"
                  )}
                />
              ))}
            </div>
            {/* Max slots edit */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted">Max</span>
              <input
                type="number"
                min={0}
                max={9}
                value={slot.total}
                onChange={(e) => {
                  const total = Number(e.target.value);
                  updateSlot(slot.level, {
                    total,
                    used: Math.min(slot.used, total),
                  });
                }}
                className="w-8 rounded border border-black/10 bg-surface-strong text-center text-xs text-foreground outline-none focus:border-accent"
              />
            </div>
            {/* Remove level */}
            <button
              type="button"
              onClick={() =>
                up({
                  spellcasting: {
                    ...sc,
                    spellSlots: sc.spellSlots.filter((s) => s.level !== slot.level),
                  },
                })
              }
              className="text-muted hover:text-red-500"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Rolls tab — record rolls in or out of combat, view roll history
// ---------------------------------------------------------------------------
function RollsTab({ pcId, pcName }: { pcId: string; pcName: string }) {
  const { state, dispatchEncounterEvent, addLogEntry } = useAppStore();
  const { campaignId } = usePlayerSession();

  const [context, setContext] = useState("");
  const [mode, setMode] = useState<"digital" | "manual">("digital");
  const [manualValue, setManualValue] = useState("");
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  // Find the running encounter scoped to this player's campaign.
  const activeEncounter = useMemo(() => {
    if (campaignId) {
      return state.encounters.find((e) => e.campaignId === campaignId && e.isRunning) ?? null;
    }
    return state.encounters.find((e) => e.isRunning) ?? null;
  }, [state.encounters, campaignId]);

  function rollD20() {
    const result = Math.floor(Math.random() * 20) + 1;
    setLastRoll(result);
    setPendingConfirm(true);
  }

  function recordRoll(total: number, rollMode: "digital" | "manual") {
    const contextLabel = context.trim() || "Roll";
    if (activeEncounter) {
      dispatchEncounterEvent(activeEncounter.id, {
        t: "ROLL_RECORDED",
        actorId: pcId,
        mode: rollMode,
        context: contextLabel,
        formula: "1d20",
        rawRolls: [total],
        total,
      });
    } else {
      addLogEntry({
        text: `${pcName} rolled ${total}${contextLabel !== "Roll" ? ` — ${contextLabel}` : ""}`,
        source: "auto",
        campaignId: campaignId ?? undefined,
      });
    }
    setContext("");
    setManualValue("");
    setLastRoll(null);
    setPendingConfirm(false);
  }

  // Roll history: ROLL_RECORDED events in encounters + session log auto entries.
  const rollHistory = useMemo(() => {
    const campaignEncounters = campaignId
      ? state.encounters.filter((e) => e.campaignId === campaignId)
      : state.encounters;

    const encRolls: Array<{ at: string; label: string }> = [];
    for (const enc of campaignEncounters) {
      for (const ev of enc.eventLog) {
        if (ev.t === "ROLL_RECORDED" && ev.actorId === pcId) {
          encRolls.push({
            at: ev.at,
            label: `${ev.total} — ${ev.context} (${enc.name})`,
          });
        }
      }
    }

    const logRolls: Array<{ at: string; label: string }> = state.log
      .filter(
        (e) =>
          e.source === "auto" &&
          e.text.includes(pcName) &&
          e.text.includes("rolled")
      )
      .map((e) => ({ at: e.timestamp, label: e.text }));

    return [...encRolls, ...logRolls]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 30);
  }, [state.encounters, state.log, pcId, pcName, campaignId]);

  return (
    <div className="flex flex-col gap-4">
      {/* Roll input */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Dices size={14} className="text-muted" />
          <span className="text-xs uppercase tracking-[0.25em] text-muted">
            {activeEncounter ? `Active combat: ${activeEncounter.name}` : "Out of combat"}
          </span>
        </div>

        <Input
          placeholder="What are you rolling? (optional)"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("digital"); setLastRoll(null); setPendingConfirm(false); }}
            className={cn(
              "flex-1 rounded-full border py-1.5 text-xs font-semibold transition",
              mode === "digital"
                ? "border-accent bg-accent/10 text-accent"
                : "border-black/10 text-muted hover:border-accent/50"
            )}
          >
            Roll d20 for me
          </button>
          <button
            type="button"
            onClick={() => { setMode("manual"); setLastRoll(null); setPendingConfirm(false); }}
            className={cn(
              "flex-1 rounded-full border py-1.5 text-xs font-semibold transition",
              mode === "manual"
                ? "border-accent bg-accent/10 text-accent"
                : "border-black/10 text-muted hover:border-accent/50"
            )}
          >
            Enter result
          </button>
        </div>

        {/* Digital roll */}
        {mode === "digital" && (
          pendingConfirm && lastRoll !== null ? (
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-accent bg-accent/10">
                <span className="font-mono text-2xl font-bold text-accent">{lastRoll}</span>
              </div>
              <div className="flex flex-1 gap-2">
                <Button className="flex-1 text-xs" onClick={() => recordRoll(lastRoll, "digital")}>
                  Record
                </Button>
                <Button variant="ghost" className="text-xs" onClick={() => { setLastRoll(null); setPendingConfirm(false); }}>
                  Reroll
                </Button>
              </div>
            </div>
          ) : (
            <Button className="w-full" onClick={rollD20}>Roll d20</Button>
          )
        )}

        {/* Manual entry */}
        {mode === "manual" && (
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              max={30}
              placeholder="Result"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = Number(manualValue);
                  if (v > 0) recordRoll(v, "manual");
                }
              }}
              className="flex-1"
            />
            <Button
              className="shrink-0"
              onClick={() => {
                const v = Number(manualValue);
                if (v > 0) recordRoll(v, "manual");
              }}
            >
              Record
            </Button>
          </div>
        )}
      </Card>

      {/* Roll history */}
      <Card>
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted">Roll history</p>
        {rollHistory.length === 0 ? (
          <p className="text-sm text-muted">No rolls recorded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5">
            {rollHistory.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span className="flex-1 text-sm text-foreground">{r.label}</span>
                <span className="shrink-0 text-xs text-muted">
                  {new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
