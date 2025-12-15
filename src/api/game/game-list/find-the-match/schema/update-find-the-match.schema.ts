import { z } from 'zod';

import { CreateFindTheMatchSchema } from './create-find-the-match.schema';

export const UpdateFindTheMatchSchema =
  CreateFindTheMatchSchema.partial().extend({
    is_published: z.boolean().optional(),
    initial_lives: z
      .number()
      .min(1, 'Initial lives must be at least 1')
      .optional(),
  });

export type IUpdateFindTheMatch = z.infer<typeof UpdateFindTheMatchSchema>;
