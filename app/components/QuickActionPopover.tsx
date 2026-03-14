"use client";

import { useRef, useState } from "react";
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from "./ui";

interface Props {
  participantName: string;
  onDamage: (amount: number) => void;
  onHeal: (amount: number) => void;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickActionPopover = ({
  participantName,
  onDamage,
  onHeal,
  children,
  open,
  onOpenChange,
}: Props) => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
          inputRef.current?.focus();
        }}
      >
        <p className="mb-2 text-xs uppercase tracking-[0.15em] text-muted">
          {participantName}
        </p>
        <Input
          ref={inputRef}
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
      </PopoverContent>
    </Popover>
  );
};
