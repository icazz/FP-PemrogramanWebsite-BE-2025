import { type NextFunction, type Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import {
  type AuthedRequest,
  SuccessResponse,
  validateAuth,
  validateBody,
} from '@/common';

import { CrosswordService } from './crossword.service';
import {
  CheckCrosswordAnswerSchema,
  CreateCrosswordSchema,
  type ICheckCrosswordAnswer,
  type ICreateCrossword,
  type IUpdateCrossword,
  UpdateCrosswordSchema,
} from './schema';

export const CrosswordController = Router()
  // CREATE
  .post(
    '/',
    validateAuth({}),
    validateBody({
      schema: CreateCrosswordSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{}, {}, ICreateCrossword>,
      response_: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await CrosswordService.createCrossword(
          request.body,
          request.user!.user_id,
        );
        const response = new SuccessResponse(
          StatusCodes.CREATED,
          'Crossword created',
          result,
        );

        return response_.status(response.statusCode).json(response.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // GET DETAIL (Khusus Creator - CRUD Read)
  .get(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response_: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await CrosswordService.getCrosswordDetail(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Game details retrieved',
          result,
        );

        return response_
          .status(successResponse.statusCode)
          .json(successResponse.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // PLAY (Public)
  .get(
    '/:game_id/play/public',
    async (
      request: AuthedRequest<{ game_id: string }>,
      response_: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await CrosswordService.getCrosswordPlay(
          request.params.game_id,
          true,
        );
        const response = new SuccessResponse(
          StatusCodes.OK,
          'Game data retrieved',
          result,
        );

        return response_.status(response.statusCode).json(response.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // PLAY (Private / Preview)
  .get(
    '/:game_id/play/private',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response_: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await CrosswordService.getCrosswordPlay(
          request.params.game_id,
          false,
          request.user!.user_id,
          request.user!.role,
        );
        const response = new SuccessResponse(
          StatusCodes.OK,
          'Private game data retrieved',
          result,
        );

        return response_.status(response.statusCode).json(response.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // UPDATE (Fitur Baru)
  .patch(
    '/:game_id',
    validateAuth({}),
    validateBody({
      schema: UpdateCrosswordSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IUpdateCrossword>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await CrosswordService.updateCrossword(
          request.params.game_id,
          request.body,
          request.user!.user_id,
          request.user!.role,
        );
        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Game updated successfully',
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

  // CHECK ANSWER (Untuk validasi Merah/Hijau)
  .post(
    '/:game_id/check',
    // Optional auth: User tamu bisa main, tapi jika mau fitur tertentu bisa diwajibkan login nanti
    validateAuth({ optional: true }),
    validateBody({ schema: CheckCrosswordAnswerSchema }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, ICheckCrosswordAnswer>,
      response_: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await CrosswordService.checkAnswer(
          request.params.game_id,
          request.body,
        );
        const response = new SuccessResponse(
          StatusCodes.OK,
          'Answer checked',
          result,
        );

        return response_.status(response.statusCode).json(response.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // DELETE
  .delete(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response_: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await CrosswordService.deleteGame(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const response = new SuccessResponse(
          StatusCodes.OK,
          'Game deleted',
          result,
        );

        return response_.status(response.statusCode).json(response.json());
      } catch (error) {
        return next(error);
      }
    },
  );
