import { type NextFunction, type Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import {
  type AuthedRequest,
  ErrorResponse,
  SuccessResponse,
  validateAuth,
  validateBody,
} from '@/common';

import { AnagramService } from './anagram.service';
import {
  CheckAnagramAnswerSchema,
  CreateAnagramSchema,
  type ICheckAnagramAnswer,
  type ICreateAnagram,
  type IUpdateAnagram,
  UpdateAnagramSchema,
} from './schema';
import { GameIdSchema } from './schema/game-parameters.schema';

//UTILITY UNTUK VALIDASI PARAMS LANGSUNG
//fungsi utilitas disini untuk memvalidasi parameter game_id
const validateGameId = (parameters: unknown) => {
  const validationResult = GameIdSchema.safeParse(parameters);

  if (!validationResult.success) {
    throw new ErrorResponse(
      StatusCodes.BAD_REQUEST,
      'Invalid game ID format (must be UUID)',
    );
  }

  return validationResult.data.game_id;
};

export const AnagramController = Router()
  // -- POST : CREATE NEW GAME
  .post(
    '/',
    validateAuth({}),
    validateBody({
      schema: CreateAnagramSchema,
      file_fields: [
        { name: 'thumbnail_image', maxCount: 1 },
        { name: 'files_to_upload', maxCount: 20 },
      ],
    }),
    async (
      request: AuthedRequest<{}, {}, ICreateAnagram>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const newGame = await AnagramService.createAnagram(
          request.body,
          request.user!.user_id,
        );
        const result = new SuccessResponse(
          StatusCodes.CREATED,
          'Anagram game created',
          newGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // GET : DETAIL GAME (CREATOR/ADMIN ACCESS)
  .get(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        //VALIDASI PARAMETER
        const gameId = validateGameId(request.params);

        const game = await AnagramService.getAnagramGameDetail(
          gameId,
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

  // GET : PLAY PUBLIC GAME (SHUFFLED) - Requires Login
  .get(
    '/:game_id/play/public',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        //VALIDASI PARAMETER
        const gameId = validateGameId(request.params);

        const game = await AnagramService.getAnagramPlay(gameId, true);
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get public game play successfully',
          game,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // PATCH : UPDATE GAME
  .patch(
    '/:game_id',
    validateAuth({}),
    validateBody({
      schema: UpdateAnagramSchema,
      file_fields: [
        { name: 'thumbnail_image', maxCount: 1 },
        { name: 'files_to_upload', maxCount: 20 },
      ],
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IUpdateAnagram>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        //VALIDASI PARAMETER
        const gameId = validateGameId(request.params);

        const updatedGame = await AnagramService.updateAnagram(
          request.body,
          gameId,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Anagram game updated',
          updatedGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  //POST : CHECK ANSWER - Requires Login
  .post(
    '/:game_id/check',
    validateAuth({}),
    validateBody({ schema: CheckAnagramAnswerSchema }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, ICheckAnagramAnswer>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        //VALIDASI PARAMETER
        const gameId = validateGameId(request.params);

        const result = await AnagramService.checkAnagramAnswer(
          request.body,
          gameId,
        );
        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Anagram Answer checked succesfully',
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

  // DELETE : DELETE GAME
  .delete(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        //VALIDASI PARAMETER
        const gameId = validateGameId(request.params);

        const result = await AnagramService.deleteAnagram(
          gameId,
          request.user!.user_id,
          request.user!.role,
        );
        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Anagram game deleted successfully',
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
