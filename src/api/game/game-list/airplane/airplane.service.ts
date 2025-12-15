import { type Prisma } from '@prisma/client';
import { type Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import { v4 as uuidv4 } from 'uuid';

import { FileManager } from '@/utils';

import { prisma } from '../../../../common/config';
import { ErrorResponse } from '../../../../common/response';
import { type ICreateAirplane } from './schema/create-airplane.schema';
import { type IUpdateAirplane } from './schema/update-airplane.schema';

interface ICreateAirplaneParameters extends ICreateAirplane {
  thumbnail_image: Express.Multer.File;
}

// FIX: Kita extend interface update untuk mengakui keberadaan 'is_published'
interface IUpdateAirplaneParameters extends IUpdateAirplane {
  is_published?: string | boolean;
}

export class AirplaneService {
  static async create(data: ICreateAirplaneParameters, creatorId: string) {
    const template = await prisma.gameTemplates.findUnique({
      where: { slug: 'airplane' },
    });

    if (!template) {
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Game template "airplane" not found',
      );
    }

    const newGameId = uuidv4();

    let fileContent: unknown;

    if (data.thumbnail_image.buffer) {
      fileContent = data.thumbnail_image.buffer;
    } else if (data.thumbnail_image.path) {
      fileContent = await Bun.file(data.thumbnail_image.path).arrayBuffer();
    } else {
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'File upload failed: No buffer or path found.',
      );
    }

    const fileToUpload = new File(
      [fileContent as BlobPart],
      data.thumbnail_image.originalname,
      { type: data.thumbnail_image.mimetype },
    );

    const thumbnailImagePath = await FileManager.upload(
      `game/airplane/${newGameId}`,
      fileToUpload,
    );

    return prisma.games.create({
      data: {
        id: newGameId,
        name: data.title,
        description: data.description || '',
        thumbnail_image: thumbnailImagePath,
        game_json: data.game_data as unknown as Prisma.InputJsonValue,
        creator_id: creatorId,
        game_template_id: template.id,
        is_published: true,
        total_played: 0,
      },
      select: {
        id: true,
      },
    });
  }

  static async findAll(request: Request) {
    const { page = 1, limit = 10, search } = request.query;
    const skip = (Number(page) - 1) * Number(limit);

    const template = await prisma.gameTemplates.findUnique({
      where: { slug: 'airplane' },
    });

    const where: Prisma.GamesWhereInput = {
      game_template_id: template?.id,
      name: { contains: search as string, mode: 'insensitive' },
    };

    const [data, total] = await Promise.all([
      prisma.games.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { created_at: 'desc' },
        include: { creator: { select: { username: true } } },
      }),
      prisma.games.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        last_page: Math.ceil(total / Number(limit)),
      },
    };
  }

  static async findOne(id: string) {
    const game = await prisma.games.findFirst({
      where: { id },
      include: { creator: { select: { username: true } } },
    });

    if (!game) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    return game;
  }

  static async update(
    id: string,
    data: IUpdateAirplaneParameters,
    creatorId: string,
    thumbnailFile?: Express.Multer.File,
  ) {
    const game = await prisma.games.findFirst({
      where: { id, creator_id: creatorId },
    });

    if (!game) {
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Game not found or you are not the creator',
      );
    }

    // --- FIX: Handle is_published logic ---
    let isPublished = game.is_published;

    if (data.is_published !== undefined) {
      // FIX LINTER: Gunakan Ternary Operator daripada if-else sederhana
      isPublished =
        typeof data.is_published === 'string'
          ? data.is_published === 'true'
          : Boolean(data.is_published);
    }

    const updateData: Record<string, unknown> = {
      name: data.title,
      description: data.description,
      is_published: isPublished,
      game_json: data.game_data
        ? (data.game_data as unknown as Prisma.InputJsonValue)
        : undefined,
    };

    if (thumbnailFile) {
      let fileContent: unknown;

      if (thumbnailFile.buffer) {
        fileContent = thumbnailFile.buffer;
      } else if (thumbnailFile.path) {
        fileContent = await Bun.file(thumbnailFile.path).arrayBuffer();
      } else {
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'File upload failed: No buffer or path found.',
        );
      }

      const fileToUpload = new File(
        [fileContent as BlobPart],
        thumbnailFile.originalname,
        { type: thumbnailFile.mimetype },
      );

      const newThumbnailPath = await FileManager.upload(
        `game/airplane/${id}`,
        fileToUpload,
      );

      updateData.thumbnail_image = newThumbnailPath;
    }

    for (const key of Object.keys(updateData)) {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    }

    return prisma.games.update({
      where: { id },
      data: updateData as Prisma.GamesUpdateInput,
      select: {
        id: true,
      },
    });
  }

  static async delete(id: string, creatorId: string) {
    const game = await prisma.games.findFirst({
      where: { id, creator_id: creatorId },
    });

    if (!game) {
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Game not found or you are not the creator',
      );
    }

    return prisma.games.delete({
      where: { id },
    });
  }

  static async play(id: string) {
    return prisma.games.update({
      where: { id },
      data: {
        total_played: { increment: 1 },
      },
    });
  }
}
