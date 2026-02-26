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
