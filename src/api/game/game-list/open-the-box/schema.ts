import { z } from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

// Schema untuk setiap item (pertanyaan)
const openTheBoxItemSchema = z.object({
  id: z.number(),
  text: z.string().min(1, 'Question text cannot be empty'),
  options: z.array(z.string()).min(2, 'Must have at least 2 options'),
  answer: z.string().min(1, 'Answer cannot be empty'),
});

// Schema untuk Settings
const openTheBoxSettingsSchema = z.object({
  theme: z.string().default('default'),
});

// Schema Utama
export const createOpenTheBoxSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  thumbnail_image: fileSchema({}),
  game_template_slug: z.string().optional(),
  is_publish_immediately: StringToBooleanSchema.default(false),
  is_question_randomized: StringToBooleanSchema.default(false),
  is_answer_randomized: StringToBooleanSchema.default(true),
  score_per_question: z.coerce.number().min(1).max(1000).default(100),
  gameData: StringToObjectSchema(
    z.object({
      items: z
        .array(openTheBoxItemSchema)
        .min(1, 'Must have at least one question'),
      settings: openTheBoxSettingsSchema,
    }),
  ),
});

// Schema untuk Update
export const updateOpenTheBoxSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  gameData: StringToObjectSchema(
    z.object({
      items: z
        .array(openTheBoxItemSchema)
        .min(1, 'Must have at least one question'),
      settings: openTheBoxSettingsSchema,
    }),
  ).optional(),
  is_publish: StringToBooleanSchema.optional(),
});
