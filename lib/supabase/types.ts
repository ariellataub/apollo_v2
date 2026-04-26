/**
 * Hand-written database types for Phase 0. Once the Supabase CLI is wired up,
 * we can replace this with `supabase gen types typescript --linked > types.ts`.
 */

export type CompanyStatus = "Active" | "Watch" | "Exited";

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Pillar = Tables<"pillars">;
export type AppUser = Tables<"users">;
export type Company = Tables<"companies">;
export type Expert = Tables<"experts">;
