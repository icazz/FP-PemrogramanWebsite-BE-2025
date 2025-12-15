import type z from 'zod';

import { fileSchema, StringToBooleanSchema } from '@/common';

import { CreateCrosswordSchema } from './create-crossword.schema';

// Kita extend partial dari create schema
export const UpdateCrosswordSchema = CreateCrosswordSchema.partial().extend({
  // Override/Tambah field khusus untuk update
  thumbnail_image: fileSchema({}).optional(),

  // Tambahkan is_publish secara eksplisit agar bisa diakses di service
  // Ini menggantikan peran is_publish_immediately dari create schema untuk konteks update
  is_publish: StringToBooleanSchema.optional(),
});

export type IUpdateCrossword = z.infer<typeof UpdateCrosswordSchema>;
