import { type Prisma } from '@prisma/client';
import { type NextFunction, type Request, type Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import multer from 'multer';
import { v4 } from 'uuid';

import {
  type AuthedRequest,
  ErrorResponse,
  prisma,
  SuccessResponse,
} from '@/common';
import { FileManager } from '@/utils';

import { updateOpenTheBoxSchema } from './schema';

interface ICreateOpenTheBoxBody {
  name: string;
  description: string;
  thumbnail_image: Express.Multer.File;
  gameData: Record<string, unknown>;
  is_publish_immediately?: boolean | string;
}

export const createOpenTheBox = async (
  request: AuthedRequest<unknown, unknown, unknown>,
  response: Response,
  next: NextFunction,
) => {
  try {
    const body = request.body as ICreateOpenTheBoxBody;

    const {
      name,
      description,
      thumbnail_image: thumbnailImage,
      gameData,
      is_publish_immediately: isPublishImmediately,
    } = body;

    const userId = request.user!.user_id;

    const template = await prisma.gameTemplates.findUnique({
      where: { slug: 'open-the-box' },
    });

    if (!template) {
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Template Open the Box not found',
      );
    }

    const newGameId = v4();

    const thumbnailImagePath = await FileManager.upload(
      `game/open-the-box/${newGameId}`,
      thumbnailImage,
    );

    const newGame = await prisma.games.create({
      data: {
        id: newGameId,
        name,
        description,
        thumbnail_image: thumbnailImagePath,
        creator_id: userId,
        game_template_id: template.id,
        is_published: Boolean(isPublishImmediately) || false,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        game_json: gameData as Prisma.InputJsonValue,
      },
    });

    const result = new SuccessResponse(
      StatusCodes.CREATED,
      'Open the Box game created successfully',
      newGame,
    );

    return response.status(result.statusCode).json(result.json());
  } catch (error) {
    return next(error);
  }
};

interface IUpdateData {
  name?: string;
  description?: string;
  gameData?: unknown;
  is_publish?: string | boolean;
  [key: string]: unknown;
}

export const updateOpenTheBox = async (
  request: AuthedRequest<unknown, unknown, Record<string, unknown>>,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params as { id: string };
    const userId = request.user!.user_id;

    let updateData: IUpdateData = request.body as IUpdateData;

    // If request.body is empty and it's multipart/form-data, parse manually
    if (
      (!updateData || Object.keys(updateData).length === 0) &&
      request.headers['content-type']?.includes('multipart/form-data')
    ) {
      const upload = multer({ storage: multer.memoryStorage() });

      // Use multer to parse the form data
      await new Promise<void>((resolve, reject) => {
        upload.any()(request, response, (error: unknown) => {
          if (error) {
            // FIX 1: Menghindari String(error) pada unknown object
            // Menggunakan pesan manual jika bukan Error object
            reject(
              error instanceof Error
                ? error
                : new Error('An error occurred during file upload'),
            );
          } else {
            resolve();
          }
        });
      });

      updateData = { ...request.body } as IUpdateData;

      if (request.files && Array.isArray(request.files)) {
        const files = request.files;

        for (const file of files) {
          if (file.fieldname) {
            updateData[file.fieldname] = file;
          }
        }
      }
    }

    const validationResult = updateOpenTheBoxSchema.safeParse(updateData);

    if (!validationResult.success) {
      throw new ErrorResponse(
        StatusCodes.UNPROCESSABLE_ENTITY,
        `Validation error: ${validationResult.error.message}`,
      );
    }

    const validatedData = validationResult.data;

    console.log('=== UPDATE OPEN THE BOX ===');
    console.log('ID:', id);
    console.log('User ID:', userId);

    const game = await prisma.games.findUnique({
      where: { id },
    });

    if (!game) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    if (game.creator_id !== userId) {
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You can only update your own games',
      );
    }

    const updateFields: Prisma.GamesUpdateInput = {};

    if (validatedData.name !== undefined) {
      updateFields.name = validatedData.name;
    }

    if (validatedData.description !== undefined) {
      updateFields.description = validatedData.description;
    }

    if (validatedData.gameData !== undefined) {
      // FIX 2: Menggunakan Prisma.InputJsonValue menggantikan 'any'
      // Ini aman secara tipe data untuk kolom JSON di database
      updateFields.game_json = validatedData.gameData as Prisma.InputJsonValue;
    }

    if (validatedData.is_publish !== undefined) {
      const isPublishValue = validatedData.is_publish;
      updateFields.is_published =
        isPublishValue === 'true' ||
        isPublishValue === true ||
        isPublishValue === '1';

      console.log(
        'Setting is_published to:',
        updateFields.is_published,
        'from input:',
        isPublishValue,
      );
    }

    console.log('Update fields:', updateFields);

    const updatedGame = await prisma.games.update({
      where: { id },
      data: updateFields,
      select: {
        id: true,
        name: true,
        is_published: true,
        updated_at: true,
      },
    });

    console.log('=== UPDATE RESULT ===');
    console.log('Update fields applied:', updateFields);
    console.log('Updated game result:', updatedGame);

    const result = new SuccessResponse(
      StatusCodes.OK,
      'Open the Box game updated successfully',
      updatedGame,
    );

    return response.status(result.statusCode).json(result.json());
  } catch (error) {
    console.error('UpdateOpenTheBox error:', error);

    return next(error);
  }
};

export const getOpenTheBoxDetail = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;

    const game = await prisma.games.findUnique({
      where: { id },
      include: {
        creator: {
          select: { username: true, id: true },
        },
        game_template: true,
      },
    });

    if (!game) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    const result = new SuccessResponse(
      StatusCodes.OK,
      'Get game detail successfully',
      game,
    );

    return response.status(result.statusCode).json(result.json());
  } catch (error) {
    return next(error);
  }
};

export const deleteOpenTheBox = async (
  request: AuthedRequest,
  response: Response,
  next: NextFunction,
) => {
  try {
    const { id } = request.params;
    const userId = request.user!.user_id;

    const game = await prisma.games.findUnique({
      where: { id },
    });

    if (!game) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    if (game.creator_id !== userId) {
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You can only delete your own games',
      );
    }

    await prisma.games.delete({
      where: { id },
    });

    const result = new SuccessResponse(
      StatusCodes.OK,
      'Open the Box game deleted successfully',
    );

    return response.status(result.statusCode).json(result.json());
  } catch (error) {
    return next(error);
  }
};
