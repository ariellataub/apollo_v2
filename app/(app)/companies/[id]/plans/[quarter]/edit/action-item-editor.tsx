"use client";

import { X } from "lucide-react";
import type { ActionOwnerType, AppUser } from "@/lib/supabase/types";
import type { ActionItemDraft } from "./types";

type Props = {
  item: ActionItemDraft;
  users: AppUser[];
  onChange: (patch: Partial<ActionItemDraft>) => void;
  onRemove: () => void;
};

export function ActionItemEditor({ item, users, onChange, onRemove }: Props) {
  return (
    <div
      className="apollo-panel-2 rounded-md p-3"
      style={{ borderColor: "var(--apollo-line-soft)" }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={item.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Action item title"
            className="apollo-input"
            style={{ height: 34 }}
          />
          <textarea
            value={item.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
            className="apollo-input"
            style={{ resize: "vertical", lineHeight: 1.5 }}
          />

          <div className="flex flex-wrap items-center gap-4 text-xs text-apollo-mute">
            <span className="font-label">Owner</span>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name={`owner-${item._clientId}`}
                checked={item.owner_type === "Greenfield"}
                onChange={() =>
                  onChange({
                    owner_type: "Greenfield" as ActionOwnerType,
                    owner_external_name: "",
                    owner_external_email: "",
                  })
                }
              />
              Greenfield
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name={`owner-${item._clientId}`}
                checked={item.owner_type === "Company"}
                onChange={() =>
                  onChange({
                    owner_type: "Company" as ActionOwnerType,
                    owner_user_id: null,
                  })
                }
              />
              Company
            </label>
          </div>

          {item.owner_type === "Greenfield" ? (
            <select
              value={item.owner_user_id ?? ""}
              onChange={(e) =>
                onChange({ owner_user_id: e.target.value || null })
              }
              className="apollo-input"
              style={{ height: 34 }}
            >
              <option value="">— Select Greenfield user —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? u.email}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={item.owner_external_name}
                onChange={(e) =>
                  onChange({ owner_external_name: e.target.value })
                }
                placeholder="Company contact name"
                className="apollo-input"
                style={{ height: 34 }}
              />
              <input
                type="email"
                value={item.owner_external_email}
                onChange={(e) =>
                  onChange({ owner_external_email: e.target.value })
                }
                placeholder="Email (optional)"
                className="apollo-input"
                style={{ height: 34 }}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-apollo-mute">
            <span className="font-label">Due</span>
            <input
              type="date"
              value={item.due_date}
              onChange={(e) => onChange({ due_date: e.target.value })}
              className="apollo-input"
              style={{ width: "auto", height: 30, padding: "4px 8px", fontSize: 13 }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded text-apollo-mute hover:bg-apollo-panel hover:text-apollo-bad"
          title="Remove action item"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
