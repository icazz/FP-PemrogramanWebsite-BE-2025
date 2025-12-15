import { z } from 'zod';

export const PlaySpinSchema = z.object({
  // Param game_id handled by router
});

export const AnswerSpinSchema = z.object({
  questionIndex: z.number().int().min(0),
  answerIndex: z.number().int().min(0).max(3),
});

export const FinishSpinSchema = z.object({
  totalScore: z.number().int().min(0),
  totalTimeTaken: z.number().min(0),
});

export type IPlaySpin = z.infer<typeof PlaySpinSchema>;
export type IAnswerSpin = z.infer<typeof AnswerSpinSchema>;
export type IFinishSpin = z.infer<typeof FinishSpinSchema>;
