import type { ActiveRole } from "../store/roleStore";

type CombatPillArgs = {
  pathname: string;
  activeRole: ActiveRole;
  hasRunning: boolean;
};

export function shouldShowCombatActivePill({
  pathname,
  activeRole,
  hasRunning,
}: CombatPillArgs): boolean {
  if (!hasRunning) return false;
  if (activeRole !== "dm") return false;
  if (pathname.startsWith("/player")) return false;
  return pathname !== "/encounters/player";
}
