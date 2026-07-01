import { z } from 'zod';

/** Taqwa Pulse: 1-5 score */
export const taqwaScoreSchema = z.number().int().min(1).max(5);

/** Single Fahm response */
export const fahmResponseSchema = z.object({
  questionId: z.string().min(1),
  answerIndex: z.number().int().min(0).max(3),
  weight: z.number().int().min(1).max(4),
});

/** Barakah scores: all four areas 1-5 */
export const barakahScoresSchema = z.object({
  timeScore: z.number().int().min(1).max(5),
  rizqScore: z.number().int().min(1).max(5),
  healthScore: z.number().int().min(1).max(5),
  heartScore: z.number().int().min(1).max(5),
});

/** Dua entry for creation */
export const duaEntrySchema = z.object({
  text: z.string().min(1).max(500),
  category: z.enum([
    'RIZQ',
    'HEALTH',
    'RELATIONSHIPS',
    'GUIDANCE',
    'FORGIVENESS',
    'JANNAH',
    'DUNYA',
    'CUSTOM',
  ]),
  context: z.string().max(500).optional(),
});

/** Full nightly submission */
export const ruhaniahSubmissionSchema = z.object({
  taqwaScore: taqwaScoreSchema,
  fahmResponses: z.array(fahmResponseSchema).min(1).max(3),
  barakahScores: barakahScoresSchema,
  duaEntries: z.array(duaEntrySchema).max(5).default([]),
});

export type RuhaniahSubmission = z.infer<typeof ruhaniahSubmissionSchema>;
export type FahmResponseInput = z.infer<typeof fahmResponseSchema>;
export type BarakahScores = z.infer<typeof barakahScoresSchema>;
export type DuaEntryInput = z.infer<typeof duaEntrySchema>;
