import z from 'zod';

import {
  fileArraySchema,
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

import {
  ImageQuizQuestionSchema, // Digunakan sebagai base type
} from './create-image-quiz.schema';

// 1. Skema Pertanyaan Update (Memperbolehkan string path lama atau number index baru)
export const UpdateImageQuizQuestionSchema = ImageQuizQuestionSchema.extend({
  // question_image_array_index diizinkan berupa index file baru (number)
  // ATAU path file lama yang tidak berubah (string)
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

    // Flag publikasi (is_publish)
    is_publish: StringToBooleanSchema.optional(),

    // Flag Randomization
    is_question_randomized: StringToBooleanSchema.optional(),
    is_answer_randomized: StringToBooleanSchema.optional(),

    // [DIHAPUS]: base_score, time_limit, dll.

    // File yang akan diupload (untuk pertanyaan baru)
    files_to_upload: fileArraySchema({
      max_size: 5 * 1024 * 1024,
      min_amount: 1,
      max_amount: 20,
    }).optional(),

    // Questions (Jika diupdate, harus kirim array lengkap)
    questions: StringToObjectSchema(
      z.array(UpdateImageQuizQuestionSchema).min(1).max(20),
    ).optional(),
  })
  .partial(); // Membuat semua field di skema utama menjadi opsional (partial)

export type IUpdateImageQuiz = z.infer<typeof UpdateImageQuizSchema>;
