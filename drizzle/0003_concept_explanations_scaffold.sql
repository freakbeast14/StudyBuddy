-- Concept explanations + scaffold card flag
CREATE TABLE IF NOT EXISTS concept_explanations (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  explanation jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, concept_id)
);

ALTER TABLE cards
ADD COLUMN IF NOT EXISTS is_scaffold integer NOT NULL DEFAULT 0;
