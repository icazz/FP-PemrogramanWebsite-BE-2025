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

export const UpdateTypeSpeedSchema = z.object({
  name: z.string().max(128).trim().optional(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}).optional(),
  is_publish: StringToBooleanSchema.optional(),
  time_limit: z.coerce.number().min(30).max(300).optional(),
  texts: StringToObjectSchema(
    z.array(TypeSpeedTextSchema).min(3).max(20),
  ).optional(),
});

export type IUpdateTypeSpeed = z.infer<typeof UpdateTypeSpeedSchema>;
