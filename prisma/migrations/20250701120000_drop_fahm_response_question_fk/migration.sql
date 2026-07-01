-- Fahm questions are served from public/data/fahm-questions.json (ids like Q1, Q2).
-- FahmResponse.questionId stores those static ids; it must not FK to FahmQuestion rows.
ALTER TABLE "FahmResponse" DROP CONSTRAINT IF EXISTS "FahmResponse_questionId_fkey";
