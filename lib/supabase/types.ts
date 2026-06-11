/**
 * Hand-written database types. Once the Supabase CLI is wired up, we can
 * replace this with `supabase gen types typescript --linked > types.ts`.
 */

export type CompanyStatus = "Active" | "Watch" | "Exited";
export type AssessmentPriority =
  | "Critical"
  | "High"
  | "Standard"
  | "Light-touch";
export type AssessmentStatus = "Draft" | "Confirmed";
export type PillarSlug =
  | "strategy"
  | "sales-execution"
  | "pipeline-generation"
  | "people-org"
  | "operational-infrastructure"
  | "partnerships-alliances"
  | "customer-success";

export type PlanStatus = "Draft" | "Active" | "Closed";
export type KpiDirection = "higher_better" | "lower_better";
export type KpiCadence = "Weekly" | "Monthly" | "Quarterly";
export type ActionOwnerType = "Greenfield" | "Company";
export type ActionItemStatus =
  | "NotStarted"
  | "InProgress"
  | "Blocked"
  | "Done";
export type ActionUpdateSource = "App" | "System";
export type TeamRequestStatus = "Open" | "Sourcing" | "Filled" | "Closed";

export type PillarFinding = {
  finding: string;
  pillar_slug: PillarSlug;
};

export type AssessmentMetric = {
  category: string;
  name: string;
  unit: string | null;
  values: Array<{ period: string; value: number | null }>;
  status: string | null;
};

export type Database = {
  public: {
    Tables: {
      pillars: {
        Row: {
          id: number;
          slug: string;
          name: string;
          ordinal: number;
        };
        Insert: {
          id: number;
          slug: string;
          name: string;
          ordinal: number;
        };
        Update: Partial<Database["public"]["Tables"]["pillars"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          domain: string | null;
          sector: string | null;
          stage: string | null;
          lead_partner_id: string | null;
          status: CompanyStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          domain?: string | null;
          sector?: string | null;
          stage?: string | null;
          lead_partner_id?: string | null;
          status?: CompanyStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "companies_lead_partner_id_fkey";
            columns: ["lead_partner_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      experts: {
        Row: {
          id: string;
          name: string;
          title: string | null;
          org: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          title?: string | null;
          org?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["experts"]["Insert"]>;
        Relationships: [];
      };
      health_assessments: {
        Row: {
          id: string;
          company_id: string;
          quarter: string;
          assessor_id: string | null;
          uploaded_pdf_path: string | null;
          health_score: number | null;
          priority: AssessmentPriority | null;
          going_well: string | null;
          needs_improvement: string | null;
          how_greenfield_supports: string | null;
          team_requests: string | null;
          pillar_tags: PillarFinding[];
          metrics: AssessmentMetric[];
          status: AssessmentStatus;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          quarter: string;
          assessor_id?: string | null;
          uploaded_pdf_path?: string | null;
          health_score?: number | null;
          priority?: AssessmentPriority | null;
          going_well?: string | null;
          needs_improvement?: string | null;
          how_greenfield_supports?: string | null;
          team_requests?: string | null;
          pillar_tags?: PillarFinding[];
          metrics?: AssessmentMetric[];
          status?: AssessmentStatus;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["health_assessments"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "health_assessments_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "health_assessments_assessor_id_fkey";
            columns: ["assessor_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          id: string;
          company_id: string;
          assessment_id: string;
          quarter: string;
          status: PlanStatus;
          narrative_summary: string | null;
          created_by: string | null;
          created_at: string;
          activated_at: string | null;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          assessment_id: string;
          quarter: string;
          status?: PlanStatus;
          narrative_summary?: string | null;
          created_by?: string | null;
          created_at?: string;
          activated_at?: string | null;
          closed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["plans"]["Insert"]>;
        Relationships: [];
      };
      objectives: {
        Row: {
          id: string;
          plan_id: string;
          title: string;
          rationale: string | null;
          pillar_slug: PillarSlug;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          title: string;
          rationale?: string | null;
          pillar_slug: PillarSlug;
          display_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["objectives"]["Insert"]>;
        Relationships: [];
      };
      kpis: {
        Row: {
          id: string;
          objective_id: string;
          name: string;
          unit: string;
          baseline: number | null;
          target: number | null;
          direction: KpiDirection;
          cadence: KpiCadence;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          objective_id: string;
          name: string;
          unit?: string;
          baseline?: number | null;
          target?: number | null;
          direction?: KpiDirection;
          cadence?: KpiCadence;
          display_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["kpis"]["Insert"]>;
        Relationships: [];
      };
      kpi_readings: {
        Row: {
          id: string;
          kpi_id: string;
          reading_month: string;
          value: number;
          note: string | null;
          entered_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          kpi_id: string;
          reading_month: string;
          value: number;
          note?: string | null;
          entered_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["kpi_readings"]["Insert"]>;
        Relationships: [];
      };
      action_items: {
        Row: {
          id: string;
          objective_id: string;
          title: string;
          description: string | null;
          owner_type: ActionOwnerType;
          owner_user_id: string | null;
          owner_external_name: string | null;
          owner_external_email: string | null;
          due_date: string | null;
          status: ActionItemStatus;
          display_order: number;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          objective_id: string;
          title: string;
          description?: string | null;
          owner_type: ActionOwnerType;
          owner_user_id?: string | null;
          owner_external_name?: string | null;
          owner_external_email?: string | null;
          due_date?: string | null;
          status?: ActionItemStatus;
          display_order?: number;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["action_items"]["Insert"]>;
        Relationships: [];
      };
      action_item_updates: {
        Row: {
          id: string;
          action_item_id: string;
          author_id: string | null;
          source: ActionUpdateSource;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          action_item_id: string;
          author_id?: string | null;
          source?: ActionUpdateSource;
          body: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["action_item_updates"]["Insert"]
        >;
        Relationships: [];
      };
      team_requests: {
        Row: {
          id: string;
          company_id: string;
          assessment_id: string;
          request_text: string;
          status: TeamRequestStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          assessment_id: string;
          request_text: string;
          status?: TeamRequestStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["team_requests"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      assessment_priority: AssessmentPriority;
      assessment_status: AssessmentStatus;
      plan_status: PlanStatus;
      kpi_direction: KpiDirection;
      kpi_cadence: KpiCadence;
      action_owner_type: ActionOwnerType;
      action_item_status: ActionItemStatus;
      action_update_source: ActionUpdateSource;
      team_request_status: TeamRequestStatus;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Pillar = Tables<"pillars">;
export type AppUser = Tables<"users">;
export type Company = Tables<"companies">;
export type Expert = Tables<"experts">;
export type HealthAssessment = Tables<"health_assessments">;
export type Plan = Tables<"plans">;
export type Objective = Tables<"objectives">;
export type Kpi = Tables<"kpis">;
export type KpiReading = Tables<"kpi_readings">;
export type ActionItem = Tables<"action_items">;
export type ActionItemUpdate = Tables<"action_item_updates">;
export type TeamRequest = Tables<"team_requests">;
