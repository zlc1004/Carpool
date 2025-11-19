export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      captcha_sessions: {
        Row: {
          id: string
          text: string
          solved: boolean
          used: boolean
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          text: string
          solved?: boolean
          used?: boolean
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          text?: string
          solved?: boolean
          used?: boolean
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          ride_id: string
          sender_id: string
          message: string
          message_type: string
          metadata: Json
          edited_at: string | null
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ride_id: string
          sender_id: string
          message: string
          message_type?: string
          metadata?: Json
          edited_at?: string | null
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ride_id?: string
          sender_id?: string
          message?: string
          message_type?: string
          metadata?: Json
          edited_at?: string | null
          deleted_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      image_uploads: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          purpose: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          purpose: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          mime_type?: string
          purpose?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          data: Json
          read_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          data?: Json
          read_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: Database["public"]["Enums"]["notification_type"]
          title?: string
          message?: string
          data?: Json
          read_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      places: {
        Row: {
          id: string
          school_id: string | null
          name: string
          address: string
          city: string | null
          state: string | null
          zip: string | null
          country: string | null
          latitude: number | null
          longitude: number | null
          place_type: string
          verified: boolean
          usage_count: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id?: string | null
          name: string
          address: string
          city?: string | null
          state?: string | null
          zip?: string | null
          country?: string | null
          latitude?: number | null
          longitude?: number | null
          place_type?: string
          verified?: boolean
          usage_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string | null
          name?: string
          address?: string
          city?: string | null
          state?: string | null
          zip?: string | null
          country?: string | null
          latitude?: number | null
          longitude?: number | null
          place_type?: string
          verified?: boolean
          usage_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "places_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          school_id: string | null
          name: string
          display_name: string | null
          phone: string | null
          bio: string | null
          avatar_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          verification_status: Database["public"]["Enums"]["verification_status"]
          verification_documents: Json
          driver_license_verified: boolean
          student_id: string | null
          graduation_year: number | null
          emergency_contact: Json | null
          preferences: Json
          last_active: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          school_id?: string | null
          name: string
          display_name?: string | null
          phone?: string | null
          bio?: string | null
          avatar_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verification_documents?: Json
          driver_license_verified?: boolean
          student_id?: string | null
          graduation_year?: number | null
          emergency_contact?: Json | null
          preferences?: Json
          last_active?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string | null
          name?: string
          display_name?: string | null
          phone?: string | null
          bio?: string | null
          avatar_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verification_documents?: Json
          driver_license_verified?: boolean
          student_id?: string | null
          graduation_year?: number | null
          emergency_contact?: Json | null
          preferences?: Json
          last_active?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          platform: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          platform: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          platform?: string
          active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      rate_limits: {
        Row: {
          id: string
          user_id: string | null
          ip_address: string | null
          endpoint: string
          request_count: number
          window_start: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          ip_address?: string | null
          endpoint: string
          request_count?: number
          window_start?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          ip_address?: string | null
          endpoint?: string
          request_count?: number
          window_start?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ride_participants: {
        Row: {
          id: string
          ride_id: string
          user_id: string
          status: string
          seats_requested: number
          message: string | null
          joined_at: string
          confirmed_at: string | null
          cancelled_at: string | null
        }
        Insert: {
          id?: string
          ride_id: string
          user_id: string
          status?: string
          seats_requested?: number
          message?: string | null
          joined_at?: string
          confirmed_at?: string | null
          cancelled_at?: string | null
        }
        Update: {
          id?: string
          ride_id?: string
          user_id?: string
          status?: string
          seats_requested?: number
          message?: string | null
          joined_at?: string
          confirmed_at?: string | null
          cancelled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_participants_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      rides: {
        Row: {
          id: string
          school_id: string
          driver_id: string
          origin_id: string
          destination_id: string
          departure_time: string
          seats_available: number
          seats_taken: number
          price_per_seat: number | null
          notes: string | null
          share_code: string | null
          status: string
          recurring_pattern: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          driver_id: string
          origin_id: string
          destination_id: string
          departure_time: string
          seats_available: number
          seats_taken?: number
          price_per_seat?: number | null
          notes?: string | null
          share_code?: string | null
          status?: string
          recurring_pattern?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          driver_id?: string
          origin_id?: string
          destination_id?: string
          departure_time?: string
          seats_available?: number
          seats_taken?: number
          price_per_seat?: number | null
          notes?: string | null
          share_code?: string | null
          status?: string
          recurring_pattern?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          }
        ]
      }
      schools: {
        Row: {
          id: string
          name: string
          domain: string
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          country: string | null
          timezone: string | null
          settings: Json
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          domain: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          country?: string | null
          timezone?: string | null
          settings?: Json
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          domain?: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          country?: string | null
          timezone?: string | null
          settings?: Json
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          value: Json
          description: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          description?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_share_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_school_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_system_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      notification_type: "ride_request" | "ride_accepted" | "ride_cancelled" | "message" | "system"
      user_role: "user" | "admin" | "school_admin"
      verification_status: "pending" | "verified" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
