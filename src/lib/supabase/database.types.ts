
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "announcements": {
                  Row: {
                    "author_id": string | null,"body_md": string,"cohort_id": string | null,"course_id": string,"id": string,"pinned": boolean,"published_at": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body_md"?: string,"cohort_id"?: string | null,"course_id": string,"id"?: string,"pinned"?: boolean,"published_at"?: string,"title": string
                  }
                  Update: {
                    "author_id"?: string | null,"body_md"?: string,"cohort_id"?: string | null,"course_id"?: string,"id"?: string,"pinned"?: boolean,"published_at"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"code_submissions": {
                  Row: {
                    "code": string,"created_at": string,"id": string,"language": string,"problem_id": string,"results": Json | null,"status": Database["public"]['Enums']["code_submission_status"],"updated_at": string,"user_id": string,"verdict": Database["public"]['Enums']["code_verdict"]
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: string,"language"?: string,"problem_id": string,"results"?: Json | null,"status"?: Database["public"]['Enums']["code_submission_status"],"updated_at"?: string,"user_id": string,"verdict"?: Database["public"]['Enums']["code_verdict"]
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: string,"language"?: string,"problem_id"?: string,"results"?: Json | null,"status"?: Database["public"]['Enums']["code_submission_status"],"updated_at"?: string,"user_id"?: string,"verdict"?: Database["public"]['Enums']["code_verdict"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "code_submissions_problem_id_fkey"
      columns: ["problem_id"]
isOneToOne: false
      referencedRelation: "coding_problem_outline"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "code_submissions_problem_id_fkey"
      columns: ["problem_id"]
isOneToOne: false
      referencedRelation: "coding_problems"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "code_submissions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"coding_problem_solutions": {
                  Row: {
                    "editorial_md": string,"hidden_tests": NonNullable<Json>,"problem_id": string,"reference_solution": string
                  }
                  ComputedFields: never
                  Insert: {
                    "editorial_md"?: string,"hidden_tests"?: NonNullable<Json>,"problem_id": string,"reference_solution"?: string
                  }
                  Update: {
                    "editorial_md"?: string,"hidden_tests"?: NonNullable<Json>,"problem_id"?: string,"reference_solution"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coding_problem_solutions_problem_id_fkey"
      columns: ["problem_id"]
isOneToOne: true
      referencedRelation: "coding_problem_outline"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coding_problem_solutions_problem_id_fkey"
      columns: ["problem_id"]
isOneToOne: true
      referencedRelation: "coding_problems"
      referencedColumns: ["id"]
    }
                  ]
                },"coding_problems": {
                  Row: {
                    "constraints": (string)[],"course_id": string,"created_at": string,"difficulty": Database["public"]['Enums']["problem_difficulty"],"examples": NonNullable<Json>,"hints": (string)[],"id": string,"is_published": boolean,"module_id": string,"position": number,"search": unknown,"slug": string,"starter_code": string,"statement_md": string,"summary": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "constraints"?: (string)[],"course_id": string,"created_at"?: string,"difficulty"?: Database["public"]['Enums']["problem_difficulty"],"examples"?: NonNullable<Json>,"hints"?: (string)[],"id"?: string,"is_published"?: boolean,"module_id": string,"position": number,"search"?: never,"slug": string,"starter_code"?: string,"statement_md"?: string,"summary"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "constraints"?: (string)[],"course_id"?: string,"created_at"?: string,"difficulty"?: Database["public"]['Enums']["problem_difficulty"],"examples"?: NonNullable<Json>,"hints"?: (string)[],"id"?: string,"is_published"?: boolean,"module_id"?: string,"position"?: number,"search"?: never,"slug"?: string,"starter_code"?: string,"statement_md"?: string,"summary"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coding_problems_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coding_problems_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "module_path"
      referencedColumns: ["id","course_id"]
    },{
      foreignKeyName: "coding_problems_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id","course_id"]
    }
                  ]
                },"cohorts": {
                  Row: {
                    "capacity": number | null,"course_id": string,"created_at": string,"description": string,"ends_on": string | null,"id": string,"is_public": boolean,"name": string,"slug": string,"starts_on": string | null,"status": Database["public"]['Enums']["cohort_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "capacity"?: number | null,"course_id": string,"created_at"?: string,"description"?: string,"ends_on"?: string | null,"id"?: string,"is_public"?: boolean,"name": string,"slug": string,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["cohort_status"]
                  }
                  Update: {
                    "capacity"?: number | null,"course_id"?: string,"created_at"?: string,"description"?: string,"ends_on"?: string | null,"id"?: string,"is_public"?: boolean,"name"?: string,"slug"?: string,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["cohort_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "cohorts_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_messages": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"message": string,"name": string,"topic": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id"?: string,"message": string,"name": string,"topic"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"message"?: string,"name"?: string,"topic"?: string
                  }
                  Relationships: [
                    
                  ]
                },"courses": {
                  Row: {
                    "created_at": string,"description": string,"duration_weeks": number | null,"id": string,"instructor_id": string | null,"is_published": boolean,"level": string | null,"outcomes": (string)[],"prerequisites": (string)[],"slug": string,"subtitle": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"duration_weeks"?: number | null,"id"?: string,"instructor_id"?: string | null,"is_published"?: boolean,"level"?: string | null,"outcomes"?: (string)[],"prerequisites"?: (string)[],"slug": string,"subtitle"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"duration_weeks"?: number | null,"id"?: string,"instructor_id"?: string | null,"is_published"?: boolean,"level"?: string | null,"outcomes"?: (string)[],"prerequisites"?: (string)[],"slug"?: string,"subtitle"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "courses_instructor_id_fkey"
      columns: ["instructor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"enrollments": {
                  Row: {
                    "cohort_id": string | null,"course_id": string,"enrolled_at": string,"id": string,"status": Database["public"]['Enums']["enrollment_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cohort_id"?: string | null,"course_id": string,"enrolled_at"?: string,"id"?: string,"status"?: Database["public"]['Enums']["enrollment_status"],"user_id": string
                  }
                  Update: {
                    "cohort_id"?: string | null,"course_id"?: string,"enrolled_at"?: string,"id"?: string,"status"?: Database["public"]['Enums']["enrollment_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "enrollments_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollments_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"enrolment_requests": {
                  Row: {
                    "cohort_id": string | null,"course_id": string,"created_at": string,"email": string,"id": string,"kind": Database["public"]['Enums']["enrolment_request_kind"],"message": string,"name": string,"status": Database["public"]['Enums']["enrolment_request_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "cohort_id"?: string | null,"course_id": string,"created_at"?: string,"email": string,"id"?: string,"kind"?: Database["public"]['Enums']["enrolment_request_kind"],"message"?: string,"name": string,"status"?: Database["public"]['Enums']["enrolment_request_status"]
                  }
                  Update: {
                    "cohort_id"?: string | null,"course_id"?: string,"created_at"?: string,"email"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["enrolment_request_kind"],"message"?: string,"name"?: string,"status"?: Database["public"]['Enums']["enrolment_request_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "enrolment_requests_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrolment_requests_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"feedback": {
                  Row: {
                    "author_id": string | null,"body_md": string,"course_id": string,"created_at": string,"id": string,"kind": Database["public"]['Enums']["feedback_kind"],"max_score": number | null,"project_id": string | null,"quiz_id": string | null,"read_at": string | null,"score": number | null,"student_id": string,"submission_id": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body_md": string,"course_id": string,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["feedback_kind"],"max_score"?: number | null,"project_id"?: string | null,"quiz_id"?: string | null,"read_at"?: string | null,"score"?: number | null,"student_id": string,"submission_id"?: string | null,"title": string
                  }
                  Update: {
                    "author_id"?: string | null,"body_md"?: string,"course_id"?: string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["feedback_kind"],"max_score"?: number | null,"project_id"?: string | null,"quiz_id"?: string | null,"read_at"?: string | null,"score"?: number | null,"student_id"?: string,"submission_id"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedback_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feedback_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feedback_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_outline"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feedback_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feedback_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quiz_outline"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feedback_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quizzes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feedback_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feedback_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_progress": {
                  Row: {
                    "completed_at": string,"lesson_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string,"lesson_id": string,"user_id": string
                  }
                  Update: {
                    "completed_at"?: string,"lesson_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_progress_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lesson_outline"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_progress_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_progress_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "body_md": string,"course_id": string,"created_at": string,"duration_minutes": number,"id": string,"is_published": boolean,"module_id": string,"objectives": (string)[],"position": number,"search": unknown,"slug": string,"summary": string,"title": string,"updated_at": string,"video_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body_md"?: string,"course_id": string,"created_at"?: string,"duration_minutes"?: number,"id"?: string,"is_published"?: boolean,"module_id": string,"objectives"?: (string)[],"position": number,"search"?: never,"slug": string,"summary"?: string,"title": string,"updated_at"?: string,"video_url"?: string | null
                  }
                  Update: {
                    "body_md"?: string,"course_id"?: string,"created_at"?: string,"duration_minutes"?: number,"id"?: string,"is_published"?: boolean,"module_id"?: string,"objectives"?: (string)[],"position"?: number,"search"?: never,"slug"?: string,"summary"?: string,"title"?: string,"updated_at"?: string,"video_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lessons_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "module_path"
      referencedColumns: ["id","course_id"]
    },{
      foreignKeyName: "lessons_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id","course_id"]
    }
                  ]
                },"live_sessions": {
                  Row: {
                    "cohort_id": string | null,"course_id": string,"created_at": string,"description": string,"ends_at": string,"id": string,"instructor_name": string,"meeting_url": string | null,"module_id": string | null,"notes_md": string,"recording_url": string | null,"slides_url": string | null,"starts_at": string,"timezone": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cohort_id"?: string | null,"course_id": string,"created_at"?: string,"description"?: string,"ends_at": string,"id"?: string,"instructor_name": string,"meeting_url"?: string | null,"module_id"?: string | null,"notes_md"?: string,"recording_url"?: string | null,"slides_url"?: string | null,"starts_at": string,"timezone"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "cohort_id"?: string | null,"course_id"?: string,"created_at"?: string,"description"?: string,"ends_at"?: string,"id"?: string,"instructor_name"?: string,"meeting_url"?: string | null,"module_id"?: string | null,"notes_md"?: string,"recording_url"?: string | null,"slides_url"?: string | null,"starts_at"?: string,"timezone"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "live_sessions_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "live_sessions_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "live_sessions_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "module_path"
      referencedColumns: ["id","course_id"]
    },{
      foreignKeyName: "live_sessions_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id","course_id"]
    }
                  ]
                },"modules": {
                  Row: {
                    "available_from": string | null,"course_id": string,"created_at": string,"description": string,"id": string,"is_published": boolean,"phase_id": string | null,"plan": NonNullable<Json>,"position": number,"requires_previous": boolean,"search": unknown,"slug": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "available_from"?: string | null,"course_id": string,"created_at"?: string,"description"?: string,"id"?: string,"is_published"?: boolean,"phase_id"?: string | null,"plan"?: NonNullable<Json>,"position": number,"requires_previous"?: boolean,"search"?: never,"slug": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "available_from"?: string | null,"course_id"?: string,"created_at"?: string,"description"?: string,"id"?: string,"is_published"?: boolean,"phase_id"?: string | null,"plan"?: NonNullable<Json>,"position"?: number,"requires_previous"?: boolean,"search"?: never,"slug"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "modules_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "modules_phase_fkey"
      columns: ["phase_id","course_id"]
isOneToOne: false
      referencedRelation: "phases"
      referencedColumns: ["id","course_id"]
    }
                  ]
                },"phases": {
                  Row: {
                    "course_id": string,"created_at": string,"description": string,"id": string,"is_preparatory": boolean,"position": number,"slug": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"created_at"?: string,"description"?: string,"id"?: string,"is_preparatory"?: boolean,"position": number,"slug": string,"title": string
                  }
                  Update: {
                    "course_id"?: string,"created_at"?: string,"description"?: string,"id"?: string,"is_preparatory"?: boolean,"position"?: number,"slug"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "phases_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"created_at": string,"email": string,"full_name": string,"headline": string | null,"id": string,"links": NonNullable<Json>,"role": Database["public"]['Enums']["user_role"],"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"email": string,"full_name": string,"headline"?: string | null,"id": string,"links"?: NonNullable<Json>,"role"?: Database["public"]['Enums']["user_role"],"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"email"?: string,"full_name"?: string,"headline"?: string | null,"id"?: string,"links"?: NonNullable<Json>,"role"?: Database["public"]['Enums']["user_role"],"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"projects": {
                  Row: {
                    "course_id": string,"created_at": string,"description_md": string,"due_at": string | null,"id": string,"is_published": boolean,"max_points": number,"module_id": string,"objectives": (string)[],"requirements": (string)[],"rubric": NonNullable<Json>,"search": unknown,"slug": string,"submission_instructions_md": string,"summary": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"created_at"?: string,"description_md"?: string,"due_at"?: string | null,"id"?: string,"is_published"?: boolean,"max_points"?: number,"module_id": string,"objectives"?: (string)[],"requirements"?: (string)[],"rubric"?: NonNullable<Json>,"search"?: never,"slug": string,"submission_instructions_md"?: string,"summary"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "course_id"?: string,"created_at"?: string,"description_md"?: string,"due_at"?: string | null,"id"?: string,"is_published"?: boolean,"max_points"?: number,"module_id"?: string,"objectives"?: (string)[],"requirements"?: (string)[],"rubric"?: NonNullable<Json>,"search"?: never,"slug"?: string,"submission_instructions_md"?: string,"summary"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "module_path"
      referencedColumns: ["id","course_id"]
    },{
      foreignKeyName: "projects_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id","course_id"]
    }
                  ]
                },"question_keys": {
                  Row: {
                    "correct": NonNullable<Json>,"explanation_md": string,"question_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "correct": NonNullable<Json>,"explanation_md"?: string,"question_id": string
                  }
                  Update: {
                    "correct"?: NonNullable<Json>,"explanation_md"?: string,"question_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "question_keys_question_id_fkey"
      columns: ["question_id"]
isOneToOne: true
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"questions": {
                  Row: {
                    "id": string,"options": NonNullable<Json>,"points": number,"position": number,"prompt_md": string,"quiz_id": string,"type": Database["public"]['Enums']["question_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"options"?: NonNullable<Json>,"points"?: number,"position": number,"prompt_md": string,"quiz_id": string,"type": Database["public"]['Enums']["question_type"]
                  }
                  Update: {
                    "id"?: string,"options"?: NonNullable<Json>,"points"?: number,"position"?: number,"prompt_md"?: string,"quiz_id"?: string,"type"?: Database["public"]['Enums']["question_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quiz_outline"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quizzes"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz_attempts": {
                  Row: {
                    "answers": NonNullable<Json>,"attempt_number": number,"id": string,"max_score": number,"passed": boolean,"percent": number,"quiz_id": string,"results": NonNullable<Json>,"score": number,"submitted_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: NonNullable<Json>,"attempt_number": number,"id"?: string,"max_score": number,"passed": boolean,"percent": number,"quiz_id": string,"results"?: NonNullable<Json>,"score": number,"submitted_at"?: string,"user_id": string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"attempt_number"?: number,"id"?: string,"max_score"?: number,"passed"?: boolean,"percent"?: number,"quiz_id"?: string,"results"?: NonNullable<Json>,"score"?: number,"submitted_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_attempts_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quiz_outline"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quiz_attempts_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quizzes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quiz_attempts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"quizzes": {
                  Row: {
                    "course_id": string,"created_at": string,"description": string,"id": string,"is_published": boolean,"max_attempts": number | null,"module_id": string,"pass_percent": number,"slug": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"created_at"?: string,"description"?: string,"id"?: string,"is_published"?: boolean,"max_attempts"?: number | null,"module_id": string,"pass_percent"?: number,"slug": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "course_id"?: string,"created_at"?: string,"description"?: string,"id"?: string,"is_published"?: boolean,"max_attempts"?: number | null,"module_id"?: string,"pass_percent"?: number,"slug"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quizzes_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quizzes_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "module_path"
      referencedColumns: ["id","course_id"]
    },{
      foreignKeyName: "quizzes_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id","course_id"]
    }
                  ]
                },"rate_limit_hits": {
                  Row: {
                    "bucket": string,"created_at": string,"id": number,"key_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"created_at"?: string,"id"?: never,"key_hash": string
                  }
                  Update: {
                    "bucket"?: string,"created_at"?: string,"id"?: never,"key_hash"?: string
                  }
                  Relationships: [
                    
                  ]
                },"resources": {
                  Row: {
                    "course_id": string,"created_at": string,"description": string,"id": string,"kind": Database["public"]['Enums']["resource_kind"],"lesson_id": string | null,"live_session_id": string | null,"module_id": string | null,"position": number,"project_id": string | null,"search": unknown,"title": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "course_id": string,"created_at"?: string,"description"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["resource_kind"],"lesson_id"?: string | null,"live_session_id"?: string | null,"module_id"?: string | null,"position"?: number,"project_id"?: string | null,"search"?: never,"title": string,"url": string
                  }
                  Update: {
                    "course_id"?: string,"created_at"?: string,"description"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["resource_kind"],"lesson_id"?: string | null,"live_session_id"?: string | null,"module_id"?: string | null,"position"?: number,"project_id"?: string | null,"search"?: never,"title"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "resources_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resources_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lesson_outline"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resources_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resources_live_session_id_fkey"
      columns: ["live_session_id"]
isOneToOne: false
      referencedRelation: "live_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resources_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "module_path"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resources_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resources_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_outline"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resources_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"submissions": {
                  Row: {
                    "created_at": string,"id": string,"notes": string,"project_id": string,"reviewed_at": string | null,"status": Database["public"]['Enums']["submission_status"],"submitted_at": string | null,"updated_at": string,"user_id": string,"work_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"notes"?: string,"project_id": string,"reviewed_at"?: string | null,"status"?: Database["public"]['Enums']["submission_status"],"submitted_at"?: string | null,"updated_at"?: string,"user_id": string,"work_url"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"notes"?: string,"project_id"?: string,"reviewed_at"?: string | null,"status"?: Database["public"]['Enums']["submission_status"],"submitted_at"?: string | null,"updated_at"?: string,"user_id"?: string,"work_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "submissions_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "project_outline"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "coding_problem_outline": {
                  Row: {
                    "course_id": string | null,"difficulty": Database["public"]['Enums']["problem_difficulty"] | null,"id": string | null,"module_id": string | null,"position": number | null,"slug": string | null,"summary": string | null,"title": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "coding_problems_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coding_problems_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "module_path"
      referencedColumns: ["id","course_id"]
    },{
      foreignKeyName: "coding_problems_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id","course_id"]
    }
                  ]
                },"lesson_outline": {
                  Row: {
                    "course_id": string | null,"duration_minutes": number | null,"id": string | null,"module_id": string | null,"position": number | null,"slug": string | null,"summary": string | null,"title": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "lessons_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lessons_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "module_path"
      referencedColumns: ["id","course_id"]
    },{
      foreignKeyName: "lessons_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id","course_id"]
    }
                  ]
                },"module_path": {
                  Row: {
                    "course_id": string | null,"description": string | null,"id": string | null,"is_published": boolean | null,"phase_id": string | null,"plan": Json | null,"position": number | null,"slug": string | null,"title": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "modules_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "modules_phase_fkey"
      columns: ["phase_id","course_id"]
isOneToOne: false
      referencedRelation: "phases"
      referencedColumns: ["id","course_id"]
    }
                  ]
                },"project_outline": {
                  Row: {
                    "course_id": string | null,"due_at": string | null,"id": string | null,"max_points": number | null,"module_id": string | null,"slug": string | null,"summary": string | null,"title": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "projects_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "module_path"
      referencedColumns: ["id","course_id"]
    },{
      foreignKeyName: "projects_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id","course_id"]
    }
                  ]
                },"quiz_outline": {
                  Row: {
                    "course_id": string | null,"description": string | null,"id": string | null,"max_attempts": number | null,"module_id": string | null,"pass_percent": number | null,"slug": string | null,"title": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "quizzes_course_id_fkey"
      columns: ["course_id"]
isOneToOne: false
      referencedRelation: "courses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quizzes_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "module_path"
      referencedColumns: ["id","course_id"]
    },{
      foreignKeyName: "quizzes_module_id_course_id_fkey"
      columns: ["module_id","course_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id","course_id"]
    }
                  ]
                }
          }
          Functions: {
            "can_access_module":
{ Args: { "p_module_id": string }; Returns: boolean
                           },
"can_read_course_file":
{ Args: { "p_object_name": string }; Returns: boolean
                           },
"in_cohort":
{ Args: { "p_cohort_id": string }; Returns: boolean
                           },
"is_enrolled":
{ Args: { "p_course_id": string }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"mark_feedback_read":
{ Args: { "p_feedback_ids": (string)[] }; Returns: number
                           },
"move_lesson":
{ Args: { "p_direction": number,"p_lesson_id": string }; Returns: undefined
                           },
"move_module":
{ Args: { "p_direction": number,"p_module_id": string }; Returns: undefined
                           },
"move_quiz_question":
{ Args: { "p_direction": number,"p_question_id": string }; Returns: undefined
                           },
"problem_editorial":
{ Args: { "p_problem_id": string }; Returns: {
              "editorial_md": string,"reference_solution": string
            }[]
                           },
"public_course_outline":
{ Args: { "p_slug": string }; Returns: Json
                           },
"save_quiz_question":
{ Args: { "p_correct": Json,"p_explanation_md": string,"p_options": Json,"p_points": number,"p_prompt_md": string,"p_question_id": string,"p_quiz_id": string,"p_type": Database["public"]['Enums']["question_type"] }; Returns: string
                           },
"search_course":
{ Args: { "p_course_id": string,"p_limit"?: number,"p_query": string }; Returns: {
              "context": string,"id": string,"kind": string,"rank": number,"slug": string,"snippet": string,"title": string,"url": string
            }[]
                           },
"take_rate_limit":
{ Args: { "p_bucket": string,"p_key_hash": string,"p_limit": number,"p_window_seconds": number }; Returns: boolean
                           },
"valid_profile_links":
{ Args: { "p_links": Json }; Returns: boolean
                           }
          }
          Enums: {
            "code_submission_status": "draft"|"submitted","code_verdict": "not_evaluated"|"passed"|"failed"|"error","cohort_status": "planned"|"open"|"waitlist"|"running"|"completed","enrollment_status": "active"|"paused"|"completed"|"withdrawn","enrolment_request_kind": "enrolment"|"waitlist","enrolment_request_status": "new"|"contacted"|"enrolled"|"declined","feedback_kind": "project"|"quiz"|"general","problem_difficulty": "warm_up"|"core"|"challenge","question_type": "multiple_choice"|"multiple_select"|"true_false"|"short_answer","resource_kind": "pdf"|"notebook"|"dataset"|"code"|"video"|"slides"|"reading"|"link","submission_status": "in_progress"|"submitted"|"reviewed","user_role": "student"|"instructor"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "code_submission_status": ["draft", "submitted"],"code_verdict": ["not_evaluated", "passed", "failed", "error"],"cohort_status": ["planned", "open", "waitlist", "running", "completed"],"enrollment_status": ["active", "paused", "completed", "withdrawn"],"enrolment_request_kind": ["enrolment", "waitlist"],"enrolment_request_status": ["new", "contacted", "enrolled", "declined"],"feedback_kind": ["project", "quiz", "general"],"problem_difficulty": ["warm_up", "core", "challenge"],"question_type": ["multiple_choice", "multiple_select", "true_false", "short_answer"],"resource_kind": ["pdf", "notebook", "dataset", "code", "video", "slides", "reading", "link"],"submission_status": ["in_progress", "submitted", "reviewed"],"user_role": ["student", "instructor", "admin"]
          }
        }
} as const
