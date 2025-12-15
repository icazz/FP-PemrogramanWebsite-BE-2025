import z from 'zod';

import { OrderBySchema } from '@/common';

const pageSchema = z
  .preprocess(
    value => (value === '' || value === '0' ? undefined : value),
    z.coerce.number().min(1).max(99).optional(),
  )
  .default(1);
const perPageSchema = z
  .preprocess(
    value => (value === '' || value === '0' ? undefined : value),
    z.coerce.number().min(1).max(999).optional(),
  )
  .default(20);

export const GamePaginateQuerySchema = z.object({
  page: pageSchema,
  perPage: perPageSchema,
  search: z.string().max(256).optional(),
  gameTypeSlug: z.string().max(32).toLowerCase().optional(),
  orderByName: OrderBySchema,
  orderByCreatedAt: OrderBySchema,
  orderByLikeAmount: OrderBySchema,
  orderByPlayAmount: OrderBySchema,
});

export type IGamePaginateQuery = z.infer<typeof GamePaginateQuerySchema>;
