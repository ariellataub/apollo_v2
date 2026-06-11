import Link from "next/link";
import { formatQuarter } from "@/lib/quarter";

type Props = {
  companyId: string;
  existingQuarters: string[];
  activeQuarter: string;
};

export function QuarterNavigator({
  companyId,
  existingQuarters,
  activeQuarter,
}: Props) {
  if (existingQuarters.length <= 1) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="font-label text-[10px] uppercase tracking-wider text-apollo-mute">
        Quarters
      </span>
      {existingQuarters.map((q) => {
        const isActive = q === activeQuarter;
        return (
          <Link
            key={q}
            href={`/companies/${companyId}?quarter=${q}`}
            scroll={false}
            className="apollo-chip"
            style={{
              background: isActive ? "var(--apollo-accent)" : "var(--apollo-panel2)",
              color: isActive ? "#fff" : "var(--apollo-ink)",
              border: isActive
                ? "1px solid var(--apollo-accent)"
                : "1px solid var(--apollo-line)",
              textDecoration: "none",
              padding: "3px 11px",
            }}
          >
            {formatQuarter(q)}
          </Link>
        );
      })}
    </div>
  );
}
