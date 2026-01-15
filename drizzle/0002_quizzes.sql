-- Add quizzes table for lesson-level assessments
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_title text,
  lesson_title text NOT NULL,
  questions jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
