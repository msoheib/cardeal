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
    PostgrestVersion: "13.0.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
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
      bid_aggregates: {
        Row: {
          bid_count: number | null
          bid_price: number
          car_id: string | null
          id: string
          last_updated: string | null
        }
        Insert: {
          bid_count?: number | null
          bid_price: number
          car_id?: string | null
          id?: string
          last_updated?: string | null
        }
        Update: {
          bid_count?: number | null
          bid_price?: number
          car_id?: string | null
          id?: string
          last_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_aggregates_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          bid_price: number
          buyer_id: string | null
          car_configuration_id: string | null
          car_id: string | null
          commitment_fee_amount: number | null
          commitment_fee_paid: boolean | null
          created_at: string | null
          expires_at: string | null
          id: string
          net_offer_amount: number | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["bid_status"] | null
          updated_at: string | null
        }
        Insert: {
          bid_price: number
          buyer_id?: string | null
          car_configuration_id?: string | null
          car_id?: string | null
          commitment_fee_amount?: number | null
          commitment_fee_paid?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          net_offer_amount?: number | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["bid_status"] | null
          updated_at?: string | null
        }
        Update: {
          bid_price?: number
          buyer_id?: string | null
          car_configuration_id?: string | null
          car_id?: string | null
          commitment_fee_amount?: number | null
          commitment_fee_paid?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          net_offer_amount?: number | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["bid_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_car_configuration_id_fkey"
            columns: ["car_configuration_id"]
            isOneToOne: false
            referencedRelation: "car_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_configurations: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          make: string
          model: string
          msrp: number
          specifications: Json | null
          trim: string | null
          updated_at: string | null
          variant: string | null
          year: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          make: string
          model: string
          msrp: number
          specifications?: Json | null
          trim?: string | null
          updated_at?: string | null
          variant?: string | null
          year: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          make?: string
          model?: string
          msrp?: number
          specifications?: Json | null
          trim?: string | null
          updated_at?: string | null
          variant?: string | null
          year?: number
        }
        Relationships: []
      }
      cars: {
        Row: {
          available_quantity: number | null
          color: string | null
          created_at: string | null
          dealer_id: string | null
          description: string | null
          featured: boolean | null
          id: string
          images: string[] | null
          make: string
          min_bid_price: number | null
          model: string
          original_quantity: number | null
          price_slots: number[] | null
          specifications: Json | null
          status: Database["public"]["Enums"]["car_status"] | null
          trim: string | null
          updated_at: string | null
          variant: string | null
          wakala_price: number
          year: number
        }
        Insert: {
          available_quantity?: number | null
          color?: string | null
          created_at?: string | null
          dealer_id?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          make: string
          min_bid_price?: number | null
          model: string
          original_quantity?: number | null
          price_slots?: number[] | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["car_status"] | null
          trim?: string | null
          updated_at?: string | null
          variant?: string | null
          wakala_price: number
          year: number
        }
        Update: {
          available_quantity?: number | null
          color?: string | null
          created_at?: string | null
          dealer_id?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          make?: string
          min_bid_price?: number | null
          model?: string
          original_quantity?: number | null
          price_slots?: number[] | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["car_status"] | null
          trim?: string | null
          updated_at?: string | null
          variant?: string | null
          wakala_price?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cars_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_fees: {
        Row: {
          amount: number | null
          bid_id: string | null
          buyer_id: string | null
          created_at: string | null
          gateway_response: Json | null
          id: string
          payment_method: string | null
          processed_at: string | null
          status: Database["public"]["Enums"]["fee_status"] | null
          transaction_reference: string | null
        }
        Insert: {
          amount?: number | null
          bid_id?: string | null
          buyer_id?: string | null
          created_at?: string | null
          gateway_response?: Json | null
          id?: string
          payment_method?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["fee_status"] | null
          transaction_reference?: string | null
        }
        Update: {
          amount?: number | null
          bid_id?: string | null
          buyer_id?: string | null
          created_at?: string | null
          gateway_response?: Json | null
          id?: string
          payment_method?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["fee_status"] | null
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commitment_fees_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_fees_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_inventory: {
        Row: {
          car_configuration_id: string | null
          created_at: string | null
          dealer_id: string | null
          id: string
          price_slots: number[] | null
          quantity: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          car_configuration_id?: string | null
          created_at?: string | null
          dealer_id?: string | null
          id?: string
          price_slots?: number[] | null
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          car_configuration_id?: string | null
          created_at?: string | null
          dealer_id?: string | null
          id?: string
          price_slots?: number[] | null
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dealer_inventory_car_configuration_id_fkey"
            columns: ["car_configuration_id"]
            isOneToOne: false
            referencedRelation: "car_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_inventory_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      dealers: {
        Row: {
          city: string
          commercial_registration: string
          company_name: string
          contact_info: Json | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          rating: number | null
          total_sales: number | null
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          city: string
          commercial_registration: string
          company_name: string
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          rating?: number | null
          total_sales?: number | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          city?: string
          commercial_registration?: string
          company_name?: string
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          rating?: number | null
          total_sales?: number | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "dealers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          bid_id: string | null
          buyer_id: string | null
          car_configuration_id: string | null
          car_id: string | null
          completed_at: string | null
          created_at: string | null
          dealer_id: string | null
          final_price: number
          id: string
          payment_due_date: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["deal_status"] | null
        }
        Insert: {
          bid_id?: string | null
          buyer_id?: string | null
          car_configuration_id?: string | null
          car_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          dealer_id?: string | null
          final_price: number
          id?: string
          payment_due_date?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["deal_status"] | null
        }
        Update: {
          bid_id?: string | null
          buyer_id?: string | null
          car_configuration_id?: string | null
          car_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          dealer_id?: string | null
          final_price?: number
          id?: string
          payment_due_date?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["deal_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_car_configuration_id_fkey"
            columns: ["car_configuration_id"]
            isOneToOne: false
            referencedRelation: "car_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          preferred_language: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_bid: {
        Args: { p_bid_id: string; p_dealer_id: string }
        Returns: Json
      }
      accept_bids_group: {
        Args: { p_bid_price: number; p_car_id: string; p_qty: number }
        Returns: {
          bid_id: string | null
          buyer_id: string | null
          car_configuration_id: string | null
          car_id: string | null
          completed_at: string | null
          created_at: string | null
          dealer_id: string | null
          final_price: number
          id: string
          payment_due_date: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["deal_status"] | null
        }[]
        SetofOptions: {
          from: "*"
          to: "deals"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      process_fcfs_deposit: { Args: { p_bid_id: string }; Returns: Json }
    }
    Enums: {
      bid_status: "pending" | "accepted" | "rejected" | "expired" | "cancelled"
      car_status: "active" | "sold_out" | "inactive" | "draft"
      deal_status: "pending_payment" | "completed" | "cancelled" | "refunded"
      fee_status: "pending" | "paid" | "refunded" | "applied_to_purchase"
      user_type: "buyer" | "dealer" | "admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      bid_status: ["pending", "accepted", "rejected", "expired", "cancelled"],
      car_status: ["active", "sold_out", "inactive", "draft"],
      deal_status: ["pending_payment", "completed", "cancelled", "refunded"],
      fee_status: ["pending", "paid", "refunded", "applied_to_purchase"],
      user_type: ["buyer", "dealer", "admin"],
    },
  },
} as const
