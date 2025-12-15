import z from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

const TypeSpeedTextSchema = z.object({
  content: z.string().min(10).max(500).trim(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export const CreateTypeSpeedSchema = z.object({
  name: z.string().max(128).trim(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}),
  is_publish_immediately: StringToBooleanSchema.default(false),
  time_limit: z.coerce.number().min(30).max(300),
  texts: StringToObjectSchema(z.array(TypeSpeedTextSchema).min(3).max(20)),
});

export type ICreateTypeSpeed = z.infer<typeof CreateTypeSpeedSchema>;
