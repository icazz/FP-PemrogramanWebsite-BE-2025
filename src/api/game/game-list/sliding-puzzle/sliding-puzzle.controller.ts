import {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from 'express';
import { StatusCodes } from 'http-status-codes';

import {
  type AuthedRequest,
  SuccessResponse,
  validateAuth,
  validateBody,
} from '@/common';

import {
  CreateSlidingPuzzleSchema,
  type ICreateSlidingPuzzle,
  type IUpdateSlidingPuzzle,
  UpdateSlidingPuzzleSchema,
} from './schema';
import { SlidingPuzzleService } from './sliding-puzzle.service';

export const SlidingPuzzleController = Router()
  .post(
    '/',
    validateAuth({}),
    validateBody({
      schema: CreateSlidingPuzzleSchema,
      file_fields: [
        { name: 'thumbnail_image', maxCount: 1 },
        { name: 'puzzle_image', maxCount: 1 },
      ],
    }),
    async (
      request: AuthedRequest<{}, {}, ICreateSlidingPuzzle>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const newGame = await SlidingPuzzleService.createSlidingPuzzle(
          request.body,
          request.user!.user_id,
        );
        const result = new SuccessResponse(
          StatusCodes.CREATED,
          'Sliding Puzzle created',
          newGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        next(error);
      }
    },
  )
  .get(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await SlidingPuzzleService.getSlidingPuzzleGameDetail(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get game successfully',
          game,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .get(
    '/:game_id/play/public',
    async (
      request: Request<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await SlidingPuzzleService.getSlidingPuzzlePlay(
          request.params.game_id,
          true,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get public game successfully',
          game,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .get(
    '/:game_id/play/private',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await SlidingPuzzleService.getSlidingPuzzlePlay(
          request.params.game_id,
          false,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get private game successfully',
          game,
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
      schema: UpdateSlidingPuzzleSchema,
      file_fields: [
        { name: 'thumbnail_image', maxCount: 1 },
        { name: 'puzzle_image', maxCount: 1 },
      ],
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IUpdateSlidingPuzzle>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const updatedGame = await SlidingPuzzleService.updateSlidingPuzzle(
          request.body,
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Sliding Puzzle updated',
          updatedGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        next(error);
      }
    },
  )
  .delete(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await SlidingPuzzleService.deleteSlidingPuzzle(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );

        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Sliding Puzzle deleted successfully',
          result,
        );

        return response
          .status(successResponse.statusCode)
          .json(successResponse.json());
      } catch (error) {
        return next(error);
      }
    },
  );
