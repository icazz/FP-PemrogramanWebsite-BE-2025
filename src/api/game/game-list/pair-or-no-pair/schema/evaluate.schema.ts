import z from 'zod';

export const EvaluateSchema = z.object({
  score: z.number().min(0, 'Score must be non-negative'),
  difficulty: z.enum(['easy', 'normal', 'hard']),
  time_taken: z.number().min(0, 'Time taken must be non-negative').optional(),
});

export type IEvaluate = z.infer<typeof EvaluateSchema>;
