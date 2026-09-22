// Placeholder database types. Regenerate from your schema with:
//   npm run db:gen-types        (remote project, uses SUPABASE_PROJECT_ID)
//   npm run db:gen-types:local  (local stack started with `npm run supabase:start`)
// This file is overwritten by those scripts.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: { [_ in never]: never };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
