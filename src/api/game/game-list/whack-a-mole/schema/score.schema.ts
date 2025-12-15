import z from 'zod';

/**
 * Schema for saving whack-a-mole score
 */
export const SaveScoreSchema = z.object({
  score: z.coerce.number().int().min(0),
  time_taken: z.coerce.number().int().min(0).optional(),
  mode: z.enum(['normal', 'nightmare']).default('normal'),
});

export type ISaveScore = z.infer<typeof SaveScoreSchema>;
