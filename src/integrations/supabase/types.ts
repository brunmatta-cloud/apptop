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
