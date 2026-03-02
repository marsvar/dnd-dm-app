import type { EncounterEvent } from "../engine/encounterEvents";

export type AbilityScores = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

export type Skills = {
  acrobatics: number;
  animalHandling: number;
  arcana: number;
  athletics: number;
  deception: number;
  history: number;
  insight: number;
  intimidation: number;
  investigation: number;
  medicine: number;
  nature: number;
  perception: number;
  performance: number;
  persuasion: number;
  religion: number;
  sleightOfHand: number;
  stealth: number;
  survival: number;
};

/** none = no proficiency, proficient = add prof bonus, expertise = add 2× prof bonus */
export type SkillProficiency = "none" | "proficient" | "expertise";

export type SkillProficiencies = {
  acrobatics: SkillProficiency;
  animalHandling: SkillProficiency;
  arcana: SkillProficiency;
  athletics: SkillProficiency;
  deception: SkillProficiency;
  history: SkillProficiency;
  insight: SkillProficiency;
  intimidation: SkillProficiency;
  investigation: SkillProficiency;
  medicine: SkillProficiency;
  nature: SkillProficiency;
  perception: SkillProficiency;
  performance: SkillProficiency;
  persuasion: SkillProficiency;
  religion: SkillProficiency;
  sleightOfHand: SkillProficiency;
  stealth: SkillProficiency;
  survival: SkillProficiency;
};

export type SaveProficiencies = {
  str: boolean;
  dex: boolean;
  con: boolean;
  int: boolean;
  wis: boolean;
  cha: boolean;
};

// ---------------------------------------------------------------------------
// v8 sub-types
// ---------------------------------------------------------------------------

/**
 * Death save tally for a PC at 0 HP.
 * successes/failures are each clamped 0–3 by the engine.
 * stable=true means the PC has stabilised (3 successes) and stops rolling.
 */
export type DeathSaves = {
  successes: number;
  failures: number;
  stable: boolean;
};

/**
 * Coin purse. All values are whole non-negative numbers.
 * 1 pp = 10 gp = 100 sp = 1000 cp; 1 ep = 5 sp.
 */
export type Currency = {
  pp: number;
  gp: number;
  ep: number;
  sp: number;
  cp: number;
};

/**
 * A class feature, racial trait, or feat with optional limited-use tracking.
 * Features without limited uses omit `uses`/`maxUses`/`recharge`.
 */
export type Feature = {
  id: string;
  name: string;
  description: string;
  uses?: number;
  maxUses?: number;
  /** When uses reset: "Short Rest" | "Long Rest" | "Dawn" | free text */
  recharge?: string;
};

/**
 * Spell slot tracking for one spell level (1–9).
 * `total` is the class maximum; `used` is how many have been expended.
 */
export type SpellSlot = {
  level: number; // 1–9
  total: number;
  used: number;
};

/**
 * Spellcasting header data.
 * `spellcastingAbility` drives getSpellSaveDc and getSpellAttackBonus in pcEngine.
 * `spellSlots` is the per-level slot array.
 */
export type SpellcastingInfo = {
  spellcastingAbility: keyof AbilityScores | null;
  spellSlots: SpellSlot[];
};

/**
 * A weapon on the character sheet.
 * `attackBonus` is the total to-hit modifier (player fills in their own value).
 * `damageBonus` is the flat damage modifier (added on top of damage dice in the roll).
 */
export type Weapon = {
  id: string;
  name: string;
  /** Total to-hit modifier including ability mod + proficiency, e.g. 5 */
  attackBonus: number;
  /** Damage dice expression, e.g. "1d8", "2d6" */
  damageDice: string;
  /** Flat damage modifier, e.g. 3 (shown as +3 in formula) */
  damageBonus: number;
  /** Damage type label, e.g. "slashing", "piercing", "fire" */
  damageType: string;
  /** Range label, e.g. "5 ft." or "20/60 ft." */
  range: string;
  /** Free-text notes: "finesse, versatile (1d10)", "light, thrown" */
  notes: string;
};

// ---------------------------------------------------------------------------
// Core entity types (unchanged shape)
// ---------------------------------------------------------------------------

export type ParticipantVisual = {
  imageUrl?: string;
  fallback: "initials";
};

export type Monster = {
  id: string;
  name: string;
  size: string;
  type: string;
  alignment: string;
  ac: number;
  hp: number;
  speed: string;
  challenge: string;
  abilities: AbilityScores;
  senses?: string;
  languages?: string;
  traits?: string[];
  actions?: string[];
  source: "SRD" | "Custom";
  visual?: ParticipantVisual;
};

export type Pc = {
  id: string;
  name: string;
  playerName: string;
  className: string;
  race: string;
  background: string;
  alignment: string;
  experiencePoints: number;
  level: number;
  ac: number;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  hitDice: string;
  passivePerception: number;
  abilities: AbilityScores;
  proficiencyBonus: number;
  proficiencyBonusAuto: boolean;
  saveProficiencies: SaveProficiencies;
  saveBonuses: AbilityScores;
  skills: Skills;
  /** Per-skill proficiency state; drives auto-computation of skill totals */
  skillProficiencies: SkillProficiencies;
  speed: string;
  senses: string;
  proficiencies: string;
  equipment: string;
  resources: string[];
  notes: string;
  inspiration: boolean;
  conditions: string[];
  visual?: ParticipantVisual;
  // --- v8 ---
  deathSaves: DeathSaves;
  currency: Currency;
  features: Feature[];
  spellcasting: SpellcastingInfo;
  weapons: Weapon[];
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
};

export type EncounterParticipant = {
  id: string;
  name: string;
  kind: "pc" | "monster" | "npc";
  refId?: string;
  initiative: number | null;
  ac: number | null;
  maxHp: number | null;
  currentHp: number | null;
  tempHp: number | null;
  conditions: string[];
  notes?: string;
  visual?: ParticipantVisual;
  /** Mirrors Pc.deathSaves for PC participants at 0 HP; null for monsters/NPCs. */
  deathSaves: DeathSaves | null;
};

export type Campaign = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
};

/** Join entity: which PCs belong to which campaign. */
export type CampaignMember = {
  id: string;
  campaignId: string;
  pcId: string;
};

export type EncounterBaseline = {
  id: string;
  name: string;
  location?: string;
  campaignId?: string;
  round: number;
  isRunning: boolean;
  /** UI mode: 'prep' for initiative setup, 'live' for running combat panel. */
  combatMode?: "prep" | "live";
  /** Lifecycle status. 'completed' marks a finished encounter (read-only). */
  status?: "idle" | "running" | "completed";
  activeParticipantId: string | null;
  participants: EncounterParticipant[];
};

export type Encounter = EncounterBaseline & {
  eventLog: EncounterEvent[];
  eventLogBase?: EncounterBaseline;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  campaignId?: string;
};

export type LogEntry = {
  id: string;
  timestamp: string;
  text: string;
  encounterId?: string;
  campaignId?: string;
  /** 'auto' = generated from encounter events; 'manual' = typed by DM. Defaults to 'manual'. */
  source?: "auto" | "manual";
};

export type AppState = {
  version: number;
  monsters: Monster[];
  pcs: Pc[];
  encounters: Encounter[];
  notes: Note[];
  log: LogEntry[];
  campaigns: Campaign[];
  campaignMembers: CampaignMember[];
  activeCampaignId: string | null;
};
