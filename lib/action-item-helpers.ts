import type {
  ActionItem,
  ActionItemStatus,
  AppUser,
} from "@/lib/supabase/types";

export type DisplayStatus =
  | "Overdue"
  | "InProgress"
  | "NotStarted"
  | "Blocked"
  | "Done";

/**
 * Wireframe collapses overdue into its own visual state. Compute it here so
 * the calendar / overdue panel / modal all agree on what "overdue" means:
 * any item that has a due_date in the past and isn't yet Done.
 */
export function deriveDisplayStatus(
  item: ActionItem,
  now: Date = new Date(),
): DisplayStatus {
  if (item.status === "Done") return "Done";
  if (item.due_date) {
    const due = new Date(item.due_date + "T00:00:00");
    if (due.getTime() < startOfDay(now).getTime()) return "Overdue";
  }
  return item.status as DisplayStatus;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function statusClassName(status: DisplayStatus): string {
  switch (status) {
    case "Overdue":
      return "apollo-cal-item-overdue";
    case "InProgress":
      return "apollo-cal-item-in-progress";
    case "Done":
      return "apollo-cal-item-done";
    case "Blocked":
      return "apollo-cal-item-blocked";
    default:
      return "apollo-cal-item-not-started";
  }
}

export function statusLabel(status: DisplayStatus): string {
  if (status === "InProgress") return "In progress";
  if (status === "NotStarted") return "Not started";
  return status;
}

export function statusChipClass(status: DisplayStatus): string {
  // Reuse existing chip palettes for visual consistency.
  switch (status) {
    case "Overdue":
      return "apollo-chip apollo-chip-priority-Critical";
    case "InProgress":
      return "apollo-chip apollo-chip-pillar-people-org"; // blue
    case "Done":
      return "apollo-chip apollo-chip-priority-Light-touch"; // green
    case "Blocked":
      return "apollo-chip apollo-chip-priority-High"; // amber
    default:
      return "apollo-chip apollo-chip-priority-Standard";
  }
}

/** Days between today and the due date (positive = overdue). */
export function daysOverdue(dueDate: string, now: Date = new Date()): number {
  const due = new Date(dueDate + "T00:00:00").getTime();
  const today = startOfDay(now).getTime();
  return Math.floor((today - due) / (24 * 60 * 60 * 1000));
}

/** "Founder" / "Ariella · GF" / "CFO @ Tessera" — display owner label. */
export function ownerLabel(
  item: ActionItem,
  usersById: Map<string, AppUser>,
): string {
  if (item.owner_type === "Greenfield" && item.owner_user_id) {
    const u = usersById.get(item.owner_user_id);
    const name =
      u?.full_name?.split(" ")[0] ?? u?.email?.split("@")[0] ?? "GF";
    return `${name} · GF`;
  }
  return item.owner_external_name ?? "Company";
}

/** "Fri 22 Apr" — wireframe-style short due date. */
export function formatDueShort(dueDate: string): string {
  const d = new Date(dueDate + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Stable status sort: Overdue → InProgress → NotStarted → Blocked → Done */
export function statusOrder(status: ActionItemStatus | DisplayStatus): number {
  switch (status) {
    case "Overdue":
      return 0;
    case "InProgress":
      return 1;
    case "NotStarted":
      return 2;
    case "Blocked":
      return 3;
    case "Done":
      return 4;
    default:
      return 5;
  }
}
