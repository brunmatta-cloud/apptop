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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      culto_sync_state: {
        Row: {
          active_culto_id: string | null
          accumulated_ms: number
          all_momentos: Json
          background_color: string | null
          bottom_font_size: number | null
          bottom_text_color: string | null
          cultos: Json
          current_command: string
          current_index: number
          danger_color: string | null
          elapsed_seconds: number
          execution_mode: string
          id: string
          is_blinking: boolean | null
          is_paused: boolean
          message: string
          message_font_size: number | null
          message_text_color: string | null
          moderador_release_active: boolean | null
          moderador_release_by: string | null
          moderador_release_updated_at: string | null
          moment_accumulated_ms: number
          moment_elapsed_seconds: number
          moment_paused_at: string | null
          moment_started_at: string | null
          next_command: string
          orange_threshold: number | null
          paused_at: string | null
          red_threshold: number | null
          revision: number
          show_message: boolean
          started_at: string | null
          timer_status: string
          timer_font_size: number | null
          timer_started_at: string | null
          timer_text_color: string | null
          top_font_size: number | null
          top_text_color: string | null
          updated_at: string
          updated_by: string
          warning_color: string | null
        }
        Insert: {
          active_culto_id?: string | null
          accumulated_ms?: number
          all_momentos?: Json
          background_color?: string | null
          bottom_font_size?: number | null
          bottom_text_color?: string | null
          cultos?: Json
          current_command?: string
          current_index?: number
          danger_color?: string | null
          elapsed_seconds?: number
          execution_mode?: string
          id?: string
          is_blinking?: boolean | null
          is_paused?: boolean
          message?: string
          message_font_size?: number | null
          message_text_color?: string | null
          moderador_release_active?: boolean | null
          moderador_release_by?: string | null
          moderador_release_updated_at?: string | null
          moment_accumulated_ms?: number
          moment_elapsed_seconds?: number
          moment_paused_at?: string | null
          moment_started_at?: string | null
          next_command?: string
          orange_threshold?: number | null
          paused_at?: string | null
          red_threshold?: number | null
          revision?: number
          show_message?: boolean
          started_at?: string | null
          timer_status?: string
          timer_font_size?: number | null
          timer_started_at?: string | null
          timer_text_color?: string | null
          top_font_size?: number | null
          top_text_color?: string | null
          updated_at?: string
          updated_by?: string
          warning_color?: string | null
        }
        Update: {
          active_culto_id?: string | null
          accumulated_ms?: number
          all_momentos?: Json
          background_color?: string | null
          bottom_font_size?: number | null
          bottom_text_color?: string | null
          cultos?: Json
          current_command?: string
          current_index?: number
          danger_color?: string | null
          elapsed_seconds?: number
          execution_mode?: string
          id?: string
          is_blinking?: boolean | null
          is_paused?: boolean
          message?: string
          message_font_size?: number | null
          message_text_color?: string | null
          moderador_release_active?: boolean | null
          moderador_release_by?: string | null
          moderador_release_updated_at?: string | null
          moment_accumulated_ms?: number
          moment_elapsed_seconds?: number
          moment_paused_at?: string | null
          moment_started_at?: string | null
          next_command?: string
          orange_threshold?: number | null
          paused_at?: string | null
          red_threshold?: number | null
          revision?: number
          show_message?: boolean
          started_at?: string | null
          timer_status?: string
          timer_font_size?: number | null
          timer_started_at?: string | null
          timer_text_color?: string | null
          top_font_size?: number | null
          top_text_color?: string | null
          updated_at?: string
          updated_by?: string
          warning_color?: string | null
        }
        Relationships: []
      }
      membros: {
        Row: {
          created_at: string
          foto_url: string | null
          funcao: string | null
          id: string
          ministerio: string | null
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          foto_url?: string | null
          funcao?: string | null
          id?: string
          ministerio?: string | null
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          foto_url?: string | null
          funcao?: string | null
          id?: string
          ministerio?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      moment_song_forms: {
        Row: {
          created_at: string
          culto_id: string
          id: string
          momento_id: string
          session_id: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          culto_id: string
          id?: string
          momento_id: string
          session_id?: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          culto_id?: string
          id?: string
          momento_id?: string
          session_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      moment_songs: {
        Row: {
          created_at: string
          created_by: string | null
          culto_id: string
          duration_seconds: number | null
          has_media: boolean
          has_playback: boolean
          id: string
          momento_id: string
          notes: string | null
          position: number
          session_id: string
          title: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          culto_id: string
          duration_seconds?: number | null
          has_media?: boolean
          has_playback?: boolean
          id?: string
          momento_id: string
          notes?: string | null
          position?: number
          session_id?: string
          title?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          culto_id?: string
          duration_seconds?: number | null
          has_media?: boolean
          has_playback?: boolean
          id?: string
          momento_id?: string
          notes?: string | null
          position?: number
          session_id?: string
          title?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      session_events: {
        Row: {
          applied_revision: number | null
          created_at: string
          created_by: string
          error_message: string | null
          event_type: string
          expected_revision: number | null
          id: number
          payload: Json
          session_id: string
          success: boolean
        }
        Insert: {
          applied_revision?: number | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          event_type: string
          expected_revision?: number | null
          id?: number
          payload?: Json
          session_id: string
          success?: boolean
        }
        Update: {
          applied_revision?: number | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          event_type?: string
          expected_revision?: number | null
          id?: number
          payload?: Json
          session_id?: string
          success?: boolean
        }
        Relationships: []
      }
      session_state: {
        Row: {
          accumulated_ms: number
          active_culto_id: string | null
          all_momentos: Json
          cultos: Json
          current_command: string
          current_index: number
          current_stage: string
          execution_mode: string
          id: number
          moment_accumulated_ms: number
          moderador_release_active: boolean
          moderador_release_by: string | null
          moderador_release_updated_at: string | null
          moment_paused_at: string | null
          moment_started_at: string | null
          next_command: string
          paused_at: string | null
          revision: number
          session_id: string
          settings: Json
          started_at: string | null
          status: string
          timer_status: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          accumulated_ms?: number
          active_culto_id?: string | null
          all_momentos?: Json
          cultos?: Json
          current_command?: string
          current_index?: number
          current_stage?: string
          execution_mode?: string
          id?: number
          moment_accumulated_ms?: number
          moderador_release_active?: boolean
          moderador_release_by?: string | null
          moderador_release_updated_at?: string | null
          moment_paused_at?: string | null
          moment_started_at?: string | null
          next_command?: string
          paused_at?: string | null
          revision?: number
          session_id: string
          settings?: Json
          started_at?: string | null
          status?: string
          timer_status?: string
          updated_at?: string
          updated_by?: string
        }
        Update: {
          accumulated_ms?: number
          active_culto_id?: string | null
          all_momentos?: Json
          cultos?: Json
          current_command?: string
          current_index?: number
          current_stage?: string
          execution_mode?: string
          id?: number
          moment_accumulated_ms?: number
          moderador_release_active?: boolean
          moderador_release_by?: string | null
          moderador_release_updated_at?: string | null
          moment_paused_at?: string | null
          moment_started_at?: string | null
          next_command?: string
          paused_at?: string | null
          revision?: number
          session_id?: string
          settings?: Json
          started_at?: string | null
          status?: string
          timer_status?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      // ===== 7Flow Platform Tables =====
      sessions: {
        Row: {
          id: string
          organization_id: string
          title: string
          date: string
          status: string
          auto_mode: boolean
          current_moment_id: string | null
          revision: number
          active_base_id: string | null
          sync_session_id: string | null
          created_at: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          id?: string
          organization_id?: string
          title: string
          date?: string
          status?: string
          auto_mode?: boolean
          current_moment_id?: string | null
          revision?: number
          active_base_id?: string | null
          sync_session_id?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          date?: string
          status?: string
          auto_mode?: boolean
          current_moment_id?: string | null
          revision?: number
          active_base_id?: string | null
          sync_session_id?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      moments: {
        Row: {
          id: string
          session_id: string
          title: string
          type: string
          sort_order: number
          planned_start: string | null
          planned_duration_seconds: number
          requires_manual_confirmation: boolean
          auto_advance: boolean
          trigger_media: boolean
          trigger_alert: boolean
          responsible: string | null
          ministry: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          title: string
          type?: string
          sort_order?: number
          planned_start?: string | null
          planned_duration_seconds?: number
          requires_manual_confirmation?: boolean
          auto_advance?: boolean
          trigger_media?: boolean
          trigger_alert?: boolean
          responsible?: string | null
          ministry?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          title?: string
          type?: string
          sort_order?: number
          planned_start?: string | null
          planned_duration_seconds?: number
          requires_manual_confirmation?: boolean
          auto_advance?: boolean
          trigger_media?: boolean
          trigger_alert?: boolean
          responsible?: string | null
          ministry?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      moment_songs_v2: {
        Row: {
          id: string
          moment_id: string
          song_id: string
          sort_order: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          moment_id: string
          song_id: string
          sort_order?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          moment_id?: string
          song_id?: string
          sort_order?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      moment_media: {
        Row: {
          id: string
          moment_id: string
          media_item_id: string
          sort_order: number
          autoplay: boolean
          auto_advance: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          moment_id: string
          media_item_id: string
          sort_order?: number
          autoplay?: boolean
          auto_advance?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          moment_id?: string
          media_item_id?: string
          sort_order?: number
          autoplay?: boolean
          auto_advance?: boolean
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      songs: {
        Row: {
          id: string
          organization_id: string
          title: string
          artist: string | null
          duration_seconds: number | null
          storage_bucket: string | null
          storage_path: string | null
          local_file_path: string | null
          youtube_url: string | null
          tags: string[]
          notes: string | null
          upload_status: string
          usage_count: number
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string
          title: string
          artist?: string | null
          duration_seconds?: number | null
          storage_bucket?: string | null
          storage_path?: string | null
          local_file_path?: string | null
          youtube_url?: string | null
          tags?: string[]
          notes?: string | null
          upload_status?: string
          usage_count?: number
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          artist?: string | null
          duration_seconds?: number | null
          storage_bucket?: string | null
          storage_path?: string | null
          local_file_path?: string | null
          youtube_url?: string | null
          tags?: string[]
          notes?: string | null
          upload_status?: string
          usage_count?: number
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_items: {
        Row: {
          id: string
          organization_id: string
          title: string
          type: string
          artist: string | null
          duration_seconds: number | null
          storage_bucket: string | null
          storage_path: string | null
          local_file_path: string | null
          remote_url: string | null
          thumbnail_url: string | null
          tags: string[]
          notes: string | null
          usage_count: number
          availability_status: string
          file_size_bytes: number | null
          mime_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string
          title: string
          type: string
          artist?: string | null
          duration_seconds?: number | null
          storage_bucket?: string | null
          storage_path?: string | null
          local_file_path?: string | null
          remote_url?: string | null
          thumbnail_url?: string | null
          tags?: string[]
          notes?: string | null
          usage_count?: number
          availability_status?: string
          file_size_bytes?: number | null
          mime_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          type?: string
          artist?: string | null
          duration_seconds?: number | null
          storage_bucket?: string | null
          storage_path?: string | null
          local_file_path?: string | null
          remote_url?: string | null
          thumbnail_url?: string | null
          tags?: string[]
          notes?: string | null
          usage_count?: number
          availability_status?: string
          file_size_bytes?: number | null
          mime_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_commands: {
        Row: {
          id: string
          session_id: string
          target: string
          command_type: string
          payload_json: Json
          expected_revision: number | null
          created_at: string
          created_by: string
          processed_at: string | null
          processed_by: string | null
          status: string
          error_message: string | null
          idempotency_key: string | null
        }
        Insert: {
          id?: string
          session_id: string
          target: string
          command_type: string
          payload_json?: Json
          expected_revision?: number | null
          created_at?: string
          created_by?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          error_message?: string | null
          idempotency_key?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          target?: string
          command_type?: string
          payload_json?: Json
          expected_revision?: number | null
          created_at?: string
          created_by?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          error_message?: string | null
          idempotency_key?: string | null
        }
        Relationships: []
      }
      player_state: {
        Row: {
          id: string
          session_id: string
          player_type: string
          current_media_id: string | null
          current_song_id: string | null
          status: string
          current_time_seconds: number
          duration_seconds: number
          volume: number
          is_muted: boolean
          queue_json: Json
          updated_at: string
          updated_by: string
        }
        Insert: {
          id?: string
          session_id: string
          player_type: string
          current_media_id?: string | null
          current_song_id?: string | null
          status?: string
          current_time_seconds?: number
          duration_seconds?: number
          volume?: number
          is_muted?: boolean
          queue_json?: Json
          updated_at?: string
          updated_by?: string
        }
        Update: {
          id?: string
          session_id?: string
          player_type?: string
          current_media_id?: string | null
          current_song_id?: string | null
          status?: string
          current_time_seconds?: number
          duration_seconds?: number
          volume?: number
          is_muted?: boolean
          queue_json?: Json
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      display_outputs: {
        Row: {
          id: string
          session_id: string
          name: string
          display_type: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          name: string
          display_type: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          name?: string
          display_type?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      display_state: {
        Row: {
          id: string
          display_output_id: string
          mode: string
          current_media_id: string | null
          current_song_id: string | null
          current_slide_index: number
          current_moment_id: string | null
          current_cue: Json
          custom_message: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          id?: string
          display_output_id: string
          mode?: string
          current_media_id?: string | null
          current_song_id?: string | null
          current_slide_index?: number
          current_moment_id?: string | null
          current_cue?: Json
          custom_message?: string | null
          updated_at?: string
          updated_by?: string
        }
        Update: {
          id?: string
          display_output_id?: string
          mode?: string
          current_media_id?: string | null
          current_song_id?: string | null
          current_slide_index?: number
          current_moment_id?: string | null
          current_cue?: Json
          custom_message?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      bases: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          base_type: string
          is_enabled: boolean
          is_primary_candidate: boolean
          default_media_root: string
          supports_audio: boolean
          supports_video: boolean
          supports_slides: boolean
          supports_displays: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string
          name: string
          description?: string | null
          base_type?: string
          is_enabled?: boolean
          is_primary_candidate?: boolean
          default_media_root?: string
          supports_audio?: boolean
          supports_video?: boolean
          supports_slides?: boolean
          supports_displays?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          base_type?: string
          is_enabled?: boolean
          is_primary_candidate?: boolean
          default_media_root?: string
          supports_audio?: boolean
          supports_video?: boolean
          supports_slides?: boolean
          supports_displays?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      executors: {
        Row: {
          id: string
          organization_id: string
          base_id: string
          machine_name: string
          device_label: string | null
          executor_version: string | null
          is_online: boolean
          base_path: string
          supports_audio: boolean
          supports_video: boolean
          supports_slides: boolean
          supports_displays: boolean
          last_seen_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string
          base_id: string
          machine_name: string
          device_label?: string | null
          executor_version?: string | null
          is_online?: boolean
          base_path?: string
          supports_audio?: boolean
          supports_video?: boolean
          supports_slides?: boolean
          supports_displays?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          base_id?: string
          machine_name?: string
          device_label?: string | null
          executor_version?: string | null
          is_online?: boolean
          base_path?: string
          supports_audio?: boolean
          supports_video?: boolean
          supports_slides?: boolean
          supports_displays?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_sync_jobs: {
        Row: {
          id: string
          organization_id: string
          media_type: string
          song_id: string | null
          media_item_id: string | null
          job_type: string
          status: string
          payload_json: Json
          created_at: string
          processed_at: string | null
          processed_by: string | null
          error_message: string | null
          retry_count: number
          max_retries: number
        }
        Insert: {
          id?: string
          organization_id?: string
          media_type: string
          song_id?: string | null
          media_item_id?: string | null
          job_type?: string
          status?: string
          payload_json?: Json
          created_at?: string
          processed_at?: string | null
          processed_by?: string | null
          error_message?: string | null
          retry_count?: number
          max_retries?: number
        }
        Update: {
          id?: string
          organization_id?: string
          media_type?: string
          song_id?: string | null
          media_item_id?: string | null
          job_type?: string
          status?: string
          payload_json?: Json
          created_at?: string
          processed_at?: string | null
          processed_by?: string | null
          error_message?: string | null
          retry_count?: number
          max_retries?: number
        }
        Relationships: []
      }
      executor_media_inventory: {
        Row: {
          id: string
          executor_id: string
          media_item_id: string | null
          song_id: string | null
          local_file_path: string
          sync_status: string
          file_size_bytes: number | null
          checksum: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          executor_id: string
          media_item_id?: string | null
          song_id?: string | null
          local_file_path: string
          sync_status?: string
          file_size_bytes?: number | null
          checksum?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          executor_id?: string
          media_item_id?: string | null
          song_id?: string | null
          local_file_path?: string
          sync_status?: string
          file_size_bytes?: number | null
          checksum?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          id: string
          name: string
          church: string
          phone: string | null
          email: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          church: string
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          church?: string
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      person_access_tokens: {
        Row: {
          id: string
          person_id: string
          token: string
          is_active: boolean
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          person_id: string
          token: string
          is_active?: boolean
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          person_id?: string
          token?: string
          is_active?: boolean
          created_at?: string
          expires_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_session_command: {
        Args: {
          p_actor?: string
          p_command?: string
          p_expected_revision?: number | null
          p_payload?: Json
          p_session_id?: string
        }
        Returns: Database["public"]["Tables"]["session_state"]["Row"]
      }
      ensure_moment_song_form: {
        Args: {
          p_culto_id?: string
          p_momento_id?: string
          p_session_id?: string
        }
        Returns: Database["public"]["Tables"]["moment_song_forms"]["Row"]
      }
      get_moment_song_bundle_by_token: {
        Args: {
          p_token: string
        }
        Returns: Json
      }
      get_session_state: {
        Args: {
          p_session_id?: string
        }
        Returns: Database["public"]["Tables"]["session_state"]["Row"]
      }
      get_server_now: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      save_moment_repertoire: {
        Args: {
          p_created_by?: string | null
          p_culto_id?: string
          p_momento_id?: string
          p_session_id?: string
          p_songs?: Json
        }
        Returns: Json
      }
      save_moment_repertoire_by_token: {
        Args: {
          p_created_by?: string | null
          p_songs?: Json
          p_token: string
        }
        Returns: Json
      }
      process_player_command: {
        Args: {
          p_command_id: string
          p_session_id: string
          p_target: string
          p_command_type: string
          p_payload_json?: Json
          p_expected_revision?: number | null
          p_created_by?: string
          p_idempotency_key?: string | null
        }
        Returns: Json
      }
      executor_heartbeat: {
        Args: {
          p_executor_id: string
          p_base_id: string
          p_machine_name: string
          p_executor_version?: string | null
          p_supports_audio?: boolean
          p_supports_video?: boolean
          p_supports_slides?: boolean
          p_supports_displays?: boolean
        }
        Returns: Json
      }
      claim_sync_job: {
        Args: {
          p_executor_id: string
          p_media_type?: string | null
        }
        Returns: Json
      }
      complete_sync_job: {
        Args: {
          p_job_id: string
          p_executor_id: string
          p_local_file_path: string
          p_file_size_bytes?: number | null
          p_checksum?: string | null
        }
        Returns: Json
      }
      get_person_by_token: {
        Args: {
          token_param: string
        }
        Returns: {
          person_id: string
          person_name: string
          person_church: string
          person_phone: string | null
          person_email: string | null
        }[]
      }
      get_moments_for_person: {
        Args: {
          person_id_param: string
        }
        Returns: {
          moment_id: string
          culto_id: string
          atividade: string
          horario_inicio: string
          responsavel: string
          form_token: string
        }[]
      }
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
    Enums: {},
  },
} as const
