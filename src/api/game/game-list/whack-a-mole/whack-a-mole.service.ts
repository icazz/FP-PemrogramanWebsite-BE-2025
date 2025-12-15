import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import { ErrorResponse, prisma } from '@/common';
import { type IWhackAMoleGameData } from '@/common/interface/games';
import { FileManager } from '@/utils';

import { type ICreateWhackAMole, type IUpdateWhackAMole } from './schema';

export abstract class WhackAMoleService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static GAME_SLUG = 'whack-a-mole';

  static async createGame(data: ICreateWhackAMole, user_id: string) {
    await this.existGameCheck(data.name);

    const newGameId = v4();
    const gameTemplateId = await this.getGameTemplateId();

    const thumbnailImagePath = await FileManager.upload(
      `game/whack-a-mole/${newGameId}`,
      data.thumbnail_image as File,
    );

    const gameJson: IWhackAMoleGameData = {
      time_limit: data.time_limit ?? 30,
    };

    const newGame = await prisma.games.create({
      data: {
        id: newGameId,
        game_template_id: gameTemplateId,
        creator_id: user_id,
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_publish_immediately ?? false,
        game_json: gameJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    return newGame;
  }

  static async getGameDetail(
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

    if (!game || game.game_template.slug !== this.GAME_SLUG)
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

  static async getGamePlay(
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
      game.game_template.slug !== this.GAME_SLUG
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

    const gameJson = game.game_json as unknown as IWhackAMoleGameData | null;

    if (!gameJson)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game data not found');

    // Increment total played
    await prisma.games.update({
      where: { id: game_id },
      data: { total_played: { increment: 1 } },
    });

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      time_limit: gameJson.time_limit ?? 60,
      is_published: game.is_published,
    };
  }

  static async updateGame(
    game_id: string,
    data: IUpdateWhackAMole,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        game_json: true,
        creator_id: true,
        thumbnail_image: true,
        game_template: { select: { slug: true } },
      },
    });

    if (!game || game.game_template.slug !== this.GAME_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot update this game',
      );

    const currentGameJson = game.game_json as unknown as IWhackAMoleGameData;

    let thumbnailImagePath: string | undefined;

    if (data.thumbnail_image) {
      // Delete old thumbnail if exists
      if (game.thumbnail_image) {
        try {
          await FileManager.remove(game.thumbnail_image);
        } catch (error) {
          // Ignore error if old file doesn't exist
          console.warn('Failed to delete old thumbnail:', error);
        }
      }

      // Upload new thumbnail
      thumbnailImagePath = await FileManager.upload(
        `game/whack-a-mole/${game_id}`,
        data.thumbnail_image as File,
      );
    }

    const updatedGameJson: IWhackAMoleGameData = {
      time_limit: data.time_limit ?? currentGameJson.time_limit,
    };

    const updatedGame = await prisma.games.update({
      where: { id: game_id },
      data: {
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_published,
        game_json: updatedGameJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    return updatedGame;
  }

  static async deleteGame(game_id: string, user_id: string, user_role: ROLE) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        creator_id: true,
        thumbnail_image: true,
        game_template: { select: { slug: true } },
      },
    });

    if (!game || game.game_template.slug !== this.GAME_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot delete this game',
      );

    // Delete thumbnail file first before deleting database record
    if (game.thumbnail_image) {
      try {
        await FileManager.remove(game.thumbnail_image);
      } catch (error) {
        console.warn('Failed to delete thumbnail file:', error);
      }
    }

    // Delete the entire game folder
    try {
      await FileManager.remove(`game/whack-a-mole/${game_id}`);
    } catch (error) {
      console.warn('Failed to delete game folder:', error);
    }

    // Delete database record last
    await prisma.games.delete({
      where: { id: game_id },
    });
  }

  static async publishGame(game_id: string, user_id: string, user_role: ROLE) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        creator_id: true,
        game_template: { select: { slug: true } },
      },
    });

    if (!game || game.game_template.slug !== this.GAME_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot publish this game',
      );

    const publishedGame = await prisma.games.update({
      where: { id: game_id },
      data: { is_published: true },
      select: { id: true },
    });

    return publishedGame;
  }

  static async unpublishGame(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        creator_id: true,
        game_template: { select: { slug: true } },
      },
    });

    if (!game || game.game_template.slug !== this.GAME_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot unpublish this game',
      );

    const unpublishedGame = await prisma.games.update({
      where: { id: game_id },
      data: { is_published: false },
      select: { id: true },
    });

    return unpublishedGame;
  }

  private static async existGameCheck(gameName: string) {
    const existedGame = await prisma.games.findUnique({
      where: { name: gameName },
    });

    if (existedGame)
      throw new ErrorResponse(
        StatusCodes.CONFLICT,
        'Game with this name already exists',
      );
  }

  private static async getGameTemplateId() {
    const gameTemplate = await prisma.gameTemplates.findUnique({
      where: { slug: this.GAME_SLUG },
      select: { id: true },
    });

    if (!gameTemplate)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game template not found');

    return gameTemplate.id;
  }
}
