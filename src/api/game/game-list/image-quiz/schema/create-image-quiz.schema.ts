import z from 'zod';

import {
  fileArraySchema,
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

// 1. Skema Jawaban
export const ImageQuizAnswerSchema = z.object({
  // Kita gunakan validasi string biasa dulu agar mudah dites, nanti backend generate UUID
  // ATAU: Gunakan valid UUID jika frontend generate UUID
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

  // [DIHAPUS]: base_score, time_limit, tile_count, reveal_interval
  // Karena semua ini sekarang diatur MUTLAK di Service.

  files_to_upload: fileArraySchema({
    max_size: 5 * 1024 * 1024,
    min_amount: 1,
    max_amount: 20,
  }).optional(),

  // StringToObjectSchema penting agar JSON string dari form-data diubah jadi Object
  questions: StringToObjectSchema(
    z.array(ImageQuizQuestionSchema).min(1).max(20),
  ),
});

export type ICreateImageQuiz = z.infer<typeof CreateImageQuizSchema>;
// Tambahkan export untuk Type Question agar Service tidak error
export type ICreateImageQuizQuestion = z.infer<typeof ImageQuizQuestionSchema>;
