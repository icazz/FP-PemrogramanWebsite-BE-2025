import { z } from 'zod';

export const CreateFindTheMatchItemSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
});

export const CreateFindTheMatchSchema = z.object({
  name: z
    .string()
    .min(1, 'Game name is required')
    .max(100, 'Name cannot be more than 100 characters'),
  description: z
    .string()
    .min(1, 'Game description is required')
    .max(2000, 'Description cannot be more than 2000 characters'),
  is_publish_immediately: z
    .union([z.boolean(), z.string()])
    .transform(value => {
      if (typeof value === 'boolean') return value;

      return value === 'true' || value === '1';
    })
    .refine(value => typeof value === 'boolean', {
      message: 'Publish status is required',
    }),
  initial_lives: z
    .union([z.number(), z.string()])
    .transform(value => {
      if (typeof value === 'number') return value;

      return Number(value);
    })
    .refine(value => !Number.isNaN(value) && value >= 1, {
      message: 'Initial lives must be at least 1',
    })
    .default(3),
  items: z
    .union([z.array(CreateFindTheMatchItemSchema), z.string()])
    .transform(value => {
      if (Array.isArray(value)) return value;

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return JSON.parse(value) as Array<{ question: string; answer: string }>;
      } catch {
        return [];
      }
    })
    .refine(
      value => Array.isArray(value) && value.length > 0,
      'At least one item (question-answer pair) is required',
    )
    .transform(value => {
      if (Array.isArray(value)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return value as Array<{ question: string; answer: string }>;
      }

      return [] as Array<{ question: string; answer: string }>;
    }),
  thumbnail_image: z.instanceof(File).optional(),
});

export type ICreateFindTheMatch = z.infer<typeof CreateFindTheMatchSchema>;
