"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, UploadCloud } from "lucide-react";
import { formatQuarter } from "@/lib/quarter";

type Props = {
  companyId: string;
  companyName: string;
  defaultQuarter: string;
  quarterOptions: string[];
};

type UploadState = "idle" | "uploading" | "error";
type Conflict = { status: "Draft" | "Confirmed"; quarter: string } | null;

const MAX_PDF_BYTES = 4 * 1024 * 1024;

export function IntakeUploadZone({
  companyId,
  companyName,
  defaultQuarter,
  quarterOptions,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [quarter, setQuarter] = useState<string>(defaultQuarter);
  const [conflict, setConflict] = useState<Conflict>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Pre-flight conflict check whenever the quarter changes (and on mount).
  // Aborted on re-trigger so a slow request can't overwrite newer state.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `/api/companies/${companyId}/assessments?quarter=${quarter}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setConflict(null);
          return;
        }
        const body = (await res.json()) as {
          exists: boolean;
          status?: "Draft" | "Confirmed";
          quarter?: string;
        };
        if (body.exists && body.status && body.quarter) {
          setConflict({ status: body.status, quarter: body.quarter });
        } else {
          setConflict(null);
        }
      } catch {
        // Network error or abort — treat as "no known conflict" and let
        // the POST surface a 409 if one arises at submit time.
      }
    })();
    return () => controller.abort();
  }, [companyId, quarter]);

  function validateFile(file: File): string | null {
    if (file.type !== "application/pdf") return "File must be a PDF.";
    if (file.size > MAX_PDF_BYTES) {
      return `PDF must be smaller than ${MAX_PDF_BYTES / 1024 / 1024} MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB).`;
    }
    return null;
  }

  async function attemptUpload(file: File) {
    setError(null);
    const validation = validateFile(file);
    if (validation) {
      setError(validation);
      setState("error");
      return;
    }
    if (conflict) {
      setPendingFile(file);
      return;
    }
    await doUpload(file, false);
  }

  async function doUpload(file: File, replace: boolean) {
    setPendingFile(null);
    setState("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("quarter", quarter);
    if (replace) formData.append("replace", "true");

    try {
      const res = await fetch(`/api/companies/${companyId}/assessments`, {
        method: "POST",
        body: formData,
      });

      if (res.status === 409) {
        // Race: pre-flight said clear but a row was created in the meantime.
        const body = (await res.json().catch(() => ({}))) as {
          existing?: { status: "Draft" | "Confirmed"; quarter: string };
        };
        if (body.existing) setConflict(body.existing);
        setPendingFile(file);
        setState("idle");
        return;
      }

      if (!res.ok) {
        const { error: msg } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          msg ?? `Upload failed (HTTP ${res.status}). Please try again.`,
        );
        setState("error");
        return;
      }

      // Navigate to the quarter we just uploaded so the user sees what
      // they wrote — important for backfills, where the latest-quarter
      // view would otherwise hide the new row.
      router.replace(`/companies/${companyId}?quarter=${quarter}`);
      setState("idle");
      setConflict(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error. Please retry.",
      );
      setState("error");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) attemptUpload(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) attemptUpload(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  const dropzoneDisabled = state === "uploading" || pendingFile !== null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label
          htmlFor="assessment-quarter"
          className="font-label text-[10px] uppercase tracking-wider text-apollo-mute"
        >
          Assessment quarter
        </label>
        <select
          id="assessment-quarter"
          value={quarter}
          onChange={(e) => setQuarter(e.target.value)}
          disabled={state === "uploading"}
          className="apollo-input"
          style={{ width: "auto", minWidth: 140, height: 34, padding: "4px 10px" }}
        >
          {quarterOptions.map((q) => (
            <option key={q} value={q}>
              {formatQuarter(q)}
            </option>
          ))}
        </select>
        {conflict && !pendingFile ? (
          <span className="font-label inline-flex items-center gap-1 text-xs text-apollo-mute">
            <AlertTriangle size={12} />
            {conflict.status} assessment already exists for this quarter
          </span>
        ) : null}
      </div>

      {pendingFile ? (
        <div
          className="apollo-panel mb-3 p-4"
          style={{
            borderColor: "#e5d4a8",
            background: "#fbf6e8",
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={18}
              style={{ color: "#8c4f1c", flexShrink: 0, marginTop: 2 }}
            />
            <div className="flex-1">
              <div className="text-sm" style={{ fontWeight: 600, color: "#5a3c14" }}>
                An assessment already exists for {companyName} {formatQuarter(quarter)}
                {conflict ? ` (${conflict.status})` : ""}.
              </div>
              <div className="mt-1 text-xs" style={{ color: "#7a5520" }}>
                Replacing will overwrite the PDF and re-parse from scratch,
                discarding any manual edits.
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="apollo-btn-ghost"
                  onClick={() => setPendingFile(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="apollo-btn"
                  onClick={() => doUpload(pendingFile, true)}
                >
                  Replace it
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="apollo-panel"
        style={{
          padding: 32,
          minHeight: 220,
          borderStyle: "dashed",
          borderColor: isDragging ? "var(--apollo-accent)" : "var(--apollo-line)",
          background: isDragging ? "#f4f9f5" : "var(--apollo-panel)",
          cursor: dropzoneDisabled ? "default" : "pointer",
          opacity: pendingFile ? 0.6 : 1,
          transition: "background 0.15s, border-color 0.15s, opacity 0.15s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={dropzoneDisabled ? undefined : openPicker}
        onDrop={dropzoneDisabled ? undefined : handleDrop}
        onDragOver={dropzoneDisabled ? undefined : handleDragOver}
        onDragLeave={dropzoneDisabled ? undefined : handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !dropzoneDisabled) {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {state === "uploading" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2
              size={32}
              className="animate-spin"
              style={{ color: "var(--apollo-accent)" }}
            />
            <div className="text-sm" style={{ fontWeight: 600 }}>
              Reading the assessment&hellip;
            </div>
            <div className="text-xs text-apollo-mute">
              Claude is extracting structured fields from the PDF. This usually
              takes 10&ndash;30 seconds.
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <UploadCloud size={32} style={{ color: "var(--apollo-mute)" }} />
            <div className="text-base" style={{ fontWeight: 600 }}>
              Drop the Orion PDF here
              <span className="text-apollo-mute">
                {" "}
                or click to choose a file
              </span>
            </div>
            <div className="text-xs text-apollo-mute">
              For {companyName} &middot; {formatQuarter(quarter)} &middot; max 4
              MB &middot; PDF only
            </div>
          </div>
        )}
      </div>

      {state === "error" && error ? (
        <div
          className="mt-3 rounded-md border p-3 text-sm"
          style={{
            borderColor: "#ecc4c0",
            background: "#fdf3f1",
            color: "#9b2f2f",
          }}
        >
          {error}
        </div>
      ) : null}
    </>
  );
}
