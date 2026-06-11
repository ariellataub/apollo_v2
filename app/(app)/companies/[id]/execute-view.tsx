"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type {
  ActionItem,
  ActionItemUpdate,
  AppUser,
  HealthAssessment,
  Kpi,
  KpiReading,
  Objective,
  Plan,
} from "@/lib/supabase/types";
import {
  currentMonth as currentMonthFn,
  planTimelineCaption,
  quarterMonths as quarterMonthsFn,
} from "@/lib/quarter";
import { deriveDisplayStatus } from "@/lib/action-item-helpers";
import { KpiTile } from "./kpi-tile";
import { OverduePanel } from "./overdue-panel";
import { WorkplanCalendar } from "./workplan-calendar";
import { ActionItemModal } from "./action-item-modal";
import { LogReadingModal } from "./log-reading-modal";

type Props = {
  companyId: string;
  companyName: string;
  plan: Plan;
  assessment: HealthAssessment;
  objectives: Objective[];
  kpis: Kpi[];
  kpiReadings: KpiReading[];
  actionItems: ActionItem[];
  actionItemUpdates: ActionItemUpdate[];
  users: AppUser[];
};

export function ExecuteView({
  companyId,
  companyName,
  plan,
  assessment,
  objectives,
  kpis,
  kpiReadings,
  actionItems,
  actionItemUpdates,
  users,
}: Props) {
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [logTarget, setLogTarget] = useState<{
    kpi: Kpi;
    presetMonth?: string;
  } | null>(null);

  const months = quarterMonthsFn(plan.quarter);
  const thisMonth = currentMonthFn();

  const objectivesById = new Map(objectives.map((o) => [o.id, o]));
  const usersById = new Map(users.map((u) => [u.id, u]));
  const readingsByKpi = new Map<string, KpiReading[]>();
  for (const r of kpiReadings) {
    const arr = readingsByKpi.get(r.kpi_id) ?? [];
    arr.push(r);
    readingsByKpi.set(r.kpi_id, arr);
  }
  const updatesByItem = new Map<string, ActionItemUpdate[]>();
  for (const u of actionItemUpdates) {
    const arr = updatesByItem.get(u.action_item_id) ?? [];
    arr.push(u);
    updatesByItem.set(u.action_item_id, arr);
  }
  // Updates are typically inserted in chronological order; sort to be safe.
  for (const arr of updatesByItem.values()) {
    arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const overdueItems = actionItems.filter(
    (i) => deriveDisplayStatus(i) === "Overdue",
  );

  const openItem = openItemId
    ? actionItems.find((i) => i.id === openItemId) ?? null
    : null;
  const openItemPillar = openItem
    ? objectivesById.get(openItem.objective_id)?.pillar_slug ?? "strategy"
    : "strategy";

  return (
    <>
      {/* ============ Header ============ */}
      <div className="font-label mb-4 flex items-center gap-2 text-xs text-apollo-mute">
        <Link href="/portfolio" className="hover:text-apollo-ink">
          Portfolio
        </Link>
        <span>›</span>
        <span className="text-apollo-ink">{companyName}</span>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-3 text-2xl" style={{ fontWeight: 600 }}>
            {companyName}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {assessment.health_score != null ? (
              <span
                className={`apollo-health-pill apollo-health-${assessment.health_score}`}
              >
                {assessment.health_score}
              </span>
            ) : null}
            {assessment.priority ? (
              <span
                className={`apollo-chip apollo-chip-priority-${assessment.priority}`}
              >
                {assessment.priority}
              </span>
            ) : null}
            <span className="apollo-chip apollo-chip-stage-executing">
              Executing
            </span>
            <span className="ml-1 text-xs text-apollo-mute">
              {planTimelineCaption(plan.activated_at, plan.quarter)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/companies/${companyId}/plans/${plan.quarter}`}
            className="apollo-btn-ghost"
          >
            View plan
          </Link>
          <button
            type="button"
            className="apollo-btn-ghost"
            title="Slack channel — coming in Phase 4"
            disabled
          >
            <MessageSquare size={14} />
            #{companyName.toLowerCase().replace(/\s+/g, "-")}
          </button>
        </div>
      </div>

      {/* ============ KPI Dashboard ============ */}
      <div className="apollo-panel mb-8 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base" style={{ fontWeight: 600 }}>
              KPI Dashboard
            </div>
            <div className="mt-1 text-xs text-apollo-mute">
              Monthly readings logged manually for now. Automated email
              round-trip ships in Phase 5.
            </div>
          </div>
        </div>

        {kpis.length === 0 ? (
          <div className="text-sm italic text-apollo-mute">
            No KPIs on this plan.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {kpis.map((kpi) => (
              <KpiTile
                key={kpi.id}
                kpi={kpi}
                quarterMonths={months}
                currentMonth={thisMonth}
                readings={readingsByKpi.get(kpi.id) ?? []}
                onLogReading={(k, preset) =>
                  setLogTarget({ kpi: k, presetMonth: preset })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* ============ Overdue ============ */}
      <OverduePanel
        items={overdueItems}
        usersById={usersById}
        objectivesById={objectivesById}
        onItemClick={setOpenItemId}
      />

      {/* ============ Workplan calendar ============ */}
      <WorkplanCalendar
        items={actionItems}
        initialMonth={new Date()}
        onItemClick={setOpenItemId}
      />

      {/* ============ Modals ============ */}
      {openItem ? (
        <ActionItemModal
          item={openItem}
          updates={updatesByItem.get(openItem.id) ?? []}
          usersById={usersById}
          objectivePillar={openItemPillar}
          companyId={companyId}
          onClose={() => setOpenItemId(null)}
        />
      ) : null}

      {logTarget ? (
        <LogReadingModal
          kpi={logTarget.kpi}
          quarterMonths={months}
          presetMonth={logTarget.presetMonth}
          companyId={companyId}
          onClose={() => setLogTarget(null)}
        />
      ) : null}
    </>
  );
}
