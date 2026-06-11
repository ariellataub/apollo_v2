"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import type {
  ActionItem,
  ActionItemUpdate,
  AppUser,
} from "@/lib/supabase/types";
import {
  deriveDisplayStatus,
  formatDueShort,
  ownerLabel,
  statusChipClass,
  statusLabel,
} from "@/lib/action-item-helpers";
import {
  markActionItemDoneAction,
  postActionItemUpdateAction,
} from "./execute-actions";

type Props = {
  item: ActionItem;
  updates: ActionItemUpdate[];
  usersById: Map<string, AppUser>;
  objectivePillar: string;
  companyId: string;
  onClose: () => void;
};

export function ActionItemModal({
  item,
  updates,
  usersById,
  objectivePillar,
  companyId,
  onClose,
}: Props) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const status = deriveDisplayStatus(item);
  const pillarLabelMap: Record<string, string> = {
    strategy: "Strategy",
    "sales-execution": "Sales Execution",
    "pipeline-generation": "Pipeline Generation",
    "people-org": "People & Org",
    "operational-infrastructure": "Operational Infra",
    "partnerships-alliances": "Partnerships",
    "customer-success": "Customer Success",
  };
  const pillarName = pillarLabelMap[objectivePillar] ?? objectivePillar;

  function onMarkDone() {
    setError(null);
    startTransition(async () => {
      const result = await markActionItemDoneAction(item.id, companyId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  function onPostUpdate() {
    setError(null);
    startTransition(async () => {
      const result = await postActionItemUpdateAction(
        item.id,
        comment,
        companyId,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setComment("");
      router.refresh();
      // Keep modal open so user sees the new entry in the timeline on refresh.
    });
  }

  return (
    <div
      className="apollo-modal-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="apollo-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            padding: "22px 24px",
            borderBottom: "1px solid var(--apollo-line)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="font-label text-xs text-apollo-mute">
                {ownerLabel(item, usersById)}
                {item.due_date ? ` · was due ${formatDueShort(item.due_date)}` : ""}
              </div>
              <h3 className="mt-1 text-xl" style={{ fontWeight: 600 }}>
                {item.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="apollo-btn-ghost"
              style={{ padding: "6px 8px" }}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`apollo-chip apollo-chip-pillar-${objectivePillar}`}>
              {pillarName}
            </span>
            <span className={statusChipClass(status)}>{statusLabel(status)}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {item.description ? (
            <div className="text-sm" style={{ lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
              {item.description}
            </div>
          ) : (
            <div className="text-sm italic text-apollo-mute">No description.</div>
          )}

          <div className="font-label mt-5 mb-3 text-xs uppercase tracking-wider text-apollo-mute">
            Activity
          </div>

          {updates.length === 0 ? (
            <div className="text-sm italic text-apollo-mute">
              No activity yet.
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((u, idx) => {
                const author = u.author_id ? usersById.get(u.author_id) : null;
                const isCreated = u.source === "System" && /^Created on/.test(u.body);
                const dotClass = isCreated
                  ? "apollo-timeline-dot-created"
                  : u.source === "System"
                    ? "apollo-timeline-dot-system"
                    : "apollo-timeline-dot-comment";
                const authorLabel =
                  author?.full_name ??
                  author?.email?.split("@")[0] ??
                  (u.source === "System" ? "Apollo" : "—");
                return (
                  <div key={u.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`apollo-timeline-dot ${dotClass}`} />
                      {idx < updates.length - 1 ? (
                        <div className="apollo-timeline-line" />
                      ) : null}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="font-label text-xs text-apollo-mute">
                        {new Date(u.created_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {u.source === "App" ? ` · ${authorLabel}` : ""}
                      </div>
                      <div className="mt-0.5 text-sm" style={{ whiteSpace: "pre-wrap" }}>
                        {u.body}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add an update or comment…"
              rows={2}
              className="apollo-input"
              style={{ resize: "vertical" }}
              disabled={isPending}
            />
            {error ? (
              <div
                className="mt-2 rounded-md border p-2 text-xs"
                style={{
                  borderColor: "#ecc4c0",
                  background: "#fdf3f1",
                  color: "#9b2f2f",
                }}
              >
                {error}
              </div>
            ) : null}
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onMarkDone}
                disabled={isPending || status === "Done"}
                className="apollo-btn-ghost disabled:cursor-not-allowed disabled:opacity-60"
                title={status === "Done" ? "Already done" : "Mark this action item Done"}
              >
                <Check size={14} /> Mark done
              </button>
              <button
                type="button"
                onClick={onPostUpdate}
                disabled={isPending || !comment.trim()}
                className="apollo-btn disabled:cursor-not-allowed disabled:opacity-60"
              >
                Post update
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
