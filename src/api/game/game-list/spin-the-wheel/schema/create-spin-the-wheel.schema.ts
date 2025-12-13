import { z } from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

export const QuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).length(4),
  answerIndex: z.number().int().min(0).max(3),
});

export const CreateSpinTheWheelSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  thumbnail_image: fileSchema({}),
  is_publish_immediately: StringToBooleanSchema.default(false),
  questions: StringToObjectSchema(z.array(QuestionSchema).min(1)),
  totalRounds: z.coerce.number().int().min(1).default(5),
});

export type ICreateSpinTheWheel = z.infer<typeof CreateSpinTheWheelSchema>;
