import { Prisma } from '@prisma/client';
import { type NextFunction, type Request, type Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ErrorResponse } from '../../../../common/response';
import { AirplaneService } from './airplane.service';

interface RequestWithUser extends Request {
  user?: {
    user_id?: string;
    id?: string;
    sub?: string;
  };
}

interface CreateGameBody {
  title: string;
  description: string;
  game_data?: string | object;
}

interface UpdateGameBody {
  title?: string;
  description?: string;
  game_data?: string | object;
  is_published?: string | boolean;
  is_publish?: string | boolean;
}

export class AirplaneController {
  static async create(
    request: Request,
    response: Response,
    next: NextFunction,
  ) {
    try {
      const { user } = request as RequestWithUser;
      const creatorId = user?.user_id || user?.id || user?.sub;

      if (!creatorId) {
        throw new ErrorResponse(
          StatusCodes.UNAUTHORIZED,
          'Unauthorized: No User ID',
        );
      }

      const thumbnailFile = request.file;

      if (!thumbnailFile) {
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Thumbnail image is required',
        );
      }

      const body = request.body as CreateGameBody;
      const { title, description } = body;

      let gameDataPayload: Prisma.JsonObject = {};

      try {
        const rawGameData = body.game_data;

        if (typeof rawGameData === 'string') {
          gameDataPayload = JSON.parse(rawGameData) as Prisma.JsonObject;
        } else if (typeof rawGameData === 'object') {
          gameDataPayload = rawGameData as Prisma.JsonObject;
        }
      } catch {
        gameDataPayload = {};
      }

      const result = await AirplaneService.create(
        {
          title,
          description,
          game_data: gameDataPayload,
          thumbnail_image: thumbnailFile,
        },
        creatorId,
      );

      response.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Airplane game created successfully',
        data: result,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return response.status(StatusCodes.CONFLICT).json({
          status: false,
          message:
            'Game with this title already exists. Please choose another title.',
        });
      }

      next(error);
    }
  }

  static async findAll(
    request: Request,
    response: Response,
    next: NextFunction,
  ) {
    try {
      const result = await AirplaneService.findAll(request);
      response.status(StatusCodes.OK).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async findOne(
    request: Request,
    response: Response,
    next: NextFunction,
  ) {
    try {
      const result = await AirplaneService.findOne(request.params.id);
      response.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async update(
    request: Request,
    response: Response,
    next: NextFunction,
  ) {
    try {
      const { user } = request as RequestWithUser;
      const creatorId = user?.user_id || user?.id;

      const thumbnailFile = request.file;

      let gameDataPayload: Prisma.JsonObject | undefined;
      const body = request.body as UpdateGameBody;

      if (body.game_data) {
        try {
          gameDataPayload =
            typeof body.game_data === 'string'
              ? (JSON.parse(body.game_data) as Prisma.JsonObject)
              : (body.game_data as Prisma.JsonObject);
        } catch {
          // Ignore
        }
      }

      let isPublished: boolean | undefined;

      if (body.is_published !== undefined) {
        isPublished = String(body.is_published) === 'true';
      } else if (body.is_publish !== undefined) {
        isPublished = String(body.is_publish) === 'true';
      }

      const payload = {
        title: body.title,
        description: body.description,
        game_data: gameDataPayload,
        is_published: isPublished,
      };

      const result = await AirplaneService.update(
        request.params.id,
        payload,
        creatorId as string,
        thumbnailFile,
      );
      response.status(StatusCodes.OK).json({
        success: true,
        message: 'Game updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(
    request: Request,
    response: Response,
    next: NextFunction,
  ) {
    try {
      const { user } = request as RequestWithUser;
      const creatorId = user?.user_id || user?.id;

      await AirplaneService.delete(request.params.id, creatorId as string);
      response
        .status(StatusCodes.OK)
        .json({ success: true, message: 'Game deleted successfully' }); //delete
    } catch (error) {
      next(error);
    }
  }

  static async play(request: Request, response: Response, next: NextFunction) {
    try {
      await AirplaneService.play(request.params.id);
      response
        .status(StatusCodes.OK)
        .json({ success: true, message: 'Play count updated' });
    } catch (error) {
      next(error);
    }
  }
}
