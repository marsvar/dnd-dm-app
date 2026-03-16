"use client";

import { useState } from "react";
import { Button, ConditionPicker, Input, Popover, PopoverContent, PopoverTrigger } from "./ui";
import { SRD_CONDITIONS } from "../lib/data/srd";

interface Props {
  participantName: string;
  onDamage: (amount: number) => void;
  onHeal: (amount: number) => void;
  currentConditions?: string[];
  onConditionsChange?: (next: string[]) => void;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickActionPopover = ({
  participantName,
  onDamage,
  onHeal,
  currentConditions,
  onConditionsChange,
  children,
  open,
  onOpenChange,
}: Props) => {
  const [value, setValue] = useState("");

  const amount = parseInt(value, 10);
  const valid = !isNaN(amount) && amount > 0;

  const handleDamage = () => {
    if (!valid) return;
    onDamage(amount);
    setValue("");
    onOpenChange(false);
  };

  const handleHeal = () => {
    if (!valid) return;
    onHeal(amount);
    setValue("");
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleDamage();
    if (e.key === "Escape") onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-56"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const input = document.getElementById(`quick-action-input-${participantName}`);
          if (input) (input as HTMLInputElement).focus();
        }}
      >
        <p className="mb-2 text-xs uppercase tracking-[0.15em] text-muted">
          {participantName}
        </p>
        <Input
          id={`quick-action-input-${participantName}`}
          type="number"
          min={1}
          placeholder="Amount…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="mb-3 font-mono"
        />
        <div className="flex gap-2">
          <Button
            onClick={handleDamage}
            disabled={!valid}
            className="flex-1 text-sm font-semibold"
            style={
              valid
                ? {
                    backgroundColor: "var(--btn-damage-bg)",
                    color: "var(--btn-damage-fg)",
                  }
                : undefined
            }
          >
            − Damage
          </Button>
          <Button
            onClick={handleHeal}
            disabled={!valid}
            className="flex-1 text-sm font-semibold"
            style={
              valid
                ? {
                    backgroundColor: "var(--btn-heal-bg)",
                    color: "var(--btn-heal-fg)",
                  }
                : undefined
            }
          >
            + Heal
          </Button>
        </div>
        {onConditionsChange && (
          <div className="mt-3 border-t border-black/10 pt-3">
            <p className="mb-1.5 text-xs uppercase tracking-[0.15em] text-muted">Conditions</p>
            <ConditionPicker
              conditions={SRD_CONDITIONS}
              active={currentConditions ?? []}
              onChange={onConditionsChange}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
