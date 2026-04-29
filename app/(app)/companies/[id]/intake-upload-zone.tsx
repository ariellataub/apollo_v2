"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { formatQuarter } from "@/lib/quarter";

type Props = {
  companyId: string;
  companyName: string;
  quarter: string;
};

type UploadState = "idle" | "uploading" | "error";

const MAX_PDF_BYTES = 4 * 1024 * 1024;

export function IntakeUploadZone({ companyId, companyName, quarter }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function uploadFile(file: File) {
    setError(null);

    if (file.type !== "application/pdf") {
      setError("File must be a PDF.");
      setState("error");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError(
        `PDF must be smaller than ${MAX_PDF_BYTES / 1024 / 1024} MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB).`,
      );
      setState("error");
      return;
    }

    setState("uploading");

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch(`/api/companies/${companyId}/assessments`, {
        method: "POST",
        body: formData,
      });

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

      router.refresh();
      setState("idle");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error. Please retry.",
      );
      setState("error");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
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

  return (
    <>
      <div
        className="apollo-panel"
        style={{
          padding: 32,
          minHeight: 220,
          borderStyle: "dashed",
          borderColor: isDragging ? "var(--apollo-accent)" : "var(--apollo-line)",
          background: isDragging ? "#f4f9f5" : "var(--apollo-panel)",
          cursor: state === "uploading" ? "default" : "pointer",
          transition: "background 0.15s, border-color 0.15s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={state === "uploading" ? undefined : openPicker}
        onDrop={state === "uploading" ? undefined : handleDrop}
        onDragOver={state === "uploading" ? undefined : handleDragOver}
        onDragLeave={state === "uploading" ? undefined : handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && state !== "uploading") {
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
