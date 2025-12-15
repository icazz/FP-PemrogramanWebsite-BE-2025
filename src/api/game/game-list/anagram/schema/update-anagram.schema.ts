// src/api/game/game-list/anagram/schema/update-anagram.schema.ts

import z from 'zod';

import {
  fileArraySchema,
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

export const UpdateAnagramQuestionSchema = z.object({
  question_id: z.string().uuid().optional(), // Allow frontend to send existing question ID
  correct_word: z.string().min(2).max(50).trim(),

  // question_image_array_index bisa berupa:
  // 1. number: index baru dari files_to_upload
  // 2. string: URL gambar lama (yang tidak diubah)
  question_image_array_index: z
    .union([z.coerce.number().min(0).max(20), z.string().max(512)])
    .optional(),
});

/*
Semua field bersifat optional untuk update
*/
export const UpdateAnagramSchema = z.object({
  name: z.string().max(128).trim().optional(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}).optional(),
  is_publish: StringToBooleanSchema.optional(), // Untuk update status publish
  is_question_randomized: StringToBooleanSchema.optional(),

  // files_to_upload opsional, hanya dikirim jika ada gambar baru/diubah
  files_to_upload: fileArraySchema({
    max_size: 10 * 1024 * 1024,
    min_amount: 1,
    max_amount: 20,
  }).optional(),

  // Questions opsional, hanya dikirim jika ada perubahan soal
  questions: StringToObjectSchema(
    z.array(UpdateAnagramQuestionSchema).min(1).max(20),
  ).optional(),
});

export type IUpdateAnagram = z.infer<typeof UpdateAnagramSchema> & {
  // Tambahkan file Array secara manual untuk memudahkan akses di service
  files_to_upload?: Express.Multer.File[];
  thumbnail_image?: Express.Multer.File;
};
