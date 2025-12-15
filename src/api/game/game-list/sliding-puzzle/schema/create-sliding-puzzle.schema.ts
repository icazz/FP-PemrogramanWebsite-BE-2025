import z from 'zod';

import { fileSchema, StringToBooleanSchema } from '@/common';

export const CreateSlidingPuzzleSchema = z.object({
  name: z.string().max(128).trim(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}),
  is_publish_immediately: StringToBooleanSchema.default(false),
  puzzle_image: fileSchema({
    max_size: 5 * 1024 * 1024, // 5MB max for puzzle image
  }),
  grid_size: z.coerce.number().min(3).max(6).default(4), // Grid size: 3x3, 4x4, 5x5, 6x6
  time_limit: z.coerce.number().min(60).max(3600).optional(), // Time limit in seconds (1 min - 1 hour)
  max_hint_percent: z.coerce.number().min(0).max(100).default(30), // Default 30%
});

export type ICreateSlidingPuzzle = z.infer<typeof CreateSlidingPuzzleSchema>;
