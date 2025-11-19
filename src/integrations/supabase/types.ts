export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      addresses: {
        Row: {
          attention: string | null;
          city: string;
          country_region: string | null;
          created_at: string | null;
          fax_number: string | null;
          id: string;
          phone: string | null;
          profile_id: string | null;
          group_id?: string | null;
          state: string;
          street1: string;
          street2: string | null;
          type: string;
          updated_at: string | null;
          zip_code: string;
        };
        Insert: {
          attention?: string | null;
          city: string;
          country_region?: string | null;
          created_at?: string | null;
          fax_number?: string | null;
          id?: string;
          phone?: string | null;
          profile_id?: string | null;
          group_id?: string | null;

          state: string;
          street1: string;
          street2?: string | null;
          type: string;
          updated_at?: string | null;
          zip_code: string;
        };
        Update: {
          attention?: string | null;
          city?: string;
          country_region?: string | null;
          created_at?: string | null;
          fax_number?: string | null;
          id?: string;
          phone?: string | null;
          profile_id?: string | null;
          group_id?: string | null;

          state?: string;
          street1?: string;
          street2?: string | null;
          type?: string;
          updated_at?: string | null;
          zip_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      customer_contacts: {
        Row: {
          created_at: string | null;
          customer_id: string | null;
          email: string | null;
          id: string;
          is_primary: boolean | null;
          name: string;
          phone: string | null;
          role: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          customer_id?: string | null;
          email?: string | null;
          id?: string;
          is_primary?: boolean | null;
          name: string;
          phone?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          customer_id?: string | null;
          email?: string | null;
          id?: string;
          is_primary?: boolean | null;
          name?: string;
          phone?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      category_configs: {
        Row: {
          id: string;
          category_name: string;
          size_units: string[]; // assuming it's stored as text[] in PostgreSQL
          default_unit: string;
          has_rolls: boolean;
          requires_case: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          category_name: string;
          size_units: string[];
          default_unit: string;
          has_rolls: boolean;
          requires_case: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          category_name?: string;
          size_units?: string[];
          default_unit?: string;
          has_rolls?: boolean;
          requires_case?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };

      customers: {
        Row: {
          created_at: string | null;
          credit_limit: number | null;
          id: string;
          notes: string | null;
          payment_method: string | null;
          payment_terms: Database["public"]["Enums"]["payment_terms"] | null;
          profile_id: string | null;
          group_id?: string | null;

          tax_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          credit_limit?: number | null;
          id?: string;
          group_id?: string | null;

          notes?: string | null;
          payment_method?: string | null;
          payment_terms?: Database["public"]["Enums"]["payment_terms"] | null;
          profile_id?: string | null;
          tax_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          credit_limit?: number | null;
          id?: string;
          group_id?: string | null;

          notes?: string | null;
          payment_method?: string | null;
          payment_terms?: Database["public"]["Enums"]["payment_terms"] | null;
          profile_id?: string | null;
          tax_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      group_pricing: {
        Row: {
          created_at: string | null;
          discount: number;
          discount_type: Database["public"]["Enums"]["discount_type"] | null;
          group_ids: string[];
          id: string;
          max_quantity: number;
          min_quantity: number;
          name: string;
          product_id: string | null;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          discount?: number;
          discount_type?: Database["public"]["Enums"]["discount_type"] | null;
          group_ids: string[];
          id?: string;
          max_quantity: number;
          min_quantity: number;
          name: string;
          product_id?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          discount?: number;
          discount_type?: Database["public"]["Enums"]["discount_type"] | null;
          group_ids?: string[];
          id?: string;
          max_quantity?: number;
          min_quantity?: number;
          name?: string;
          product_id?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "group_pricing_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      inventory_transactions: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          id: string;
          new_stock: number;
          notes: string | null;
          previous_stock: number;
          product_id: string | null;
          quantity: number;
          reference_id: string;
          type: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          new_stock: number;
          notes?: string | null;
          previous_stock: number;
          product_id?: string | null;
          quantity: number;
          reference_id?: string;
          type: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          new_stock?: number;
          notes?: string | null;
          previous_stock?: number;
          product_id?: string | null;
          quantity?: number;
          reference_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      invoices: {
        Row: {
          amount: number;
          created_at: string | null;
          customer_info: Json | null;
          due_date: string;
          id: string;
          payment_status: string | null;
          purchase_number_external: string | null;

          invoice_number: string;
          items: Json | null;
          order_id: string | null;
          paid_at: string | null;
          payment_method: Database["public"]["Enums"]["payment_method"] | null;
          payment_notes: string | null;
          profile_id: string | null;
          shipping_info: Json | null;
          status: Database["public"]["Enums"]["invoice_status"];
          subtotal: number | null;
          tax_amount: number | null;
          total_amount: number;
          updated_at: string | null;
          notes: string | null;

        };
        Insert: {
          amount: number;
          created_at?: string | null;
          customer_info?: Json | null;
          due_date: string;
          payment_status: string | null;
          purchase_number_external: string | null;

          id?: string;
          invoice_number: string;
          items?: Json | null;
          order_id?: string | null;
          paid_at?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          payment_notes?: string | null;
          profile_id?: string | null;
          shipping_info?: Json | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          subtotal?: number | null;
          tax_amount?: number | null;
          total_amount: number;
          notes: string | null;
          updated_at?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          customer_info?: Json | null;
          due_date?: string;
          purchase_number_external: string | null;
          id?: string;
          invoice_number?: string;
          payment_status: string | null;
          items?: Json | null;
          order_id?: string | null;
          paid_at?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          payment_notes?: string | null;
          profile_id?: string | null;
          shipping_info?: Json | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          subtotal?: number | null;
          tax_amount?: number | null;
          total_amount?: number;
          notes: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      locations: {
        Row: {
          contact_email: string | null;
          contact_phone: string | null;

          created_at: string | null;
          id: string;
          manager: string | null;
          name: string;
          address?: any;
          profile_id: string | null;
          status: Database["public"]["Enums"]["user_status"];
          type: string;
          updated_at: string | null;
        };
        Insert: {
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string | null;
          id?: string;
          manager?: string | null;
          name: string;
          profile_id?: string | null;
          status?: Database["public"]["Enums"]["user_status"];
          type: string;
          updated_at?: string | null;
        };
        Update: {
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string | null;
          id?: string;
          manager?: string | null;
          name?: string;
          profile_id?: string | null;
          status?: Database["public"]["Enums"]["user_status"];
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "locations_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      order_items: {
        Row: {
          created_at: string | null;
          id: string;
          notes: string | null;
          order_id: string | null;
          product_id: string | null;
          quantity: number;
          total_price: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          order_id?: string | null;
          product_id?: string | null;
          quantity: number;
          total_price: number;
          unit_price: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          order_id?: string | null;
          product_id?: string | null;
          quantity?: number;
          total_price?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      orders: {
        Row: {
          created_at: string | null;
          deleted_at: string | null;
          estimated_delivery: string | null;
          id: string;
          notes: string | null;
          order_number: string;
          void?: string;
          profile_id: string | null;
          shipping_cost: number | null;
          quickBooksID: number | null;
          shipping_method:
            | Database["public"]["Enums"]["shipping_method"]
            | null;
          status: Database["public"]["Enums"]["order_status"];
          tax_amount: number | null;
          total_amount: number;
          tracking_number: string | null;
          purchase_number_external: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          deleted_at?: string | null;
          estimated_delivery?: string | null;
          id?: string;
          quickBooksID: number | null;
          notes?: string | null;
          purchase_number_external: string | null;
          void?: string;
          order_number: string;
          profile_id?: string | null;
          shipping_cost?: number | null;
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null;
          status?: Database["public"]["Enums"]["order_status"];
          tax_amount?: number | null;
          total_amount: number;
          tracking_number?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          deleted_at?: string | null;
          estimated_delivery?: string | null;
          id?: string;
          purchase_number_external: string | null;
          void?: string;
          quickBooksID: number | null;
          notes?: string | null;
          order_number?: string;
          profile_id?: string | null;
          shipping_cost?: number | null;
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null;
          status?: Database["public"]["Enums"]["order_status"];
          tax_amount?: number | null;
          total_amount?: number;
          tracking_number?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_settings: {
        Row: {
          created_at: string;
          id: string;
          profile_id: string;
          provider: string;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          profile_id: string;
          provider: string;
          settings: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          profile_id?: string;
          provider?: string;
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_settings_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      product_sizes: {
        Row: {
          created_at: string | null;
          id: string;
          price: number;
          price_per_case: number;
          product_id: string | null;
          rolls_per_case: number | null;
          sizeSquanence: number | null;
          shipping_cost: number | null;
          size_unit: string;
          sku: any;
          unit?: boolean;
          groupIds?: string[];
          disAllogroupIds?: string[];
          case?: boolean;
          size_value: string;
          stock: number;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          price: number;
          price_per_case: number;
          product_id?: string | null;
          quantity_per_case?: number | null;
          rolls_per_case?: number | null;
          sizeSquanence?: number | null;
          shipping_cost?: number | null;
          size_unit: string;
          sku: any;
          unit?: boolean;
          groupIds?: string[];
          disAllogroupIds?: string[];
          case?: boolean;
          size_value: string;
          stock?: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          price?: number;
          price_per_case?: number;
          product_id?: string | null;
          quantity_per_case?: number | null;
          rolls_per_case?: number | null;
          sizeSquanence?: number | null;
          shipping_cost?: number | null;
          size_unit?: string;
          size_value?: string;
          sku: any;
          unit?: boolean;
          groupIds?: string[];
          disAllogroupIds?: string[];
          case?: boolean;
          stock?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      products: {
        Row: {
          base_price: number;
          category: string;
          created_at: string | null;
          current_stock: number;
          customization: Json | null;
          description: string | null;
          id: string;
          image: string | null;
          image_url: string | null;
          images: string[] | null;
          min_stock: number;
          name: string;
          quantity_per_case: number | null;
          quantityPerCase: number | null;
          reorder_point: number;
          shipping_cost: number | null;
          size_unit: string | null;
          size_value: number | null;
          sku: string;
          key_features: string;
          squanence: string;
          updated_at: string | null;

          ndcCode?: string;
          upcCode?: string;
          lotNumber?: string;
          exipry?: string;
          unitToggle?: boolean;
        };
        Insert: {
          base_price?: number;
          category: string;
          created_at?: string | null;
          current_stock?: number;
          customization?: Json | null;
          description?: string | null;
          id?: string;
          image?: string | null;
          image_url?: string | null;
          images?: string[] | null;
          min_stock?: number;
          name: string;
          quantity_per_case?: number | null;
          quantityPerCase?: number | null;
          reorder_point?: number;
          shipping_cost?: number | null;
          size_unit?: string | null;
          size_value?: number | null;
          sku: string;
          key_features: string;
          squanence: string;
          ndcCode?: string;
          upcCode?: string;
          lotNumber?: string;
          unitToggle?: boolean;
          exipry?: string;
          updated_at?: string | null;
        };
        Update: {
          base_price?: number;
          category?: string;
          created_at?: string | null;
          current_stock?: number;
          customization?: Json | null;
          description?: string | null;
          id?: string;
          image?: string | null;
          image_url?: string | null;
          images?: string[] | null;
          min_stock?: number;
          name?: string;
          quantity_per_case?: number | null;
          quantityPerCase?: number | null;
          reorder_point?: number;
          shipping_cost?: number | null;
          size_unit?: string | null;
          size_value?: number | null;
          sku?: string;
          key_features?: string;
          squanence?: string;
          ndcCode?: string;
          upcCode?: string;
          unitToggle?: boolean;
          lotNumber?: string;
          exipry?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          account_status: string | null;

          alternative_email: string | null;
          email_notifaction?: boolean | false;
          order_updates?: boolean | false;
          billing_address: Json | null;
          company_name: string | null;
          contact_person: string | null;
          created_at: string | null;
          credit_limit: string | null;
          currency: string | null;
          department: string | null;
          display_name: string | null;
          documents: Json | null;
          email: string;
          enable_portal: boolean | null;
          fax_number: string | null;
          first_name: string;
          group_station: string | null;
          id: string;
          group_id?: string | null;

          locations?: any;
          language_preference: string | null;
          last_active: string | null;
          last_login: string | null;
          last_name: string;
          last_sign_in_at: string | null;
          mobile_phone: string | null;
          notes: string | null;
          payment_method: string | null;
          payment_terms: string | null;
          pharmacy_license: string | null;
          portal_language: string | null;
          preferred_contact_method: string | null;
          role: string | null;
          same_as_shipping: boolean | null;
          freeShipping: boolean | null;
          order_pay: boolean | null;
          shipping_address: Json | null;
          status: Database["public"]["Enums"]["user_status"];
          tax_id: string | null;
          tax_preference: string | null;
          type: Database["public"]["Enums"]["user_type"] | null;
          updated_at: string | null;
          website: string | null;
          work_phone: string | null;
        };
        Insert: {
          account_status?: string | null;
          alternative_email?: string | null;
          email_notifaction?: boolean | false;
          order_updates?: boolean | false;

          billing_address?: Json | null;
          company_name?: string | null;
          contact_person?: string | null;
          created_at?: string | null;
          credit_limit?: string | null;
          currency?: string | null;
          department?: string | null;
          display_name?: string | null;
          documents?: Json | null;
          email: string;
          enable_portal?: boolean | null;
          fax_number?: string | null;
          first_name: string;
          group_station?: string | null;
          id?: string;
          language_preference?: string | null;
          last_active?: string | null;
          last_login?: string | null;
          last_name: string;
          last_sign_in_at?: string | null;
          mobile_phone?: string | null;
          notes?: string | null;
          payment_method?: string | null;
          payment_terms?: string | null;
          pharmacy_license?: string | null;
          portal_language?: string | null;
          preferred_contact_method?: string | null;
          locations?: any;
          group_id?: string | null;

          role?: string | null;
          same_as_shipping?: boolean | null;
          freeShipping?: boolean | null;
          order_pay?: boolean | null;
          shipping_address?: Json | null;
          status?: Database["public"]["Enums"]["user_status"];
          tax_id?: string | null;
          tax_preference?: string | null;
          type?: Database["public"]["Enums"]["user_type"] | null;
          updated_at?: string | null;
          website?: string | null;
          work_phone?: string | null;
        };
        Update: {
          account_status?: string | null;
          alternative_email?: string | null;
          billing_address?: Json | null;
          email_notifaction?: boolean | false;
          order_updates?: boolean | false;

          company_name?: string | null;
          contact_person?: string | null;
          created_at?: string | null;
          credit_limit?: string | null;
          currency?: string | null;
          department?: string | null;
          display_name?: string | null;
          documents?: Json | null;
          email?: string;
          enable_portal?: boolean | null;
          fax_number?: string | null;
          first_name?: string;
          group_station?: string | null;
          id?: string;
          group_id?: string | null;

          language_preference?: string | null;
          last_active?: string | null;
          last_login?: string | null;
          last_name?: string;
          last_sign_in_at?: string | null;
          mobile_phone?: string | null;
          notes?: string | null;
          payment_method?: string | null;
          payment_terms?: string | null;
          pharmacy_license?: string | null;
          portal_language?: string | null;
          preferred_contact_method?: string | null;
          locations?: any;

          role?: string | null;
          same_as_shipping?: boolean | null;
          shipping_address?: Json | null;
          order_pay?: boolean | null;
          status?: Database["public"]["Enums"]["user_status"];
          tax_id?: string | null;
          tax_preference?: string | null;
          type?: Database["public"]["Enums"]["user_type"] | null;
          updated_at?: string | null;
          website?: string | null;
          work_phone?: string | null;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          address: string | null;
          authorize_net_api_login_id: string | null;
          authorize_net_enabled: boolean | null;
          authorize_net_test_mode: boolean | null;
          authorize_net_transaction_key: string | null;
          business_name: string | null;
          city: string | null;
          created_at: string | null;
          current_password: string | null;
          custom_payment_instructions: string | null;
          description: string | null;
          email: string | null;
          email_notifications: boolean | null;
          id: string;
          invoice_accent_color: string | null;
          invoice_due_days: number | null;
          invoice_footer_text: string | null;
          invoice_header_text: string | null;
          invoice_logo: string | null;
          invoice_notes: string | null;
          invoice_prefix: string | null;
          invoice_terms_and_conditions: string | null;
          logo: string | null;
          new_password: string | null;
          next_invoice_number: number | null;
          order_updates: boolean | null;
          phone: string | null;
          profile_id: string | null;
          show_business_address: boolean | null;
          show_invoice_due_date: boolean | null;
          show_logo: boolean | null;
          show_payment_instructions: boolean | null;
          state: string | null;
          suite: string | null;
          two_factor_enabled: boolean | null;
          updated_at: string | null;
          zip_code: string | null;
        };
        Insert: {
          address?: string | null;
          authorize_net_api_login_id?: string | null;
          authorize_net_enabled?: boolean | null;
          authorize_net_test_mode?: boolean | null;
          authorize_net_transaction_key?: string | null;
          business_name?: string | null;
          city?: string | null;
          created_at?: string | null;
          current_password?: string | null;
          custom_payment_instructions?: string | null;
          description?: string | null;
          email?: string | null;
          email_notifications?: boolean | null;
          id?: string;
          invoice_accent_color?: string | null;
          invoice_due_days?: number | null;
          invoice_footer_text?: string | null;
          invoice_header_text?: string | null;
          invoice_logo?: string | null;
          invoice_notes?: string | null;
          invoice_prefix?: string | null;
          invoice_terms_and_conditions?: string | null;
          logo?: string | null;
          new_password?: string | null;
          next_invoice_number?: number | null;
          order_updates?: boolean | null;
          phone?: string | null;
          profile_id?: string | null;
          show_business_address?: boolean | null;
          show_invoice_due_date?: boolean | null;
          show_logo?: boolean | null;
          show_payment_instructions?: boolean | null;
          state?: string | null;
          suite?: string | null;
          two_factor_enabled?: boolean | null;
          updated_at?: string | null;
          zip_code?: string | null;
        };
        Update: {
          address?: string | null;
          authorize_net_api_login_id?: string | null;
          authorize_net_enabled?: boolean | null;
          authorize_net_test_mode?: boolean | null;
          authorize_net_transaction_key?: string | null;
          business_name?: string | null;
          city?: string | null;
          created_at?: string | null;
          current_password?: string | null;
          custom_payment_instructions?: string | null;
          description?: string | null;
          email?: string | null;
          email_notifications?: boolean | null;
          id?: string;
          invoice_accent_color?: string | null;
          invoice_due_days?: number | null;
          invoice_footer_text?: string | null;
          invoice_header_text?: string | null;
          invoice_logo?: string | null;
          invoice_notes?: string | null;
          invoice_prefix?: string | null;
          invoice_terms_and_conditions?: string | null;
          logo?: string | null;
          new_password?: string | null;
          next_invoice_number?: number | null;
          order_updates?: boolean | null;
          phone?: string | null;
          profile_id?: string | null;
          show_business_address?: boolean | null;
          show_invoice_due_date?: boolean | null;
          show_logo?: boolean | null;
          show_payment_instructions?: boolean | null;
          state?: string | null;
          suite?: string | null;
          two_factor_enabled?: boolean | null;
          updated_at?: string | null;
          zip_code?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "settings_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      centerize_data: {
        Row: {
          id: string;
          name: string;
          order_start: string;
          invoice_start: string;
          order_no: number;
          invoice_no: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          order_start: string;
          invoice_start: string;
          order_no: number;
          invoice_no: number;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          name: string;
          order_start: string;
          invoice_start: string;
          order_no: number;
          invoice_no: number;
          created_at: string;
        }>;
      };
      expenses: {
        Row: {
          amount: number;
          created_at: string;
          date: string;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          amount?: number;
          created_at?: string;
          date: string;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          date?: string;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_if_user_is_admin: {
        Args: {
          user_id: string;
        };
        Returns: boolean;
      };
      decrement_stock: {
        Args: {
          product_id: string;
          quantity: number;
        };
        Returns: undefined;
      };
      generate_invoice_number: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      generate_order_number: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_low_stock_products: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          name: string;
          current_stock: number;
          min_stock: number;
        }[];
      };
      get_order_status_counts:
        | {
            Args: Record<PropertyKey, never>;
            Returns: {
              status: string;
              count: number;
            }[];
          }
        | {
            Args: {
              user_id: string;
            };
            Returns: {
              status: string;
              count: number;
            }[];
          };
      is_admin: {
        Args: {
          user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      discount_type: "fixed" | "percentage";
      invoice_status:
        | "draft"
        | "pending"
        | "needs_payment_link"
        | "payment_link_sent"
        | "paid"
        | "overdue"
        | "cancelled";
      order_status:
        | "new"
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled";
      payment_method: "card" | "bank_transfer" | "ach" | "manual";
      payment_terms: "net30" | "net60" | "net90" | "due_on_receipt";
      shipping_method: "FedEx" | "custom";
      user_status: "active" | "inactive" | "pending";
      user_type: "admin" | "pharmacy" | "group" | "hospital";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;
