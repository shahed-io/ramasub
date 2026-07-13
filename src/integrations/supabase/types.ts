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
  public: {
    Tables: {
      abandoned_checkouts: {
        Row: {
          admin_note: string | null
          checkout_step: number
          contacted_at: string | null
          coupon_code: string | null
          created_at: string
          customer_note: string | null
          email: string
          full_name: string
          id: string
          items: Json
          payment_method: string | null
          payment_screenshot_url: string | null
          phone: string
          recovered_at: string | null
          recovered_order_id: string | null
          sender_number: string | null
          status: string
          subtotal: number
          total: number
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          checkout_step?: number
          contacted_at?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_note?: string | null
          email: string
          full_name?: string
          id?: string
          items?: Json
          payment_method?: string | null
          payment_screenshot_url?: string | null
          phone?: string
          recovered_at?: string | null
          recovered_order_id?: string | null
          sender_number?: string | null
          status?: string
          subtotal?: number
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          checkout_step?: number
          contacted_at?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_note?: string | null
          email?: string
          full_name?: string
          id?: string
          items?: Json
          payment_method?: string | null
          payment_screenshot_url?: string | null
          phone?: string
          recovered_at?: string | null
          recovered_order_id?: string | null
          sender_number?: string | null
          status?: string
          subtotal?: number
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      accessibility_reports: {
        Row: {
          created_at: string
          description: string
          id: string
          issue_type: string
          metadata: Json
          page_url: string | null
          priority: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          issue_type?: string
          metadata?: Json
          page_url?: string | null
          priority?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          issue_type?: string
          metadata?: Json
          page_url?: string | null
          priority?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      admin_mfa_grants: {
        Row: {
          expires_at: string
          granted_at: string
          id: string
          ip: string | null
          method: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          expires_at: string
          granted_at?: string
          id?: string
          ip?: string | null
          method: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string
          granted_at?: string
          id?: string
          ip?: string | null
          method?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_records: {
        Row: {
          created_at: string
          data: Json
          id: string
          is_active: boolean
          kind: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          is_active?: boolean
          kind: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          is_active?: boolean
          kind?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string
          ends_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_subtotal: number
          starts_at: string | null
          type: string
          updated_at: string
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_subtotal?: number
          starts_at?: string | null
          type?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_subtotal?: number
          starts_at?: string | null
          type?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      live_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          user_id: string | null
          visitor_label: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          user_id?: string | null
          visitor_label?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          user_id?: string | null
          visitor_label?: string | null
        }
        Relationships: []
      }
      meta_advanced_matching: {
        Row: {
          created_at: string
          fields: Json
          id: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          fields?: Json
          id?: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          fields?: Json
          id?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      meta_business_config: {
        Row: {
          access_token_encrypted: string | null
          access_token_last4: string | null
          advanced_matching: boolean
          auto_inject: boolean
          auto_pageview: boolean
          capi_enabled: boolean
          capi_endpoint: string | null
          capi_max_retry: number
          capi_queue_failed: boolean
          capi_retry_failed: boolean
          capi_timeout_ms: number
          consent_ccpa: boolean
          consent_gdpr: boolean
          consent_region_detect: boolean
          created_at: string
          dataset_id: string | null
          debug_mode: boolean
          enable_pixel: boolean
          event_match_quality: number | null
          graph_api_version: string
          id: string
          last_event_at: string | null
          last_verified_at: string | null
          last_verify_result: Json | null
          load_after_consent: boolean
          load_in_head: boolean
          pixel_id: string | null
          singleton: boolean
          spa_nav: boolean
          test_event_code: string | null
          updated_at: string
          wc_detect: boolean
        }
        Insert: {
          access_token_encrypted?: string | null
          access_token_last4?: string | null
          advanced_matching?: boolean
          auto_inject?: boolean
          auto_pageview?: boolean
          capi_enabled?: boolean
          capi_endpoint?: string | null
          capi_max_retry?: number
          capi_queue_failed?: boolean
          capi_retry_failed?: boolean
          capi_timeout_ms?: number
          consent_ccpa?: boolean
          consent_gdpr?: boolean
          consent_region_detect?: boolean
          created_at?: string
          dataset_id?: string | null
          debug_mode?: boolean
          enable_pixel?: boolean
          event_match_quality?: number | null
          graph_api_version?: string
          id?: string
          last_event_at?: string | null
          last_verified_at?: string | null
          last_verify_result?: Json | null
          load_after_consent?: boolean
          load_in_head?: boolean
          pixel_id?: string | null
          singleton?: boolean
          spa_nav?: boolean
          test_event_code?: string | null
          updated_at?: string
          wc_detect?: boolean
        }
        Update: {
          access_token_encrypted?: string | null
          access_token_last4?: string | null
          advanced_matching?: boolean
          auto_inject?: boolean
          auto_pageview?: boolean
          capi_enabled?: boolean
          capi_endpoint?: string | null
          capi_max_retry?: number
          capi_queue_failed?: boolean
          capi_retry_failed?: boolean
          capi_timeout_ms?: number
          consent_ccpa?: boolean
          consent_gdpr?: boolean
          consent_region_detect?: boolean
          created_at?: string
          dataset_id?: string | null
          debug_mode?: boolean
          enable_pixel?: boolean
          event_match_quality?: number | null
          graph_api_version?: string
          id?: string
          last_event_at?: string | null
          last_verified_at?: string | null
          last_verify_result?: Json | null
          load_after_consent?: boolean
          load_in_head?: boolean
          pixel_id?: string | null
          singleton?: boolean
          spa_nav?: boolean
          test_event_code?: string | null
          updated_at?: string
          wc_detect?: boolean
        }
        Relationships: []
      }
      meta_capi_queue: {
        Row: {
          attempts: number
          created_at: string
          event_name: string
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_name: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload: Json
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_name?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      meta_custom_events: {
        Row: {
          browser: boolean
          created_at: string
          enabled: boolean
          id: string
          name: string
          params: Json
          server: boolean
          trigger_type: string
          trigger_value: string
          updated_at: string
        }
        Insert: {
          browser?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          params?: Json
          server?: boolean
          trigger_type: string
          trigger_value: string
          updated_at?: string
        }
        Update: {
          browser?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          params?: Json
          server?: boolean
          trigger_type?: string
          trigger_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      meta_event_logs: {
        Row: {
          channel: string
          created_at: string
          customer_id: string | null
          event_id: string | null
          event_name: string
          http_code: number | null
          id: string
          latency_ms: number | null
          order_id: string | null
          response: Json | null
          retry_count: number
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          customer_id?: string | null
          event_id?: string | null
          event_name: string
          http_code?: number | null
          id?: string
          latency_ms?: number | null
          order_id?: string | null
          response?: Json | null
          retry_count?: number
          status: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          event_id?: string | null
          event_name?: string
          http_code?: number | null
          id?: string
          latency_ms?: number | null
          order_id?: string | null
          response?: Json | null
          retry_count?: number
          status?: string
        }
        Relationships: []
      }
      meta_standard_events: {
        Row: {
          browser: boolean
          created_at: string
          dedupe: boolean
          enabled: boolean
          event_name: string
          priority: number
          server: boolean
          updated_at: string
        }
        Insert: {
          browser?: boolean
          created_at?: string
          dedupe?: boolean
          enabled?: boolean
          event_name: string
          priority?: number
          server?: boolean
          updated_at?: string
        }
        Update: {
          browser?: boolean
          created_at?: string
          dedupe?: boolean
          enabled?: boolean
          event_name?: string
          priority?: number
          server?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          source: string | null
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          source?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          source?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read_status: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read_status?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read_status?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_campaigns: {
        Row: {
          ai_selection_prompt: string | null
          allow_multiple_entries: boolean
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          fields_schema: Json
          google_form_url: string | null
          id: string
          prizes: Json
          redirect_url: string | null
          show_winners_publicly: boolean
          slug: string
          starts_at: string | null
          status: string
          success_message: string | null
          title: string
          total_submissions: number
          updated_at: string
          winner_count: number
        }
        Insert: {
          ai_selection_prompt?: string | null
          allow_multiple_entries?: boolean
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          fields_schema?: Json
          google_form_url?: string | null
          id?: string
          prizes?: Json
          redirect_url?: string | null
          show_winners_publicly?: boolean
          slug: string
          starts_at?: string | null
          status?: string
          success_message?: string | null
          title: string
          total_submissions?: number
          updated_at?: string
          winner_count?: number
        }
        Update: {
          ai_selection_prompt?: string | null
          allow_multiple_entries?: boolean
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          fields_schema?: Json
          google_form_url?: string | null
          id?: string
          prizes?: Json
          redirect_url?: string | null
          show_winners_publicly?: boolean
          slug?: string
          starts_at?: string | null
          status?: string
          success_message?: string | null
          title?: string
          total_submissions?: number
          updated_at?: string
          winner_count?: number
        }
        Relationships: []
      }
      offer_submissions: {
        Row: {
          ai_reason: string | null
          ai_score: number | null
          answers: Json
          campaign_id: string
          created_at: string
          email: string
          id: string
          ip: string | null
          is_winner: boolean
          name: string
          notified_at: string | null
          phone: string | null
          user_agent: string | null
          user_id: string | null
          winner_rank: number | null
        }
        Insert: {
          ai_reason?: string | null
          ai_score?: number | null
          answers?: Json
          campaign_id: string
          created_at?: string
          email: string
          id?: string
          ip?: string | null
          is_winner?: boolean
          name: string
          notified_at?: string | null
          phone?: string | null
          user_agent?: string | null
          user_id?: string | null
          winner_rank?: number | null
        }
        Update: {
          ai_reason?: string | null
          ai_score?: number | null
          answers?: Json
          campaign_id?: string
          created_at?: string
          email?: string
          id?: string
          ip?: string | null
          is_winner?: boolean
          name?: string
          notified_at?: string | null
          phone?: string | null
          user_agent?: string | null
          user_id?: string | null
          winner_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "offer_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string | null
          created_at: string
          delivered_at: string | null
          delivered_credentials: Json | null
          email: string
          full_name: string
          id: string
          items: Json
          payment_method: string
          payment_screenshot_url: string | null
          payment_status: string
          phone: string
          status: string
          total: number
          transaction_id: string
          updated_at: string
          user_id: string
          whatsapp_sent: boolean
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_credentials?: Json | null
          email: string
          full_name: string
          id?: string
          items: Json
          payment_method: string
          payment_screenshot_url?: string | null
          payment_status?: string
          phone: string
          status?: string
          total: number
          transaction_id: string
          updated_at?: string
          user_id: string
          whatsapp_sent?: boolean
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          delivered_at?: string | null
          delivered_credentials?: Json | null
          email?: string
          full_name?: string
          id?: string
          items?: Json
          payment_method?: string
          payment_screenshot_url?: string | null
          payment_status?: string
          phone?: string
          status?: string
          total?: number
          transaction_id?: string
          updated_at?: string
          user_id?: string
          whatsapp_sent?: boolean
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          admin_reply: string | null
          admin_reply_at: string | null
          comment: string
          created_at: string
          id: string
          is_approved: boolean
          product_slug: string
          rating: number
          reviewer_name: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          comment: string
          created_at?: string
          id?: string
          is_approved?: boolean
          product_slug: string
          rating: number
          reviewer_name: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          comment?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          product_slug?: string
          rating?: number
          reviewer_name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          badge: string | null
          category: string
          created_at: string
          delivery_time: string
          description: string
          emoji: string
          features: Json
          gradient: string
          image_url: string
          is_active: boolean
          meta: Json
          name: string
          plans: Json
          short_description: string
          slug: string
          sort_order: number
          stock_status: string
          tagline: string
          updated_at: string
          views: number
          warranty: string
          whatsapp_order_text: string
        }
        Insert: {
          badge?: string | null
          category: string
          created_at?: string
          delivery_time?: string
          description?: string
          emoji?: string
          features?: Json
          gradient?: string
          image_url?: string
          is_active?: boolean
          meta?: Json
          name: string
          plans?: Json
          short_description?: string
          slug: string
          sort_order?: number
          stock_status?: string
          tagline?: string
          updated_at?: string
          views?: number
          warranty?: string
          whatsapp_order_text?: string
        }
        Update: {
          badge?: string | null
          category?: string
          created_at?: string
          delivery_time?: string
          description?: string
          emoji?: string
          features?: Json
          gradient?: string
          image_url?: string
          is_active?: boolean
          meta?: Json
          name?: string
          plans?: Json
          short_description?: string
          slug?: string
          sort_order?: number
          stock_status?: string
          tagline?: string
          updated_at?: string
          views?: number
          warranty?: string
          whatsapp_order_text?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          badge: string | null
          code: string | null
          created_at: string
          description: string
          discount_percent: number | null
          ends_at: string | null
          id: string
          is_active: boolean
          product_slug: string | null
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          code?: string | null
          created_at?: string
          description?: string
          discount_percent?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          product_slug?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          code?: string | null
          created_at?: string
          description?: string
          discount_percent?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          product_slug?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_product_slug_fkey"
            columns: ["product_slug"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["slug"]
          },
        ]
      }
      redirects: {
        Row: {
          created_at: string
          from_path: string
          hits: number
          id: string
          is_active: boolean
          notes: string | null
          status_code: number
          to_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_path: string
          hits?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          status_code?: number
          to_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_path?: string
          hits?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          status_code?: number
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      renewal_reminders_sent: {
        Row: {
          expiry_date: string
          id: string
          item_key: string
          order_id: string
          recipient_email: string
          sent_at: string
        }
        Insert: {
          expiry_date: string
          id?: string
          item_key: string
          order_id: string
          recipient_email: string
          sent_at?: string
        }
        Update: {
          expiry_date?: string
          id?: string
          item_key?: string
          order_id?: string
          recipient_email?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_reminders_sent_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages: {
        Row: {
          content: Json
          created_at: string
          id: string
          key: string
          page_type: string
          path: string
          seo: Json
          show_in_menu: boolean
          sort_order: number
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          key: string
          page_type?: string
          path: string
          seo?: Json
          show_in_menu?: boolean
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          key?: string
          page_type?: string
          path?: string
          seo?: Json
          show_in_menu?: boolean
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          id: string
          name: string
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          id?: string
          name: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      telegram_customer_links: {
        Row: {
          chat_id: number
          first_name: string | null
          id: string
          last_name: string | null
          linked_at: string
          phone: string | null
          telegram_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_id: number
          first_name?: string | null
          id?: string
          last_name?: string | null
          linked_at?: string
          phone?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_id?: number
          first_name?: string | null
          id?: string
          last_name?: string | null
          linked_at?: string
          phone?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_link_codes: {
        Row: {
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          user_id: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          user_id: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_notifications_log: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          message: string | null
          payload: Json | null
          success: boolean
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          message?: string | null
          payload?: Json | null
          success?: boolean
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          message?: string | null
          payload?: Json | null
          success?: boolean
        }
        Relationships: []
      }
      telegram_phone_otps: {
        Row: {
          attempts: number
          chat_id: number
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          chat_id: number
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          chat_id?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      telegram_settings: {
        Row: {
          bot_token: string | null
          chat_id: string | null
          created_at: string
          customer_bot_enabled: boolean
          customer_bot_token: string | null
          customer_bot_username: string | null
          customer_events: Json
          customer_webhook_secret: string | null
          enabled: boolean
          events: Json
          id: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          bot_token?: string | null
          chat_id?: string | null
          created_at?: string
          customer_bot_enabled?: boolean
          customer_bot_token?: string | null
          customer_bot_username?: string | null
          customer_events?: Json
          customer_webhook_secret?: string | null
          enabled?: boolean
          events?: Json
          id?: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          bot_token?: string | null
          chat_id?: string | null
          created_at?: string
          customer_bot_enabled?: boolean
          customer_bot_token?: string | null
          customer_bot_username?: string | null
          customer_events?: Json
          customer_webhook_secret?: string | null
          enabled?: boolean
          events?: Json
          id?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_role: string
          sender_user_id: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_role: string
          sender_user_id: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_role?: string
          sender_user_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events_log: {
        Row: {
          created_at: string
          error_message: string | null
          event_name: string
          id: string
          payload: Json
          provider: string
          response: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_name: string
          id?: string
          payload?: Json
          provider: string
          response?: Json | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_name?: string
          id?: string
          payload?: Json
          provider?: string
          response?: Json | null
          status?: string
        }
        Relationships: []
      }
      tracking_pixels: {
        Row: {
          access_token: string | null
          account_id: string | null
          conversion_label: string | null
          created_at: string
          custom_script: string | null
          enabled: boolean
          events_config: Json
          id: string
          label: string | null
          notes: string | null
          pixel_id: string | null
          provider: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          conversion_label?: string | null
          created_at?: string
          custom_script?: string | null
          enabled?: boolean
          events_config?: Json
          id?: string
          label?: string | null
          notes?: string | null
          pixel_id?: string | null
          provider: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          conversion_label?: string | null
          created_at?: string
          custom_script?: string | null
          enabled?: boolean
          events_config?: Json
          id?: string
          label?: string | null
          notes?: string | null
          pixel_id?: string | null
          provider?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      wallet_topups: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_path: string | null
          sender_number: string | null
          status: Database["public"]["Enums"]["wallet_topup_status"]
          txn_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string | null
          sender_number?: string | null
          status?: Database["public"]["Enums"]["wallet_topup_status"]
          txn_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string | null
          sender_number?: string | null
          status?: Database["public"]["Enums"]["wallet_topup_status"]
          txn_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          ref_order_id: string | null
          ref_topup_id: string | null
          type: Database["public"]["Enums"]["wallet_txn_type"]
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          ref_order_id?: string | null
          ref_topup_id?: string | null
          type: Database["public"]["Enums"]["wallet_txn_type"]
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          ref_order_id?: string | null
          ref_topup_id?: string | null
          type?: Database["public"]["Enums"]["wallet_txn_type"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      web_analytics_events: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          country_name: string | null
          created_at: string
          device: string | null
          duration_ms: number | null
          full_url: string | null
          id: string
          ip_hash: string | null
          is_new_session: boolean | null
          is_new_visitor: boolean | null
          language: string | null
          os: string | null
          path: string
          referrer: string | null
          referrer_host: string | null
          region: string | null
          screen_size: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          country_name?: string | null
          created_at?: string
          device?: string | null
          duration_ms?: number | null
          full_url?: string | null
          id?: string
          ip_hash?: string | null
          is_new_session?: boolean | null
          is_new_visitor?: boolean | null
          language?: string | null
          os?: string | null
          path: string
          referrer?: string | null
          referrer_host?: string | null
          region?: string | null
          screen_size?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          country_name?: string | null
          created_at?: string
          device?: string | null
          duration_ms?: number | null
          full_url?: string | null
          id?: string
          ip_hash?: string | null
          is_new_session?: boolean | null
          is_new_visitor?: boolean | null
          language?: string | null
          os?: string | null
          path?: string
          referrer?: string | null
          referrer_host?: string | null
          region?: string | null
          screen_size?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      offer_winners_public: {
        Row: {
          ai_reason: string | null
          campaign_id: string | null
          created_at: string | null
          id: string | null
          name: string | null
          winner_rank: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "offer_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions_public: {
        Row: {
          badge: string | null
          created_at: string | null
          description: string | null
          discount_percent: number | null
          ends_at: string | null
          id: string | null
          is_active: boolean | null
          product_slug: string | null
          starts_at: string | null
          title: string | null
        }
        Insert: {
          badge?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          ends_at?: string | null
          id?: string | null
          is_active?: boolean | null
          product_slug?: string | null
          starts_at?: string | null
          title?: string | null
        }
        Update: {
          badge?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          ends_at?: string | null
          id?: string | null
          is_active?: boolean | null
          product_slug?: string | null
          starts_at?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_product_slug_fkey"
            columns: ["product_slug"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["slug"]
          },
        ]
      }
      public_contest_winners: {
        Row: {
          ai_reason: string | null
          campaign_id: string | null
          created_at: string | null
          id: string | null
          is_winner: boolean | null
          name: string | null
          winner_rank: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "offer_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_pixels_public: {
        Row: {
          account_id: string | null
          conversion_label: string | null
          custom_script: string | null
          enabled: boolean | null
          events_config: Json | null
          id: string | null
          pixel_id: string | null
          provider: string | null
          sort_order: number | null
        }
        Insert: {
          account_id?: string | null
          conversion_label?: string | null
          custom_script?: string | null
          enabled?: boolean | null
          events_config?: Json | null
          id?: string | null
          pixel_id?: string | null
          provider?: string | null
          sort_order?: number | null
        }
        Update: {
          account_id?: string | null
          conversion_label?: string | null
          custom_script?: string | null
          enabled?: boolean | null
          events_config?: Json | null
          id?: string | null
          pixel_id?: string | null
          provider?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      v_has_role_permissions: {
        Row: {
          can_execute: boolean | null
          grantee: string | null
          signature: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _wallet_apply: {
        Args: {
          _created_by: string
          _delta: number
          _reason: string
          _ref_order: string
          _ref_topup: string
          _type: Database["public"]["Enums"]["wallet_txn_type"]
          _user_id: string
        }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          ref_order_id: string | null
          ref_topup_id: string | null
          type: Database["public"]["Enums"]["wallet_txn_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_adjust_wallet: {
        Args: { _amount: number; _reason: string; _user_id: string }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          ref_order_id: string | null
          ref_topup_id: string | null
          type: Database["public"]["Enums"]["wallet_txn_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_credit_wallet: {
        Args: {
          _amount: number
          _reason: string
          _ref_order?: string
          _type: Database["public"]["Enums"]["wallet_txn_type"]
          _user_id: string
        }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          ref_order_id: string | null
          ref_topup_id: string | null
          type: Database["public"]["Enums"]["wallet_txn_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_wallet_topup: {
        Args: { _admin_note?: string; _topup_id: string }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          ref_order_id: string | null
          ref_topup_id: string | null
          type: Database["public"]["Enums"]["wallet_txn_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_offer_email_submitted: {
        Args: { _campaign_id: string; _email: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redeem_coupon: { Args: { _code: string }; Returns: undefined }
      redeem_referral: { Args: { _code: string }; Returns: Json }
      reject_wallet_topup: {
        Args: { _admin_note?: string; _topup_id: string }
        Returns: undefined
      }
      spend_wallet: {
        Args: { _amount: number; _reason?: string; _ref_order?: string }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          ref_order_id: string | null
          ref_topup_id: string | null
          type: Database["public"]["Enums"]["wallet_txn_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_coupon: {
        Args: { _code: string; _subtotal: number }
        Returns: {
          code: string
          discount: number
          label: string
          reason: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      wallet_topup_status: "pending" | "approved" | "rejected"
      wallet_txn_type:
        | "topup"
        | "refund"
        | "cashback"
        | "referral"
        | "spend"
        | "adjustment"
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
      app_role: ["admin", "user"],
      wallet_topup_status: ["pending", "approved", "rejected"],
      wallet_txn_type: [
        "topup",
        "refund",
        "cashback",
        "referral",
        "spend",
        "adjustment",
      ],
    },
  },
} as const
