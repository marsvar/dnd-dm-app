"use client";

import { useMemo, useState } from "react";
import type { Monster } from "../lib/models/types";
import { fuzzyIncludes, parseChallenge } from "../lib/engine/selectors";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { Input, Select } from "./ui";

type MonsterPickerProps = {
  monsters: Monster[];
  onPickMonster: (monster: Monster) => void;
  disabled?: boolean;
  emptyMessage?: string;
  listClassName?: string;
};

export function MonsterPicker({
  monsters,
  onPickMonster,
  disabled = false,
  emptyMessage = "No monsters match this search.",
  listClassName = "max-h-[20rem]",
}: MonsterPickerProps) {
  const [monsterQuery, setMonsterQuery] = useState("");
  const [monsterCrFilter, setMonsterCrFilter] = useState("all");
  const [monsterTypeFilter, setMonsterTypeFilter] = useState("all");
  const [highlightedMonsterId, setHighlightedMonsterId] = useState<string | null>(null);

  const crFilterOptions = useMemo(
    () =>
      [...new Set(monsters.map((monster) => monster.challenge))].sort(
        (a, b) => parseChallenge(a) - parseChallenge(b)
      ),
    [monsters]
  );

  const typeFilterOptions = useMemo(
    () =>
      [...new Set(monsters.map((monster) => monster.type))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [monsters]
  );

  const filteredMonsters = useMemo(() => {
    return monsters.filter((monster) => {
      const queryMatch =
        !monsterQuery ||
        fuzzyIncludes(monsterQuery, monster.name) ||
        fuzzyIncludes(monsterQuery, `${monster.type} ${monster.size}`);
      const crMatch =
        monsterCrFilter === "all" || monster.challenge === monsterCrFilter;
      const typeMatch =
        monsterTypeFilter === "all" || monster.type === monsterTypeFilter;
      return queryMatch && crMatch && typeMatch;
    });
  }, [monsterCrFilter, monsterQuery, monsterTypeFilter, monsters]);

  const effectiveHighlightedMonsterId =
    filteredMonsters.find((monster) => monster.id === highlightedMonsterId)?.id ??
    filteredMonsters[0]?.id ??
    null;

  return (
    <div className="space-y-2">
      <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr] md:items-center">
        <Input
          placeholder="Search monsters"
          value={monsterQuery}
          disabled={disabled}
          onChange={(event) => setMonsterQuery(event.target.value)}
          onKeyDown={(event) => {
            if (disabled) {
              return;
            }
            if (
              event.key === "ArrowDown" ||
              event.key === "ArrowUp" ||
              event.key === "ArrowRight" ||
              event.key === "ArrowLeft"
            ) {
              if (!filteredMonsters.length) {
                return;
              }
              event.preventDefault();
              const currentIndex = filteredMonsters.findIndex(
                (monster) => monster.id === effectiveHighlightedMonsterId
              );
              const safeIndex = currentIndex < 0 ? 0 : currentIndex;
              const delta =
                event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
              const nextIndex =
                (safeIndex + delta + filteredMonsters.length) % filteredMonsters.length;
              setHighlightedMonsterId(filteredMonsters[nextIndex].id);
              return;
            }
            if (event.key !== "Enter") {
              return;
            }
            const highlighted =
              filteredMonsters.find(
                (monster) => monster.id === effectiveHighlightedMonsterId
              ) ?? filteredMonsters[0];
            if (!highlighted) {
              return;
            }
            event.preventDefault();
            onPickMonster(highlighted);
          }}
        />
        <Select
          value={monsterCrFilter}
          disabled={disabled}
          onChange={(event) => setMonsterCrFilter(event.target.value)}
        >
          <option value="all">All CR</option>
          {crFilterOptions.map((cr) => (
            <option key={cr} value={cr}>
              CR {cr}
            </option>
          ))}
        </Select>
        <Select
          value={monsterTypeFilter}
          disabled={disabled}
          onChange={(event) => setMonsterTypeFilter(event.target.value)}
        >
          <option value="all">All Types</option>
          {typeFilterOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Showing {filteredMonsters.length} of {monsters.length}
        </span>
      </div>

      <div className={`${listClassName} overflow-auto pr-1`}>
        {!!filteredMonsters.length ? (
          <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredMonsters.map((monster) => {
              const isHighlighted = effectiveHighlightedMonsterId === monster.id;
              return (
                <button
                  key={monster.id}
                  className={`flex min-h-[96px] flex-col rounded-lg border p-2.5 text-left transition ${
                    isHighlighted
                      ? "border-accent bg-surface-strong"
                      : "border-black/5 bg-surface"
                  }`}
                  onMouseEnter={() => setHighlightedMonsterId(monster.id)}
                  onClick={() => onPickMonster(monster)}
                  disabled={disabled}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex items-center gap-2">
                      <ParticipantAvatar
                        name={monster.name}
                        visual={monster.visual}
                        className="h-7 w-7 rounded-md border border-black/10 bg-surface-strong object-cover text-center text-[0.6rem] font-semibold leading-[1.7rem] text-muted"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[0.8rem] font-semibold leading-tight text-foreground">
                          {monster.name}
                        </p>
                        <p className="truncate text-[0.68rem] leading-tight text-muted">
                          {monster.size} {monster.type}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-surface-strong px-1.5 py-0.5 font-mono text-[0.6rem] leading-none text-foreground">
                      CR {monster.challenge}
                    </span>
                  </div>
                  <div className="mt-auto pt-2">
                    <div className="flex items-center gap-1.5 text-[0.65rem] text-muted">
                      <span className="rounded-full bg-surface-strong px-1.5 py-0.5 font-mono leading-none text-foreground">AC {monster.ac}</span>
                      <span className="rounded-full bg-surface-strong px-1.5 py-0.5 font-mono leading-none text-foreground">HP {monster.hp}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-black/10 bg-surface-strong px-3 py-3 text-sm text-muted">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
