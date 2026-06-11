"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { IntakeUploadZone } from "./intake-upload-zone";

type Props = {
  companyId: string;
  companyName: string;
  defaultQuarter: string;
  quarterOptions: string[];
};

export function AddAssessmentButton(props: Props) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="mt-6 border-t border-apollo-line-soft pt-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm" style={{ fontWeight: 600 }}>
            Upload assessment for another quarter
          </div>
          <button
            type="button"
            className="font-label inline-flex items-center gap-1 text-xs text-apollo-mute hover:text-apollo-ink"
            onClick={() => setOpen(false)}
          >
            <X size={12} /> Cancel
          </button>
        </div>
        <IntakeUploadZone {...props} />
      </div>
    );
  }

  return (
    <div className="mt-4 flex justify-end">
      <button
        type="button"
        className="apollo-btn-ghost"
        onClick={() => setOpen(true)}
      >
        <Plus size={14} /> Upload another quarter
      </button>
    </div>
  );
}
