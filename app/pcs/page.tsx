"use client";

import { useState } from "react";
import { Button, Checkbox, Input, PageShell, SectionTitle } from "../components/ui";
import { PcCard } from "../components/PcCard";
import { useAppStore } from "../lib/store/appStore";
import { DEFAULT_SKILL_PROFICIENCIES, getProficiencyBonus } from "../lib/engine/pcEngine";
import type { Pc } from "../lib/models/types";
import { ChevronDown } from "lucide-react";

function parseDndBeyondId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/\/characters?\/(\d+)/);
  return match ? match[1] : null;
}

const EMPTY_FORM = {
  name: "",
  playerName: "",
  className: "",
  race: "",
  level: "1",
  maxHp: "",
  ac: "",
  imageUrl: "",
};

export default function PartyPage() {
  const { state, addPc, updatePc, removePc } = useAppStore();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [dndInput, setDndInput] = useState("");
  const [dndLoading, setDndLoading] = useState(false);
  const [dndStatus, setDndStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [persistImportedPc, setPersistImportedPc] = useState(true);

  const handleDndImport = async () => {
    const characterId = parseDndBeyondId(dndInput);
    if (!characterId) {
      setDndStatus({ ok: false, msg: "Enter a character ID (e.g. 144304045) or a dndbeyond.com/characters/… URL." });
      return;
    }
    setDndLoading(true);
    setDndStatus(null);
    try {
      const res = await fetch(`/api/import-dndbeyond?id=${characterId}`);
      const json = await res.json() as { pc?: Omit<Pc, "id">; error?: string };
      if (!res.ok || json.error) {
        setDndStatus({ ok: false, msg: json.error ?? `HTTP ${res.status}` });
      } else if (json.pc) {
        addPc({ ...json.pc, persistToCloud: persistImportedPc });
        setDndInput("");
        setDndStatus({
          ok: true,
          msg: `Imported "${json.pc.name}" (${json.pc.className} ${json.pc.level})${persistImportedPc ? "" : " — local only"}`,
        });
      }
    } catch {
      setDndStatus({ ok: false, msg: "Network error — is the dev server running?" });
    } finally {
      setDndLoading(false);
    }
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const level = Number(form.level) || 1;
    const maxHp = Number(form.maxHp) || 8;
    addPc({
      name: form.name.trim(),
      playerName: form.playerName.trim(),
      className: form.className.trim() || "Adventurer",
      race: form.race.trim(),
      background: "",
      alignment: "",
      experiencePoints: 0,
      level,
      ac: Number(form.ac) || 10,
      maxHp,
      currentHp: maxHp,
      tempHp: 0,
      hitDice: `${level}d8`,
      passivePerception: 10,
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      proficiencyBonus: getProficiencyBonus(level),
      proficiencyBonusAuto: true,
      saveProficiencies: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
      saveBonuses: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      skills: {
        acrobatics: 0, animalHandling: 0, arcana: 0, athletics: 0,
        deception: 0, history: 0, insight: 0, intimidation: 0,
        investigation: 0, medicine: 0, nature: 0, perception: 0,
        performance: 0, persuasion: 0, religion: 0, sleightOfHand: 0,
        stealth: 0, survival: 0,
      },
      skillProficiencies: { ...DEFAULT_SKILL_PROFICIENCIES },
      speed: "30 ft.",
      senses: "",
      proficiencies: "",
      equipment: "",
      resources: [],
      notes: "",
      inspiration: false,
      conditions: [],
      visual: {
        fallback: "initials",
        imageUrl: form.imageUrl.trim() || undefined,
      },
    });
    setForm(EMPTY_FORM);
  };

  const handleUpdate = (id: string) => (updates: Partial<Pc>) => {
    updatePc(id, updates);
  };

  return (
    <PageShell>
      {/* Header row: title + add toggle */}
      <div className="flex items-center justify-between">
        <SectionTitle title="Party" subtitle="Player characters in your campaign." />
        <button
          onClick={() => setIsAddOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-black/10 bg-surface px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <span>{isAddOpen ? "Close" : "+ Add PC"}</span>
          <ChevronDown
            size={12}
            style={{
              display: "inline-block",
              transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
              transform: isAddOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
      </div>

      {/* Collapsible add form */}
      <div
        style={{
          overflow: "hidden",
          maxHeight: isAddOpen ? "24rem" : "0",
          opacity: isAddOpen ? 1 : 0,
          transition: "max-height 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
        }}
      >
        <div className="rounded-2xl border border-black/10 bg-surface p-5 space-y-4">
          {/* Identity fields */}
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-muted mb-2">Identity</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  { key: "name", label: "Name *" },
                  { key: "playerName", label: "Player" },
                  { key: "className", label: "Class" },
                  { key: "race", label: "Race" },
                ] as { key: keyof typeof EMPTY_FORM; label: string }[]
              ).map(({ key, label }) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-xs text-muted">{label}</span>
                  <Input
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
                </label>
              ))}
            </div>
          </div>
          {/* Stats fields */}
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-muted mb-2">Stats</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  { key: "level", label: "Level" },
                  { key: "maxHp", label: "Max HP" },
                  { key: "ac", label: "AC" },
                  { key: "imageUrl", label: "Image URL" },
                ] as { key: keyof typeof EMPTY_FORM; label: string }[]
              ).map(({ key, label }) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-xs text-muted">{label}</span>
                  <Input
                    type={key === "imageUrl" ? "text" : "number"}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
                </label>
              ))}
            </div>
          </div>
          <Button onClick={handleAdd} disabled={!form.name.trim()}>Add PC</Button>
        </div>
      </div>

      {/* PC list */}
      <div className="space-y-6">
        {state.pcs.length === 0 && (
          <div className="rounded-xl border border-black/10 bg-surface-strong px-5 py-8 text-center">
            <p className="text-sm font-medium text-foreground">No player characters yet</p>
            <p className="mt-1 text-sm text-muted">
              Use{" "}
              <button className="text-accent hover:underline" onClick={() => setIsAddOpen(true)}>
                Add PC
              </button>{" "}
              above or import from D&D Beyond below.
            </p>
          </div>
        )}
        {state.pcs.map((pc) => (
          <PcCard
            key={pc.id}
            pc={pc}
            onUpdate={handleUpdate(pc.id)}
            onRemove={() => removePc(pc.id)}
          />
        ))}
      </div>

      {/* D&D Beyond import */}
      <div className="border-t border-black/10 pt-6">
        <SectionTitle title="Import from D&D Beyond" />
        <p className="mt-1 text-xs text-muted">
          Paste a character ID or full dndbeyond.com/characters/… URL. The character must have public sharing enabled.
        </p>
        <div className="mt-3 flex gap-2 items-center">
          <Input
            className="max-w-xs"
            placeholder="144304045 or dndbeyond.com/characters/…"
            value={dndInput}
            onChange={(e) => { setDndInput(e.target.value); setDndStatus(null); }}
            onKeyDown={(e) => e.key === "Enter" && !dndLoading && handleDndImport()}
            disabled={dndLoading}
          />
          <Button onClick={handleDndImport} disabled={dndLoading || !dndInput.trim()}>
            {dndLoading ? "Importing…" : "Import"}
          </Button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Checkbox
            checked={persistImportedPc}
            onChange={(e) => setPersistImportedPc(e.target.checked)}
            disabled={dndLoading}
          />
          <span>Persist to database (sync across devices)</span>
        </label>
        {dndStatus && (
          <p className={`mt-2 text-xs ${dndStatus.ok ? "text-[var(--hp-full)]" : "text-[var(--hp-low)]"}`}>
            {dndStatus.msg}
          </p>
        )}
      </div>
    </PageShell>
  );
}
