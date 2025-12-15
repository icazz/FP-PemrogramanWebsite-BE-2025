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
  AnswerSpinSchema,
  CreateSpinTheWheelSchema,
  FinishSpinSchema,
  type IAnswerSpin,
  type ICreateSpinTheWheel,
  type IFinishSpin,
  type IUpdateSpinTheWheel,
  UpdateSpinTheWheelSchema,
} from './schema';
import { SpinTheWheelService } from './spin-the-wheel.service';

export const SpinTheWheelController = Router()
  .post(
    '/',
    validateAuth({}),
    validateBody({
      schema: CreateSpinTheWheelSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{}, {}, ICreateSpinTheWheel>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const newGame = await SpinTheWheelService.createGame(
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
        const game = await SpinTheWheelService.getGameDetail(
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
        const game = await SpinTheWheelService.getGamePlay(
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
        const game = await SpinTheWheelService.getGamePlay(
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
      schema: UpdateSpinTheWheelSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IUpdateSpinTheWheel>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const updatedGame = await SpinTheWheelService.updateGame(
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
        const result = await SpinTheWheelService.deleteGame(
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
  // --- SPIN THE WHEEL GAMEPLAY ---
  .post(
    '/:game_id/play/spin',
    async (
      request: Request<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await SpinTheWheelService.spin(request.params.game_id);

        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Spin successful',
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
    '/:game_id/play/answer',
    validateBody({ schema: AnswerSpinSchema }),
    async (
      request: Request<{ game_id: string }, {}, IAnswerSpin>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await SpinTheWheelService.checkAnswer(
          request.params.game_id,
          request.body.questionIndex,
          request.body.answerIndex,
        );

        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Answer submitted',
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
    '/:game_id/play/finish',
    validateAuth({ optional: true }),
    validateBody({ schema: FinishSpinSchema }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IFinishSpin>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await SpinTheWheelService.finishGame(
          request.params.game_id,
          request.body,
          request.user?.user_id,
        );

        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Game finished',
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
      request: Request<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await SpinTheWheelService.getLeaderboard(
          request.params.game_id,
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
