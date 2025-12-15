import { type NextFunction, type Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import {
  type AuthedRequest,
  SuccessResponse,
  validateAuth,
  validateBody,
} from '@/common';

import {
  CreateSpeedSortingSchema,
  type ICreateSpeedSorting,
  type IUpdateSpeedSorting,
  UpdateSpeedSortingSchema,
} from './schema';
import { SpeedSortingService } from './speed-sorting.service';

export const SpeedSortingController = Router()
  .post(
    '/',
    validateAuth({}),
    validateBody({
      schema: CreateSpeedSortingSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{}, {}, ICreateSpeedSorting>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const newGame = await SpeedSortingService.createSpeedSorting(
          request.body,
          request.user!.user_id,
        );

        const result = new SuccessResponse(
          StatusCodes.CREATED,
          'Speed Sorting game created',
          newGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .get(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }, {}>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const data = await SpeedSortingService.getSpeedSortingGameDetail(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );

        const result = new SuccessResponse(
          StatusCodes.OK,
          'Speed Sorting game data',
          data,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .patch(
    '/:game_id',
    validateAuth({}),
    validateBody({
      schema: UpdateSpeedSortingSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IUpdateSpeedSorting>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const updated = await SpeedSortingService.updateSpeedSorting(
          request.params.game_id,
          request.body,
          {
            user_id: request.user!.user_id,
            role: request.user!.role,
          },
        );

        const result = new SuccessResponse(
          StatusCodes.OK,
          'Speed Sorting game updated',
          updated,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .get(
    '/:game_id/play',
    async (
      request: AuthedRequest<{ game_id: string }, {}>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const data = await SpeedSortingService.getSpeedSortingForPlay(
          request.params.game_id,
        );

        const result = new SuccessResponse(
          StatusCodes.OK,
          'Speed Sorting config and dataset for play',
          data,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .delete(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }, {}>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        await SpeedSortingService.deleteSpeedSorting(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );

        const result = new SuccessResponse(
          StatusCodes.OK,
          'Speed Sorting game deleted',
          null,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  );
