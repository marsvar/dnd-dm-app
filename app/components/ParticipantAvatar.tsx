"use client";

import type { ParticipantVisual } from "../lib/models/types";
import { cn } from "./ui";

type ParticipantAvatarProps = {
  name: string;
  visual?: ParticipantVisual;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-7 w-7 rounded-full text-[10px] flex items-center justify-center overflow-hidden shrink-0 bg-surface-strong font-semibold text-muted",
  md: "h-9 w-9 rounded-full text-xs flex items-center justify-center overflow-hidden shrink-0 bg-surface-strong font-semibold text-muted",
  lg: "h-12 w-12 rounded-full text-sm flex items-center justify-center overflow-hidden shrink-0 bg-surface-strong font-semibold text-muted",
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export function ParticipantAvatar({ name, visual, className, size = "md" }: ParticipantAvatarProps) {
  const base = cn(sizeClasses[size], className);

  if (visual?.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={visual.imageUrl}
        alt={name}
        className={base}
        style={{ objectFit: "cover" }}
      />
    );
  }

  return (
    <span className={base} aria-hidden>
      {getInitials(name)}
    </span>
  );
}

