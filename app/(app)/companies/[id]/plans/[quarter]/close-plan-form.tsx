"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { closePlanAction } from "./plan-actions";

type Props = {
  planId: string;
};

export function ClosePlanForm({ planId }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onClose() {
    setError(null);
    startTransition(async () => {
      const result = await closePlanAction(planId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="text-xs"
          style={{ color: "var(--apollo-ink-soft)", fontWeight: 600 }}
        >
          Close this plan?
        </span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="apollo-btn-ghost"
          style={{ padding: "4px 10px", fontSize: 12 }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="apollo-btn"
          style={{ padding: "4px 10px", fontSize: 12 }}
        >
          {isPending ? "Closing…" : "Yes, close"}
        </button>
        {error ? (
          <span className="text-xs" style={{ color: "var(--apollo-bad)" }}>
            {error}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="apollo-btn-ghost"
      title="Mark this quarter's plan complete"
    >
      <CheckCheck size={14} /> Close plan
    </button>
  );
}
