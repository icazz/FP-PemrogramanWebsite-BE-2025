import z from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

import { MazeChaseAnswerSchema } from './create-maze-chase.schema';

export const UpdateMazeChaseQuestionSchema = z.object({
  question_text: z.string().max(2000).trim(),
  answers: z.array(MazeChaseAnswerSchema).min(4).max(4),
});

export const UpdateMazeChaseSchema = z.object({
  name: z.string().max(128).trim().optional(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}).optional(),
  map_id: z.string().max(128).trim().optional(),
  countdown: z.coerce.number().min(0).max(60).optional(),
  is_publish: StringToBooleanSchema.optional(),
  is_question_randomized: StringToBooleanSchema.optional(),
  is_answer_randomized: StringToBooleanSchema.optional(),
  score_per_question: z.coerce.number().min(1).max(1000).optional(),
  questions: StringToObjectSchema(
    z.array(UpdateMazeChaseQuestionSchema).min(1).max(20),
  ).optional(),
});

export type IUpdateMazeChase = z.infer<typeof UpdateMazeChaseSchema>;
