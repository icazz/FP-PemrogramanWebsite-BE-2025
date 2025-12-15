import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import { ErrorResponse, prisma } from '@/common';
import { type IPairOrNoPairGameData } from '@/common/interface/games';
import { FileManager } from '@/utils';

import {
  type ICreatePairOrNoPair,
  type IEvaluate,
  type IUpdatePairOrNoPair,
} from './schema';

export abstract class PairOrNoPairService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static GAME_SLUG = 'pair-or-no-pair';

  static async createGame(data: ICreatePairOrNoPair, user_id: string) {
    await this.existGameCheck(data.name);

    const newGameId = v4();
    const gameTemplateId = await this.getGameTemplateId();

    const thumbnailImagePath = await FileManager.upload(
      `game/pair-or-no-pair/${newGameId}`,
      data.thumbnail_image,
    );

    const gameJson: IPairOrNoPairGameData = {
      items: data.items.map((item, index) => ({
        id: `item-${String(index + 1).padStart(3, '0')}`,
        left_content: item.left_content,
        right_content: item.right_content,
      })),
    };

    const newGame = await prisma.games.create({
      data: {
        id: newGameId,
        game_template_id: gameTemplateId,
        creator_id: user_id,
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_publish_immediately,
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

    const gameJson = game.game_json as unknown as IPairOrNoPairGameData | null;

    if (!gameJson)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game data not found');

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      items: gameJson.items ?? [],
      is_published: game.is_published,
    };
  }

  static async updateGame(
    data: IUpdatePairOrNoPair,
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

    if (!game || game.game_template.slug !== this.GAME_SLUG)
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

    const oldGameJson = game.game_json as IPairOrNoPairGameData | null;

    let thumbnailImagePath = game.thumbnail_image;

    if (data.thumbnail_image) {
      if (game.thumbnail_image) {
        await FileManager.remove(game.thumbnail_image);
      }

      thumbnailImagePath = await FileManager.upload(
        `game/pair-or-no-pair/${game_id}`,
        data.thumbnail_image,
      );
    }

    const gameJson: IPairOrNoPairGameData = {
      items: data.items
        ? data.items.map((item, index) => ({
            id: `item-${String(index + 1).padStart(3, '0')}`,
            left_content: item.left_content,
            right_content: item.right_content,
          }))
        : (oldGameJson?.items ?? []),
    };

    const updatedGame = await prisma.games.update({
      where: { id: game_id },
      data: {
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_publish,
        game_json: gameJson as unknown as Prisma.InputJsonValue,
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
        id: true,
        thumbnail_image: true,
        creator_id: true,
      },
    });

    if (!game) throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot delete this game',
      );

    if (game.thumbnail_image) {
      await FileManager.remove(game.thumbnail_image);
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
      where: { slug: this.GAME_SLUG },
      select: { id: true },
    });

    if (!result)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game template not found');

    return result.id;
  }

  static async evaluateGame(
    data: IEvaluate,
    game_id: string,
    user_id?: string,
  ) {
    // Verify game exists and is a pair-or-no-pair game
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.GAME_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    // Create leaderboard entry
    const leaderboardEntry = await prisma.leaderboard.create({
      data: {
        game_id,
        user_id: user_id || null,
        score: data.score,
        difficulty: data.difficulty,
        time_taken: data.time_taken,
      },
      select: {
        id: true,
        score: true,
        difficulty: true,
        created_at: true,
      },
    });

    // Get user's rank for this game and difficulty
    const rank = await prisma.leaderboard.count({
      where: {
        game_id,
        difficulty: data.difficulty,
        score: {
          gt: data.score,
        },
      },
    });

    return {
      ...leaderboardEntry,
      rank: rank + 1,
    };
  }

  static async getLeaderboard(game_id: string, difficulty?: string) {
    // Verify game exists
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: { id: true },
    });

    if (!game) throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    // Build where clause
    const where: { game_id: string; difficulty?: string } = { game_id };
    if (difficulty) where.difficulty = difficulty;

    // Get top 10 scores
    const leaderboard = await prisma.leaderboard.findMany({
      where,
      orderBy: { score: 'desc' },
      take: 10,
      select: {
        id: true,
        score: true,
        difficulty: true,
        created_at: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    return leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry.user?.username || 'Anonymous',
      score: entry.score,
      difficulty: entry.difficulty,
      created_at: entry.created_at,
    }));
  }
}
