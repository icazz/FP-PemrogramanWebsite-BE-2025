import z from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';
import {
  base64ToBuffer,
  getExtensionFromMime,
  isBase64,
  parseDataUrl,
} from '@/utils/buffer.util';

export const SpeedSortingCategoryInputSchema = z.object({
  name: z.string().max(128).trim(),
});

export const SpeedSortingItemInputSchema = z.object({
  value: z.string(),
  category_index: z.number().int().nonnegative(),
  type: z.enum(['text', 'image']),
});

export const CreateSpeedSortingSchema = z
  .object({
    name: z.string().max(128).trim(),
    description: z.string().max(256).trim().optional(),
    thumbnail_image: fileSchema({}),
    is_published: StringToBooleanSchema.default(false),
    categories: StringToObjectSchema(
      z.array(SpeedSortingCategoryInputSchema).min(2).max(20),
    ),
    items: StringToObjectSchema(
      z.array(SpeedSortingItemInputSchema).min(1).max(1000),
    ),
  })
  .superRefine((data, context) => {
    const maxIndex = data.categories.length - 1;

    for (const [index, item] of data.items.entries()) {
      if (item.category_index > maxIndex) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'category_index'],
          message: 'category_index out of range',
        });
      }
    }
  })
  .transform(data => ({
    ...data,
    items: data.items.map((item, index) => {
      if (isBase64(item.value) && item.type === 'image') {
        const { mime, base64 } = parseDataUrl(item.value);

        const buffer = base64ToBuffer(base64);
        const extension = getExtensionFromMime(mime);

        const filename = `item-${index}.${extension}`;

        return {
          ...item,
          type: 'image' as const,
          raw_value: item.value,
          file: {
            filename,
            mimetype: mime ?? 'application/octet-stream',
            buffer,
          },
        };
      }

      return { ...item, type: 'text' as const };
    }),
  }));

export type ICreateSpeedSorting = z.infer<typeof CreateSpeedSortingSchema>;
