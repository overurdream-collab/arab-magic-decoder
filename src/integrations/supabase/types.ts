export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      catalog_parts: {
        Row: {
          alt_numbers: string[];
          category_id: string;
          created_at: string;
          description_ar: string | null;
          id: string;
          image_url: string | null;
          is_featured: boolean;
          name_ar: string;
          name_en: string;
          oem_number: string;
          specs: Json;
          updated_at: string;
        };
        Insert: {
          alt_numbers?: string[];
          category_id: string;
          created_at?: string;
          description_ar?: string | null;
          id?: string;
          image_url?: string | null;
          is_featured?: boolean;
          name_ar: string;
          name_en: string;
          oem_number: string;
          specs?: Json;
          updated_at?: string;
        };
        Update: {
          alt_numbers?: string[];
          category_id?: string;
          created_at?: string;
          description_ar?: string | null;
          id?: string;
          image_url?: string | null;
          is_featured?: boolean;
          name_ar?: string;
          name_en?: string;
          oem_number?: string;
          specs?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_parts_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          icon: string | null;
          id: string;
          name_ar: string;
          name_en: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          name_ar: string;
          name_en: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          name_ar?: string;
          name_en?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      customer_vehicles: {
        Row: {
          created_at: string;
          current_mileage: number;
          engine: string | null;
          id: string;
          is_active: boolean;
          license_plate: string | null;
          make_id: string | null;
          model_id: string | null;
          nickname: string | null;
          updated_at: string;
          user_id: string;
          vin: string | null;
          year: number | null;
        };
        Insert: {
          created_at?: string;
          current_mileage?: number;
          engine?: string | null;
          id?: string;
          is_active?: boolean;
          license_plate?: string | null;
          make_id?: string | null;
          model_id?: string | null;
          nickname?: string | null;
          updated_at?: string;
          user_id: string;
          vin?: string | null;
          year?: number | null;
        };
        Update: {
          created_at?: string;
          current_mileage?: number;
          engine?: string | null;
          id?: string;
          is_active?: boolean;
          license_plate?: string | null;
          make_id?: string | null;
          model_id?: string | null;
          nickname?: string | null;
          updated_at?: string;
          user_id?: string;
          vin?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_vehicles_make_id_fkey";
            columns: ["make_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_makes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_vehicles_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["id"];
          },
        ];
      };
      part_fitments: {
        Row: {
          created_at: string;
          id: string;
          model_id: string;
          notes_ar: string | null;
          part_id: string;
          year_from: number;
          year_to: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          model_id: string;
          notes_ar?: string | null;
          part_id: string;
          year_from?: number;
          year_to?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          model_id?: string;
          notes_ar?: string | null;
          part_id?: string;
          year_from?: number;
          year_to?: number;
        };
        Relationships: [
          {
            foreignKeyName: "part_fitments_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "part_fitments_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "catalog_parts";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          city: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          city?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          city?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      seller_applications: {
        Row: {
          business_name: string;
          city: string;
          commercial_register: string | null;
          created_at: string;
          district: string | null;
          id: string;
          notes: string | null;
          phone: string;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          seller_id: string | null;
          seller_type: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          business_name: string;
          city: string;
          commercial_register?: string | null;
          created_at?: string;
          district?: string | null;
          id?: string;
          notes?: string | null;
          phone: string;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          seller_id?: string | null;
          seller_type?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          business_name?: string;
          city?: string;
          commercial_register?: string | null;
          created_at?: string;
          district?: string | null;
          id?: string;
          notes?: string | null;
          phone?: string;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          seller_id?: string | null;
          seller_type?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_applications_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_offers: {
        Row: {
          condition: string;
          created_at: string;
          delivery_days: number;
          id: string;
          is_active: boolean;
          origin_country: string | null;
          part_id: string;
          price_yer: number;
          quality_grade: string;
          seller_id: string;
          stock_qty: number;
          updated_at: string;
          warranty_months: number;
        };
        Insert: {
          condition?: string;
          created_at?: string;
          delivery_days?: number;
          id?: string;
          is_active?: boolean;
          origin_country?: string | null;
          part_id: string;
          price_yer: number;
          quality_grade?: string;
          seller_id: string;
          stock_qty?: number;
          updated_at?: string;
          warranty_months?: number;
        };
        Update: {
          condition?: string;
          created_at?: string;
          delivery_days?: number;
          id?: string;
          is_active?: boolean;
          origin_country?: string | null;
          part_id?: string;
          price_yer?: number;
          quality_grade?: string;
          seller_id?: string;
          stock_qty?: number;
          updated_at?: string;
          warranty_months?: number;
        };
        Relationships: [
          {
            foreignKeyName: "seller_offers_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "catalog_parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_offers_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "sellers";
            referencedColumns: ["id"];
          },
        ];
      };
      sellers: {
        Row: {
          city: string;
          created_at: string;
          district: string | null;
          id: string;
          is_verified: boolean;
          name: string;
          owner_id: string | null;
          phone: string | null;
          rating: number;
          reviews_count: number;
          seller_type: string;
          updated_at: string;
        };
        Insert: {
          city: string;
          created_at?: string;
          district?: string | null;
          id?: string;
          is_verified?: boolean;
          name: string;
          owner_id?: string | null;
          phone?: string | null;
          rating?: number;
          reviews_count?: number;
          seller_type?: string;
          updated_at?: string;
        };
        Update: {
          city?: string;
          created_at?: string;
          district?: string | null;
          id?: string;
          is_verified?: boolean;
          name?: string;
          owner_id?: string | null;
          phone?: string | null;
          rating?: number;
          reviews_count?: number;
          seller_type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      vehicle_maintenance_logs: {
        Row: {
          cost_total: number | null;
          created_at: string;
          current_mileage: number;
          id: string;
          next_due_date: string | null;
          next_due_mileage: number;
          notes: string | null;
          product_details: Json;
          service_date: string;
          service_type: string;
          updated_at: string;
          user_id: string;
          vehicle_id: string;
        };
        Insert: {
          cost_total?: number | null;
          created_at?: string;
          current_mileage: number;
          id?: string;
          next_due_date?: string | null;
          next_due_mileage: number;
          notes?: string | null;
          product_details?: Json;
          service_date?: string;
          service_type?: string;
          updated_at?: string;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          cost_total?: number | null;
          created_at?: string;
          current_mileage?: number;
          id?: string;
          next_due_date?: string | null;
          next_due_mileage?: number;
          notes?: string | null;
          product_details?: Json;
          service_date?: string;
          service_type?: string;
          updated_at?: string;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_logs_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "customer_vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_makes: {
        Row: {
          country: string | null;
          created_at: string;
          id: string;
          name_ar: string;
          name_en: string;
          wmi_codes: string[];
        };
        Insert: {
          country?: string | null;
          created_at?: string;
          id?: string;
          name_ar: string;
          name_en: string;
          wmi_codes?: string[];
        };
        Update: {
          country?: string | null;
          created_at?: string;
          id?: string;
          name_ar?: string;
          name_en?: string;
          wmi_codes?: string[];
        };
        Relationships: [];
      };
      vehicle_models: {
        Row: {
          body_type: string | null;
          created_at: string;
          engine: string | null;
          id: string;
          make_id: string;
          name_ar: string;
          name_en: string;
          year_end: number;
          year_start: number;
        };
        Insert: {
          body_type?: string | null;
          created_at?: string;
          engine?: string | null;
          id?: string;
          make_id: string;
          name_ar: string;
          name_en: string;
          year_end?: number;
          year_start?: number;
        };
        Update: {
          body_type?: string | null;
          created_at?: string;
          engine?: string | null;
          id?: string;
          make_id?: string;
          name_ar?: string;
          name_en?: string;
          year_end?: number;
          year_start?: number;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_models_make_id_fkey";
            columns: ["make_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_makes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      record_zero_result_search: { Args: { _term: string }; Returns: boolean };
      admin_search_gap_summary: { Args: Record<string, never>; Returns: Json };
      admin_stage_catalog: { Args: { _items: Json; _source?: string }; Returns: Json };
      admin_commit_catalog: { Args: { _id: string }; Returns: Json };
      approve_seller_application: {
        Args: { _app_id: string; _note?: string };
        Returns: string;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      reject_seller_application: {
        Args: { _app_id: string; _note?: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "customer" | "workshop" | "quick_service" | "seller" | "delivery" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "workshop", "quick_service", "seller", "delivery", "admin"],
    },
  },
} as const;
