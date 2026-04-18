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
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          role: string | null
          subscription_plan: string | null
          trial_ends_at: string | null
          accepting_bookings: boolean
          nudge_sent_at: string | null
          stripe_customer_id: string | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          country: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          city: string | null
          state: string | null
          genre: string | null
          website: string | null
          instagram: string | null
          spotify: string | null
          youtube: string | null
          apple_music: string | null
          soundcloud: string | null
          tiktok: string | null
          bandcamp: string | null
          beatport: string | null
          bandsintown: string | null
          songkick: string | null
          facebook: string | null
          twitter: string | null
          threads: string | null
          rate_min: number | null
          rate_max: number | null
          is_verified: boolean | null
          profile_complete: boolean | null
          suspended: boolean | null
          slug: string | null
          bookscore: number | null
          completion_score: number | null
          onboarding_steps: Json | null
          streaming_stats: Json | null
          email_preferences: Json | null
          timezone: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          role?: string | null
          subscription_plan?: string | null
          trial_ends_at?: string | null
          accepting_bookings?: boolean
          nudge_sent_at?: string | null
          stripe_customer_id?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          country?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          city?: string | null
          state?: string | null
          genre?: string | null
          website?: string | null
          instagram?: string | null
          spotify?: string | null
          youtube?: string | null
          apple_music?: string | null
          soundcloud?: string | null
          tiktok?: string | null
          bandcamp?: string | null
          beatport?: string | null
          bandsintown?: string | null
          songkick?: string | null
          facebook?: string | null
          twitter?: string | null
          threads?: string | null
          rate_min?: number | null
          rate_max?: number | null
          is_verified?: boolean | null
          profile_complete?: boolean | null
          suspended?: boolean | null
          slug?: string | null
          bookscore?: number | null
          completion_score?: number | null
          onboarding_steps?: Json | null
          streaming_stats?: Json | null
          email_preferences?: Json | null
          timezone?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          role?: string | null
          subscription_plan?: string | null
          trial_ends_at?: string | null
          accepting_bookings?: boolean
          nudge_sent_at?: string | null
          stripe_customer_id?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          country?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          city?: string | null
          state?: string | null
          genre?: string | null
          website?: string | null
          instagram?: string | null
          spotify?: string | null
          youtube?: string | null
          apple_music?: string | null
          soundcloud?: string | null
          tiktok?: string | null
          bandcamp?: string | null
          beatport?: string | null
          bandsintown?: string | null
          songkick?: string | null
          facebook?: string | null
          twitter?: string | null
          threads?: string | null
          rate_min?: number | null
          rate_max?: number | null
          is_verified?: boolean | null
          profile_complete?: boolean | null
          suspended?: boolean | null
          slug?: string | null
          bookscore?: number | null
          completion_score?: number | null
          onboarding_steps?: Json | null
          streaming_stats?: Json | null
          email_preferences?: Json | null
          timezone?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          artist_id: string | null
          promoter_id: string | null
          booking_status: string | null
          venue_name: string | null
          guarantee: number | null
          commission_rate: number | null
          payment_status: string
          deposit_paid_at: string | null
          deposit_stripe_session_id: string | null
          deposit_amount: number | null
          final_paid_at: string | null
          final_payment_paid_at: string | null
          final_payment_stripe_session_id: string | null
          final_payment_amount: number | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          contract_url: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          artist_id?: string | null
          promoter_id?: string | null
          booking_status?: string | null
          venue_name?: string | null
          guarantee?: number | null
          commission_rate?: number | null
          payment_status?: string
          deposit_paid_at?: string | null
          deposit_stripe_session_id?: string | null
          deposit_amount?: number | null
          final_paid_at?: string | null
          final_payment_paid_at?: string | null
          final_payment_stripe_session_id?: string | null
          final_payment_amount?: number | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          contract_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          artist_id?: string | null
          promoter_id?: string | null
          booking_status?: string | null
          venue_name?: string | null
          guarantee?: number | null
          commission_rate?: number | null
          payment_status?: string
          deposit_paid_at?: string | null
          deposit_stripe_session_id?: string | null
          deposit_amount?: number | null
          final_paid_at?: string | null
          final_payment_paid_at?: string | null
          final_payment_stripe_session_id?: string | null
          final_payment_amount?: number | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          contract_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          id: string
          sender_id: string | null
          recipient_id: string | null
          status: string | null
          guarantee: number | null
          splits: Json | null
          message: string | null
          venue_name: string | null
          event_date: string | null
          event_time: string | null
          door_split: number | null
          merch_split: number | null
          hospitality: string | null
          backline: string | null
          notes: string | null
          commission_rate: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          sender_id?: string | null
          recipient_id?: string | null
          status?: string | null
          guarantee?: number | null
          splits?: Json | null
          message?: string | null
          venue_name?: string | null
          event_date?: string | null
          event_time?: string | null
          door_split?: number | null
          merch_split?: number | null
          hospitality?: string | null
          backline?: string | null
          notes?: string | null
          commission_rate?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          sender_id?: string | null
          recipient_id?: string | null
          status?: string | null
          guarantee?: number | null
          splits?: Json | null
          message?: string | null
          venue_name?: string | null
          event_date?: string | null
          event_time?: string | null
          door_split?: number | null
          merch_split?: number | null
          hospitality?: string | null
          backline?: string | null
          notes?: string | null
          commission_rate?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string | null
          title: string | null
          message: string | null
          booking_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type?: string | null
          title?: string | null
          message?: string | null
          booking_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string | null
          title?: string | null
          message?: string | null
          booking_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          stripe_event_id: string
          event_type: string
          processed_at: string
          booking_id: string | null
          outcome: string | null
        }
        Insert: {
          stripe_event_id: string
          event_type: string
          processed_at?: string
          booking_id?: string | null
          outcome?: string | null
        }
        Update: {
          stripe_event_id?: string
          event_type?: string
          processed_at?: string
          booking_id?: string | null
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_webhook_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          }
        ]
      }
      payout_failures: {
        Row: {
          id: string
          booking_id: string
          artist_id: string
          stripe_account_id: string
          payout_amount_cents: number
          currency: string
          stripe_error_code: string | null
          stripe_error_message: string
          stripe_error_type: string | null
          stripe_event_id: string | null
          status: string
          retry_count: number
          max_retries: number
          next_retry_at: string | null
          last_retried_at: string | null
          resolved_transfer_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolution_note: string | null
          admin_notified_at: string | null
          admin_notification_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          artist_id: string
          stripe_account_id: string
          payout_amount_cents: number
          currency?: string
          stripe_error_code?: string | null
          stripe_error_message: string
          stripe_error_type?: string | null
          stripe_event_id?: string | null
          status?: string
          retry_count?: number
          max_retries?: number
          next_retry_at?: string | null
          last_retried_at?: string | null
          resolved_transfer_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_note?: string | null
          admin_notified_at?: string | null
          admin_notification_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          artist_id?: string
          stripe_account_id?: string
          payout_amount_cents?: number
          currency?: string
          stripe_error_code?: string | null
          stripe_error_message?: string
          stripe_error_type?: string | null
          stripe_event_id?: string | null
          status?: string
          retry_count?: number
          max_retries?: number
          next_retry_at?: string | null
          last_retried_at?: string | null
          resolved_transfer_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_note?: string | null
          admin_notified_at?: string | null
          admin_notification_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_failures_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          }
        ]
      }
      payment_tracking: {
        Row: {
          id: string
          booking_id: string | null
          user_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          amount_cents: number
          currency: string | null
          payment_type: string | null
          status: string | null
          metadata: Json | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          booking_id?: string | null
          user_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          amount_cents?: number
          currency?: string | null
          payment_type?: string | null
          status?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          booking_id?: string | null
          user_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          amount_cents?: number
          currency?: string | null
          payment_type?: string | null
          status?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          id: string
          user_id: string
          role: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string | null
          created_at?: string
        }
        Relationships: []
      }
      artist_listings: {
        Row: {
          id: string
          name: string
          genre: string | null
          origin: string | null
          notes: string | null
          bio: string | null
          claim_status: string | null
          claimed_by: string | null
          slug: string | null
          instagram: string | null
          spotify: string | null
          tiktok: string | null
          website: string | null
          avatar_url: string | null
          bookscore: number | null
          tier: string | null
          fee_min: number | null
          fee_max: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          genre?: string | null
          origin?: string | null
          notes?: string | null
          bio?: string | null
          claim_status?: string | null
          claimed_by?: string | null
          slug?: string | null
          instagram?: string | null
          spotify?: string | null
          tiktok?: string | null
          website?: string | null
          avatar_url?: string | null
          bookscore?: number | null
          tier?: string | null
          fee_min?: number | null
          fee_max?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          genre?: string | null
          origin?: string | null
          notes?: string | null
          bio?: string | null
          claim_status?: string | null
          claimed_by?: string | null
          slug?: string | null
          instagram?: string | null
          spotify?: string | null
          tiktok?: string | null
          website?: string | null
          avatar_url?: string | null
          bookscore?: number | null
          tier?: string | null
          fee_min?: number | null
          fee_max?: number | null
          created_at?: string
        }
        Relationships: []
      }
      venue_listings: {
        Row: {
          id: string
          name: string
          city: string | null
          state: string | null
          description: string | null
          claim_status: string | null
          claimed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          city?: string | null
          state?: string | null
          description?: string | null
          claim_status?: string | null
          claimed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          city?: string | null
          state?: string | null
          description?: string | null
          claim_status?: string | null
          claimed_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tours: {
        Row: {
          id: string
          artist_id: string | null
          name: string | null
          start_date: string | null
          end_date: string | null
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          artist_id?: string | null
          name?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          artist_id?: string | null
          name?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string | null
          created_at?: string
        }
        Relationships: []
      }
      deal_rooms: {
        Row: {
          id: string
          booking_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      deal_room_messages: {
        Row: {
          id: string
          deal_room_id: string
          sender_id: string
          content: string
          message_type: string | null
          metadata: Json | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          deal_room_id: string
          sender_id: string
          content: string
          message_type?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          deal_room_id?: string
          sender_id?: string
          content?: string
          message_type?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          participant_ids: string[]
          booking_id: string | null
          last_message_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          participant_ids: string[]
          booking_id?: string | null
          last_message_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          participant_ids?: string[]
          booking_id?: string | null
          last_message_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string | null
          thread_id: string | null
          sender_id: string
          content: string
          message_type: string | null
          read_by: string[] | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id?: string | null
          thread_id?: string | null
          sender_id: string
          content: string
          message_type?: string | null
          read_by?: string[] | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string | null
          thread_id?: string | null
          sender_id?: string
          content?: string
          message_type?: string | null
          read_by?: string[] | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      message_threads: {
        Row: {
          id: string
          conversation_id: string | null
          subject: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id?: string | null
          subject?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string | null
          subject?: string | null
          created_at?: string
        }
        Relationships: []
      }
      crew_members: {
        Row: {
          id: string
          tour_id: string
          name: string
          role: string
          email: string | null
          phone: string | null
          day_rate: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tour_id: string
          name: string
          role: string
          email?: string | null
          phone?: string | null
          day_rate?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tour_id?: string
          name?: string
          role?: string
          email?: string | null
          phone?: string | null
          day_rate?: number | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string | null
          sort_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string | null
          sort_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string | null
          sort_order?: number | null
          created_at?: string
        }
        Relationships: []
      }
      pipeline_deals: {
        Row: {
          id: string
          user_id: string
          stage_id: string | null
          title: string
          artist_name: string | null
          venue_name: string | null
          guarantee: number | null
          date: string | null
          notes: string | null
          status: string | null
          sort_order: number | null
          metadata: Json | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          stage_id?: string | null
          title: string
          artist_name?: string | null
          venue_name?: string | null
          guarantee?: number | null
          date?: string | null
          notes?: string | null
          status?: string | null
          sort_order?: number | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          stage_id?: string | null
          title?: string
          artist_name?: string | null
          venue_name?: string | null
          guarantee?: number | null
          date?: string | null
          notes?: string | null
          status?: string | null
          sort_order?: number | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      booking_analytics: {
        Row: {
          id: string
          user_id: string
          booking_id: string | null
          event_type: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          booking_id?: string | null
          event_type: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          booking_id?: string | null
          event_type?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      venue_booking_requests: {
        Row: {
          id: string
          artist_id: string
          venue_id: string
          proposed_date: string
          event_type: string
          expected_attendance: number | null
          message: string | null
          status: string
          responded_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          artist_id: string
          venue_id: string
          proposed_date: string
          event_type?: string
          expected_attendance?: number | null
          message?: string | null
          status?: string
          responded_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          artist_id?: string
          venue_id?: string
          proposed_date?: string
          event_type?: string
          expected_attendance?: number | null
          message?: string | null
          status?: string
          responded_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          id: string
          email: string
          name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          artist_id: string | null
          reviewee_id: string | null
          reviewer_id: string | null
          booking_id: string | null
          rating: number | null
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          artist_id?: string | null
          reviewee_id?: string | null
          reviewer_id?: string | null
          booking_id?: string | null
          rating?: number | null
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          artist_id?: string | null
          reviewee_id?: string | null
          reviewer_id?: string | null
          booking_id?: string | null
          rating?: number | null
          comment?: string | null
          created_at?: string
        }
        Relationships: []
      }
      flash_bids: {
        Row: {
          id: string
          artist_id: string | null
          promoter_id: string | null
          status: string | null
          expires_at: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          artist_id?: string | null
          promoter_id?: string | null
          status?: string | null
          expires_at?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          artist_id?: string | null
          promoter_id?: string | null
          status?: string | null
          expires_at?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      artist_availability: {
        Row: {
          id: string
          artist_id: string
          date: string
          is_available: boolean
          notes: string | null
          flash_bid_enabled: boolean
          flash_bid_deadline: string | null
          flash_bid_min_price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          artist_id: string
          date: string
          is_available?: boolean
          notes?: string | null
          flash_bid_enabled?: boolean
          flash_bid_deadline?: string | null
          flash_bid_min_price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          artist_id?: string
          date?: string
          is_available?: boolean
          notes?: string | null
          flash_bid_enabled?: boolean
          flash_bid_deadline?: string | null
          flash_bid_min_price?: number | null
          created_at?: string
        }
        Relationships: []
      }
      contract_signatures: {
        Row: {
          id: string
          booking_id: string
          user_id: string
          signature_data: string
          signature_type: string
          signed_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          user_id: string
          signature_data: string
          signature_type?: string
          signed_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          user_id?: string
          signature_data?: string
          signature_type?: string
          signed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          }
        ]
      }
      counter_offers: {
        Row: {
          id: string
          offer_id: string
          sender_id: string
          guarantee: number
          door_split: number | null
          merch_split: number | null
          event_date: string
          event_time: string | null
          message: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          offer_id: string
          sender_id: string
          guarantee?: number
          door_split?: number | null
          merch_split?: number | null
          event_date: string
          event_time?: string | null
          message?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          offer_id?: string
          sender_id?: string
          guarantee?: number
          door_split?: number | null
          merch_split?: number | null
          event_date?: string
          event_time?: string | null
          message?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counter_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          }
        ]
      }
      tour_stops: {
        Row: {
          id: string
          tour_id: string
          venue_name: string
          city: string | null
          state: string | null
          date: string
          load_in_time: string | null
          sound_check_time: string | null
          doors_time: string | null
          show_time: string | null
          guarantee: number | null
          notes: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          tour_id: string
          venue_name: string
          city?: string | null
          state?: string | null
          date: string
          load_in_time?: string | null
          sound_check_time?: string | null
          doors_time?: string | null
          show_time?: string | null
          guarantee?: number | null
          notes?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          tour_id?: string
          venue_name?: string
          city?: string | null
          state?: string | null
          date?: string
          load_in_time?: string | null
          sound_check_time?: string | null
          doors_time?: string | null
          show_time?: string | null
          guarantee?: number | null
          notes?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_stops_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          }
        ]
      }
      show_attendance: {
        Row: {
          id: string
          booking_id: string
          venue_name: string
          artist_id: string
          promoter_id: string
          venue_capacity: number | null
          actual_attendance: number
          reported_by: string
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          venue_name: string
          artist_id: string
          promoter_id: string
          venue_capacity?: number | null
          actual_attendance: number
          reported_by: string
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          venue_name?: string
          artist_id?: string
          promoter_id?: string
          venue_capacity?: number | null
          actual_attendance?: number
          reported_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_attendance_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          }
        ]
      }
      artist_expenses: {
        Row: {
          id: string
          user_id: string
          booking_id: string | null
          tour_stop_id: string | null
          amount: number
          category: string
          description: string
          expense_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          booking_id?: string | null
          tour_stop_id?: string | null
          amount?: number
          category?: string
          description?: string
          expense_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          booking_id?: string | null
          tour_stop_id?: string | null
          amount?: number
          category?: string
          description?: string
          expense_date?: string
          created_at?: string
        }
        Relationships: []
      }
      advance_requests: {
        Row: {
          id: string
          booking_id: string
          artist_id: string
          amount_requested: number
          guarantee_net: number
          fee_percent: number
          fee_amount: number
          status: string
          evaluated_at: string | null
          paid_at: string | null
          collected_at: string | null
          rejection_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          artist_id: string
          amount_requested?: number
          guarantee_net?: number
          fee_percent?: number
          fee_amount?: number
          status?: string
          evaluated_at?: string | null
          paid_at?: string | null
          collected_at?: string | null
          rejection_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          artist_id?: string
          amount_requested?: number
          guarantee_net?: number
          fee_percent?: number
          fee_amount?: number
          status?: string
          evaluated_at?: string | null
          paid_at?: string | null
          collected_at?: string | null
          rejection_reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advance_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          }
        ]
      }
      booking_insurance: {
        Row: {
          id: string
          booking_id: string
          policy_type: string
          coverage_type: string
          premium: number
          coverage_amount: number
          status: string
          policy_id: string | null
          purchased_by: string | null
          purchased_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          policy_type?: string
          coverage_type: string
          premium?: number
          coverage_amount?: number
          status?: string
          policy_id?: string | null
          purchased_by?: string | null
          purchased_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          policy_type?: string
          coverage_type?: string
          premium?: number
          coverage_amount?: number
          status?: string
          policy_id?: string | null
          purchased_by?: string | null
          purchased_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      income_smoothing: {
        Row: {
          id: string
          artist_id: string
          is_active: boolean
          total_managed_income: number
          monthly_payout: number
          fee_percent: number
          start_date: string | null
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          artist_id: string
          is_active?: boolean
          total_managed_income?: number
          monthly_payout?: number
          fee_percent?: number
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          artist_id?: string
          is_active?: boolean
          total_managed_income?: number
          monthly_payout?: number
          fee_percent?: number
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_financing: {
        Row: {
          id: string
          booking_id: string
          promoter_id: string
          plan_type: string
          total_amount: number
          monthly_payment: number | null
          installments: number | null
          interest_rate: number | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          promoter_id: string
          plan_type?: string
          total_amount?: number
          monthly_payment?: number | null
          installments?: number | null
          interest_rate?: number | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          promoter_id?: string
          plan_type?: string
          total_amount?: number
          monthly_payment?: number | null
          installments?: number | null
          interest_rate?: number | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          id: string
          message_id: string | null
          template_name: string
          recipient_email: string
          status: string
          error_message: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id?: string | null
          template_name: string
          recipient_email: string
          status?: string
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string | null
          template_name?: string
          recipient_email?: string
          status?: string
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      directory_listings: {
        Row: {
          id: string | null
          name: string | null
          avatar_url: string | null
          genres: string[] | null
          city: string | null
          state: string | null
          listing_type: string | null
          slug: string | null
          bio: string | null
          bookscore: number | null
          tier: string | null
          fee_min: number | null
          fee_max: number | null
          is_claimed: boolean | null
          claimed_by: string | null
          instagram: string | null
          spotify: string | null
          tiktok: string | null
          website: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_waitlist_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      check_trial_status: {
        Args: { p_user_id: string }
        Returns: Json
      }
      has_role: {
        Args: { _user_id: string; _role: string }
        Returns: boolean
      }
      get_artist_social: {
        Args: { p_slug: string }
        Returns: {
          id: string
          name: string
          instagram: string
          spotify: string
          tiktok: string
          website: string
        }[]
      }
      get_all_artists_social: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          slug: string
          instagram: string
          spotify: string
          tiktok: string
          website: string
        }[]
      }
      get_artist_by_slug: {
        Args: { p_slug: string }
        Returns: {
          id: string
          name: string
          slug: string
          avatar_url: string
          bio: string
          genres: string[]
          city: string
          state: string
          tier: string
          bookscore: number
          fee_min: number
          fee_max: number
          instagram: string
          spotify: string
          tiktok: string
          website: string
          is_claimed: boolean
          listing_type: string
        }[]
      }
      get_directory_artists: {
        Args: {
          p_search?: string
          p_genre?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          name: string
          slug: string
          avatar_url: string
          bio: string
          genres: string[]
          city: string
          state: string
          tier: string
          bookscore: number
          fee_min: number
          fee_max: number
          instagram: string
          spotify: string
          tiktok: string
          website: string
          is_claimed: boolean
        }[]
      }
      notify_pgrst_reload: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "artist" | "promoter" | "venue" | "production" | "photo_video"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
