"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Upload, X } from "lucide-react";
import { ParticipantAvatar } from "../components/ParticipantAvatar";
import { Button, Card, FieldLabel, Input, PageShell, Pill, SectionTitle, Select } from "../components/ui";
import { useAppStore } from "../lib/store/appStore";
import { parseChallenge } from "../lib/engine/selectors";
import type { Monster } from "../lib/models/types";

// ---------------------------------------------------------------------------
// MonsterImageEditor — file upload + URL fallback, matching PcCard ImageUploader
// ---------------------------------------------------------------------------
function MonsterImageEditor({
  monster,
  onUpdate,
}: {
  monster: Monster;
  onUpdate: (updates: Partial<Monster>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdate({ visual: { fallback: "initials", imageUrl: reader.result as string } });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const currentUrl = monster.visual?.imageUrl;
  const isDataUrl = currentUrl?.startsWith("data:");

  return (
    <div>
      <FieldLabel>Image</FieldLabel>

      {currentUrl ? (
        <div className="mt-1.5 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt={monster.name}
            className="h-16 w-16 rounded-xl border border-black/10 object-cover shrink-0"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onUpdate({ visual: { fallback: "initials", imageUrl: undefined } })}
              className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
            >
              <X className="h-3 w-3" /> Remove
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
          className="mt-1.5 flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-black/15 bg-surface p-4 text-center transition hover:border-accent/50 hover:bg-surface-strong"
        >
          <Upload className="h-4 w-4 text-muted" />
          <span className="text-xs text-muted">Upload image</span>
        </button>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} />

      {/* URL input — shown when no data-url image is set */}
      {!isDataUrl && (
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 text-xs text-muted">or URL:</span>
          <Input
            type="url"
            placeholder="https://…"
            value={isDataUrl ? "" : (currentUrl ?? "")}
            onChange={(e) =>
              onUpdate({
                visual: { fallback: "initials", imageUrl: e.target.value.trim() || undefined },
              })
            }
            className="text-xs"
          />
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  type: "Humanoid",
  size: "Medium",
  alignment: "Unaligned",
  ac: "",
  hp: "",
  speed: "30 ft.",
  challenge: "1/2",
};

export default function BestiaryPage() {
  const { state, addMonster, updateMonster, removeMonster } = useAppStore();
  const [query, setQuery] = useState("");
  const [crFilter, setCrFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const crOptions = useMemo(
    () =>
      [...new Set(state.monsters.map((m) => m.challenge))]
        .sort((a, b) => parseChallenge(a) - parseChallenge(b)),
    [state.monsters]
  );
  const typeOptions = useMemo(
    () => [...new Set(state.monsters.map((m) => m.type))].sort(),
    [state.monsters]
  );
  const [form, setForm] = useState(EMPTY_FORM);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const monsters = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return state.monsters.filter((monster) => {
      const queryMatch = !lowered || monster.name.toLowerCase().includes(lowered);
      const crMatch = crFilter === "all" || monster.challenge === crFilter;
      const typeMatch = typeFilter === "all" || monster.type === typeFilter;
      return queryMatch && crMatch && typeMatch;
    });
  }, [query, crFilter, typeFilter, state.monsters]);

  const handleAdd = () => {
    if (!form.name.trim()) {
      return;
    }
    addMonster({
      name: form.name.trim(),
      type: form.type.trim(),
      size: form.size.trim(),
      alignment: form.alignment.trim(),
      ac: Number(form.ac) || 10,
      hp: Number(form.hp) || 5,
      speed: form.speed.trim(),
      challenge: form.challenge.trim(),
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      traits: [],
      actions: [],
      visual: { fallback: "initials" },
    });
    setForm(EMPTY_FORM);
  };

  return (
    <PageShell>
      {/* Header row: title + add toggle */}
      <div className="flex items-center justify-between">
        <SectionTitle
          title="Bestiary"
          subtitle="SRD creatures plus any custom monsters you add."
        />
        <button
          onClick={() => setIsAddOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-black/10 bg-surface px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <span>{isAddOpen ? "Close" : "+ Add Monster"}</span>
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
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-muted mb-2">Identity</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  { key: "name", label: "Name *" },
                  { key: "type", label: "Type" },
                  { key: "size", label: "Size" },
                  { key: "alignment", label: "Alignment" },
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
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-muted mb-2">Stats</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  { key: "ac", label: "AC", type: "number" },
                  { key: "hp", label: "HP", type: "number" },
                  { key: "speed", label: "Speed" },
                  { key: "challenge", label: "Challenge" },
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
          </div>
          <Button onClick={handleAdd} disabled={!form.name.trim()}>Add monster</Button>
        </div>
      </div>

      {/* Search / filter */}
      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.25em] text-muted">Search</span>
            <Input
              className="w-44"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.25em] text-muted">CR</span>
            <Select
              className="w-28"
              value={crFilter}
              onChange={(e) => setCrFilter(e.target.value)}
            >
              <option value="all">All CR</option>
              {crOptions.map((cr) => (
                <option key={cr} value={cr}>CR {cr}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.25em] text-muted">Type</span>
            <Select
              className="w-36"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </label>
        </div>
      </Card>

      {monsters.length === 0 && (
        <p className="text-sm text-muted">
          No monsters match your search.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {monsters.map((monster) => (
          <Card key={monster.id} className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <ParticipantAvatar name={monster.name} visual={monster.visual} size="md" />
                <div>
                  <h4 className="text-base font-semibold">{monster.name}</h4>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">
                    {monster.size} {monster.type} · {monster.alignment}
                  </p>
                </div>
              </div>
              {monster.source === "Custom" ? (
                <div className="flex items-center gap-2 shrink-0">
                  <Pill label="Custom" tone="accent" />
                  <Button variant="outline" onClick={() => removeMonster(monster.id)}>
                    Remove
                  </Button>
                </div>
              ) : (
                <Pill label="SRD" tone="neutral" className="shrink-0" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill tone="stat" label={`AC ${monster.ac}`} />
              <Pill tone="stat" label={`HP ${monster.hp}`} />
              <Pill tone="stat" label={`CR ${monster.challenge}`} />
              <Pill tone="stat" label={`Speed ${monster.speed}`} />
            </div>
            {monster.traits?.length ? (
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Traits</p>
                <ul className="space-y-0.5 text-sm text-muted">
                  {monster.traits.map((trait, i) => (
                    <li key={i}>{trait}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {monster.actions?.length ? (
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Actions</p>
                <ul className="space-y-0.5 text-sm text-muted">
                  {monster.actions.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {monster.source === "Custom" && (
              <MonsterImageEditor
                monster={monster}
                onUpdate={(updates) => updateMonster(monster.id, updates)}
              />
            )}
          </Card>
        ))}
      </div>

    </PageShell>
  );
}
