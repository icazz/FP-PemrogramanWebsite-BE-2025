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

import { PairOrNoPairService } from './pair-or-no-pair.service';
import {
  CreatePairOrNoPairSchema,
  EvaluateSchema,
  type ICreatePairOrNoPair,
  type IEvaluate,
  type IUpdatePairOrNoPair,
  UpdatePairOrNoPairSchema,
} from './schema';

export const PairOrNoPairController = Router()
  .post(
    '/',
    validateAuth({}),
    validateBody({
      schema: CreatePairOrNoPairSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{}, {}, ICreatePairOrNoPair>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const newGame = await PairOrNoPairService.createGame(
          request.body,
          request.user!.user_id,
        );
        const result = new SuccessResponse(
          StatusCodes.CREATED,
          'Game created',
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
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await PairOrNoPairService.getGameDetail(
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
        const game = await PairOrNoPairService.getGamePlay(
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
        const game = await PairOrNoPairService.getGamePlay(
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
      schema: UpdatePairOrNoPairSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IUpdatePairOrNoPair>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const updatedGame = await PairOrNoPairService.updateGame(
          request.body,
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Game updated',
          updatedGame,
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
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await PairOrNoPairService.deleteGame(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );

        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Game deleted successfully',
          result,
        );

        return response
          .status(successResponse.statusCode)
          .json(successResponse.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .post(
    '/:game_id/evaluate',
    validateAuth({ optional: true }),
    validateBody({ schema: EvaluateSchema }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IEvaluate>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await PairOrNoPairService.evaluateGame(
          request.body,
          request.params.game_id,
          request.user?.user_id,
        );

        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Score submitted successfully',
          result,
        );

        return response
          .status(successResponse.statusCode)
          .json(successResponse.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .get(
    '/:game_id/leaderboard',
    async (
      request: Request<{ game_id: string }, {}, {}, { difficulty?: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await PairOrNoPairService.getLeaderboard(
          request.params.game_id,
          request.query.difficulty,
        );

        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Leaderboard retrieved successfully',
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
