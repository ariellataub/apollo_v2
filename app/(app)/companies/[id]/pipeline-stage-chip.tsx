import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { PipelineStage } from "@/lib/pipeline-stage";

// Static lookup so the literal class names appear in source — defensive
// against any Tailwind v4 scanner edge cases with template-composed names.
const STAGE_CLASS: Record<PipelineStage, string> = {
  Intake: "apollo-chip-stage-intake",
  Plan: "apollo-chip-stage-plan",
  Review: "apollo-chip-stage-review",
  Executing: "apollo-chip-stage-executing",
  Closed: "apollo-chip-stage-closed",
};

type Props = {
  stage: PipelineStage;
  href?: string | null;
};

export function PipelineStageChip({ stage, href }: Props) {
  const classes = ["apollo-chip", STAGE_CLASS[stage]];
  if (href) classes.push("apollo-chip-stage-clickable");
  const className = classes.join(" ");

  const content = (
    <>
      {stage}
      {href ? <ChevronRight size={11} aria-hidden /> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <span className={className}>{content}</span>;
}
