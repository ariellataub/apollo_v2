"use client";

import { AlertTriangle } from "lucide-react";
import type { ActionItem, AppUser } from "@/lib/supabase/types";
import {
  daysOverdue,
  formatDueShort,
  ownerLabel,
} from "@/lib/action-item-helpers";

type ObjectiveLookup = Map<string, { pillar_slug: string }>;

type Props = {
  items: ActionItem[]; // already filtered to overdue
  usersById: Map<string, AppUser>;
  objectivesById: ObjectiveLookup;
  onItemClick: (itemId: string) => void;
};

export function OverduePanel({
  items,
  usersById,
  objectivesById,
  onItemClick,
}: Props) {
  if (items.length === 0) return null;

  return (
    <div className="apollo-overdue-box mb-8">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={16}
            style={{ color: "var(--apollo-bad)" }}
            aria-hidden
          />
          <div style={{ fontWeight: 600, color: "var(--apollo-bad)" }}>
            Overdue
          </div>
          <span className="font-label text-xs text-apollo-mute">
            {items.length === 1 ? "1 item" : `${items.length} items`}
          </span>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((it) => {
          const obj = objectivesById.get(it.objective_id);
          const pillar = obj?.pillar_slug ?? "strategy";
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onItemClick(it.id)}
              className="apollo-panel text-left"
              style={{
                padding: 14,
                borderColor: "#ecc4c0",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={`apollo-chip apollo-chip-pillar-${pillar}`}>
                  {pillarLabel(pillar)}
                </span>
                <span
                  className="font-label text-xs"
                  style={{ color: "var(--apollo-bad)" }}
                >
                  {daysOverdue(it.due_date!)}d overdue
                </span>
              </div>
              <div className="mt-1 text-sm" style={{ fontWeight: 600 }}>
                {it.title}
              </div>
              <div className="mt-1 text-xs text-apollo-mute">
                {ownerLabel(it, usersById)} · was due {formatDueShort(it.due_date!)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function pillarLabel(slug: string): string {
  const labels: Record<string, string> = {
    strategy: "Strategy",
    "sales-execution": "Sales Execution",
    "pipeline-generation": "Pipeline Generation",
    "people-org": "People & Org",
    "operational-infrastructure": "Operational Infra",
    "partnerships-alliances": "Partnerships",
    "customer-success": "Customer Success",
  };
  return labels[slug] ?? slug;
}
