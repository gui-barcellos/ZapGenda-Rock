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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_action_definitions: {
        Row: {
          action_hashtag: string
          category: string | null
          created_at: string | null
          description: string | null
          handler: string
          id: string
          is_active: boolean | null
          name: string
          parameters: Json | null
          response_instruction: string | null
          updated_at: string | null
        }
        Insert: {
          action_hashtag: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          handler: string
          id?: string
          is_active?: boolean | null
          name: string
          parameters?: Json | null
          response_instruction?: string | null
          updated_at?: string | null
        }
        Update: {
          action_hashtag?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          handler?: string
          id?: string
          is_active?: boolean | null
          name?: string
          parameters?: Json | null
          response_instruction?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_instruction_blocks: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          instructions: string
          is_active: boolean | null
          name: string
          order_position: number | null
          slug: string
          trigger_hashtag: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          instructions?: string
          is_active?: boolean | null
          name: string
          order_position?: number | null
          slug: string
          trigger_hashtag: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          instructions?: string
          is_active?: boolean | null
          name?: string
          order_position?: number | null
          slug?: string
          trigger_hashtag?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_master_prompt: {
        Row: {
          context_window: number | null
          id: string
          max_tokens: number | null
          model: string | null
          paragraph_delay_seconds: number | null
          prompt: string
          state_expiration_minutes: number | null
          temperature: number | null
          top_p: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          context_window?: number | null
          id?: string
          max_tokens?: number | null
          model?: string | null
          paragraph_delay_seconds?: number | null
          prompt?: string
          state_expiration_minutes?: number | null
          temperature?: number | null
          top_p?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          context_window?: number | null
          id?: string
          max_tokens?: number | null
          model?: string | null
          paragraph_delay_seconds?: number | null
          prompt?: string
          state_expiration_minutes?: number | null
          temperature?: number | null
          top_p?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_prompt_injections: {
        Row: {
          category: string
          content: string
          description: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          category: string
          content: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          category?: string
          content?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      ai_prompt_logs: {
        Row: {
          ai_config_snapshot: Json | null
          ai_response: string | null
          company_id: string
          contact_id: string | null
          conversation_id: string | null
          conversation_stage: string | null
          created_at: string | null
          full_prompt: string
          function_calls: Json | null
          id: string
          is_first_message: boolean | null
          loop_iterations: number | null
          message_count: number | null
          model_used: string | null
          openai_raw_response: Json | null
          previous_response_id: string | null
          response_id_generated: string | null
          response_time_ms: number | null
          tokens_input: number | null
          tokens_output: number | null
          tokens_total: number | null
          user_message: string | null
        }
        Insert: {
          ai_config_snapshot?: Json | null
          ai_response?: string | null
          company_id: string
          contact_id?: string | null
          conversation_id?: string | null
          conversation_stage?: string | null
          created_at?: string | null
          full_prompt: string
          function_calls?: Json | null
          id?: string
          is_first_message?: boolean | null
          loop_iterations?: number | null
          message_count?: number | null
          model_used?: string | null
          openai_raw_response?: Json | null
          previous_response_id?: string | null
          response_id_generated?: string | null
          response_time_ms?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          user_message?: string | null
        }
        Update: {
          ai_config_snapshot?: Json | null
          ai_response?: string | null
          company_id?: string
          contact_id?: string | null
          conversation_id?: string | null
          conversation_stage?: string | null
          created_at?: string | null
          full_prompt?: string
          function_calls?: Json | null
          id?: string
          is_first_message?: boolean | null
          loop_iterations?: number | null
          message_count?: number | null
          model_used?: string | null
          openai_raw_response?: Json | null
          previous_response_id?: string | null
          response_id_generated?: string | null
          response_time_ms?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          user_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompt_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompt_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_token_usage: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          model_used: string
          operation_type: string | null
          tokens_used: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          model_used: string
          operation_type?: string | null
          tokens_used?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          model_used?: string
          operation_type?: string | null
          tokens_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_token_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          company_id: string | null
          confirmation_sent: boolean | null
          confirmation_sent_at: string | null
          contact_id: string | null
          created_at: string | null
          date: string
          end_time: string
          id: string
          notes: string | null
          post_attended_sent_at: string | null
          post_missed_sent_at: string | null
          pre_reminder_sent_at: string | null
          reminder_sent_at: string | null
          professional_id: string | null
          service_id: string | null
          start_time: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          confirmation_sent?: boolean | null
          confirmation_sent_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          notes?: string | null
          post_attended_sent_at?: string | null
          post_missed_sent_at?: string | null
          pre_reminder_sent_at?: string | null
          reminder_sent_at?: string | null
          professional_id?: string | null
          service_id?: string | null
          start_time: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          confirmation_sent?: boolean | null
          confirmation_sent_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          post_attended_sent_at?: string | null
          post_missed_sent_at?: string | null
          pre_reminder_sent_at?: string | null
          reminder_sent_at?: string | null
          professional_id?: string | null
          service_id?: string | null
          start_time?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_transcription_usage: {
        Row: {
          audio_duration_seconds: number
          company_id: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          transcription_text: string | null
          whisper_model: string | null
        }
        Insert: {
          audio_duration_seconds: number
          company_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          transcription_text?: string | null
          whisper_model?: string | null
        }
        Update: {
          audio_duration_seconds?: number
          company_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          transcription_text?: string | null
          whisper_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_transcription_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_message_templates: {
        Row: {
          company_id: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          message_type: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_message_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          company_id: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          professional_id: string | null
          start_time: string
        }
        Insert: {
          company_id?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          professional_id?: string | null
          start_time: string
        }
        Update: {
          company_id?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          professional_id?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_messages_log: {
        Row: {
          company_id: string
          contact_id: string
          id: string
          sent_at: string | null
          year: number
        }
        Insert: {
          company_id: string
          contact_id: string
          id?: string
          sent_at?: string | null
          year: number
        }
        Update: {
          company_id?: string
          contact_id?: string
          id?: string
          sent_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "birthday_messages_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_messages_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_slots: {
        Row: {
          company_id: string | null
          created_at: string | null
          date: string
          end_time: string | null
          general_block_group_id: string | null
          id: string
          is_general_block: boolean | null
          professional_id: string | null
          reason: string | null
          start_time: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          date: string
          end_time?: string | null
          general_block_group_id?: string | null
          id?: string
          is_general_block?: boolean | null
          professional_id?: string | null
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          date?: string
          end_time?: string | null
          general_block_group_id?: string | null
          id?: string
          is_general_block?: boolean | null
          professional_id?: string | null
          reason?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_slots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_slots_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          default_language: string | null
          free_days_granted: number | null
          id: string
          name: string
          owner_email: string
          owner_name: string
          owner_whatsapp: string
          payment_due_day: number | null
          status: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          default_language?: string | null
          free_days_granted?: number | null
          id?: string
          name: string
          owner_email: string
          owner_name: string
          owner_whatsapp: string
          payment_due_day?: number | null
          status?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          default_language?: string | null
          free_days_granted?: number | null
          id?: string
          name?: string
          owner_email?: string
          owner_name?: string
          owner_whatsapp?: string
          payment_due_day?: number | null
          status?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      company_ai_settings: {
        Row: {
          ai_enabled: boolean | null
          ai_instructions: string | null
          ai_name: string | null
          ai_personality: string | null
          ai_personality_type: string | null
          ai_tone: string | null
          ask_preferred_day: boolean | null
          company_id: string | null
          created_at: string | null
          custom_faqs: Json | null
          escalation_rules: string | null
          escalation_sound_enabled: boolean | null
          escalation_sound_type: string | null
          escalation_tag: string | null
          greeting_message: string | null
          greeting_show_always: boolean | null
          greeting_time_based: boolean | null
          id: string
          process_expired_message: string | null
          scheduling_mode: string | null
          show_next_slots: number | null
          state_expiration_minutes: number | null
          updated_at: string | null
          urgency_rules: string | null
          urgency_sound_enabled: boolean | null
          urgency_sound_type: string | null
          urgency_tag: string | null
          use_function_calling: boolean | null
        }
        Insert: {
          ai_enabled?: boolean | null
          ai_instructions?: string | null
          ai_name?: string | null
          ai_personality?: string | null
          ai_personality_type?: string | null
          ai_tone?: string | null
          ask_preferred_day?: boolean | null
          company_id?: string | null
          created_at?: string | null
          custom_faqs?: Json | null
          escalation_rules?: string | null
          escalation_sound_enabled?: boolean | null
          escalation_sound_type?: string | null
          escalation_tag?: string | null
          greeting_message?: string | null
          greeting_show_always?: boolean | null
          greeting_time_based?: boolean | null
          id?: string
          process_expired_message?: string | null
          scheduling_mode?: string | null
          show_next_slots?: number | null
          state_expiration_minutes?: number | null
          updated_at?: string | null
          urgency_rules?: string | null
          urgency_sound_enabled?: boolean | null
          urgency_sound_type?: string | null
          urgency_tag?: string | null
          use_function_calling?: boolean | null
        }
        Update: {
          ai_enabled?: boolean | null
          ai_instructions?: string | null
          ai_name?: string | null
          ai_personality?: string | null
          ai_personality_type?: string | null
          ai_tone?: string | null
          ask_preferred_day?: boolean | null
          company_id?: string | null
          created_at?: string | null
          custom_faqs?: Json | null
          escalation_rules?: string | null
          escalation_sound_enabled?: boolean | null
          escalation_sound_type?: string | null
          escalation_tag?: string | null
          greeting_message?: string | null
          greeting_show_always?: boolean | null
          greeting_time_based?: boolean | null
          id?: string
          process_expired_message?: string | null
          scheduling_mode?: string | null
          show_next_slots?: number | null
          state_expiration_minutes?: number | null
          updated_at?: string | null
          urgency_rules?: string | null
          urgency_sound_enabled?: boolean | null
          urgency_sound_type?: string | null
          urgency_tag?: string | null
          use_function_calling?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "company_ai_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_faqs: {
        Row: {
          answer: string
          company_id: string
          created_at: string | null
          embedding: string | null
          id: string
          is_active: boolean | null
          question: string
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          company_id: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          is_active?: boolean | null
          question: string
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          company_id?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_faqs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          alternative_phone: string | null
          auto_mark_no_show_enabled: boolean | null
          auto_mark_no_show_hours: number | null
          business_hours: Json | null
          company_id: string | null
          created_at: string | null
          email: string | null
          google_maps_link: string | null
          has_physical_address: boolean | null
          id: string
          language: string | null
          logo_url: string | null
          max_advance_days: number | null
          max_advance_days_ai: number | null
          max_advance_days_manual: number | null
          min_advance_hours: number | null
          min_advance_hours_ai: number | null
          min_advance_hours_manual: number | null
          months_ahead_visible: number | null
          open_next_month_on_day: number | null
          opening_end_day: number | null
          opening_start_day: number | null
          opening_type: string | null
          opening_week: string | null
          payment_methods: string | null
          confirmation_hours: number | null
          pre_appointment_hours: number | null
          primary_color: string | null
          reminder_hours: number | null
          scheduled_return_reminder_days: number | null
          scheduling_mode: string | null
          send_birthday_messages: boolean | null
          send_confirmation_messages: boolean | null
          social_media: Json | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          alternative_phone?: string | null
          auto_mark_no_show_enabled?: boolean | null
          auto_mark_no_show_hours?: number | null
          business_hours?: Json | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          google_maps_link?: string | null
          has_physical_address?: boolean | null
          id?: string
          language?: string | null
          logo_url?: string | null
          max_advance_days?: number | null
          max_advance_days_ai?: number | null
          max_advance_days_manual?: number | null
          min_advance_hours?: number | null
          min_advance_hours_ai?: number | null
          min_advance_hours_manual?: number | null
          months_ahead_visible?: number | null
          open_next_month_on_day?: number | null
          opening_end_day?: number | null
          opening_start_day?: number | null
          opening_type?: string | null
          opening_week?: string | null
          payment_methods?: string | null
          confirmation_hours?: number | null
          pre_appointment_hours?: number | null
          primary_color?: string | null
          reminder_hours?: number | null
          scheduled_return_reminder_days?: number | null
          scheduling_mode?: string | null
          send_birthday_messages?: boolean | null
          send_confirmation_messages?: boolean | null
          social_media?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          alternative_phone?: string | null
          auto_mark_no_show_enabled?: boolean | null
          auto_mark_no_show_hours?: number | null
          business_hours?: Json | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          google_maps_link?: string | null
          has_physical_address?: boolean | null
          id?: string
          language?: string | null
          logo_url?: string | null
          max_advance_days?: number | null
          max_advance_days_ai?: number | null
          max_advance_days_manual?: number | null
          min_advance_hours?: number | null
          min_advance_hours_ai?: number | null
          min_advance_hours_manual?: number | null
          months_ahead_visible?: number | null
          open_next_month_on_day?: number | null
          opening_end_day?: number | null
          opening_start_day?: number | null
          opening_type?: string | null
          opening_week?: string | null
          payment_methods?: string | null
          confirmation_hours?: number | null
          pre_appointment_hours?: number | null
          primary_color?: string | null
          reminder_hours?: number | null
          scheduled_return_reminder_days?: number | null
          scheduling_mode?: string | null
          send_birthday_messages?: boolean | null
          send_confirmation_messages?: boolean | null
          social_media?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          company_id: string | null
          created_at: string | null
          current_ai_tokens: number | null
          current_contacts: number | null
          current_custom_tags: number | null
          current_professionals: number | null
          current_users: number | null
          current_whatsapp_numbers: number | null
          id: string
          max_ai_tokens: number | null
          max_contacts: number | null
          max_custom_tags: number | null
          max_professionals: number | null
          max_users: number | null
          max_whatsapp_numbers: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          current_ai_tokens?: number | null
          current_contacts?: number | null
          current_custom_tags?: number | null
          current_professionals?: number | null
          current_users?: number | null
          current_whatsapp_numbers?: number | null
          id?: string
          max_ai_tokens?: number | null
          max_contacts?: number | null
          max_custom_tags?: number | null
          max_professionals?: number | null
          max_users?: number | null
          max_whatsapp_numbers?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          current_ai_tokens?: number | null
          current_contacts?: number | null
          current_custom_tags?: number | null
          current_professionals?: number | null
          current_users?: number | null
          current_whatsapp_numbers?: number | null
          id?: string
          max_ai_tokens?: number | null
          max_contacts?: number | null
          max_custom_tags?: number | null
          max_professionals?: number | null
          max_users?: number | null
          max_whatsapp_numbers?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          assigned_to_user_id: string | null
          birth_date: string | null
          company_id: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          estimated_value: number | null
          funnel_stage: string | null
          id: string
          is_blocked: boolean | null
          last_contact_date: string | null
          lead_source: string | null
          lost_reason: string | null
          moved_to_stage_at: string | null
          name: string
          next_follow_up: string | null
          notes: string | null
          phone: string
          pipeline_notes: string | null
          profile_picture_fetched_at: string | null
          profile_picture_url: string | null
          secondary_phone: string | null
          tags: string[] | null
          whatsapp_about: string | null
          whatsapp_push_name: string | null
        }
        Insert: {
          assigned_to_user_id?: string | null
          birth_date?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          estimated_value?: number | null
          funnel_stage?: string | null
          id?: string
          is_blocked?: boolean | null
          last_contact_date?: string | null
          lead_source?: string | null
          lost_reason?: string | null
          moved_to_stage_at?: string | null
          name: string
          next_follow_up?: string | null
          notes?: string | null
          phone: string
          pipeline_notes?: string | null
          profile_picture_fetched_at?: string | null
          profile_picture_url?: string | null
          secondary_phone?: string | null
          tags?: string[] | null
          whatsapp_about?: string | null
          whatsapp_push_name?: string | null
        }
        Update: {
          assigned_to_user_id?: string | null
          birth_date?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          estimated_value?: number | null
          funnel_stage?: string | null
          id?: string
          is_blocked?: boolean | null
          last_contact_date?: string | null
          lead_source?: string | null
          lost_reason?: string | null
          moved_to_stage_at?: string | null
          name?: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string
          pipeline_notes?: string | null
          profile_picture_fetched_at?: string | null
          profile_picture_url?: string | null
          secondary_phone?: string | null
          tags?: string[] | null
          whatsapp_about?: string | null
          whatsapp_push_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_state: {
        Row: {
          collected_data: Json | null
          company_id: string
          confirmed_facts: Json | null
          conversation_id: string
          created_at: string | null
          expires_at: string | null
          has_active_appointment: boolean | null
          has_previous_appointment: boolean | null
          id: string
          last_response_id: string | null
          pending_action: string | null
          stage: string
          started_at: string | null
          updated_at: string | null
        }
        Insert: {
          collected_data?: Json | null
          company_id: string
          confirmed_facts?: Json | null
          conversation_id: string
          created_at?: string | null
          expires_at?: string | null
          has_active_appointment?: boolean | null
          has_previous_appointment?: boolean | null
          id?: string
          last_response_id?: string | null
          pending_action?: string | null
          stage?: string
          started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          collected_data?: Json | null
          company_id?: string
          confirmed_facts?: Json | null
          conversation_id?: string
          created_at?: string | null
          expires_at?: string | null
          has_active_appointment?: boolean | null
          has_previous_appointment?: boolean | null
          id?: string
          last_response_id?: string | null
          pending_action?: string | null
          stage?: string
          started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_state_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_state_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_disabled_until: string | null
          assigned_to_user_id: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          is_favorite: boolean | null
          is_unread: boolean | null
          last_message_at: string | null
          pending_ai_processing_at: string | null
          status: string | null
          whatsapp_connection_id: string | null
        }
        Insert: {
          ai_disabled_until?: string | null
          assigned_to_user_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          is_unread?: boolean | null
          last_message_at?: string | null
          pending_ai_processing_at?: string | null
          status?: string | null
          whatsapp_connection_id?: string | null
        }
        Update: {
          ai_disabled_until?: string | null
          assigned_to_user_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          is_unread?: boolean | null
          last_message_at?: string | null
          pending_ai_processing_at?: string | null
          status?: string | null
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_history: {
        Row: {
          action_type: string
          company_id: string
          contact_id: string
          created_at: string | null
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          company_id: string
          contact_id: string
          created_at?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          company_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_history_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          color: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          order_position: number
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_position: number
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          company_id: string | null
          created_at: string | null
          feature_name: string
          id: string
          is_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          feature_name: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          feature_name?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          amount_total: number
          attempt_count: number | null
          billing_reason: string | null
          company_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          invoice_pdf_url: string | null
          paid_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_invoice_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          amount_total: number
          attempt_count?: number | null
          billing_reason?: string | null
          company_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_pdf_url?: string | null
          paid_at?: string | null
          status: string
          stripe_charge_id?: string | null
          stripe_invoice_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          amount_total?: number
          attempt_count?: number | null
          billing_reason?: string | null
          company_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_pdf_url?: string | null
          paid_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      openai_assistant: {
        Row: {
          assistant_id: string
          created_at: string | null
          id: string
          model: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          assistant_id: string
          created_at?: string | null
          id?: string
          model?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          assistant_id?: string
          created_at?: string | null
          id?: string
          model?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      openai_settings: {
        Row: {
          api_key: string
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          api_key: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          api_key?: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          company_id: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          stripe_customer_id: string
          stripe_payment_method_id: string | null
          updated_at: string | null
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stripe_customer_id: string
          stripe_payment_method_id?: string | null
          updated_at?: string | null
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stripe_customer_id?: string
          stripe_payment_method_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      professionals: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          specialty: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          specialty?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          specialty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          must_change_password: boolean | null
          preferred_language: string | null
          whatsapp: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          must_change_password?: boolean | null
          preferred_language?: string | null
          whatsapp?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          must_change_password?: boolean | null
          preferred_language?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string
          key: string
          reset_at: string
        }
        Insert: {
          count?: number
          created_at?: string
          key: string
          reset_at: string
        }
        Update: {
          count?: number
          created_at?: string
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
      resend_settings: {
        Row: {
          api_key: string
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          api_key: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          api_key?: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      resource_prices: {
        Row: {
          id: string
          monthly_price: number
          resource_type: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          monthly_price?: number
          resource_type: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          monthly_price?: number
          resource_type?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      scheduled_returns: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          message_sent: boolean | null
          message_sent_at: string | null
          original_appointment_id: string | null
          return_date: string
          return_months: number
          whatsapp_connection_id: string | null
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          message_sent?: boolean | null
          message_sent_at?: string | null
          original_appointment_id?: string | null
          return_date: string
          return_months: number
          whatsapp_connection_id?: string | null
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          message_sent?: boolean | null
          message_sent_at?: string | null
          original_appointment_id?: string | null
          return_date?: string
          return_months?: number
          whatsapp_connection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_returns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_returns_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_returns_original_appointment_id_fkey"
            columns: ["original_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_returns_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      service_availability: {
        Row: {
          company_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          service_id: string
          start_time: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          service_id: string
          start_time: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          service_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_availability_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_availability_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_professionals: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          professional_id: string
          service_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          professional_id: string
          service_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          professional_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_professionals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_professionals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_professionals_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          duration: number
          id: string
          is_active: boolean | null
          name: string
          price: number | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          duration: number
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_settings: {
        Row: {
          api_key: string
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          api_key: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          api_key?: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      stripe_subscriptions: {
        Row: {
          company_id: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string | null
          stripe_customer_id: string
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string | null
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string | null
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_changes: {
        Row: {
          applied_at: string | null
          change_type: string
          company_id: string | null
          created_at: string | null
          id: string
          quantity_change: number
          requested_by: string | null
          resource_type: string
          scheduled_for: string | null
        }
        Insert: {
          applied_at?: string | null
          change_type: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          quantity_change: number
          requested_by?: string | null
          resource_type: string
          scheduled_for?: string | null
        }
        Update: {
          applied_at?: string | null
          change_type?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          quantity_change?: number
          requested_by?: string | null
          resource_type?: string
          scheduled_for?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_changes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          question: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_ai_response: boolean | null
          is_internal: boolean | null
          ticket_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_ai_response?: boolean | null
          is_internal?: boolean | null
          ticket_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_ai_response?: boolean | null
          is_internal?: boolean | null
          ticket_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          log_type: string
          message: string
          metadata: Json | null
          severity: string
          source: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          log_type: string
          message: string
          metadata?: Json | null
          severity?: string
          source: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          log_type?: string
          message?: string
          metadata?: Json | null
          severity?: string
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_automation_rules: {
        Row: {
          company_id: string
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tags_to_add: string[] | null
          tags_to_remove: string[] | null
          trigger_event: string
        }
        Insert: {
          company_id: string
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tags_to_add?: string[] | null
          tags_to_remove?: string[] | null
          trigger_event: string
        }
        Update: {
          company_id?: string
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tags_to_add?: string[] | null
          tags_to_remove?: string[] | null
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_automation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_automation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_registry: {
        Row: {
          alert_sound_enabled: boolean | null
          auto_source: string | null
          blocks_ai: boolean | null
          can_ai_insert: boolean | null
          can_ai_remove: boolean | null
          category: string | null
          color: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_auto_generated: boolean | null
          is_editable: boolean | null
          is_system_tag: boolean | null
          linked_entity_id: string | null
          name: string
          show_in_chat: boolean | null
          triggers_alert: boolean | null
          updated_at: string | null
        }
        Insert: {
          alert_sound_enabled?: boolean | null
          auto_source?: string | null
          blocks_ai?: boolean | null
          can_ai_insert?: boolean | null
          can_ai_remove?: boolean | null
          category?: string | null
          color?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_auto_generated?: boolean | null
          is_editable?: boolean | null
          is_system_tag?: boolean | null
          linked_entity_id?: string | null
          name: string
          show_in_chat?: boolean | null
          triggers_alert?: boolean | null
          updated_at?: string | null
        }
        Update: {
          alert_sound_enabled?: boolean | null
          auto_source?: string | null
          blocks_ai?: boolean | null
          can_ai_insert?: boolean | null
          can_ai_remove?: boolean | null
          category?: string | null
          color?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_auto_generated?: boolean | null
          is_editable?: boolean | null
          is_system_tag?: boolean | null
          linked_entity_id?: string | null
          name?: string
          show_in_chat?: boolean | null
          triggers_alert?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tag_registry_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_registry_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      token_reset_history: {
        Row: {
          companies_affected: number
          created_at: string
          id: string
          reset_date: string
          total_tokens_reset: number
        }
        Insert: {
          companies_affected: number
          created_at?: string
          id?: string
          reset_date?: string
          total_tokens_reset: number
        }
        Update: {
          companies_affected?: number
          created_at?: string
          id?: string
          reset_date?: string
          total_tokens_reset?: number
        }
        Relationships: []
      }
      user_invites: {
        Row: {
          company_id: string
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invite_token: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invite_token?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invite_token?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_connected: boolean | null
          is_primary: boolean | null
          name: string | null
          phone: string | null
          updated_at: string | null
          z_api_instance_id: string
          z_api_token: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          is_primary?: boolean | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
          z_api_instance_id: string
          z_api_token: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          is_primary?: boolean | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
          z_api_instance_id?: string
          z_api_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          company_id: string | null
          contact_id: string | null
          content: string
          conversation_id: string | null
          created_at: string | null
          direction: string
          id: string
          media_type: string | null
          media_url: string | null
          message_id: string | null
          message_type: string | null
          phone: string
          read_at: string | null
          sent_by_user_id: string | null
          transcription_text: string | null
          whatsapp_connection_id: string | null
          whatsapp_timestamp: number
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          direction: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string | null
          phone: string
          read_at?: string | null
          sent_by_user_id?: string | null
          transcription_text?: string | null
          whatsapp_connection_id?: string | null
          whatsapp_timestamp: number
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_id?: string | null
          message_type?: string | null
          phone?: string
          read_at?: string | null
          sent_by_user_id?: string | null
          transcription_text?: string | null
          whatsapp_connection_id?: string | null
          whatsapp_timestamp?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_type: string
          actor_user_id: string | null
          company_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          payload_after: Json | null
          payload_before: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_type?: string
          actor_user_id?: string | null
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          payload_after?: Json | null
          payload_before?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_type?: string
          actor_user_id?: string | null
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          payload_after?: Json | null
          payload_before?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          commission_months: number | null
          commission_rate: number | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          commission_months?: number | null
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          commission_months?: number | null
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      affiliate_companies: {
        Row: {
          affiliate_id: string | null
          cancelled_at: string | null
          commission_end_at: string | null
          commission_start_at: string | null
          company_id: string | null
          created_at: string | null
          id: string
          status: string | null
        }
        Insert: {
          affiliate_id?: string | null
          cancelled_at?: string | null
          commission_end_at?: string | null
          commission_start_at?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          affiliate_id?: string | null
          cancelled_at?: string | null
          commission_end_at?: string | null
          commission_start_at?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string | null
          amount: number
          company_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          invoice_id: string | null
          payout_id: string | null
          period_end: string | null
          period_start: string | null
          status: string | null
        }
        Insert: {
          affiliate_id?: string | null
          amount: number
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          payout_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string | null
          amount?: number
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          payout_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
        }
        Relationships: []
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string | null
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          status: string | null
          stripe_payout_id: string | null
        }
        Insert: {
          affiliate_id?: string | null
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          status?: string | null
          stripe_payout_id?: string | null
        }
        Update: {
          affiliate_id?: string | null
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          status?: string | null
          stripe_payout_id?: string | null
        }
        Relationships: []
      }
      affiliates_stripe: {
        Row: {
          affiliate_id: string | null
          charges_enabled: boolean | null
          created_at: string | null
          id: string
          onboarding_status: string | null
          payouts_enabled: boolean | null
          stripe_account_id: string | null
        }
        Insert: {
          affiliate_id?: string | null
          charges_enabled?: boolean | null
          created_at?: string | null
          id?: string
          onboarding_status?: string | null
          payouts_enabled?: boolean | null
          stripe_account_id?: string | null
        }
        Update: {
          affiliate_id?: string | null
          charges_enabled?: boolean | null
          created_at?: string | null
          id?: string
          onboarding_status?: string | null
          payouts_enabled?: boolean | null
          stripe_account_id?: string | null
        }
        Relationships: []
      }
      zapi_settings: {
        Row: {
          client_token: string
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          client_token: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          client_token?: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_old_system_logs: { Args: never; Returns: undefined }
      create_default_tags_for_company: {
        Args: { _company_id: string }
        Returns: undefined
      }
      delete_tag_globally: {
        Args: { _company_id: string; _tag_name: string }
        Returns: number
      }
      ensure_default_crm_stages: {
        Args: { _company_id: string }
        Returns: undefined
      }
      get_masked_api_key: { Args: never; Returns: string }
      get_masked_resend_key: { Args: never; Returns: string }
      get_masked_stripe_key: { Args: never; Returns: string }
      get_masked_zapi_client_token: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rename_tag_globally: {
        Args: { _company_id: string; _new_name: string; _old_name: string }
        Returns: undefined
      }
      search_contact_memories: {
        Args: {
          match_contact_id: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          importance: number
          memory_type: string
          similarity: number
        }[]
      }
      search_similar_events:
        | {
            Args: {
              match_company_id: string
              match_contact_id?: string
              match_count?: number
              query_embedding: string
              similarity_threshold?: number
            }
            Returns: {
              event_content: string
              event_id: string
              event_type: string
              metadata: Json
              sent_at: string
              similarity: number
            }[]
          }
        | {
            Args: {
              match_company_id: string
              match_contact_id?: string
              match_count?: number
              query_embedding: string
              similarity_threshold?: number
            }
            Returns: {
              event_content: string
              event_id: string
              event_type: string
              metadata: Json
              sent_at: string
              similarity: number
            }[]
          }
      search_similar_faqs: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_company_id?: string
          query_embedding: string
        }
        Returns: {
          answer: string
          id: string
          question: string
          similarity: number
          summary: string
        }[]
      }
      superuser_exists: { Args: never; Returns: boolean }
      update_contact_tags: {
        Args: { p_add_tag: string; p_contact_id: string; p_remove_tag: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "superuser" | "admin" | "attendant" | "affiliate"
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
      app_role: ["superuser", "admin", "attendant", "affiliate"],
    },
  },
} as const

