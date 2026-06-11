import type {
  ActionItem,
  ActionItemStatus,
  ActionOwnerType,
  Kpi,
  KpiCadence,
  KpiDirection,
  Objective,
  PillarSlug,
} from "@/lib/supabase/types";

/**
 * Client-side draft shape for the Plan Builder form state.
 *
 * `_clientId` is a client-only React key for newly-added rows that have no
 * DB id yet. `id` mirrors the DB UUID when present, null for new items.
 * On Draft saves we full-replace the plan tree, so DB ids churn between
 * saves — that's intentional and invisible to the user.
 */

export type KpiDraft = {
  _clientId: string;
  id: string | null;
  name: string;
  unit: string;
  baseline: string;
  target: string;
  direction: KpiDirection;
  cadence: KpiCadence;
};

export type ActionItemDraft = {
  _clientId: string;
  id: string | null;
  title: string;
  description: string;
  owner_type: ActionOwnerType;
  owner_user_id: string | null;
  owner_external_name: string;
  owner_external_email: string;
  due_date: string;
  status: ActionItemStatus;
};

export type ObjectiveDraft = {
  _clientId: string;
  id: string | null;
  title: string;
  rationale: string;
  pillar_slug: PillarSlug;
  kpis: KpiDraft[];
  actionItems: ActionItemDraft[];
};

export type PlanDraft = {
  narrative_summary: string;
  objectives: ObjectiveDraft[];
};

// ---------------------------------------------------------------------
// Builders — empty rows for "+ Add" buttons
// ---------------------------------------------------------------------

function newClientId(): string {
  return crypto.randomUUID();
}

export function emptyKpi(): KpiDraft {
  return {
    _clientId: newClientId(),
    id: null,
    name: "",
    unit: "",
    baseline: "",
    target: "",
    direction: "higher_better",
    cadence: "Monthly",
  };
}

export function emptyActionItem(): ActionItemDraft {
  return {
    _clientId: newClientId(),
    id: null,
    title: "",
    description: "",
    owner_type: "Greenfield",
    owner_user_id: null,
    owner_external_name: "",
    owner_external_email: "",
    due_date: "",
    status: "NotStarted",
  };
}

export function emptyObjective(): ObjectiveDraft {
  return {
    _clientId: newClientId(),
    id: null,
    title: "",
    rationale: "",
    pillar_slug: "strategy",
    kpis: [],
    actionItems: [],
  };
}

// ---------------------------------------------------------------------
// DB rows → draft state
// ---------------------------------------------------------------------

export function objectivesToDrafts(
  objectives: Objective[],
  kpisByObjective: Map<string, Kpi[]>,
  actionsByObjective: Map<string, ActionItem[]>,
): ObjectiveDraft[] {
  return objectives.map((o) => ({
    _clientId: newClientId(),
    id: o.id,
    title: o.title,
    rationale: o.rationale ?? "",
    pillar_slug: o.pillar_slug,
    kpis: (kpisByObjective.get(o.id) ?? []).map((k) => ({
      _clientId: newClientId(),
      id: k.id,
      name: k.name,
      unit: k.unit,
      baseline: k.baseline?.toString() ?? "",
      target: k.target?.toString() ?? "",
      direction: k.direction,
      cadence: k.cadence,
    })),
    actionItems: (actionsByObjective.get(o.id) ?? []).map((a) => ({
      _clientId: newClientId(),
      id: a.id,
      title: a.title,
      description: a.description ?? "",
      owner_type: a.owner_type,
      owner_user_id: a.owner_user_id,
      owner_external_name: a.owner_external_name ?? "",
      owner_external_email: a.owner_external_email ?? "",
      due_date: a.due_date ?? "",
      status: a.status,
    })),
  }));
}
