"use client";

import { useRef, useState } from "react";
import type { Pc, Skills, AbilityScores } from "../lib/models/types";
import {
  Button,
  Checkbox,
  cn,
  ConditionChip,
  FieldLabel,
  HpBar,
  Input,
  Textarea,
} from "./ui";
import { ParticipantAvatar } from "./ParticipantAvatar";
import {
  ABILITY_ABBREV,
  ALL_SKILLS,
  cycleSkillProficiency,
  formatMod,
  getAbilityMod,
  getInitiativeBonus,
  getPassivePerception,
  getProficiencyBonus,
  getSaveTotal,
  getSkillTotal,
  SKILL_ABILITY,
  SKILL_LABELS,
} from "../lib/engine/pcEngine";
import { SRD_CONDITIONS } from "../lib/data/srd";
import { ChevronDown, Upload, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tab = "combat" | "abilities" | "background";

interface PcCardProps {
  pc: Pc;
  onUpdate: (updates: Partial<Pc>) => void;
  onRemove: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUpdate(pc: Pc, onUpdate: (u: Partial<Pc>) => void) {
  return (raw: Partial<Pc>) => {
    const merged: Pc = { ...pc, ...raw };
    const derived: Partial<Pc> = {};

    const autoNowEnabled =
      (raw.level !== undefined && merged.proficiencyBonusAuto) ||
      raw.proficiencyBonusAuto === true;
    if (autoNowEnabled) {
      derived.proficiencyBonus = getProficiencyBonus(merged.level);
      merged.proficiencyBonus = derived.proficiencyBonus;
    }

    derived.passivePerception = getPassivePerception(merged);
    onUpdate({ ...raw, ...derived });
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-black/10 bg-surface px-2 py-1 min-w-[2.75rem]">
      <span className="text-[0.6rem] uppercase tracking-widest text-muted leading-none">{label}</span>
      <span className="font-mono text-sm font-bold text-foreground leading-tight mt-0.5">{value}</span>
    </div>
  );
}

function AbilityBlock({
  abilityKey,
  score,
  onChange,
}: {
  abilityKey: keyof AbilityScores;
  score: number;
  onChange: (value: number) => void;
}) {
  const mod = getAbilityMod(score);
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-black/10 bg-surface p-2 text-center">
      <p className="text-[0.6rem] uppercase tracking-[0.2em] text-muted">
        {ABILITY_ABBREV[abilityKey]}
      </p>
      <p className="text-3xl font-bold text-foreground leading-tight font-mono">
        {formatMod(mod)}
      </p>
      <input
        type="number"
        value={score}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-12 rounded-lg border border-black/10 bg-surface-strong px-1 py-0.5 text-center text-sm font-mono text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-[var(--ring)]"
      />
    </div>
  );
}

function ProfDot({
  state,
  onClick,
}: {
  state: Pc["skillProficiencies"][keyof Skills];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Proficiency: ${state}. Click to cycle.`}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[0.75rem] leading-none transition",
        state === "none" && "text-black/25 hover:text-black/40",
        state === "proficient" && "text-accent",
        state === "expertise" && "text-accent"
      )}
    >
      {state === "none" ? "○" : state === "proficient" ? "●" : "◆"}
    </button>
  );
}

function ImageUploader({
  pc,
  update,
}: {
  pc: Pc;
  update: (u: Partial<Pc>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      update({
        visual: { fallback: "initials", imageUrl: reader.result as string },
      });
    };
    reader.readAsDataURL(file);
    // reset so same file can be re-picked
    e.target.value = "";
  };

  const currentUrl = pc.visual?.imageUrl;
  const isDataUrl = currentUrl?.startsWith("data:");

  return (
    <div>
      <FieldLabel>Character Image</FieldLabel>

      {currentUrl ? (
        <div className="mt-1.5 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt={pc.name}
            className="h-20 w-20 rounded-xl border border-black/10 object-cover shrink-0"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() =>
                update({ visual: { fallback: "initials", imageUrl: undefined } })
              }
              className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
            >
              <X className="h-3 w-3" /> Remove image
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-accent hover:underline text-left"
            >
              Replace from file…
            </button>
            {isDataUrl && (
              <span className="text-[0.6rem] text-muted/60">Stored locally (base64)</span>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-1.5 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 bg-surface p-6 text-center transition hover:border-accent/50 hover:bg-surface-strong"
        >
          <Upload className="h-5 w-5 text-muted" />
          <span className="text-sm text-muted">Click to upload image</span>
          <span className="text-[0.65rem] text-muted/60">PNG, JPG, WebP — stored locally in browser</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
      />

      {/* URL fallback */}
      {!isDataUrl && (
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 text-xs text-muted">or URL:</span>
          <Input
            type="url"
            placeholder="https://…"
            value={isDataUrl ? "" : (currentUrl ?? "")}
            onChange={(e) =>
              update({
                visual: {
                  fallback: "initials",
                  imageUrl: e.target.value.trim() || undefined,
                },
              })
            }
            className="text-xs"
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Combat
// ---------------------------------------------------------------------------
function CombatTab({ pc, update }: { pc: Pc; update: (u: Partial<Pc>) => void }) {
  const [conditionDraft, setConditionDraft] = useState("");
  const initBonus = getInitiativeBonus(pc);

  const addCondition = () => {
    const trimmed = conditionDraft.trim();
    if (!trimmed || pc.conditions.includes(trimmed)) return;
    update({ conditions: [...pc.conditions, trimmed] });
    setConditionDraft("");
  };

  return (
    <div className="space-y-4">
      {/* HP */}
      <div>
        <HpBar current={pc.currentHp} max={pc.maxHp} className="mb-2" />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <FieldLabel>Current HP</FieldLabel>
            <Input
              type="number"
              value={pc.currentHp}
              onChange={(e) => update({ currentHp: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <FieldLabel>Max HP</FieldLabel>
            <Input
              type="number"
              value={pc.maxHp}
              onChange={(e) => update({ maxHp: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <FieldLabel>Temp HP</FieldLabel>
            <Input
              type="number"
              value={pc.tempHp}
              onChange={(e) => update({ tempHp: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      {/* Combat stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <FieldLabel>AC</FieldLabel>
          <Input
            type="number"
            value={pc.ac}
            onChange={(e) => update({ ac: Number(e.target.value) || 10 })}
          />
        </div>
        <div>
          <FieldLabel>Initiative</FieldLabel>
          <div className="flex h-9 items-center rounded-xl border border-black/10 bg-surface px-3 text-sm font-mono font-bold text-foreground">
            {formatMod(initBonus)}
            <span className="ml-1.5 text-xs font-normal text-muted">(DEX)</span>
          </div>
        </div>
        <div>
          <FieldLabel>Speed</FieldLabel>
          <Input value={pc.speed} onChange={(e) => update({ speed: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Hit Dice</FieldLabel>
          <Input value={pc.hitDice} onChange={(e) => update({ hitDice: e.target.value })} />
        </div>
      </div>

      {/* Passive Perception */}
      <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-surface px-3 py-2">
        <span className="text-xs uppercase tracking-widest text-muted">Passive Perception</span>
        <span className="font-mono text-xl font-bold text-foreground">{getPassivePerception(pc)}</span>
        <span className="text-xs text-muted/60">(auto)</span>
      </div>

      {/* Inspiration */}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox
          checked={pc.inspiration}
          onChange={(e) => update({ inspiration: e.target.checked })}
        />
        <span className="font-semibold text-foreground">Inspiration</span>
      </label>

      {/* Conditions */}
      <div>
        <FieldLabel>Conditions</FieldLabel>
        {pc.conditions.length > 0 && (
          <div className="my-2 flex flex-wrap gap-1.5">
            {pc.conditions.map((condition) => (
              <ConditionChip
                key={condition}
                label={condition}
                onRemove={() =>
                  update({ conditions: pc.conditions.filter((c) => c !== condition) })
                }
              />
            ))}
          </div>
        )}
        <datalist id={`conditions-pc-${pc.id}`}>
          {SRD_CONDITIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="flex gap-2">
          <Input
            value={conditionDraft}
            list={`conditions-pc-${pc.id}`}
            placeholder="Add condition…"
            onChange={(e) => setConditionDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCondition()}
            className="flex-1"
          />
          <Button variant="outline" className="shrink-0 px-3 py-1 text-xs" onClick={addCondition}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Abilities & Skills
// ---------------------------------------------------------------------------
function AbilitiesTab({ pc, update }: { pc: Pc; update: (u: Partial<Pc>) => void }) {
  const abilities = ["str", "dex", "con", "int", "wis", "cha"] as const;
  const passivePerc = getPassivePerception(pc);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* ── Left: ability scores + saves ── */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {abilities.map((key) => (
            <AbilityBlock
              key={key}
              abilityKey={key}
              score={pc.abilities[key]}
              onChange={(value) =>
                update({ abilities: { ...pc.abilities, [key]: value } })
              }
            />
          ))}
        </div>

        {/* Proficiency bonus */}
        <div className="rounded-xl border border-black/10 bg-surface px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>Proficiency Bonus</FieldLabel>
            <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
              <Checkbox
                checked={pc.proficiencyBonusAuto}
                onChange={(e) => update({ proficiencyBonusAuto: e.target.checked })}
              />
              Auto (level {pc.level})
            </label>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            {pc.proficiencyBonusAuto ? (
              <span className="font-mono text-lg font-bold text-foreground">+{pc.proficiencyBonus}</span>
            ) : (
              <Input
                type="number"
                value={pc.proficiencyBonus}
                onChange={(e) => update({ proficiencyBonus: Number(e.target.value) || 0 })}
                className="w-20"
              />
            )}
          </div>
        </div>

        {/* Saving throws */}
        <div>
          <FieldLabel className="mb-2">Saving Throws</FieldLabel>
          <div className="space-y-0.5">
            {abilities.map((key) => {
              const total = getSaveTotal(pc, key);
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-surface"
                >
                  <Checkbox
                    checked={pc.saveProficiencies[key]}
                    onChange={(e) =>
                      update({
                        saveProficiencies: { ...pc.saveProficiencies, [key]: e.target.checked },
                      })
                    }
                  />
                  <span className="w-8 text-xs font-semibold uppercase text-muted">
                    {ABILITY_ABBREV[key]}
                  </span>
                  <span className={cn("font-mono text-sm font-semibold", total >= 0 ? "text-foreground" : "text-muted")}>
                    {formatMod(total)}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <span className="text-[0.6rem] text-muted">+bonus</span>
                    <input
                      type="number"
                      value={pc.saveBonuses[key]}
                      onChange={(e) =>
                        update({ saveBonuses: { ...pc.saveBonuses, [key]: Number(e.target.value) || 0 } })
                      }
                      className="w-10 rounded border border-black/10 bg-surface-strong px-1 py-0.5 text-center text-xs font-mono text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right: skills ── */}
      <div>
        <div className="mb-3 flex items-center justify-between rounded-xl border border-black/10 bg-surface px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">Passive Perception</span>
          <span className="font-mono text-xl font-bold text-foreground">{passivePerc}</span>
        </div>

        <FieldLabel className="mb-1.5">Skills — ○ none · ● prof · ◆ expertise</FieldLabel>
        <div className="space-y-0.5">
          {ALL_SKILLS.map((skill) => {
            const profState = pc.skillProficiencies?.[skill] ?? "none";
            const total = getSkillTotal(pc, skill);
            const abilityKey = SKILL_ABILITY[skill];
            const manualBonus = pc.skills?.[skill] ?? 0;

            return (
              <div
                key={skill}
                className="flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-surface"
              >
                <ProfDot
                  state={profState}
                  onClick={() =>
                    update({
                      skillProficiencies: {
                        ...pc.skillProficiencies,
                        [skill]: cycleSkillProficiency(profState),
                      },
                    })
                  }
                />
                <span className="flex-1 text-sm text-foreground">{SKILL_LABELS[skill]}</span>
                <span className="text-[0.6rem] uppercase text-muted">{ABILITY_ABBREV[abilityKey]}</span>
                <input
                  type="number"
                  value={manualBonus}
                  onChange={(e) =>
                    update({ skills: { ...pc.skills, [skill]: Number(e.target.value) || 0 } })
                  }
                  title={`Manual bonus for ${SKILL_LABELS[skill]}`}
                  className={cn(
                    "w-10 rounded border bg-transparent px-1 py-0.5 text-center text-xs font-mono outline-none focus:border-accent",
                    manualBonus !== 0
                      ? "border-accent/40 text-accent"
                      : "border-transparent text-muted/50"
                  )}
                />
                <span
                  className={cn(
                    "w-8 text-right font-mono text-sm font-semibold",
                    profState === "expertise"
                      ? "text-accent"
                      : profState === "proficient"
                        ? "text-foreground"
                        : "text-muted"
                  )}
                >
                  {formatMod(total)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Background & Notes
// ---------------------------------------------------------------------------
function BackgroundTab({ pc, update }: { pc: Pc; update: (u: Partial<Pc>) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <ImageUploader pc={pc} update={update} />
        <div>
          <FieldLabel>Player</FieldLabel>
          <Input value={pc.playerName} onChange={(e) => update({ playerName: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Race</FieldLabel>
          <Input value={pc.race} onChange={(e) => update({ race: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Background</FieldLabel>
          <Input value={pc.background} onChange={(e) => update({ background: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Alignment</FieldLabel>
          <Input value={pc.alignment} onChange={(e) => update({ alignment: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Experience (XP)</FieldLabel>
          <Input
            type="number"
            value={pc.experiencePoints}
            onChange={(e) => update({ experiencePoints: Number(e.target.value) || 0 })}
          />
        </div>
        <div>
          <FieldLabel>Senses</FieldLabel>
          <Input value={pc.senses} onChange={(e) => update({ senses: e.target.value })} />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <FieldLabel>Proficiencies & Languages</FieldLabel>
          <Textarea rows={3} value={pc.proficiencies} onChange={(e) => update({ proficiencies: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Equipment</FieldLabel>
          <Textarea rows={3} value={pc.equipment} onChange={(e) => update({ equipment: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Resources</FieldLabel>
          <Textarea
            rows={2}
            value={pc.resources.join(", ")}
            onChange={(e) =>
              update({ resources: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
            }
          />
        </div>
        <div>
          <FieldLabel>Notes</FieldLabel>
          <Textarea rows={5} value={pc.notes} onChange={(e) => update({ notes: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PcCard — main export
// ---------------------------------------------------------------------------
export function PcCard({ pc, onUpdate, onRemove }: PcCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("combat");
  const update = makeUpdate(pc, onUpdate);

  const initBonus = getInitiativeBonus(pc);
  const passivePerc = getPassivePerception(pc);

  const tabs: { id: Tab; label: string }[] = [
    { id: "combat", label: "Combat" },
    { id: "abilities", label: "Abilities & Skills" },
    { id: "background", label: "Background" },
  ];

  return (
    <div className="rounded-2xl border border-black/10 bg-surface-strong overflow-hidden">
      {/* ── Collapsed header (always visible) ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-surface transition-colors"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
      >
        {/* Avatar */}
        <ParticipantAvatar
          name={pc.name}
          visual={pc.visual}
          className={cn(
            "h-11 w-11 shrink-0 rounded-full border border-black/10 bg-surface object-cover text-sm font-semibold text-muted",
            "flex items-center justify-center"
          )}
        />

        {/* Name + HP */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
            <span className="font-semibold text-foreground truncate">{pc.name}</span>
            <span className="text-xs text-muted shrink-0">{pc.className} Lv {pc.level}</span>
            {pc.race && (
              <span className="text-xs text-muted/60 shrink-0">· {pc.race}</span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <HpBar current={pc.currentHp} max={pc.maxHp} className="h-1.5 w-24 shrink-0" />
            <span className="text-xs font-mono text-muted">
              {pc.currentHp}/{pc.maxHp} HP
              {pc.tempHp > 0 && <span className="text-accent"> +{pc.tempHp}</span>}
            </span>
          </div>
        </div>

        {/* Stat badges */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <StatBadge label="AC" value={pc.ac} />
          <StatBadge label="Init" value={formatMod(initBonus)} />
          <StatBadge label="PP" value={passivePerc} />
        </div>

        {/* Conditions (collapsed, max 2) */}
        {pc.conditions.length > 0 && (
          <div className="hidden md:flex items-center gap-1 shrink-0">
            {pc.conditions.slice(0, 2).map((c) => (
              <ConditionChip key={c} label={c} />
            ))}
            {pc.conditions.length > 2 && (
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted border border-black/10">
                +{pc.conditions.length - 2}
              </span>
            )}
          </div>
        )}

        {pc.inspiration && (
          <span
            title="Inspiration"
            className="hidden sm:flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[0.65rem] font-bold text-surface shrink-0"
          >
            ★
          </span>
        )}

        {/* Expand chevron */}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted transition-transform duration-200 shrink-0",
            expanded && "rotate-180"
          )}
        />
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        <>
          {/* Remove button row */}
          <div className="flex items-center justify-between border-t border-black/5 px-4 py-1.5">
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
              <label className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                Class:
                <input
                  value={pc.className}
                  onChange={(e) => update({ className: e.target.value })}
                  className="ml-0.5 bg-transparent text-foreground outline-none focus:underline focus:decoration-accent"
                />
              </label>
              <label className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                Lv:
                <input
                  type="number"
                  value={pc.level}
                  onChange={(e) => update({ level: Number(e.target.value) || 1 })}
                  className="ml-0.5 w-8 bg-transparent text-foreground outline-none focus:underline focus:decoration-accent"
                />
              </label>
              <label className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                Name:
                <input
                  value={pc.name}
                  onChange={(e) => update({ name: e.target.value })}
                  className="ml-0.5 bg-transparent text-foreground outline-none focus:underline focus:decoration-accent"
                />
              </label>
            </div>
            <Button
              variant="outline"
              className="shrink-0 text-xs px-2 py-0.5"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
            >
              Remove PC
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-black/10 px-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); setTab(t.id); }}
                className={cn(
                  "pb-2 pr-5 text-sm transition",
                  tab === t.id
                    ? "border-b-2 border-accent font-semibold text-foreground"
                    : "text-muted hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {tab === "combat" && <CombatTab pc={pc} update={update} />}
            {tab === "abilities" && <AbilitiesTab pc={pc} update={update} />}
            {tab === "background" && <BackgroundTab pc={pc} update={update} />}
          </div>
        </>
      )}
    </div>
  );
}
