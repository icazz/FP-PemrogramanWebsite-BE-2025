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
import { AdditionalValidation } from '@/utils';

import { GameService } from './game.service';
import { gameListRouter } from './game-list/game-list.router';
import {
  GamePaginateQuerySchema,
  GameTemplateQuerySchema,
  type IUpdateLikeCount,
  type IUpdatePlayCount,
  type IUpdatePublishStatus,
  UpdateLikeCountSchema,
  UpdatePlayCountSchema,
  UpdatePublishStatusSchema,
} from './schema';

export const GameController = Router()
  .get(
    '/',
    validateAuth({ optional: true }),
    async (request: AuthedRequest, response: Response, next: NextFunction) => {
      try {
        const query = AdditionalValidation.validate(
          GamePaginateQuerySchema,
          request.query,
        );

        const games = await GameService.getAllGame(
          query,
          false,
          undefined,
          request.user?.user_id,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get all game successfully',
          games.data,
          games.meta,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error as Error);
      }
    },
  )
  .patch(
    '/',
    validateAuth({}),
    validateBody({
      schema: UpdatePublishStatusSchema,
    }),
    async (
      request: AuthedRequest<{}, {}, IUpdatePublishStatus>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const updatedStatus = await GameService.updateGamePublishStatus(
          request.body,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Game publish status updated successfully',
          updatedStatus,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error as Error);
      }
    },
  )
  .get(
    '/private',
    validateAuth({
      allowed_roles: ['SUPER_ADMIN'],
    }),
    async (request: AuthedRequest, response: Response, next: NextFunction) => {
      try {
        const query = AdditionalValidation.validate(
          GamePaginateQuerySchema,
          request.query,
        );

        const games = await GameService.getAllGame(
          query,
          true,
          undefined,
          request.user!.user_id,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get all game (private) successfully',
          games.data,
          games.meta,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error as Error);
      }
    },
  )
  .get(
    '/user/:user_id',
    validateAuth({ optional: true }),
    async (
      request: AuthedRequest<{ user_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const query = AdditionalValidation.validate(
          GamePaginateQuerySchema,
          request.query,
        );

        const games = await GameService.getAllGame(
          query,
          false,
          request.params.user_id,
          request.user?.user_id,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get all user game successfully',
          games.data,
          games.meta,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error as Error);
      }
    },
  )
  .get(
    '/template',
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const query = AdditionalValidation.validate(
          GameTemplateQuerySchema,
          request.query,
        );
        const templates = await GameService.getAllGameTemplate(query);
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get all game template successfully',
          templates,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error as Error);
      }
    },
  )
  .post(
    '/play-count',
    validateAuth({
      optional: true,
    }),
    validateBody({
      schema: UpdatePlayCountSchema,
    }),
    async (
      request: AuthedRequest<{}, {}, IUpdatePlayCount>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        await GameService.updateGamePlayCount(
          request.body.game_id,
          request.user?.user_id,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Game play count updated successfully',
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error as Error);
      }
    },
  )
  .post(
    '/like',
    validateAuth({}),
    validateBody({
      schema: UpdateLikeCountSchema,
    }),
    async (
      request: AuthedRequest<{}, {}, IUpdateLikeCount>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        await GameService.updateGameLikeCount(
          request.body.game_id,
          request.user!.user_id,
          request.body.is_like,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'User liked game update successfully',
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error as Error);
      }
    },
  )
  .use('/game-type', gameListRouter);
