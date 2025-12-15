import { Router } from 'express';

import { validateAuth } from '../../../../common/middleware';
import { upload } from '../../../../common/middleware/upload.middleware';
import { AirplaneController } from './airplane.controller';

const airplaneRouter = Router();

airplaneRouter.get('/', (request, response, next) =>
  AirplaneController.findAll(request, response, next),
);

airplaneRouter.get('/:id', (request, response, next) =>
  AirplaneController.findOne(request, response, next),
);

airplaneRouter.post(
  '/',
  validateAuth({}),
  upload.single('thumbnail_image'),
  (request, response, next) =>
    AirplaneController.create(request, response, next),
);

airplaneRouter.put(
  '/:id',
  validateAuth({}),
  upload.single('thumbnail_image'),
  (request, response, next) =>
    AirplaneController.update(request, response, next),
);

airplaneRouter.patch(
  '/:id',
  validateAuth({}),
  upload.single('thumbnail_image'),
  (request, response, next) =>
    AirplaneController.update(request, response, next),
);

airplaneRouter.delete('/:id', validateAuth({}), (request, response, next) =>
  AirplaneController.delete(request, response, next),
);

// Endpoint Play Count (Public)
airplaneRouter.post('/:id/play', (request, response, next) =>
  AirplaneController.play(request, response, next),
);

// eslint-disable-next-line import/no-default-export
export default airplaneRouter;
