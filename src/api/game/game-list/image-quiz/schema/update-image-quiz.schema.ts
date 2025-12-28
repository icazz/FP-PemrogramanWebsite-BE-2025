import z from 'zod';

import {
  fileArraySchema,
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

// [PENTING] Import 'ImageQuizQuestionShape' (Shape Dasar), BUKAN Schema
import { ImageQuizQuestionShape } from './create-image-quiz.schema';

// 1. Skema Pertanyaan Update
// Kita extend dari SHAPE agar tidak error "refinement cannot be extended"
export const UpdateImageQuizQuestionSchema = ImageQuizQuestionShape.extend({
  // Override field ini agar bisa menerima string (URL gambar lama) atau number (Index gambar baru)
  question_image_array_index: z
    .union([z.coerce.number().min(0).max(20), z.string().max(512)])
    .optional(),
}).partial(); // .partial() membuat semua field (question_text, dll) jadi opsional

// 2. Skema Utama Update
export const UpdateImageQuizSchema = z
  .object({
    name: z.string().max(128).trim().optional(),
    description: z.string().max(256).trim().optional(),
    thumbnail_image: fileSchema({}).optional(),

    is_publish: StringToBooleanSchema.optional(),

    is_question_randomized: StringToBooleanSchema.optional(),
    is_answer_randomized: StringToBooleanSchema.optional(),
    theme: z
      .enum(['adventure', 'family100', 'ocean'])
      .default('family100')
      .optional(),

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
