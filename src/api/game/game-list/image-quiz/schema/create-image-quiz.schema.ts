import z from 'zod';

import {
  fileArraySchema,
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

// 1. Skema Jawaban (Tidak berubah)
export const ImageQuizAnswerSchema = z.object({
  answer_id: z.string().uuid(),
  answer_text: z.string().max(512).trim(),
});

// 2. SHAPE Pertanyaan (Hanya Struktur Dasar - TANPA .refine)
// Kita pisahkan ini agar bersih saat dipakai di type definition
export const ImageQuizQuestionShape = z.object({
  question_id: z.string().uuid(),
  question_text: z.string().max(2000).trim(),
  question_image_array_index: z.coerce.number().min(0).max(20),
  correct_answer_id: z.string().uuid(),
  answers: z.array(ImageQuizAnswerSchema).min(3).max(6),
});

// 3. SHAPE Utama (Hanya Struktur Dasar - EXPORT INI UNTUK DIPAKAI UPDATE)
// Ini adalah "Objek Polos" yang bisa di-extend oleh file lain
export const ImageQuizShape = z.object({
  name: z.string().max(128).trim(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}),
  is_publish_immediately: StringToBooleanSchema.default(false),
  is_question_randomized: StringToBooleanSchema.default(false),
  is_answer_randomized: StringToBooleanSchema.default(false),
  theme: z
    .enum(['adventure', 'family100', 'ocean'])
    .default('family100')
    .optional(),

  files_to_upload: fileArraySchema({
    max_size: 5 * 1024 * 1024,
    min_amount: 1,
    max_amount: 20,
  }).optional(),
});

// 4. Skema CREATE Akhir (Menggabungkan Shape + Validasi Logika)
export const CreateImageQuizSchema = ImageQuizShape.extend({
  // Kita pasang validasi 'correct_answer_id' di sini, khusus untuk Create
  questions: StringToObjectSchema(
    z
      .array(
        ImageQuizQuestionShape.refine(
          data =>
            data.answers.some(ans => ans.answer_id === data.correct_answer_id),
          {
            message:
              'correct_answer_id must match one of the answer_id values in answers',
            path: ['correct_answer_id'],
          },
        ),
      )
      .min(1)
      .max(20),
  ),
});

export type ICreateImageQuiz = z.infer<typeof CreateImageQuizSchema>;
// Kita pakai Shape untuk Type agar lebih fleksibel
export type ICreateImageQuizQuestion = z.infer<typeof ImageQuizQuestionShape>;
