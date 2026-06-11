import type { HealthAssessment } from "@/lib/supabase/types";
import { formatQuarter } from "@/lib/quarter";

export function AssessmentContextPanel({
  assessment,
  companyName,
}: {
  assessment: HealthAssessment;
  companyName: string;
}) {
  return (
    <aside className="space-y-4">
      <div className="apollo-panel p-4">
        <div className="font-label text-[10px] uppercase tracking-wider text-apollo-mute">
          Assessment context
        </div>
        <div className="mt-2 text-sm" style={{ fontWeight: 600 }}>
          {companyName} &middot; {formatQuarter(assessment.quarter)}
        </div>

        <div className="mt-4 flex items-center gap-3">
          {assessment.health_score != null ? (
            <span
              className={`apollo-health-pill apollo-health-${assessment.health_score}`}
            >
              {assessment.health_score}
            </span>
          ) : (
            <span className="text-apollo-mute">—</span>
          )}
          {assessment.priority ? (
            <span
              className={`apollo-chip apollo-chip-priority-${assessment.priority}`}
            >
              {assessment.priority}
            </span>
          ) : null}
        </div>
      </div>

      <NarrativeBlock
        label="What's going well"
        value={assessment.going_well ?? ""}
      />
      <NarrativeBlock
        label="Needs improvement"
        value={assessment.needs_improvement ?? ""}
      />
      <NarrativeBlock
        label="How can Greenfield help"
        value={assessment.how_greenfield_supports ?? ""}
      />
      <NarrativeBlock
        label="Team input requests"
        value={assessment.team_requests ?? ""}
      />
    </aside>
  );
}

function NarrativeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="apollo-panel p-4">
      <div className="font-label mb-2 text-[10px] uppercase tracking-wider text-apollo-mute">
        {label}
      </div>
      {value ? (
        <div className="text-sm" style={{ lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
          {value}
        </div>
      ) : (
        <div className="text-sm italic text-apollo-mute">Not provided.</div>
      )}
    </div>
  );
}
