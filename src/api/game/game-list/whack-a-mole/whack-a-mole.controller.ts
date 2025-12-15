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
  CreateWhackAMoleSchema,
  type ICreateWhackAMole,
  type ISaveScore,
  type IUpdateWhackAMole,
  SaveScoreSchema,
  UpdateWhackAMoleSchema,
} from './schema';
import { WhackAMoleService } from './whack-a-mole.service';
import { WhackAMoleScoreService } from './whack-a-mole-score.service';

export const WhackAMoleController = Router()
  // Create Game
  .post(
    '/',
    validateAuth({}),
    validateBody({
      schema: CreateWhackAMoleSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{}, {}, ICreateWhackAMole>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const newGame = await WhackAMoleService.createGame(
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
        next(error);
      }
    },
  )

  // Play Game (Public)
  .get(
    '/:game_id/play/public',
    async (
      request: Request<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await WhackAMoleService.getGamePlay(
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
        next(error);
      }
    },
  )

  // Play Game (Private/Preview)
  .get(
    '/:game_id/play',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await WhackAMoleService.getGamePlay(
          request.params.game_id,
          false,
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
        next(error);
      }
    },
  )

  // Publish Game
  .post(
    '/:game_id/publish',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const publishedGame = await WhackAMoleService.publishGame(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Game published',
          publishedGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        next(error);
      }
    },
  )

  // Unpublish Game
  .post(
    '/:game_id/unpublish',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const unpublishedGame = await WhackAMoleService.unpublishGame(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Game unpublished',
          unpublishedGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        next(error);
      }
    },
  )

  // Submit Score
  .post(
    '/:game_id/score',
    validateAuth({}),
    validateBody({ schema: SaveScoreSchema }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, ISaveScore>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { score, time_taken, mode } = request.body;
        const newScore = await WhackAMoleScoreService.saveScore(
          request.params.game_id,
          score,
          request.user!.user_id,
          time_taken,
          mode,
        );
        const result = new SuccessResponse(
          StatusCodes.CREATED,
          'Score saved successfully',
          newScore,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        next(error);
      }
    },
  )

  // Get Leaderboard (Per Game)
  .get(
    '/:game_id/leaderboard',
    async (
      request: Request<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const scores = await WhackAMoleScoreService.getTopScores(
          request.params.game_id,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Leaderboard retrieved successfully',
          scores,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        next(error);
      }
    },
  )

  // Update Game
  .patch(
    '/:game_id',
    validateAuth({}),
    validateBody({
      schema: UpdateWhackAMoleSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IUpdateWhackAMole>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const updatedGame = await WhackAMoleService.updateGame(
          request.params.game_id,
          request.body,
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
        next(error);
      }
    },
  )

  // Delete Game
  .delete(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        await WhackAMoleService.deleteGame(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Game deleted successfully',
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        next(error);
      }
    },
  )

  // Get Game Detail
  .get(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await WhackAMoleService.getGameDetail(
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
        next(error);
      }
    },
  );
