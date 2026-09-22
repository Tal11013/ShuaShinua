// Database types, matching the moving_south_operation DDL and public.users.
// Regenerate from the live schema with:
//   npm run db:gen-types        (remote project, uses SUPABASE_PROJECT_ID; needs `supabase login`)
//   npm run db:gen-types:local  (local stack started with `npm run supabase:start`)
// This file is overwritten by those scripts.
//
// Postgres -> TS: bigint/numeric -> number, varchar -> string, timestamptz -> string (ISO).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  moving_south_operation: {
    Tables: {
      categories: {
        Row: {
          id: number;
          description: string;
          item_type_id: number | null;
          is_special: boolean | null;
          is_available: boolean | null;
        };
        Insert: {
          id?: number;
          description: string;
          item_type_id?: number | null;
          is_special?: boolean | null;
          is_available?: boolean | null;
        };
        Update: {
          id?: number;
          description?: string;
          item_type_id?: number | null;
          is_special?: boolean | null;
          is_available?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "item_type_id_fkey";
            columns: ["item_type_id"];
            isOneToOne: false;
            referencedRelation: "item_types";
            referencedColumns: ["id"];
          },
        ];
      };
      group_codes: {
        Row: {
          id: number;
          code: string;
          identity_num: string | null;
          is_available: boolean;
        };
        Insert: {
          id?: number;
          code: string;
          identity_num?: string | null;
          is_available?: boolean;
        };
        Update: {
          id?: number;
          code?: string;
          identity_num?: string | null;
          is_available?: boolean;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: number;
          contact_name: string | null;
          contact_phone: string | null;
          created_on: string | null;
          created_by: string | null;
          is_available: boolean;
        };
        Insert: {
          id?: number;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_on?: string | null;
          created_by?: string | null;
          is_available?: boolean;
        };
        Update: {
          id?: number;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_on?: string | null;
          created_by?: string | null;
          is_available?: boolean;
        };
        Relationships: [];
      };
      item_types: {
        Row: {
          id: number;
          description: string;
        };
        Insert: {
          id?: number;
          description: string;
        };
        Update: {
          id?: number;
          description?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: number;
          description: string;
          is_available: boolean | null;
        };
        Insert: {
          id?: number;
          description: string;
          is_available?: boolean | null;
        };
        Update: {
          id?: number;
          description?: string;
          is_available?: boolean | null;
        };
        Relationships: [];
      };
      mapping_reports: {
        Row: {
          id: number;
          room_id: number;
          sub_category_id: number;
          reported_by: string;
          reported_on: string;
          status: string;
          description: string | null;
          quantity: number;
          serial: string | null;
          item_purpose: string | null;
          item_target: string | null;
          expiration_date: string | null;
          is_available: boolean;
        };
        Insert: {
          id?: number;
          room_id: number;
          sub_category_id: number;
          reported_by: string;
          reported_on?: string;
          status: string;
          description?: string | null;
          quantity?: number;
          serial?: string | null;
          item_purpose?: string | null;
          item_target?: string | null;
          expiration_date?: string | null;
          is_available?: boolean;
        };
        Update: {
          id?: number;
          room_id?: number;
          sub_category_id?: number;
          reported_by?: string;
          reported_on?: string;
          status?: string;
          description?: string | null;
          quantity?: number;
          serial?: string | null;
          item_purpose?: string | null;
          item_target?: string | null;
          expiration_date?: string | null;
          is_available?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "mapping_reports_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mapping_reports_sub_category_id_fkey";
            columns: ["sub_category_id"];
            isOneToOne: false;
            referencedRelation: "sub_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          id: number;
          group_id: number;
          location_id: number | null;
          description: string | null;
          status: string | null;
          room_manager: string | null;
          start_mapping_time: string | null;
          end_mapping_time: string | null;
          is_available: boolean;
        };
        Insert: {
          id?: number;
          group_id: number;
          location_id?: number | null;
          description?: string | null;
          status?: string | null;
          room_manager?: string | null;
          start_mapping_time?: string | null;
          end_mapping_time?: string | null;
          is_available?: boolean;
        };
        Update: {
          id?: number;
          group_id?: number;
          location_id?: number | null;
          description?: string | null;
          status?: string | null;
          room_manager?: string | null;
          start_mapping_time?: string | null;
          end_mapping_time?: string | null;
          is_available?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rooms_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      sub_categories: {
        Row: {
          id: number;
          category_id: number;
          description: string;
          is_available: boolean | null;
        };
        Insert: {
          id?: number;
          category_id: number;
          description: string;
          is_available?: boolean | null;
        };
        Update: {
          id?: number;
          category_id?: number;
          description?: string;
          is_available?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "sub_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      user_group: {
        Row: {
          identity_num: string;
          group_id: number;
          assigned_on: string | null;
          assigned_by: string | null;
          is_available: boolean;
        };
        Insert: {
          identity_num: string;
          group_id: number;
          assigned_on?: string | null;
          assigned_by?: string | null;
          is_available?: boolean;
        };
        Update: {
          identity_num?: string;
          group_id?: number;
          assigned_on?: string | null;
          assigned_by?: string | null;
          is_available?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "user_group_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
  public: {
    Tables: {
      users: {
        Row: {
          identity_num: string;
          full_name: string | null;
        };
        Insert: {
          identity_num: string;
          full_name?: string | null;
        };
        Update: {
          identity_num?: string;
          full_name?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// Helpers in the same shape `supabase gen types` emits:
//   Tables<"users">                                   -> public schema
//   Tables<{ schema: "moving_south_operation" }, "rooms">
type DefaultSchema = Database["public"];
type SchemaName = keyof Database;

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: SchemaName },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: SchemaName }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: SchemaName }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: SchemaName },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: SchemaName }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: SchemaName }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: SchemaName },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: SchemaName }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: SchemaName }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never;
