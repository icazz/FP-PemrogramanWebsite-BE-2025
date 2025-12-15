import z from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

const CrosswordWordSchema = z.object({
  number: z.number().int().min(1),
  direction: z.enum(['horizontal', 'vertical']),
  row_index: z.number().int().min(0),
  col_index: z.number().int().min(0),
  // Validasi jawaban: hanya huruf, uppercase, tanpa spasi (biasanya TTS tanpa spasi)
  answer: z
    .string()
    .min(1)
    .max(30)
    .trim()
    .transform(value => value.toUpperCase()),
  clue: z.string().min(1).max(500).trim(),
});

export const CreateCrosswordSchema = z.object({
  name: z.string().max(128).trim(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}).optional(),
  is_publish_immediately: StringToBooleanSchema.default(false),

  // Ukuran Grid
  rows: z.coerce.number().min(5).max(50),
  cols: z.coerce.number().min(5).max(50),

  // Array kata-kata yang sudah disusun user lewat UI Click & Drag
  words: StringToObjectSchema(z.array(CrosswordWordSchema).min(1)),
});

export type ICreateCrossword = z.infer<typeof CreateCrosswordSchema>;
