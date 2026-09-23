export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  moving_south_operation: {
    Tables: {
      categories: {
        Row: {
          description: string
          id: number
          is_available: boolean | null
          is_special: boolean | null
          item_type_id: number | null
        }
        Insert: {
          description: string
          id?: number
          is_available?: boolean | null
          is_special?: boolean | null
          item_type_id?: number | null
        }
        Update: {
          description?: string
          id?: number
          is_available?: boolean | null
          is_special?: boolean | null
          item_type_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "item_type_id_fkey"
            columns: ["item_type_id"]
            isOneToOne: false
            referencedRelation: "item_types"
            referencedColumns: ["id"]
          },
        ]
      }
      group_codes: {
        Row: {
          code: string
          id: number
          identity_num: string | null
          is_available: boolean
        }
        Insert: {
          code: string
          id?: number
          identity_num?: string | null
          is_available?: boolean
        }
        Update: {
          code?: string
          id?: number
          identity_num?: string | null
          is_available?: boolean
        }
        Relationships: []
      }
      groups: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          created_by: string | null
          created_on: string | null
          id: number
          is_available: boolean
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          created_by?: string | null
          created_on?: string | null
          id?: number
          is_available?: boolean
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          created_by?: string | null
          created_on?: string | null
          id?: number
          is_available?: boolean
        }
        Relationships: []
      }
      item_types: {
        Row: {
          description: string
          id: number
        }
        Insert: {
          description: string
          id?: number
        }
        Update: {
          description?: string
          id?: number
        }
        Relationships: []
      }
      locations: {
        Row: {
          description: string
          id: number
          is_available: boolean | null
        }
        Insert: {
          description: string
          id?: number
          is_available?: boolean | null
        }
        Update: {
          description?: string
          id?: number
          is_available?: boolean | null
        }
        Relationships: []
      }
      mapping_reports: {
        Row: {
          description: string | null
          expiration_date: string | null
          id: number
          is_available: boolean
          item_purpose: string | null
          item_target: string | null
          quantity: number
          reported_by: string
          reported_on: string
          room_id: number
          serial: string | null
          status: string
          sub_category_id: number
        }
        Insert: {
          description?: string | null
          expiration_date?: string | null
          id?: number
          is_available?: boolean
          item_purpose?: string | null
          item_target?: string | null
          quantity?: number
          reported_by: string
          reported_on?: string
          room_id: number
          serial?: string | null
          status: string
          sub_category_id: number
        }
        Update: {
          description?: string | null
          expiration_date?: string | null
          id?: number
          is_available?: boolean
          item_purpose?: string | null
          item_target?: string | null
          quantity?: number
          reported_by?: string
          reported_on?: string
          room_id?: number
          serial?: string | null
          status?: string
          sub_category_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "mapping_reports_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mapping_reports_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "sub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_items: {
        Row: {
          id: number
          packing_unit_id: number
          quantity: number
          status: string
          sub_category_id: number
        }
        Insert: {
          id?: never
          packing_unit_id: number
          quantity: number
          status?: string
          sub_category_id: number
        }
        Update: {
          id?: never
          packing_unit_id?: number
          quantity?: number
          status?: string
          sub_category_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "packing_items_packing_unit_id_fkey"
            columns: ["packing_unit_id"]
            isOneToOne: false
            referencedRelation: "packing_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_items_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "sub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_units: {
        Row: {
          box_type: string
          created_by: string
          created_on: string
          destination_room_id: number
          id: number
          source_room_id: number
          status: string
          transport_id: number | null
        }
        Insert: {
          box_type: string
          created_by: string
          created_on?: string
          destination_room_id: number
          id?: never
          source_room_id: number
          status?: string
          transport_id?: number | null
        }
        Update: {
          box_type?: string
          created_by?: string
          created_on?: string
          destination_room_id?: number
          id?: never
          source_room_id?: number
          status?: string
          transport_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packing_units_destination_room_id_fkey"
            columns: ["destination_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_units_source_room_id_fkey"
            columns: ["source_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packing_units_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          description: string | null
          end_mapping_time: string | null
          group_id: number
          id: number
          is_available: boolean
          location_id: number | null
          move_status: string
          room_manager: string | null
          start_mapping_time: string | null
          status: string | null
        }
        Insert: {
          description?: string | null
          end_mapping_time?: string | null
          group_id: number
          id?: number
          is_available?: boolean
          location_id?: number | null
          move_status?: string
          room_manager?: string | null
          start_mapping_time?: string | null
          status?: string | null
        }
        Update: {
          description?: string | null
          end_mapping_time?: string | null
          group_id?: number
          id?: number
          is_available?: boolean
          location_id?: number | null
          move_status?: string
          room_manager?: string | null
          start_mapping_time?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_categories: {
        Row: {
          category_id: number
          description: string
          id: number
          is_available: boolean | null
        }
        Insert: {
          category_id: number
          description: string
          id?: number
          is_available?: boolean | null
        }
        Update: {
          category_id?: number
          description?: string
          id?: number
          is_available?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transports: {
        Row: {
          created_by: string
          id: number
          moving_date: string
          moving_type: string
          status: string
          vehicle_details: string | null
          vehicle_number: string | null
        }
        Insert: {
          created_by: string
          id?: never
          moving_date?: string
          moving_type: string
          status?: string
          vehicle_details?: string | null
          vehicle_number?: string | null
        }
        Update: {
          created_by?: string
          id?: never
          moving_date?: string
          moving_type?: string
          status?: string
          vehicle_details?: string | null
          vehicle_number?: string | null
        }
        Relationships: []
      }
      user_group: {
        Row: {
          assigned_by: string | null
          assigned_on: string | null
          group_id: number
          identity_num: string
          is_available: boolean
        }
        Insert: {
          assigned_by?: string | null
          assigned_on?: string | null
          group_id: number
          identity_num: string
          is_available?: boolean
        }
        Update: {
          assigned_by?: string | null
          assigned_on?: string | null
          group_id?: number
          identity_num?: string
          is_available?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_group_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          assigned_on: string
          identity_num: string
          role: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_on?: string
          identity_num: string
          role: string
        }
        Update: {
          assigned_by?: string | null
          assigned_on?: string
          identity_num?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_packing: {
        Args: {
          p_box_type: string
          p_created_by: string
          p_destination_room_id: number
          p_items: Json
          p_source_room_id: number
        }
        Returns: number
      }
      create_transport: {
        Args: {
          p_created_by: string
          p_moving_type: string
          p_packing_ids: number[]
          p_vehicle_details: string
          p_vehicle_number: string
        }
        Returns: number
      }
      distribute_items: {
        Args: { p_item_ids: number[]; p_packing_id: number }
        Returns: undefined
      }
      receive_transport: {
        Args: { p_packing_ids: number[]; p_transport_id: number }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      users: {
        Row: {
          full_name: string | null
          identity_num: string
        }
        Insert: {
          full_name?: string | null
          identity_num: string
        }
        Update: {
          full_name?: string | null
          identity_num?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  moving_south_operation: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
