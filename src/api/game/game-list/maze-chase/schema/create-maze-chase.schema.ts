import z from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

export const MazeChaseAnswerSchema = z.object({
  answer_text: z.string().max(512).trim(),
  is_correct: z.boolean(),
});

export const MazeChaseQuestionSchema = z.object({
  question_text: z.string().max(2000).trim(),
  answers: z.array(MazeChaseAnswerSchema).min(4).max(4),
});

export const CreateMazeChaseSchema = z.object({
  name: z.string().max(128).trim(),
  description: z.string().max(256).trim(),
  thumbnail_image: fileSchema({}),
  map_id: z.string().max(128).trim(),
  countdown: z.coerce.number().min(0).max(60),
  is_publish_immediately: StringToBooleanSchema.default(false),
  is_question_randomized: StringToBooleanSchema.default(false),
  is_answer_randomized: StringToBooleanSchema.default(false),
  score_per_question: z.coerce.number().min(1).max(1000),
  questions: StringToObjectSchema(
    z.array(MazeChaseQuestionSchema).min(1).max(20),
  ),
});

export type ICreateMazeChase = z.infer<typeof CreateMazeChaseSchema>;
