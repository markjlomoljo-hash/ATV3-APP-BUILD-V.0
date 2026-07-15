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
      acne_history: {
        Row: {
          created_at: string
          duration_years: number | null
          flare_frequency: string | null
          id: string
          notes: string | null
          onset_age: number | null
          self_assessment: string | null
          severity: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_years?: number | null
          flare_frequency?: string | null
          id?: string
          notes?: string | null
          onset_age?: number | null
          self_assessment?: string | null
          severity?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_years?: number | null
          flare_frequency?: string | null
          id?: string
          notes?: string | null
          onset_age?: number | null
          self_assessment?: string | null
          severity?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      annotations: {
        Row: {
          confidence: number | null
          created_at: string
          h: number | null
          id: string
          lesion_type: string | null
          notes: string | null
          scan_id: string
          source: string
          updated_at: string
          user_id: string
          w: number | null
          x: number | null
          y: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          h?: number | null
          id?: string
          lesion_type?: string | null
          notes?: string | null
          scan_id: string
          source?: string
          updated_at?: string
          user_id: string
          w?: number | null
          x?: number | null
          y?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          h?: number | null
          id?: string
          lesion_type?: string | null
          notes?: string | null
          scan_id?: string
          source?: string
          updated_at?: string
          user_id?: string
          w?: number | null
          x?: number | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "annotations_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "face_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          code: string
          created_at: string
          criteria: Json | null
          description: string | null
          icon: string | null
          id: string
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          anonymous_learning: boolean
          consented_at: string | null
          created_at: string
          id: string
          marketing: boolean
          personal_processing: boolean
          personal_learning: boolean
          raw_image_processing: boolean
          raw_image_retention: boolean
          research_share: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymous_learning?: boolean
          consented_at?: string | null
          created_at?: string
          id?: string
          marketing?: boolean
          personal_processing?: boolean
          personal_learning?: boolean
          raw_image_processing?: boolean
          raw_image_retention?: boolean
          research_share?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymous_learning?: boolean
          consented_at?: string | null
          created_at?: string
          id?: string
          marketing?: boolean
          personal_processing?: boolean
          personal_learning?: boolean
          raw_image_processing?: boolean
          raw_image_retention?: boolean
          research_share?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      face_scans: {
        Row: {
          angle: string
          captured_at: string
          created_at: string
          embedding: string | null
          id: string
          image_quality: number | null
          labels: Json | null
          lesion_counts: Json | null
          model_confidence: number | null
          notes: string | null
          oiliness_estimate: number | null
          raw_image_deleted_at: string | null
          status: string
          storage_path: string | null
          updated_at: string
          user_certainty: number | null
          user_id: string
        }
        Insert: {
          angle: string
          captured_at?: string
          created_at?: string
          embedding?: string | null
          id?: string
          image_quality?: number | null
          labels?: Json | null
          lesion_counts?: Json | null
          model_confidence?: number | null
          notes?: string | null
          oiliness_estimate?: number | null
          raw_image_deleted_at?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_certainty?: number | null
          user_id: string
        }
        Update: {
          angle?: string
          captured_at?: string
          created_at?: string
          embedding?: string | null
          id?: string
          image_quality?: number | null
          labels?: Json | null
          lesion_counts?: Json | null
          model_confidence?: number | null
          notes?: string | null
          oiliness_estimate?: number | null
          raw_image_deleted_at?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_certainty?: number | null
          user_id?: string
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          categories: Json | null
          completed: boolean
          created_at: string
          id: string
          is_baseline: boolean
          items: Json | null
          log_date: string
          meal_type: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: Json | null
          completed?: boolean
          created_at?: string
          id?: string
          is_baseline?: boolean
          items?: Json | null
          log_date: string
          meal_type: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: Json | null
          completed?: boolean
          created_at?: string
          id?: string
          is_baseline?: boolean
          items?: Json | null
          log_date?: string
          meal_type?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      forecasts: {
        Row: {
          confidence: number | null
          forecast: Json
          generated_at: string
          horizon_days: number
          id: string
          model_version: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          forecast: Json
          generated_at?: string
          horizon_days: number
          id?: string
          model_version?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          forecast?: Json
          generated_at?: string
          horizon_days?: number
          id?: string
          model_version?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gamification: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_action_at: string | null
          longest_streak: number
          pet_stage: string
          pet_xp: number
          points: number
          rank: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_action_at?: string | null
          longest_streak?: number
          pet_stage?: string
          pet_xp?: number
          points?: number
          rank?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_action_at?: string | null
          longest_streak?: number
          pet_stage?: string
          pet_xp?: number
          points?: number
          rank?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals_constraints: {
        Row: {
          budget: string | null
          constraints: Json | null
          created_at: string
          fragrance_preference: string | null
          id: string
          primary_goals: Json | null
          texture_preference: string | null
          updated_at: string
          urgency: string | null
          user_id: string
        }
        Insert: {
          budget?: string | null
          constraints?: Json | null
          created_at?: string
          fragrance_preference?: string | null
          id?: string
          primary_goals?: Json | null
          texture_preference?: string | null
          updated_at?: string
          urgency?: string | null
          user_id: string
        }
        Update: {
          budget?: string | null
          constraints?: Json | null
          created_at?: string
          fragrance_preference?: string | null
          id?: string
          primary_goals?: Json | null
          texture_preference?: string | null
          updated_at?: string
          urgency?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lifestyle_triggers: {
        Row: {
          created_at: string
          diet_patterns: Json | null
          exercise_frequency: string | null
          hydration_liters: number | null
          id: string
          occlusion_exposures: Json | null
          sleep_schedule: Json | null
          stress_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diet_patterns?: Json | null
          exercise_frequency?: string | null
          hydration_liters?: number | null
          id?: string
          occlusion_exposures?: Json | null
          sleep_schedule?: Json | null
          stress_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          diet_patterns?: Json | null
          exercise_frequency?: string | null
          hydration_liters?: number | null
          id?: string
          occlusion_exposures?: Json | null
          sleep_schedule?: Json | null
          stress_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      migration_imports: {
        Row: {
          id: string
          imported_at: string
          payload_summary: Json | null
          source: string
          user_id: string
        }
        Insert: {
          id?: string
          imported_at?: string
          payload_summary?: Json | null
          source?: string
          user_id: string
        }
        Update: {
          id?: string
          imported_at?: string
          payload_summary?: Json | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          categories: Json | null
          created_at: string
          email_enabled: boolean
          id: string
          push_enabled: boolean
          quiet_hours: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: Json | null
          created_at?: string
          email_enabled?: boolean
          id?: string
          push_enabled?: boolean
          quiet_hours?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: Json | null
          created_at?: string
          email_enabled?: boolean
          id?: string
          push_enabled?: boolean
          quiet_hours?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          payload: Json | null
          read_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          payload?: Json | null
          read_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      product_ingredients: {
        Row: {
          comedogenic_score: number | null
          common_names: Json | null
          created_at: string
          evidence: Json | null
          function: string | null
          id: string
          inci_name: string
          irritation_score: number | null
        }
        Insert: {
          comedogenic_score?: number | null
          common_names?: Json | null
          created_at?: string
          evidence?: Json | null
          function?: string | null
          id?: string
          inci_name: string
          irritation_score?: number | null
        }
        Update: {
          comedogenic_score?: number | null
          common_names?: Json | null
          created_at?: string
          evidence?: Json | null
          function?: string | null
          id?: string
          inci_name?: string
          irritation_score?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          created_at: string
          embedding: string | null
          id: string
          ingredients: Json | null
          name: string
          source: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          ingredients?: Json | null
          name: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          ingredients?: Json | null
          name?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          climate_preference: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          id: string
          imaging_calibration: Json | null
          onboarding_completed: boolean
          sex: string | null
          skin_tone: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          climate_preference?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id?: string
          imaging_calibration?: Json | null
          onboarding_completed?: boolean
          sex?: string | null
          skin_tone?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          climate_preference?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id?: string
          imaging_calibration?: Json | null
          onboarding_completed?: boolean
          sex?: string | null
          skin_tone?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          compiled_at: string | null
          created_at: string
          id: string
          state: string
          storage_path: string | null
          summary: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          compiled_at?: string | null
          created_at?: string
          id?: string
          state?: string
          storage_path?: string | null
          summary?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          compiled_at?: string | null
          created_at?: string
          id?: string
          state?: string
          storage_path?: string | null
          summary?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_products: {
        Row: {
          active: boolean
          brand: string | null
          created_at: string
          end_date: string | null
          id: string
          ingredients: Json | null
          product_name: string | null
          slot: string
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          brand?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          ingredients?: Json | null
          product_name?: string | null
          slot: string
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          brand?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          ingredients?: Json | null
          product_name?: string | null
          slot?: string
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skin_twin_snapshots: {
        Row: {
          id: string
          preview_storage_path: string | null
          scenario: string | null
          simulation: Json | null
          snapshot_at: string
          user_id: string
        }
        Insert: {
          id?: string
          preview_storage_path?: string | null
          scenario?: string | null
          simulation?: Json | null
          snapshot_at?: string
          user_id: string
        }
        Update: {
          id?: string
          preview_storage_path?: string | null
          scenario?: string | null
          simulation?: Json | null
          snapshot_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skin_type_barrier: {
        Row: {
          allergies: Json | null
          barrier_symptoms: Json | null
          created_at: string
          dryness: string | null
          id: string
          oiliness: string | null
          sensitivity: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: Json | null
          barrier_symptoms?: Json | null
          created_at?: string
          dryness?: string | null
          id?: string
          oiliness?: string | null
          sensitivity?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: Json | null
          barrier_symptoms?: Json | null
          created_at?: string
          dryness?: string | null
          id?: string
          oiliness?: string | null
          sensitivity?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          created_at: string
          disturbances: Json | null
          id: string
          log_date: string
          naps: Json | null
          notes: string | null
          quality: number | null
          sleep_time: string | null
          updated_at: string
          user_id: string
          wake_time: string | null
        }
        Insert: {
          created_at?: string
          disturbances?: Json | null
          id?: string
          log_date: string
          naps?: Json | null
          notes?: string | null
          quality?: number | null
          sleep_time?: string | null
          updated_at?: string
          user_id: string
          wake_time?: string | null
        }
        Update: {
          created_at?: string
          disturbances?: Json | null
          id?: string
          log_date?: string
          naps?: Json | null
          notes?: string | null
          quality?: number | null
          sleep_time?: string | null
          updated_at?: string
          user_id?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      treatment_plans: {
        Row: {
          adherence_pct: number | null
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          safety_flags: Json | null
          schedule: Json | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adherence_pct?: number | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          safety_flags?: Json | null
          schedule?: Json | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adherence_pct?: number | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          safety_flags?: Json | null
          schedule?: Json | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      treatment_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          metadata: Json | null
          plan_id: string
          skipped: boolean
          task_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          metadata?: Json | null
          plan_id: string
          skipped?: boolean
          task_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          metadata?: Json | null
          plan_id?: string
          skipped?: boolean
          task_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      trigger_hypotheses: {
        Row: {
          confidence: number | null
          created_at: string
          evidence: Json | null
          id: string
          observed_window: Json | null
          status: string
          trigger_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          evidence?: Json | null
          id?: string
          observed_window?: Json | null
          status?: string
          trigger_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          evidence?: Json | null
          id?: string
          observed_window?: Json | null
          status?: string
          trigger_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
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
      weather_snapshots: {
        Row: {
          aqi: number | null
          coarse_lat: number | null
          coarse_lon: number | null
          confidence: number | null
          humidity_pct: number | null
          id: string
          pollen: Json | null
          recorded_at: string
          source: string | null
          temperature_c: number | null
          user_id: string
          uv_index: number | null
        }
        Insert: {
          aqi?: number | null
          coarse_lat?: number | null
          coarse_lon?: number | null
          confidence?: number | null
          humidity_pct?: number | null
          id?: string
          pollen?: Json | null
          recorded_at?: string
          source?: string | null
          temperature_c?: number | null
          user_id: string
          uv_index?: number | null
        }
        Update: {
          aqi?: number | null
          coarse_lat?: number | null
          coarse_lon?: number | null
          confidence?: number | null
          humidity_pct?: number | null
          id?: string
          pollen?: Json | null
          recorded_at?: string
          source?: string | null
          temperature_c?: number | null
          user_id?: string
          uv_index?: number | null
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
    }
    Enums: {
      app_role: "admin" | "clinician" | "user"
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
      app_role: ["admin", "clinician", "user"],
    },
  },
} as const
