import z from 'zod';

import {
  fileArraySchema,
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

import { ImageQuizQuestionSchema } from './create-image-quiz.schema';

// 1. Skema Pertanyaan Update (Memperbolehkan string path lama atau number index baru)
export const UpdateImageQuizQuestionSchema = ImageQuizQuestionSchema.extend({
  question_image_array_index: z
    .union([z.coerce.number().min(0).max(20), z.string().max(512)])
    .optional(),

  // Semua field pertanyaan di-partial (opsional) untuk update
}).partial();

// 2. Skema Utama Update (Semua field bersifat opsional)
export const UpdateImageQuizSchema = z
  .object({
    name: z.string().max(128).trim().optional(),
    description: z.string().max(256).trim().optional(),
    thumbnail_image: fileSchema({}).optional(),

    is_publish: StringToBooleanSchema.optional(),

    is_question_randomized: StringToBooleanSchema.optional(),
    is_answer_randomized: StringToBooleanSchema.optional(),

    files_to_upload: fileArraySchema({
      max_size: 5 * 1024 * 1024,
      min_amount: 0,
      max_amount: 20,
    }).optional(),

    questions: StringToObjectSchema(
      z.array(UpdateImageQuizQuestionSchema).min(1).max(20),
    ).optional(),
  })
  .partial();

export type IUpdateImageQuiz = z.infer<typeof UpdateImageQuizSchema>;
