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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      assessment_priority: AssessmentPriority;
      assessment_status: AssessmentStatus;
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
