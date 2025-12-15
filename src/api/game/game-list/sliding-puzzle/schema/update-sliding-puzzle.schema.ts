import z from 'zod';

import { fileSchema, StringToBooleanSchema } from '@/common';

export const UpdateSlidingPuzzleSchema = z.object({
  name: z.string().max(128).trim().optional(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}).optional(),
  is_published: StringToBooleanSchema.optional(),
  puzzle_image: fileSchema({
    max_size: 5 * 1024 * 1024,
  }).optional(),
  grid_size: z.coerce.number().min(3).max(6).optional(),
  time_limit: z.coerce.number().min(60).max(3600).optional(),
  max_hint_percent: z.coerce.number().min(0).max(100).optional(),
});

export type IUpdateSlidingPuzzle = z.infer<typeof UpdateSlidingPuzzleSchema>;
