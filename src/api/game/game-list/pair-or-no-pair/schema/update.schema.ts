import z from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

const PairItemSchema = z.object({
  left_content: z.string().min(1, 'Left content is required'),
  right_content: z.string().min(1, 'Right content is required'),
});

export const UpdatePairOrNoPairSchema = z.object({
  name: z.string().max(128).trim().optional(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}).optional(),
  is_publish: StringToBooleanSchema.optional(),
  items: StringToObjectSchema(z.array(PairItemSchema).min(2)).optional(),
});

export type IUpdatePairOrNoPair = z.infer<typeof UpdatePairOrNoPairSchema>;
