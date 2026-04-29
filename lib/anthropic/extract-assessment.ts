import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

// =====================================================================
// Output schema
// =====================================================================

const PillarSlugSchema = z.enum([
  "strategy",
  "sales-execution",
  "pipeline-generation",
  "people-org",
  "operational-infrastructure",
  "partnerships-alliances",
  "customer-success",
]);

const PriorityTierSchema = z.enum([
  "Critical",
  "High",
  "Standard",
  "Light-touch",
]);

const PillarFindingSchema = z.object({
  finding: z.string(),
  pillar_slug: PillarSlugSchema,
});

const MetricRowSchema = z.object({
  category: z.string(),
  name: z.string(),
  unit: z.string().nullable(),
  values: z.array(
    z.object({
      period: z.string(),
      value: z.number().nullable(),
    }),
  ),
  status: z.string().nullable(),
});

export const ExtractedAssessmentSchema = z.object({
  health_score: z.number().int().min(1).max(10),
  priority: PriorityTierSchema,
  going_well: z.string(),
  needs_improvement: z.string(),
  how_greenfield_supports: z.string(),
  team_requests: z.string(),
  pillar_tags: z.array(PillarFindingSchema),
  metrics: z.array(MetricRowSchema),
});

export type ExtractedAssessment = z.infer<typeof ExtractedAssessmentSchema>;

// =====================================================================
// System prompt — frozen across calls so it can be prompt-cached once
// the prefix exceeds Sonnet 4.6's 2048-token cache minimum.
// =====================================================================

const SYSTEM_PROMPT = `You are an extraction assistant for Apollo, Greenfield Growth's portfolio value-creation platform.

Greenfield Growth is a portfolio firm that runs quarterly health assessments on its companies — produced by a separate Greenfield app called Orion and exported as PDF. Apollo turns each Orion assessment into a structured value-creation plan tagged against Greenfield's Seven Pillars taxonomy.

You will be given an Orion PDF for a single company. Your job is to extract structured fields, tag findings to pillars, and capture the financial metrics table verbatim. Stay close to the document's language — don't editorialize or invent.

═══════════════════════════════════════════════════════════════════
ORION PDF STRUCTURE
═══════════════════════════════════════════════════════════════════
Each Orion assessment has a fixed shape. Look in these sections:

- HEALTH SCORE — top of page, "X / 10" format.
- PRIORITY STATUS — top of page; Orion's label, mapped below.
- WHAT'S GOING WELL — bullet list → going_well.
- NEEDS IMPROVEMENT — bullets, often with nested numbered sub-items. Each sub-item is a SEPARATE finding for pillar tagging — do not collapse them. Maps to needs_improvement.
- HOW CAN GREENFIELD HELP — numbered list → how_greenfield_supports.
- TEAM INPUT REQUESTS — may say "Not provided" → team_requests.
- Financial Metrics Overview — multi-row table with prior quarters, current quarter, budget, status. Capture every row in metrics.

═══════════════════════════════════════════════════════════════════
PRIORITY MAPPING (Orion label → Apollo tier)
═══════════════════════════════════════════════════════════════════
- Critical Focus  → Critical
- High Priority   → High
- Tracking        → Standard
- Low Priority    → Light-touch

If the Orion label is something else, fall back to inferring from health_score:
- 1–3  → Critical
- 4–5  → High
- 6–7  → Standard
- 8–10 → Light-touch

═══════════════════════════════════════════════════════════════════
THE SEVEN PILLARS
═══════════════════════════════════════════════════════════════════
Tag each substantive finding to exactly ONE pillar — the most relevant sub-area. Don't double-tag. Sub-areas below are matching guidance — emit only the pillar slug.

1. Market Strategy (\`strategy\`)
   ICP definition · Market segmentation · Competitive positioning · Pricing & packaging · GTM motion selection · Territory design · Vision / strategic clarity · Channel & segment focus · Capital allocation · M&A

2. Sales Execution (\`sales-execution\`)
   Qualification frameworks · Discovery methodology · Proposal process · Objection handling · Closing playbooks · Forecasting cadence · Pipeline discipline · Comp plans · Deal sizing · Win rates · Sales-team performance

3. Pipeline Generation (\`pipeline-generation\`)
   Outbound prospecting · Inbound content strategy · Paid acquisition · ABM programs · Event marketing · SDR playbook design · Broker / channel sourcing · Top-of-funnel demand generation

4. People & Organization (\`people-org\`)
   Hiring · Onboarding · Training · Career growth · Compensation · Performance management · Retention · Leadership team gaps · Culture

5. Operational Infrastructure (\`operational-infrastructure\`)
   CRM architecture · Tech stack audit · Analytics dashboards · Process documentation · OKR frameworks · RevOps design · Supply chain · Compliance · Finance & accounting

6. Partnerships & Alliances (\`partnerships-alliances\`)
   Partner program design · Co-selling motions · Channel enablement · Integration partnerships · Referral programs · Alliance strategy · OEM partnerships · Co-manufacturing · Distribution partners

7. Customer Success (\`customer-success\`)
   Onboarding programs · QBR frameworks · Expansion playbooks · Health scoring · Churn prevention · Voice of customer · NRR / retention · Customer support

If a finding is genuinely cross-pillar, pick the dominant one.

For findings rooted in financial metrics:
- ARR / ACV / new logo growth → Sales Execution
- NRR / GRR / churn / logo retention → Customer Success
- Gross margin / burn / magic number → Operational Infrastructure
- Pricing fluctuation / segment focus → Market Strategy

═══════════════════════════════════════════════════════════════════
FIELD GUIDANCE
═══════════════════════════════════════════════════════════════════
- going_well — strengths and what's working. Faithful summary.
- needs_improvement — gaps, risks, concerns. Faithful summary.
- how_greenfield_supports — what Greenfield is doing or could do (advisory, intros, capital).
- team_requests — explicit asks the company team has made of Greenfield. team_requests = company→GF; how_greenfield_supports = GF→company.
- pillar_tags — every substantive issue, one finding per array entry. Single-sentence faithful summaries — not verbatim quotes. Aim for 5–15 findings. Use the financial metrics table to ground severity.
- metrics — every row of the Financial Metrics Overview table. Preserve category groupings (e.g. "ARR ($K)", "Retention (%)"). Numeric values are plain numbers (strip "$" and "%"); status stays as printed ("-6.1%", "+1.3%", "N/A").

If a field is not addressed in the PDF, return an empty string for narrative fields, empty arrays for pillar_tags and metrics. Do not fabricate.`;

// =====================================================================
// Public API
// =====================================================================

const MODEL_ID = "claude-sonnet-4-6";

export async function extractAssessment(
  pdfBase64: string,
  companyName: string,
): Promise<ExtractedAssessment> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (and Vercel env).",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.parse({
    model: MODEL_ID,
    max_tokens: 4096,
    thinking: { type: "disabled" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: `Extract structured fields from the attached Orion health assessment for ${companyName}.`,
          },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(ExtractedAssessmentSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error(
      `Claude did not return a parseable extraction. stop_reason=${response.stop_reason}`,
    );
  }

  return response.parsed_output;
}
