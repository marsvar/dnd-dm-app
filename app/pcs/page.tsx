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
  const [dndSyncing, setDndSyncing] = useState(false);
  const [dndSyncStatus, setDndSyncStatus] = useState<{ ok: boolean; msg: string } | null>(null);

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
        addPc({
          ...json.pc,
          persistToCloud: persistImportedPc,
          importSource: "dndbeyond",
          importId: characterId,
        });
        setDndInput("");
        setDndStatus({
          ok: true,
          msg: `Imported "${json.pc.name}" (${json.pc.className} ${json.pc.level})${persistImportedPc ? "" : " — local only"}`,
        });
        setDndSyncStatus(null);
      }
    } catch {
      setDndStatus({ ok: false, msg: "Network error — is the dev server running?" });
    } finally {
      setDndLoading(false);
    }
  };

  const handleDndSyncAll = async () => {
    const importedPcs = state.pcs.filter(
      (pc) => pc.importSource === "dndbeyond" && pc.importId
    );
    if (importedPcs.length === 0) {
      setDndSyncStatus({ ok: false, msg: "No D&D Beyond imports to sync." });
      return;
    }
    setDndSyncing(true);
    setDndSyncStatus(null);
    const results = await Promise.allSettled(
      importedPcs.map(async (pc) => {
        const res = await fetch(`/api/import-dndbeyond?id=${pc.importId}`);
        const json = (await res.json()) as { pc?: Omit<Pc, "id">; error?: string };
        if (!res.ok || json.error || !json.pc) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        updatePc(pc.id, {
          ...json.pc,
          persistToCloud: pc.persistToCloud ?? true,
          importSource: "dndbeyond",
          importId: pc.importId,
          pin: pc.pin ?? null,
        });
      })
    );

    const failures = results.filter((r) => r.status === "rejected");
    const successCount = results.length - failures.length;
    if (failures.length === 0) {
      setDndSyncStatus({
        ok: true,
        msg: `Synced ${successCount} D&D Beyond character${successCount === 1 ? "" : "s"}.`,
      });
    } else {
      const lastFailure = failures[0];
      const errorMsg =
        lastFailure.status === "rejected" && lastFailure.reason instanceof Error
          ? lastFailure.reason.message
          : "Unknown error";
      setDndSyncStatus({
        ok: false,
        msg: `Synced ${successCount}/${results.length}. Last error: ${errorMsg}`,
      });
    }
    setDndSyncing(false);
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
      <SectionTitle title="Party" subtitle="Track your players' characters and stats." />
      <div className="space-y-6">
        {state.pcs.length === 0 && (
          <p className="text-sm text-muted">
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

      <div className="mt-10 border-t border-black/10 pt-6">
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
              <span className="text-xs text-muted">{label}</span>
              <Input
                type={type ?? "text"}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </label>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Checkbox
            checked={persistImportedPc}
            onChange={(e) => setPersistImportedPc(e.target.checked)}
            disabled={dndLoading}
          />
          <span>Persist to database (sync across devices)</span>
        </label>
        {state.pcs.some((pc) => pc.importSource === "dndbeyond" && pc.importId) && (
          <div className="mt-3">
            <Button
              variant="outline"
              onClick={handleDndSyncAll}
              disabled={dndSyncing || dndLoading}
            >
              {dndSyncing ? "Syncing…" : "Sync imported PCs"}
            </Button>
          </div>
        )}
        {dndStatus && (
          <p className={`mt-2 text-xs ${dndStatus.ok ? "text-[var(--hp-full)]" : "text-[var(--hp-low)]"}`}>
            {dndStatus.msg}
          </p>
        )}
        {dndSyncStatus && (
          <p className={`mt-2 text-xs ${dndSyncStatus.ok ? "text-[var(--hp-full)]" : "text-[var(--hp-low)]"}`}>
            {dndSyncStatus.msg}
          </p>
        )}
      </div>
    </PageShell>
  );
}
