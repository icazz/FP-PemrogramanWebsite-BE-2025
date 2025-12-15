import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import { ErrorResponse, type ISlidingPuzzleJson, prisma } from '@/common';
import { FileManager } from '@/utils';

import { type ICreateSlidingPuzzle, type IUpdateSlidingPuzzle } from './schema';

export abstract class SlidingPuzzleService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static SLIDING_PUZZLE_SLUG = 'sliding-puzzle';

  static async createSlidingPuzzle(
    data: ICreateSlidingPuzzle,
    user_id: string,
  ) {
    await this.existGameCheck(data.name);

    const newPuzzleId = v4();
    const puzzleTemplateId = await this.getGameTemplateId();

    // Upload thumbnail image
    const thumbnailImagePath = await FileManager.upload(
      `game/sliding-puzzle/${newPuzzleId}`,
      data.thumbnail_image,
    );

    // Upload puzzle image
    const puzzleImagePath = await FileManager.upload(
      `game/sliding-puzzle/${newPuzzleId}`,
      data.puzzle_image,
    );

    const puzzleJson: ISlidingPuzzleJson = {
      puzzle_image: puzzleImagePath,
      grid_size: data.grid_size,
      time_limit: data.time_limit,
      max_hint_percent: data.max_hint_percent ?? 30, // Default 30%
    };

    const newGame = await prisma.games.create({
      data: {
        id: newPuzzleId,
        game_template_id: puzzleTemplateId,
        creator_id: user_id,
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_publish_immediately,
        game_json: puzzleJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    return newGame;
  }

  static async getSlidingPuzzleGameDetail(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnail_image: true,
        is_published: true,
        created_at: true,
        game_json: true,
        creator_id: true,
        total_played: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.SLIDING_PUZZLE_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot access this game',
      );

    return {
      ...game,
      creator_id: undefined,
      game_template: undefined,
    };
  }

  static async updateSlidingPuzzle(
    data: IUpdateSlidingPuzzle,
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnail_image: true,
        is_published: true,
        game_json: true,
        creator_id: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.SLIDING_PUZZLE_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot access this game',
      );

    if (data.name) {
      const isNameExist = await prisma.games.findUnique({
        where: { name: data.name },
        select: { id: true },
      });

      if (isNameExist && isNameExist.id !== game_id)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Game name is already used',
        );
    }

    const oldPuzzleJson = game.game_json as ISlidingPuzzleJson | null;
    const oldImagePaths: string[] = [];

    if (oldPuzzleJson?.puzzle_image) {
      oldImagePaths.push(oldPuzzleJson.puzzle_image);
    }

    if (game.thumbnail_image) {
      oldImagePaths.push(game.thumbnail_image);
    }

    let thumbnailImagePath = game.thumbnail_image;
    let puzzleImagePath = oldPuzzleJson?.puzzle_image || '';

    if (data.thumbnail_image) {
      thumbnailImagePath = await FileManager.upload(
        `game/sliding-puzzle/${game_id}`,
        data.thumbnail_image,
      );
    }

    if (data.puzzle_image) {
      puzzleImagePath = await FileManager.upload(
        `game/sliding-puzzle/${game_id}`,
        data.puzzle_image,
      );
    }

    const puzzleJson: ISlidingPuzzleJson = {
      puzzle_image: puzzleImagePath,
      grid_size: data.grid_size ?? oldPuzzleJson?.grid_size ?? 4,
      time_limit: data.time_limit ?? oldPuzzleJson?.time_limit,
      max_hint_percent:
        data.max_hint_percent ?? oldPuzzleJson?.max_hint_percent ?? 30,
    };

    const updatedGame = await prisma.games.update({
      where: { id: game_id },
      data: {
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_published,
        game_json: puzzleJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    const newImagePaths = new Set([thumbnailImagePath, puzzleImagePath]);

    for (const oldPath of oldImagePaths) {
      if (!newImagePaths.has(oldPath)) {
        await FileManager.remove(oldPath);
      }
    }

    return updatedGame;
  }

  static async getSlidingPuzzlePlay(
    game_id: string,
    is_public: boolean,
    user_id?: string,
    user_role?: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnail_image: true,
        is_published: true,
        game_json: true,
        creator_id: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (
      !game ||
      (is_public && !game.is_published) ||
      game.game_template.slug !== this.SLIDING_PUZZLE_SLUG
    )
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (
      !is_public &&
      user_role !== 'SUPER_ADMIN' &&
      game.creator_id !== user_id
    )
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot get this game data',
      );

    const puzzleJson = game.game_json as unknown as ISlidingPuzzleJson | null;

    if (!puzzleJson)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Puzzle data not found');

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      puzzle_image: puzzleJson.puzzle_image,
      grid_size: puzzleJson.grid_size,
      time_limit: puzzleJson.time_limit,
      max_hint_percent: puzzleJson.max_hint_percent,
      is_published: game.is_published,
    };
  }

  static async deleteSlidingPuzzle(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        thumbnail_image: true,
        game_json: true,
        creator_id: true,
      },
    });

    if (!game) throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot delete this game',
      );

    const oldPuzzleJson = game.game_json as ISlidingPuzzleJson | null;
    const oldImagePaths: string[] = [];

    if (oldPuzzleJson?.puzzle_image)
      oldImagePaths.push(oldPuzzleJson.puzzle_image);

    if (game.thumbnail_image) oldImagePaths.push(game.thumbnail_image);

    for (const path of oldImagePaths) {
      await FileManager.remove(path);
    }

    await prisma.games.delete({ where: { id: game_id } });

    return { id: game_id };
  }

  private static async existGameCheck(game_name?: string, game_id?: string) {
    const where: Record<string, unknown> = {};
    if (game_name) where.name = game_name;
    if (game_id) where.id = game_id;

    if (Object.keys(where).length === 0) return null;

    const game = await prisma.games.findFirst({
      where,
      select: { id: true, creator_id: true },
    });

    if (game)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game name is already exist',
      );

    return game;
  }

  private static async getGameTemplateId() {
    const result = await prisma.gameTemplates.findUnique({
      where: { slug: this.SLIDING_PUZZLE_SLUG },
      select: { id: true },
    });

    if (!result)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game template not found');

    return result.id;
  }
}
