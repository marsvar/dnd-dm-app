export type CreatePcStatus =
  | "completed"
  | "needs_assignment"
  | "conflict"
  | "invalid_context"
  | "invite_revoked"
  | "invite_reserved"
  | "context_bound";

export function isConflictStatus(status: string): boolean {
  return status === "conflict";
}

export function isRecoverableStatus(status: string): boolean {
  return status === "needs_assignment";
}
