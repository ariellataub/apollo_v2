"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import type { CompanyFormState } from "./actions";
import type { CompanyStatus } from "@/lib/supabase/types";

type LeadOption = { id: string; label: string };

type Defaults = {
  name?: string;
  domain?: string | null;
  sector?: string | null;
  stage?: string | null;
  lead_partner_id?: string | null;
  status?: CompanyStatus;
};

type Props = {
  action: (
    prev: CompanyFormState,
    formData: FormData,
  ) => Promise<CompanyFormState>;
  leadOptions: LeadOption[];
  mode: "add" | "edit";
  defaults?: Defaults;
};

export function CompanyForm({ action, leadOptions, mode, defaults }: Props) {
  const [state, formAction, isPending] = useActionState<CompanyFormState, FormData>(
    action,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (mode === "add" && state?.ok && formRef.current) {
      formRef.current.reset();
    }
  }, [state, mode]);

  const submitLabel =
    mode === "add"
      ? isPending
        ? "Adding…"
        : "Add company"
      : isPending
        ? "Saving…"
        : "Save changes";

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label
          htmlFor="name"
          className="font-label mb-1.5 block text-xs uppercase tracking-wider text-apollo-mute"
        >
          Company name <span className="text-apollo-bad">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="apollo-input"
          placeholder="e.g. Tessera Foods"
          defaultValue={defaults?.name ?? ""}
        />
      </div>

      <div className="md:col-span-2">
        <label
          htmlFor="domain"
          className="font-label mb-1.5 block text-xs uppercase tracking-wider text-apollo-mute"
        >
          Domain
        </label>
        <input
          id="domain"
          name="domain"
          type="text"
          className="apollo-input"
          placeholder="e.g. acme.com"
          defaultValue={defaults?.domain ?? ""}
        />
      </div>

      <div>
        <label
          htmlFor="sector"
          className="font-label mb-1.5 block text-xs uppercase tracking-wider text-apollo-mute"
        >
          Sector
        </label>
        <input
          id="sector"
          name="sector"
          type="text"
          className="apollo-input"
          placeholder="e.g. CPG, Fintech, Health"
          defaultValue={defaults?.sector ?? ""}
        />
      </div>

      <div>
        <label
          htmlFor="stage"
          className="font-label mb-1.5 block text-xs uppercase tracking-wider text-apollo-mute"
        >
          Stage
        </label>
        <input
          id="stage"
          name="stage"
          type="text"
          className="apollo-input"
          placeholder="e.g. Seed, Series A, Growth"
          defaultValue={defaults?.stage ?? ""}
        />
      </div>

      <div>
        <label
          htmlFor="lead_partner_id"
          className="font-label mb-1.5 block text-xs uppercase tracking-wider text-apollo-mute"
        >
          Lead partner
        </label>
        <select
          id="lead_partner_id"
          name="lead_partner_id"
          className="apollo-input"
          defaultValue={defaults?.lead_partner_id ?? ""}
        >
          <option value="">— None —</option>
          {leadOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="status"
          className="font-label mb-1.5 block text-xs uppercase tracking-wider text-apollo-mute"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaults?.status ?? "Active"}
          className="apollo-input"
        >
          <option value="Active">Active</option>
          <option value="Watch">Watch</option>
          <option value="Exited">Exited</option>
        </select>
      </div>

      {state?.error ? (
        <div
          className="rounded-md border p-3 text-sm md:col-span-2"
          style={{
            borderColor: "#ecc4c0",
            background: "#fdf3f1",
            color: "#9b2f2f",
          }}
        >
          {state.error}
        </div>
      ) : null}

      {mode === "add" && state?.ok ? (
        <div
          className="rounded-md border p-3 text-sm md:col-span-2"
          style={{
            borderColor: "#d6e6dc",
            background: "#eaf2ed",
            color: "#1f5d3f",
          }}
        >
          Company added.
        </div>
      ) : null}

      <div className="md:col-span-2 flex justify-end gap-2">
        {mode === "edit" ? (
          <Link href="/settings" className="apollo-btn-ghost">
            Cancel
          </Link>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="apollo-btn disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
