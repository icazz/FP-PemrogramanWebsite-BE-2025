import { z } from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

import { QuestionSchema } from './create-spin-the-wheel.schema';

export const UpdateSpinTheWheelSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  thumbnail_image: fileSchema({}).optional(),
  is_publish: StringToBooleanSchema.optional(),
  questions: StringToObjectSchema(z.array(QuestionSchema).min(1)).optional(),
  totalRounds: z.coerce.number().int().min(1).optional(),
});

export type IUpdateSpinTheWheel = z.infer<typeof UpdateSpinTheWheelSchema>;
