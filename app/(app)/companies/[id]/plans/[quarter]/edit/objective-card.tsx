"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { AppUser, PillarSlug } from "@/lib/supabase/types";
import {
  emptyActionItem,
  emptyKpi,
  type ActionItemDraft,
  type KpiDraft,
  type ObjectiveDraft,
} from "./types";
import { KpiEditor } from "./kpi-editor";
import { ActionItemEditor } from "./action-item-editor";

const PILLARS: { slug: PillarSlug; name: string }[] = [
  { slug: "strategy", name: "Market Strategy" },
  { slug: "sales-execution", name: "Sales Execution" },
  { slug: "pipeline-generation", name: "Pipeline Generation" },
  { slug: "people-org", name: "People & Organization" },
  { slug: "operational-infrastructure", name: "Operational Infrastructure" },
  { slug: "partnerships-alliances", name: "Partnerships & Alliances" },
  { slug: "customer-success", name: "Customer Success" },
];

type Props = {
  objective: ObjectiveDraft;
  index: number;
  users: AppUser[];
  onChange: (patch: Partial<ObjectiveDraft>) => void;
  onRemove: () => void;
};

export function ObjectiveCard({
  objective,
  index,
  users,
  onChange,
  onRemove,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  function updateKpi(clientId: string, patch: Partial<KpiDraft>) {
    onChange({
      kpis: objective.kpis.map((k) =>
        k._clientId === clientId ? { ...k, ...patch } : k,
      ),
    });
  }
  function removeKpi(clientId: string) {
    onChange({ kpis: objective.kpis.filter((k) => k._clientId !== clientId) });
  }
  function addKpi() {
    onChange({ kpis: [...objective.kpis, emptyKpi()] });
  }

  function updateActionItem(clientId: string, patch: Partial<ActionItemDraft>) {
    onChange({
      actionItems: objective.actionItems.map((a) =>
        a._clientId === clientId ? { ...a, ...patch } : a,
      ),
    });
  }
  function removeActionItem(clientId: string) {
    onChange({
      actionItems: objective.actionItems.filter((a) => a._clientId !== clientId),
    });
  }
  function addActionItem() {
    onChange({ actionItems: [...objective.actionItems, emptyActionItem()] });
  }

  const pillarChipClass = `apollo-chip apollo-chip-pillar-${objective.pillar_slug}`;
  const pillarName =
    PILLARS.find((p) => p.slug === objective.pillar_slug)?.name ?? objective.pillar_slug;

  return (
    <div className="apollo-panel">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown size={16} className="text-apollo-mute flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-apollo-mute flex-shrink-0" />
        )}
        <span
          className="font-label text-[10px] uppercase tracking-wider text-apollo-mute"
          style={{ minWidth: 56 }}
        >
          Objective {index + 1}
        </span>
        <span className={pillarChipClass}>{pillarName}</span>
        <div className="text-sm flex-1 min-w-0 truncate" style={{ fontWeight: 600 }}>
          {objective.title || (
            <span className="italic text-apollo-mute">Untitled</span>
          )}
        </div>
        <span className="font-label text-xs text-apollo-mute">
          {objective.kpis.length} {objective.kpis.length === 1 ? "KPI" : "KPIs"} &middot;{" "}
          {objective.actionItems.length} action
          {objective.actionItems.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded text-apollo-mute hover:bg-apollo-panel2 hover:text-apollo-bad"
          title="Remove objective"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-apollo-line-soft p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_240px]">
            <input
              type="text"
              value={objective.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Objective title"
              className="apollo-input"
            />
            <select
              value={objective.pillar_slug}
              onChange={(e) =>
                onChange({ pillar_slug: e.target.value as PillarSlug })
              }
              className="apollo-input"
            >
              {PILLARS.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="font-label mb-1.5 text-[10px] uppercase tracking-wider text-apollo-mute">
              Rationale
            </div>
            <textarea
              value={objective.rationale}
              onChange={(e) => onChange({ rationale: e.target.value })}
              placeholder="Why this objective matters this quarter"
              rows={2}
              className="apollo-input"
              style={{ resize: "vertical", lineHeight: 1.55 }}
            />
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <div className="font-label text-[10px] uppercase tracking-wider text-apollo-mute">
                KPIs
              </div>
              <button
                type="button"
                onClick={addKpi}
                className="font-label inline-flex items-center gap-1 text-xs text-apollo-accent hover:underline"
              >
                <Plus size={12} /> Add KPI
              </button>
            </div>
            {objective.kpis.length === 0 ? (
              <div className="text-xs italic text-apollo-mute">No KPIs yet.</div>
            ) : (
              <div className="space-y-2">
                {objective.kpis.map((k) => (
                  <KpiEditor
                    key={k._clientId}
                    kpi={k}
                    onChange={(patch) => updateKpi(k._clientId, patch)}
                    onRemove={() => removeKpi(k._clientId)}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <div className="font-label text-[10px] uppercase tracking-wider text-apollo-mute">
                Action items
              </div>
              <button
                type="button"
                onClick={addActionItem}
                className="font-label inline-flex items-center gap-1 text-xs text-apollo-accent hover:underline"
              >
                <Plus size={12} /> Add action item
              </button>
            </div>
            {objective.actionItems.length === 0 ? (
              <div className="text-xs italic text-apollo-mute">
                No action items yet.
              </div>
            ) : (
              <div className="space-y-2">
                {objective.actionItems.map((a) => (
                  <ActionItemEditor
                    key={a._clientId}
                    item={a}
                    users={users}
                    onChange={(patch) => updateActionItem(a._clientId, patch)}
                    onRemove={() => removeActionItem(a._clientId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
