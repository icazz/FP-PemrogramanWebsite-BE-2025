import z from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

const TrueOrFalseQuestionSchema = z.object({
  questionText: z.string().min(1),
  correctAnswer: z.enum(['A', 'B']),
});

const TrueOrFalseGameJsonSchema = z.object({
  countdown: z.number().min(1),
  choices: z.object({
    A: z.string().min(1),
    B: z.string().min(1),
  }),
  questions: z.array(TrueOrFalseQuestionSchema).min(1).max(10),
});

export const UpdateTrueOrFalseSchema = z.object({
  name: z.string().max(128).trim().optional(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}).optional(),
  is_published: StringToBooleanSchema.optional(),
  game_json: StringToObjectSchema(TrueOrFalseGameJsonSchema).optional(),
});

export type IUpdateTrueOrFalse = z.infer<typeof UpdateTrueOrFalseSchema>;
