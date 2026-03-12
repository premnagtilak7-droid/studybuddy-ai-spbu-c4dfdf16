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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          device_type: string | null
          feature: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          device_type?: string | null
          feature: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          device_type?: string | null
          feature?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_sent: boolean
          message: string
          scheduled_at: string | null
          sent_at: string | null
          target: string
          target_email: string | null
          template_type: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_sent?: boolean
          message: string
          scheduled_at?: string | null
          sent_at?: string | null
          target?: string
          target_email?: string | null
          template_type?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_sent?: boolean
          message?: string
          scheduled_at?: string | null
          sent_at?: string | null
          target?: string
          target_email?: string | null
          template_type?: string | null
          title?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          message: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message?: string
          title?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          status: string
          subject: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          status?: string
          subject: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          status?: string
          subject?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          created_at: string
          date: string
          id: string
          status: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          status?: string
          subject_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          status?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "attendance_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_subjects: {
        Row: {
          created_at: string
          id: string
          lectures_per_week: number
          subject_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lectures_per_week?: number
          subject_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lectures_per_week?: number
          subject_name?: string
          user_id?: string
        }
        Relationships: []
      }
      batch_profiles: {
        Row: {
          branch: string
          created_at: string
          id: string
          user_id: string
          year: string
        }
        Insert: {
          branch: string
          created_at?: string
          id?: string
          user_id: string
          year: string
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          user_id?: string
          year?: string
        }
        Relationships: []
      }
      buddy_profiles: {
        Row: {
          created_at: string
          id: string
          preferred_time: string
          study_hours_per_day: number
          subjects: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferred_time?: string
          study_hours_per_day?: number
          subjects?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferred_time?: string
          study_hours_per_day?: number
          subjects?: string[]
          user_id?: string
        }
        Relationships: []
      }
      buddy_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          status: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          status?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          status?: string
          to_user_id?: string
        }
        Relationships: []
      }
      cgpa_history: {
        Row: {
          created_at: string
          id: string
          semester: number
          sgpa: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          semester: number
          sgpa: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          semester?: number
          sgpa?: number
          user_id?: string
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          current_value: number
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          discount_percent: number
          discount_type: string
          expiry_date: string | null
          flat_amount: number | null
          id: string
          is_active: boolean
          max_uses: number | null
          plan_type: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          discount_percent?: number
          discount_type?: string
          expiry_date?: string | null
          flat_amount?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          plan_type?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          discount_percent?: number
          discount_type?: string
          expiry_date?: string | null
          flat_amount?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          plan_type?: string
          used_count?: number
        }
        Relationships: []
      }
      daily_study_goals: {
        Row: {
          created_at: string
          id: string
          target_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      doubt_history: {
        Row: {
          answer: string
          created_at: string
          id: string
          image_url: string | null
          question: string
          subject_id: string | null
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          image_url?: string | null
          question: string
          subject_id?: string | null
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          image_url?: string | null
          question?: string
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubt_history_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_dates: {
        Row: {
          created_at: string
          exam_date: string
          id: string
          is_global: boolean
          label: string | null
          subject_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          exam_date: string
          id?: string
          is_global?: boolean
          label?: string | null
          subject_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          exam_date?: string
          id?: string
          is_global?: boolean
          label?: string | null
          subject_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_dates_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_decks: {
        Row: {
          created_at: string
          id: string
          name: string
          subject: string
          topic: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          subject: string
          topic?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          subject?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          deck_id: string
          front: string
          id: string
          next_review_at: string
          review_count: number
          status: string
        }
        Insert: {
          back: string
          created_at?: string
          deck_id: string
          front: string
          id?: string
          next_review_at?: string
          review_count?: number
          status?: string
        }
        Update: {
          back?: string
          created_at?: string
          deck_id?: string
          front?: string
          id?: string
          next_review_at?: string
          review_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          completed: boolean
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration_minutes: number
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      formula_bank: {
        Row: {
          created_at: string
          example: string | null
          formula: string
          id: string
          is_custom: boolean
          name: string
          subject: string
          user_id: string
          variables: string | null
        }
        Insert: {
          created_at?: string
          example?: string | null
          formula: string
          id?: string
          is_custom?: boolean
          name: string
          subject: string
          user_id: string
          variables?: string | null
        }
        Update: {
          created_at?: string
          example?: string | null
          formula?: string
          id?: string
          is_custom?: boolean
          name?: string
          subject?: string
          user_id?: string
          variables?: string | null
        }
        Relationships: []
      }
      formula_bookmarks: {
        Row: {
          created_at: string
          formula_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          formula_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          formula_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formula_bookmarks_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "formula_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      formula_sheets: {
        Row: {
          content: Json
          created_at: string
          id: string
          subject: string
          units: string[]
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          subject: string
          units?: string[]
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          subject?: string
          units?: string[]
          user_id?: string
        }
        Relationships: []
      }
      forum_answers: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_best: boolean
          post_id: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_best?: boolean
          post_id: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_best?: boolean
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_answers_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          best_answer_id: string | null
          created_at: string
          id: string
          image_url: string | null
          question: string
          subject: string
          topic: string | null
          user_id: string
        }
        Insert: {
          best_answer_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          question: string
          subject: string
          topic?: string | null
          user_id: string
        }
        Update: {
          best_answer_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          question?: string
          subject?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      forum_votes: {
        Row: {
          answer_id: string
          created_at: string
          id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          id?: string
          user_id: string
          vote_type: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_votes_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "forum_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          created_at: string
          group_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_experiments: {
        Row: {
          completed_at: string | null
          created_at: string
          experiment_name: string
          id: string
          is_completed: boolean
          subject: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          experiment_name: string
          id?: string
          is_completed?: boolean
          subject: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          experiment_name?: string
          id?: string
          is_completed?: boolean
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      marks_tracker: {
        Row: {
          assignment_marks: number | null
          assignment_total: number
          attendance_marks: number | null
          attendance_total: number
          created_at: string
          credits: number
          ia1_marks: number | null
          ia1_total: number
          ia2_marks: number | null
          ia2_total: number
          id: string
          semester: number
          subject_name: string
          target_grade: string | null
          user_id: string
        }
        Insert: {
          assignment_marks?: number | null
          assignment_total?: number
          attendance_marks?: number | null
          attendance_total?: number
          created_at?: string
          credits?: number
          ia1_marks?: number | null
          ia1_total?: number
          ia2_marks?: number | null
          ia2_total?: number
          id?: string
          semester?: number
          subject_name: string
          target_grade?: string | null
          user_id: string
        }
        Update: {
          assignment_marks?: number | null
          assignment_total?: number
          attendance_marks?: number | null
          attendance_total?: number
          created_at?: string
          credits?: number
          ia1_marks?: number | null
          ia1_total?: number
          ia2_marks?: number | null
          ia2_total?: number
          id?: string
          semester?: number
          subject_name?: string
          target_grade?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mock_tests: {
        Row: {
          answers: Json | null
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          num_questions: number
          question_type: string
          questions: Json
          score: number | null
          subject: string
          topic: string | null
          total: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          num_questions?: number
          question_type?: string
          questions?: Json
          score?: number | null
          subject: string
          topic?: string | null
          total?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          num_questions?: number
          question_type?: string
          questions?: Json
          score?: number | null
          subject?: string
          topic?: string | null
          total?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ban_reason: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_banned: boolean
          is_subscribed: boolean
          premium_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ban_reason?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          is_banned?: boolean
          is_subscribed?: boolean
          premium_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ban_reason?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_banned?: boolean
          is_subscribed?: boolean
          premium_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_dates: {
        Row: {
          created_at: string
          id: string
          study_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          study_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          study_date?: string
          user_id?: string
        }
        Relationships: []
      }
      study_groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          join_code: string
          max_members: number
          name: string
          subject_focus: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          join_code: string
          max_members?: number
          name: string
          subject_focus: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          join_code?: string
          max_members?: number
          name?: string
          subject_focus?: string
        }
        Relationships: []
      }
      study_logs: {
        Row: {
          duration_minutes: number
          id: string
          logged_at: string
          mode: string | null
          notes: string | null
          subject_id: string | null
          user_id: string
        }
        Insert: {
          duration_minutes?: number
          id?: string
          logged_at?: string
          mode?: string | null
          notes?: string | null
          subject_id?: string | null
          user_id: string
        }
        Update: {
          duration_minutes?: number
          id?: string
          logged_at?: string
          mode?: string | null
          notes?: string | null
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string
          daily_hours: number
          difficulty: string
          id: string
          plan_data: Json
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_hours?: number
          difficulty?: string
          id?: string
          plan_data?: Json
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_hours?: number
          difficulty?: string
          id?: string
          plan_data?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      study_reminders: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          reminder_time: string
          subject_id: string | null
          subject_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          reminder_time: string
          subject_id?: string | null
          subject_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          reminder_time?: string
          subject_id?: string | null
          subject_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_reminders_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          color: string
          completed_units: number
          created_at: string
          id: string
          name: string
          target_grade: number | null
          target_units: number
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          color?: string
          completed_units?: number
          created_at?: string
          id?: string
          name: string
          target_grade?: number | null
          target_units?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          color?: string
          completed_units?: number
          created_at?: string
          id?: string
          name?: string
          target_grade?: number | null
          target_units?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subtopics: {
        Row: {
          completed_at: string | null
          created_at: string
          difficulty: string
          id: string
          is_completed: boolean
          name: string
          notes: string | null
          topic_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          is_completed?: boolean
          name: string
          notes?: string | null
          topic_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          is_completed?: boolean
          name?: string
          notes?: string | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtopics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          created_at: string
          id: string
          message: string
          priority: string
          replied_at: string | null
          status: string
          subject: string
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          replied_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          replied_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      timer_sessions: {
        Row: {
          countdown_target_seconds: number | null
          created_at: string
          elapsed_seconds: number
          id: string
          is_running: boolean
          mode: string
          paused_at: string | null
          pomodoro_phase: string | null
          pomodoro_sessions_done: number | null
          started_at: string
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          countdown_target_seconds?: number | null
          created_at?: string
          elapsed_seconds?: number
          id?: string
          is_running?: boolean
          mode?: string
          paused_at?: string | null
          pomodoro_phase?: string | null
          pomodoro_sessions_done?: number | null
          started_at?: string
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          countdown_target_seconds?: number | null
          created_at?: string
          elapsed_seconds?: number
          id?: string
          is_running?: boolean
          mode?: string
          paused_at?: string | null
          pomodoro_phase?: string | null
          pomodoro_sessions_done?: number | null
          started_at?: string
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timer_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_sessions: {
        Row: {
          color: string
          created_at: string
          day_of_week: string
          duration: string
          id: string
          is_completed: boolean
          repeat_type: string
          session_type: string
          sort_order: number
          start_time: string
          subject: string
          topic: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          day_of_week: string
          duration?: string
          id?: string
          is_completed?: boolean
          repeat_type?: string
          session_type?: string
          sort_order?: number
          start_time: string
          subject: string
          topic?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          day_of_week?: string
          duration?: string
          id?: string
          is_completed?: boolean
          repeat_type?: string
          session_type?: string
          sort_order?: number
          start_time?: string
          subject?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          name: string
          priority: Database["public"]["Enums"]["topic_priority"]
          unit_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          name: string
          priority?: Database["public"]["Enums"]["topic_priority"]
          unit_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          name?: string
          priority?: Database["public"]["Enums"]["topic_priority"]
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          id: string
          name: string
          subject_id: string
          unit_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          subject_id: string
          unit_number: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          subject_id?: string
          unit_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "units_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          badge_key: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_key: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          id: string
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_challenges: {
        Row: {
          bonus_xp: number
          challenge_type: string
          created_at: string
          description: string
          id: string
          target_value: number
          title: string
          week_start: string
        }
        Insert: {
          bonus_xp?: number
          challenge_type?: string
          created_at?: string
          description: string
          id?: string
          target_value?: number
          title: string
          week_start: string
        }
        Update: {
          bonus_xp?: number
          challenge_type?: string
          created_at?: string
          description?: string
          id?: string
          target_value?: number
          title?: string
          week_start?: string
        }
        Relationships: []
      }
      xp_logs: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
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
    }
    Enums: {
      app_role: "admin" | "student"
      topic_priority: "high" | "medium" | "low"
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
      app_role: ["admin", "student"],
      topic_priority: ["high", "medium", "low"],
    },
  },
} as const
