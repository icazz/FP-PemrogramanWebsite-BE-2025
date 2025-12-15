import { Router } from 'express';

import { validateAuth, validateBody } from '@/common';

import {
  createOpenTheBox,
  deleteOpenTheBox,
  getOpenTheBoxDetail,
  updateOpenTheBox,
} from './controller';
import { createOpenTheBoxSchema } from './schema';

const openTheBoxRouter = Router();

openTheBoxRouter.post(
  '/',
  validateAuth({}),
  validateBody({
    schema: createOpenTheBoxSchema,
    file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
  }),
  createOpenTheBox,
);

openTheBoxRouter.get(
  '/:id',
  validateAuth({ optional: true }),
  getOpenTheBoxDetail,
);

openTheBoxRouter.patch('/:id', validateAuth({}), updateOpenTheBox);

openTheBoxRouter.delete('/:id', validateAuth({}), deleteOpenTheBox);

export const router = openTheBoxRouter;
