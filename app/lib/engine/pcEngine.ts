/**
 * pcEngine.ts — Pure functions for deriving PC stats.
 *
 * All computations are deterministic and dependency-free so they can be:
 * - Imported by the DM character sheet (app/components/PcCard.tsx)
 * - Imported by a future player view without store coupling
 * - Tested in isolation (see __tests__/pcEngine.test.ts)
 *
 * The `skills: Skills` field on Pc is treated as a per-skill MANUAL BONUS
 * added on top of the auto-computed total (ability mod + prof multiplier × prof bonus).
 * This allows the DM to apply context-specific overrides (e.g. race bonuses, magical items)
 * without losing the automatic computation.
 */

import type {
  AbilityScores,
  Currency,
  DeathSaves,
  Feature,
  Pc,
  SkillProficiencies,
  SkillProficiency,
  Skills,
  SpellcastingInfo,
  Weapon,
} from "../models/types";

// ---------------------------------------------------------------------------
// Display maps
// ---------------------------------------------------------------------------

export const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

export const ABILITY_ABBREV: Record<keyof AbilityScores, string> = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA",
};

export const SKILL_LABELS: Record<keyof Skills, string> = {
  acrobatics: "Acrobatics",
  animalHandling: "Animal Handling",
  arcana: "Arcana",
  athletics: "Athletics",
  deception: "Deception",
  history: "History",
  insight: "Insight",
  intimidation: "Intimidation",
  investigation: "Investigation",
  medicine: "Medicine",
  nature: "Nature",
  perception: "Perception",
  performance: "Performance",
  persuasion: "Persuasion",
  religion: "Religion",
  sleightOfHand: "Sleight of Hand",
  stealth: "Stealth",
  survival: "Survival",
};

/** Which ability score drives each skill. */
export const SKILL_ABILITY: Record<keyof Skills, keyof AbilityScores> = {
  acrobatics: "dex",
  animalHandling: "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  sleightOfHand: "dex",
  stealth: "dex",
  survival: "wis",
};

/** All 18 skills in display order (alphabetical by label). */
export const ALL_SKILLS = Object.keys(SKILL_LABELS) as (keyof Skills)[];

// ---------------------------------------------------------------------------
// Default values (used for new PCs and migration)
// ---------------------------------------------------------------------------

export const DEFAULT_SKILL_PROFICIENCIES: SkillProficiencies = {
  acrobatics: "none",
  animalHandling: "none",
  arcana: "none",
  athletics: "none",
  deception: "none",
  history: "none",
  insight: "none",
  intimidation: "none",
  investigation: "none",
  medicine: "none",
  nature: "none",
  perception: "none",
  performance: "none",
  persuasion: "none",
  religion: "none",
  sleightOfHand: "none",
  stealth: "none",
  survival: "none",
};

// ---------------------------------------------------------------------------
// Core stat derivations
// ---------------------------------------------------------------------------

/** Standard D&D 5e ability modifier formula. */
export const getAbilityMod = (score: number): number =>
  Math.floor((score - 10) / 2);

/** D&D 5e proficiency bonus by character level. */
export const getProficiencyBonus = (level: number): number => {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
};

/** Multiplier applied to proficiency bonus for a given proficiency state. */
export const profMultiplier = (state: SkillProficiency): number => {
  if (state === "expertise") return 2;
  if (state === "proficient") return 1;
  return 0;
};

/**
 * Full auto-computed skill total:
 * abilityMod + profMultiplier × profBonus + pc.skills[skill] (manual bonus)
 */
export const getSkillTotal = (pc: Pc, skill: keyof Skills): number => {
  const ability = SKILL_ABILITY[skill];
  const abilityMod = getAbilityMod(pc.abilities[ability]);
  const profState = pc.skillProficiencies?.[skill] ?? "none";
  const profBonus = pc.proficiencyBonus;
  const manualBonus = pc.skills?.[skill] ?? 0;
  return abilityMod + profMultiplier(profState) * profBonus + manualBonus;
};

/**
 * Full auto-computed saving throw total:
 * abilityMod + (proficient ? profBonus : 0) + saveBonuses[ability]
 */
export const getSaveTotal = (pc: Pc, ability: keyof AbilityScores): number => {
  const mod = getAbilityMod(pc.abilities[ability]);
  const profBonus = pc.saveProficiencies[ability] ? pc.proficiencyBonus : 0;
  const bonus = pc.saveBonuses?.[ability] ?? 0;
  return mod + profBonus + bonus;
};

