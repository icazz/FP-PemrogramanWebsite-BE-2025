import z from 'zod';

import {
  fileArraySchema,
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

//soal anagram hanya perlu memerlukan gambar (petunjuk) dan jawaban yang benar
export const AnagramQuestionSchema = z.object({
  //jawaban yang benar (kata)
  correct_word: z.string().min(2).max(50).trim(),
  //index file yang wajib karena gambar adalah petunjuk utama
  question_image_array_index: z.coerce.number().min(0).max(20),
});

//schema untuk membuat game anagram
export const CreateAnagramSchema = z.object({
  name: z.string().max(128).trim(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}).optional(),
  is_publish_immediately: StringToBooleanSchema.default(false),
  is_question_randomized: StringToObjectSchema(z.boolean()).default(false),

  files_to_upload: fileArraySchema({
    max_size: 10 * 1024 * 1024,
    min_amount: 1,
    max_amount: 20,
  }),

  //questions di parsing dari string JSON ke array objek
  questions: StringToObjectSchema(
    z.array(AnagramQuestionSchema).min(1).max(20),
  ),
});

export type ICreateAnagram = z.infer<typeof CreateAnagramSchema> & {
  //menambahkan file array secara manual karena zod tidak memproses file
  files_to_upload: Express.Multer.File[];
  thumbnail_image?: Express.Multer.File;
};
