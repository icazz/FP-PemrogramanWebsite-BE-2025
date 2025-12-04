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

import { ImageQuizService } from './image-quiz.service';
import {
  CheckAnswerSchema,
  CreateImageQuizSchema,
  type ICheckAnswer,
  type ICreateImageQuiz,
} from './schema';
import {
  type IUpdateImageQuiz,
  UpdateImageQuizSchema,
} from './schema/update-image-quiz.schema';

export const ImageQuizController = Router()
  // CREATE GAME
  .post(
    '/',
    validateAuth({}),
    validateBody({
      schema: CreateImageQuizSchema,
      file_fields: [
        { name: 'thumbnail_image', maxCount: 1 },
        { name: 'files_to_upload', maxCount: 20 },
      ],
    }),
    async (
      request: AuthedRequest<{}, {}, ICreateImageQuiz>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const newGame = await ImageQuizService.createImageQuiz(
          request.body,
          request.user!.user_id,
        );
        const result = new SuccessResponse(
          StatusCodes.CREATED,
          'Image Quiz created',
          newGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        next(error);
      }
    },
  )

  // GET GAME DETAIL (Private - Admin/Creator Only)
  .get(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await ImageQuizService.getImageQuizDetail(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get game detail successfully',
          game,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // 3. DELETE GAME
  .delete(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await ImageQuizService.deleteImageQuiz(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );

        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Image Quiz deleted successfully',
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

  // 4. PLAY PUBLIC
  .get(
    '/:game_id/play/public',
    async (
      request: Request<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await ImageQuizService.getImageQuizPlay(
          request.params.game_id,
          true,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get public game data success',
          game,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // PLAY PRIVATE
  .get(
    '/:game_id/play/private',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await ImageQuizService.getImageQuizPlay(
          request.params.game_id,
          false,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get private game data success',
          game,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // UPDATE GAME
  .patch(
    '/:game_id',
    validateAuth({}),
    validateBody({
      schema: UpdateImageQuizSchema,
      file_fields: [
        { name: 'thumbnail_image', maxCount: 1 },
        { name: 'files_to_upload', maxCount: 20 },
      ],
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IUpdateImageQuiz>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const updatedGame = await ImageQuizService.updateImageQuiz(
          request.body,
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Image Quiz updated',
          updatedGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        next(error);
      }
    },
  )

  // CHECK ANSWER
  .post(
    '/:game_id/check',
    validateBody({ schema: CheckAnswerSchema }),
    async (
      request: Request<{ game_id: string }, {}, ICheckAnswer>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await ImageQuizService.checkAnswer(
          request.body,
          request.params.game_id,
        );
        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Answer validated',
          result,
        );

        return response
          .status(successResponse.statusCode)
          .json(successResponse.json());
      } catch (error) {
        next(error);
      }
    },
  );
