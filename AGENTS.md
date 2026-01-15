# StudyBuddy AI — Local Postgres + OpenAI (No Docker / No AWS / No Cloudflare)

## Hard constraints
- No Docker.
- No AWS / Cloudflare.
- Run locally with my existing PostgreSQL + pgAdmin.
- OpenAI API key is available.
- Free/local-friendly choices preferred.

## Goal
Build StudyBuddy AI: Upload PDF → auto outline (modules/lessons/concepts) → flashcards + quizzes → daily 10-minute session using spaced repetition → progress tracking.
All generated learning assets must be grounded with citations (page + chunk ids).

## Tech stack (required)
App/UI:
- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui + lucide-react
- Framer Motion (flashcard transitions)
- Recharts (progress charts)
- react-pdf (pdfjs) for PDF preview + highlighting citations

Backend/Data:
- Local PostgreSQL
- pgvector extension (embeddings stored in Postgres; similarity search via vector index)
- Drizzle ORM + drizzle-kit migrations
- Zod validation for all inputs and model outputs

Jobs:
- Use pg-boss (Postgres-backed job queue). No Redis.
- Add `pnpm worker` to run the ingestion pipeline worker.

Storage:
- Store uploaded PDFs on local filesystem: ./data/uploads/{documentId}.pdf

AI:
- OpenAI API:
  - embeddings for chunks
  - generation for outline/cards/quizzes
  - optional “validator pass” to dedupe and improve card quality

## Core pages (MVP)
- /upload (upload + ingestion progress)
- /course/[id] (outline tree: modules → lessons → concepts)
- /lesson/[id] (generate/view/edit cards + quiz; show citations)
- /daily (10-min session: due cards + 1 new concept + mini quiz)
- /progress (mastery per concept + due forecast)

## Spaced repetition (SM-2)
Per user per card:
- easeFactor, intervalDays, repetitions, dueAt, lastReviewedAt
Ratings: Again / Hard / Good / Easy

## Environment variables
- DATABASE_URL=postgres://...
- OPENAI_API_KEY=...
- OPENAI_MODEL=...
- OPENAI_EMBED_MODEL=...
- DATA_DIR=./data

## Quality
- Vitest unit tests (SM-2 scheduling)
- Playwright: 1 happy-path e2e
- ESLint + Prettier