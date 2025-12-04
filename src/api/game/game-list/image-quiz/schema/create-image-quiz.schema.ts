import z from 'zod';

import {
  fileArraySchema,
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

// 1. Skema Jawaban
export const ImageQuizAnswerSchema = z.object({
  answer_id: z.string().uuid(),
  answer_text: z.string().max(512).trim(),
});

// 2. Skema Pertanyaan
export const ImageQuizQuestionSchema = z.object({
  question_id: z.string().uuid(),
  question_text: z.string().max(2000).trim(),
  question_image_array_index: z.coerce.number().min(0).max(20),
  correct_answer_id: z.string().uuid(),
  answers: z.array(ImageQuizAnswerSchema).min(3).max(6),
});

// 3. Skema Utama (Perhatikan field yang DIHAPUS)
export const CreateImageQuizSchema = z.object({
  name: z.string().max(128).trim(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}),
  is_publish_immediately: StringToBooleanSchema.default(false),
  is_question_randomized: StringToBooleanSchema.default(false),
  is_answer_randomized: StringToBooleanSchema.default(false),

  files_to_upload: fileArraySchema({
    max_size: 5 * 1024 * 1024,
    min_amount: 1,
    max_amount: 20,
  }).optional(),

  questions: StringToObjectSchema(
    z.array(ImageQuizQuestionSchema).min(1).max(20),
  ),
});

export type ICreateImageQuiz = z.infer<typeof CreateImageQuizSchema>;
export type ICreateImageQuizQuestion = z.infer<typeof ImageQuizQuestionSchema>;
