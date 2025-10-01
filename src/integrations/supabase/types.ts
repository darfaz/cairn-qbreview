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
      bulk_upload_history: {
        Row: {
          created_at: string | null
          error_details: Json | null
          failed_rows: number
          file_name: string
          id: string
          successful_rows: number
          total_rows: number
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          failed_rows?: number
          file_name: string
          id?: string
          successful_rows?: number
          total_rows?: number
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          failed_rows?: number
          file_name?: string
          id?: string
          successful_rows?: number
          total_rows?: number
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          client_name: string
          created_at: string
          dropbox_folder_path: string | null
          dropbox_folder_url: string | null
          id: string
          realm_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name: string
          created_at?: string
          dropbox_folder_path?: string | null
          dropbox_folder_url?: string | null
          id?: string
          realm_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name?: string
          created_at?: string
          dropbox_folder_path?: string | null
          dropbox_folder_url?: string | null
          id?: string
          realm_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          client_id: string | null
          created_at: string
          error_message: string | null
          id: string
          message: string
          notification_type: string
          recipient: string
          reconciliation_run_id: string | null
          retry_count: number
          sent_at: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          notification_type: string
          recipient: string
          reconciliation_run_id?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          notification_type?: string
          recipient?: string
          reconciliation_run_id?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_reconciliation_run_id_fkey"
            columns: ["reconciliation_run_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      qbo_connections: {
        Row: {
          access_token: string
          accountant_access: boolean
          client_id: string
          connection_method: string
          connection_status: string
          created_at: string
          expires_at: string
          id: string
          realm_id: string
          refresh_token: string
          refresh_token_updated_at: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          accountant_access?: boolean
          client_id: string
          connection_method?: string
          connection_status?: string
          created_at?: string
          expires_at: string
          id?: string
          realm_id: string
          refresh_token: string
          refresh_token_updated_at?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          accountant_access?: boolean
          client_id?: string
          connection_method?: string
          connection_status?: string
          created_at?: string
          expires_at?: string
          id?: string
          realm_id?: string
          refresh_token?: string
          refresh_token_updated_at?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qbo_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      qbo_oauth_states: {
        Row: {
          created_at: string | null
          environment: string | null
          expires_at: string
          id: string
          state: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          environment?: string | null
          expires_at: string
          id?: string
          state: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          environment?: string | null
          expires_at?: string
          id?: string
          state?: string
          user_id?: string | null
        }
        Relationships: []
      }
      qbo_sync_queue: {
        Row: {
          client_id: string
          created_at: string
          error_message: string | null
          id: string
          operation_type: string
          parameters: Json | null
          priority: number
          processed_at: string | null
          retry_count: number
          scheduled_for: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          operation_type: string
          parameters?: Json | null
          priority?: number
          processed_at?: string | null
          retry_count?: number
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          operation_type?: string
          parameters?: Json | null
          priority?: number
          processed_at?: string | null
          retry_count?: number
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qbo_sync_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_runs: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          google_sheet_url: string | null
          id: string
          report_url: string | null
          retry_count: number | null
          run_type: string
          started_at: string
          status: string
          status_color: string | null
          unreconciled_count: number | null
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          google_sheet_url?: string | null
          id?: string
          report_url?: string | null
          retry_count?: number | null
          run_type: string
          started_at?: string
          status?: string
          status_color?: string | null
          unreconciled_count?: number | null
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          google_sheet_url?: string | null
          id?: string
          report_url?: string | null
          retry_count?: number | null
          run_type?: string
          started_at?: string
          status?: string
          status_color?: string | null
          unreconciled_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          action_items_count: number | null
          client_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          sheet_url: string | null
          status: string
          triggered_at: string
        }
        Insert: {
          action_items_count?: number | null
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          sheet_url?: string | null
          status: string
          triggered_at?: string
        }
        Update: {
          action_items_count?: number | null
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          sheet_url?: string | null
          status?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_runs: {
        Row: {
          created_at: string
          day_of_month: number
          enabled: boolean | null
          id: string
          last_run_date: string | null
          next_run_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number
          enabled?: boolean | null
          id?: string
          last_run_date?: string | null
          next_run_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_month?: number
          enabled?: boolean | null
          id?: string
          last_run_date?: string | null
          next_run_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_oauth_states: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      encrypt_token: {
        Args: { _key: string; _token: string }
        Returns: string
      }
      hash_token: {
        Args: { _token: string }
        Returns: string
      }
      log_token_access: {
        Args: { _action: string; _client_id: string; _user_id: string }
        Returns: undefined
      }
      user_can_access_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_qbo_connection: {
        Args: { _connection_client_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_modify_qbo_tokens: {
        Args: { _connection_client_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_client_firm: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_firm: {
        Args: { _firm_id: string; _user_id: string }
        Returns: boolean
      }
      validate_token_integrity: {
        Args: {
          _encrypted_token: string
          _key: string
          _original_token: string
        }
        Returns: boolean
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