/** Passive Perception = 10 + perception skill total (includes proficiency and manual bonus). */
export const getPassivePerception = (pc: Pc): number =>
  10 + getSkillTotal(pc, "perception");

/** Initiative bonus = DEX modifier. */
export const getInitiativeBonus = (pc: Pc): number =>
  getAbilityMod(pc.abilities.dex);

/** Format a number as a signed modifier string: +3, -1, +0 */
export const formatMod = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);

// ---------------------------------------------------------------------------
// Proficiency cycling
// ---------------------------------------------------------------------------

/** Cycles proficiency state on click: none → proficient → expertise → none */
export const cycleSkillProficiency = (
  current: SkillProficiency
): SkillProficiency => {
  if (current === "none") return "proficient";
  if (current === "proficient") return "expertise";
  return "none";
};

// ---------------------------------------------------------------------------
// Default values for v8 fields
// ---------------------------------------------------------------------------

export const DEFAULT_DEATH_SAVES: DeathSaves = {
  successes: 0,
  failures: 0,
  stable: false,
};

export const DEFAULT_CURRENCY: Currency = {
  pp: 0,
  gp: 0,
  ep: 0,
  sp: 0,
  cp: 0,
};

export const DEFAULT_SPELLCASTING: SpellcastingInfo = {
  spellcastingAbility: null,
  spellSlots: [],
};

export const DEFAULT_FEATURES: Feature[] = [];

export const DEFAULT_WEAPONS: Weapon[] = [];

// ---------------------------------------------------------------------------
// Rest mechanics
// ---------------------------------------------------------------------------

/**
 * Returns the Partial<Pc> updates for a long rest:
 * - HP restored to max
 * - All spell slots recovered (used = 0)
 * - All limited-use features recharged (uses = maxUses)
 * - Death saves cleared
 *
 * Does NOT touch conditions or inspiration — those are DM decisions.
 */
export function applyLongRest(pc: Pc): Partial<Pc> {
  return {
    currentHp: pc.maxHp,
    deathSaves: DEFAULT_DEATH_SAVES,
    spellcasting: {
      ...pc.spellcasting,
      spellSlots: (pc.spellcasting?.spellSlots ?? []).map((slot) => ({
        ...slot,
        used: 0,
      })),
    },
    features: pc.features.map((f) =>
      f.maxUses !== undefined && f.uses !== undefined ? { ...f, uses: f.maxUses } : f
    ),
  };
}

/**
 * Returns the Partial<Pc> updates for a short rest:
 * - Features with recharge "Short Rest" are recharged (uses = maxUses)
 * - HP is NOT changed — hit dice rolls are the DM's call
 * - Spell slots are NOT changed (except classes that recharge on short rest
 *   should have their slots tagged as Short Rest features)
 */
export function applyShortRest(pc: Pc): Partial<Pc> {
  return {
    features: pc.features.map((f) =>
      f.maxUses !== undefined && f.uses !== undefined && f.recharge === "Short Rest"
        ? { ...f, uses: f.maxUses }
        : f
    ),
  };
}

// ---------------------------------------------------------------------------
// Spellcasting derivations
// ---------------------------------------------------------------------------

/** Spell Save DC = 8 + proficiency bonus + spellcasting ability modifier. */
export const getSpellSaveDc = (pc: Pc): number | null => {
  const ability = pc.spellcasting?.spellcastingAbility;
  if (!ability) return null;
  return 8 + pc.proficiencyBonus + getAbilityMod(pc.abilities[ability]);
};

/** Spell Attack Bonus = proficiency bonus + spellcasting ability modifier. */
export const getSpellAttackBonus = (pc: Pc): number | null => {
  const ability = pc.spellcasting?.spellcastingAbility;
  if (!ability) return null;
  return pc.proficiencyBonus + getAbilityMod(pc.abilities[ability]);
};

// ---------------------------------------------------------------------------
// Weapon derivations
// ---------------------------------------------------------------------------

/**
 * Human-readable damage formula for a weapon.
 * e.g. weapon with damageDice="1d8", damageBonus=3, damageType="slashing"
 * → "1d8 + 3 slashing"
 */
export const getWeaponDiceFormula = (weapon: Weapon): string => {
  const bonus =
    weapon.damageBonus !== 0
      ? weapon.damageBonus > 0
        ? ` + ${weapon.damageBonus}`
        : ` - ${Math.abs(weapon.damageBonus)}`
      : "";
  return `${weapon.damageDice}${bonus} ${weapon.damageType}`;
};
