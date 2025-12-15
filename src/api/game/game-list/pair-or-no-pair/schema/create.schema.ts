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

export const CreatePairOrNoPairSchema = z.object({
  name: z.string().max(128).trim(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}),
  is_publish_immediately: StringToBooleanSchema.default(false),
  items: StringToObjectSchema(
    z.array(PairItemSchema).min(2, 'Minimum 2 pairs required'),
  ),
});

export type ICreatePairOrNoPair = z.infer<typeof CreatePairOrNoPairSchema>;
