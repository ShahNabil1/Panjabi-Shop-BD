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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description_bn: string | null
          description_en: string | null
          icon_key: string | null
          id: string
          image_url: string | null
          is_active: boolean
          meta_description: string | null
          meta_title: string | null
          name_bn: string
          name_en: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          icon_key?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name_bn: string
          name_en: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          icon_key?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name_bn?: string
          name_en?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      courier_checks: {
        Row: {
          cancelled_parcel: number
          checked_at: string
          created_at: string
          data: Json
          id: string
          phone: string
          success_parcel: number
          success_ratio: number
          total_parcel: number
          updated_at: string
        }
        Insert: {
          cancelled_parcel?: number
          checked_at?: string
          created_at?: string
          data?: Json
          id?: string
          phone: string
          success_parcel?: number
          success_ratio?: number
          total_parcel?: number
          updated_at?: string
        }
        Update: {
          cancelled_parcel?: number
          checked_at?: string
          created_at?: string
          data?: Json
          id?: string
          phone?: string
          success_parcel?: number
          success_ratio?: number
          total_parcel?: number
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer_bn: string
          answer_en: string
          created_at: string
          id: string
          is_active: boolean
          question_bn: string
          question_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer_bn: string
          answer_en: string
          created_at?: string
          id?: string
          is_active?: boolean
          question_bn: string
          question_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer_bn?: string
          answer_en?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question_bn?: string
          question_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          content: Json
          created_at: string
          headline_bn: string | null
          headline_en: string | null
          id: string
          is_active: boolean
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          product_id: string
          slug: string
          subheadline_bn: string | null
          subheadline_en: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          headline_bn?: string | null
          headline_en?: string | null
          id?: string
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          product_id: string
          slug: string
          subheadline_bn?: string | null
          subheadline_en?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          headline_bn?: string | null
          headline_en?: string | null
          id?: string
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          product_id?: string
          slug?: string
          subheadline_bn?: string | null
          subheadline_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_activity: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          meta: Json
          order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          message: string
          meta?: Json
          order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          meta?: Json
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          product_slug: string | null
          quantity: number
          sku: string | null
          unit_price: number
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          product_slug?: string | null
          quantity: number
          sku?: string | null
          unit_price: number
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_slug?: string | null
          quantity?: number
          sku?: string | null
          unit_price?: number
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_line: string
          advance_amount: number
          advance_method: string | null
          city: string
          created_at: string
          customer_email: string | null
          customer_ip: string | null
          customer_name: string
          customer_phone: string
          delivery_area: string | null
          delivery_charge: number
          delivery_partner: string | null
          discount: number
          id: string
          invoice_r2_key: string | null
          note: string | null
          order_number: string
          payment_method: string
          source: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_line: string
          advance_amount?: number
          advance_method?: string | null
          city: string
          created_at?: string
          customer_email?: string | null
          customer_ip?: string | null
          customer_name: string
          customer_phone: string
          delivery_area?: string | null
          delivery_charge?: number
          delivery_partner?: string | null
          discount?: number
          id?: string
          invoice_r2_key?: string | null
          note?: string | null
          order_number?: string
          payment_method?: string
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_line?: string
          advance_amount?: number
          advance_method?: string | null
          city?: string
          created_at?: string
          customer_email?: string | null
          customer_ip?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_area?: string | null
          delivery_charge?: number
          delivery_partner?: string | null
          discount?: number
          id?: string
          invoice_r2_key?: string | null
          note?: string | null
          order_number?: string
          payment_method?: string
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_bn: string | null
          alt_en: string | null
          created_at: string
          id: string
          product_id: string
          r2_key: string | null
          sort_order: number
          url: string
        }
        Insert: {
          alt_bn?: string | null
          alt_en?: string | null
          created_at?: string
          id?: string
          product_id: string
          r2_key?: string | null
          sort_order?: number
          url: string
        }
        Update: {
          alt_bn?: string | null
          alt_en?: string | null
          created_at?: string
          id?: string
          product_id?: string
          r2_key?: string | null
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          group_name_bn: string
          group_name_en: string
          id: string
          is_active: boolean
          price_delta: number
          product_id: string
          sku: string | null
          sort_order: number
          stock: number
          updated_at: string
          value_bn: string
          value_en: string
        }
        Insert: {
          created_at?: string
          group_name_bn: string
          group_name_en: string
          id?: string
          is_active?: boolean
          price_delta?: number
          product_id: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
          value_bn: string
          value_en: string
        }
        Update: {
          created_at?: string
          group_name_bn?: string
          group_name_en?: string
          id?: string
          is_active?: boolean
          price_delta?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
          value_bn?: string
          value_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badge_bn: string | null
          badge_en: string | null
          brand: string | null
          category_id: string
          compare_at_price: number | null
          created_at: string
          description_bn: string | null
          description_en: string | null
          faq: Json
          id: string
          is_active: boolean
          is_featured: boolean
          meta_description: string | null
          meta_title: string | null
          name_bn: string
          name_en: string
          og_image_url: string | null
          price: number
          rating: number
          review_count: number
          short_description_bn: string | null
          short_description_en: string | null
          sku: string | null
          slug: string
          sort_order: number
          specs: Json
          stock: number
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          badge_bn?: string | null
          badge_en?: string | null
          brand?: string | null
          category_id: string
          compare_at_price?: number | null
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          faq?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name_bn: string
          name_en: string
          og_image_url?: string | null
          price: number
          rating?: number
          review_count?: number
          short_description_bn?: string | null
          short_description_en?: string | null
          sku?: string | null
          slug: string
          sort_order?: number
          specs?: Json
          stock?: number
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          badge_bn?: string | null
          badge_en?: string | null
          brand?: string | null
          category_id?: string
          compare_at_price?: number | null
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          faq?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name_bn?: string
          name_en?: string
          og_image_url?: string | null
          price?: number
          rating?: number
          review_count?: number
          short_description_bn?: string | null
          short_description_en?: string | null
          sku?: string | null
          slug?: string
          sort_order?: number
          specs?: Json
          stock?: number
          subcategory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotion_products: {
        Row: {
          id: string
          product_id: string
          promotion_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          product_id: string
          promotion_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          product_id?: string
          promotion_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotion_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          banner_url: string | null
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          meta_description: string | null
          meta_title: string | null
          show_on_home: boolean
          slug: string
          sort_order: number
          starts_at: string | null
          subtitle_bn: string | null
          subtitle_en: string | null
          title_bn: string
          title_en: string
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          show_on_home?: boolean
          slug: string
          sort_order?: number
          starts_at?: string | null
          subtitle_bn?: string | null
          subtitle_en?: string | null
          title_bn: string
          title_en: string
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          show_on_home?: boolean
          slug?: string
          sort_order?: number
          starts_at?: string | null
          subtitle_bn?: string | null
          subtitle_en?: string | null
          title_bn?: string
          title_en?: string
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          description_bn: string | null
          description_en: string | null
          id: string
          image_url: string | null
          is_active: boolean
          meta_description: string | null
          meta_title: string | null
          name_bn: string
          name_en: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name_bn: string
          name_en: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name_bn?: string
          name_en?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_order_number: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "staff" | "user"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned"
        | "incomplete"
        | "no_response"
        | "good_no_response"
        | "hold"
      promotion_type: "offer" | "featured" | "flash" | "new_arrival"
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
  public: {
    Enums: {
      app_role: ["admin", "staff", "user"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
        "incomplete",
        "no_response",
        "good_no_response",
        "hold",
      ],
      promotion_type: ["offer", "featured", "flash", "new_arrival"],
    },
  },
} as const
