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

import {
  SpeedSortingCategoryInputSchema,
  SpeedSortingItemInputSchema,
} from './create-speed-sorting.schema';

export const UpdateSpeedSortingSchema = z
  .object({
    name: z.string().max(128).trim().optional(),
    description: z.string().max(256).trim().optional(),
    thumbnail_image: fileSchema({}).optional(),
    is_publish: StringToBooleanSchema.optional(),
    categories: StringToObjectSchema(
      z.array(SpeedSortingCategoryInputSchema).min(2).max(20),
    ).optional(),
    items: StringToObjectSchema(
      z.array(SpeedSortingItemInputSchema).min(1).max(1000),
    ).optional(),
  })
  .superRefine((data, context) => {
    if (!data.categories || !data.items) return;

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
    items: data.items?.map((item, index) => {
      if (isBase64(item.value) && item.type === 'image') {
        const { mime, base64 } = parseDataUrl(item.value);

        const buffer = base64ToBuffer(base64);
        const extension = getExtensionFromMime(mime);

        const filename = `item-${index}.${extension}`;

        return {
          ...item,
          type: 'image' as const,
          raw_value: item.value,
          valid_file: true,
          file: {
            filename,
            mimetype: mime ?? 'application/octet-stream',
            buffer,
          },
        };
      }

      return {
        ...item,
        type: item.type,
        raw_value: null,
        file: null,
        valid_file: false,
      };
    }),
  }));
export type IUpdateSpeedSorting = z.infer<typeof UpdateSpeedSortingSchema>;
