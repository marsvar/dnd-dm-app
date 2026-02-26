"use client";

import { useState } from "react";
import { Button, Input, PageShell, SectionTitle } from "../components/ui";
import { PcCard } from "../components/PcCard";
import { useAppStore } from "../lib/store/appStore";
import { DEFAULT_SKILL_PROFICIENCIES, getProficiencyBonus } from "../lib/engine/pcEngine";
import type { Pc } from "../lib/models/types";

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
    <PageShell title="Party Tracker">
      <div className="space-y-6">
        {state.pcs.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">
            No PCs yet — add one below.
          </p>
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

      <div className="mt-10 border-t border-[var(--color-border)] pt-6">
        <SectionTitle title="Add PC" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-4">
          {(
            [
              { key: "name", label: "Name *" },
              { key: "playerName", label: "Player" },
              { key: "className", label: "Class" },
              { key: "race", label: "Race" },
              { key: "level", label: "Level", type: "number" },
              { key: "maxHp", label: "Max HP", type: "number" },
              { key: "ac", label: "AC", type: "number" },
              { key: "imageUrl", label: "Image URL" },
            ] as { key: keyof typeof EMPTY_FORM; label: string; type?: string }[]
          ).map(({ key, label, type }) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
              <Input
                type={type ?? "text"}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </label>
          ))}
        </div>
        <Button className="mt-4" onClick={handleAdd}>
          Add PC
        </Button>
      </div>
    </PageShell>
  );
}
