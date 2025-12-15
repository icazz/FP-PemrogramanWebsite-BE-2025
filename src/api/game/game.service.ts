import {
  type Games,
  type GameTemplates,
  type LikedGames,
  type Prisma,
  type ROLE,
  type Users,
} from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

import { ErrorResponse, prisma } from '@/common';
import { paginate } from '@/utils';

import {
  type IGamePaginateQuery,
  type IGameTemplateQuery,
  type IUpdatePublishStatus,
} from './schema';

export abstract class GameService {
  static async getAllGame(
    query: IGamePaginateQuery,
    is_private: boolean,
    user_id?: string,
    current_user_id?: string,
  ) {
    // Build filters array, excluding undefined values
    const filters: Prisma.GamesWhereInput[] = [];

    // Always filter by is_published for public/explore pages
    if (!is_private) {
      filters.push({ is_published: true });
    }

    // Search filter
    if (query.search) {
      filters.push({ name: { contains: query.search, mode: 'insensitive' } });
    }

    // Game template filter
    if (query.gameTypeSlug) {
      filters.push({ game_template: { slug: query.gameTypeSlug } });
    }

    // Creator filter
    if (user_id) {
      filters.push({ creator: { id: user_id } });
    }

    const args: {
      where: Prisma.GamesWhereInput;
      select: Prisma.GamesSelect;
      orderBy: Prisma.GamesOrderByWithRelationInput[];
    } = {
      where: {
        AND: filters.length > 0 ? filters : undefined,
      },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnail_image: true,
        total_played: true,
        _count: {
          select: {
            liked: true,
          },
        },
        liked: current_user_id
          ? {
              where: { user_id: current_user_id },
              select: { id: true },
            }
          : undefined,
        is_published: is_private,
        game_template: {
          select: {
            name: true,
            slug: true,
          },
        },
        creator: user_id
          ? undefined
          : {
              select: { id: true, username: true },
            },
      },
      orderBy: [
        { name: query.orderByName },
        { total_played: query.orderByPlayAmount },
        {
          liked: query.orderByLikeAmount
            ? { _count: query.orderByLikeAmount }
            : undefined,
        },
        { created_at: query.orderByCreatedAt || 'desc' },
      ],
    };

    const paginationResult = await paginate<
      Games & { creator: Users } & { game_template: GameTemplates } & {
        _count: { liked: number };
      } & { liked: LikedGames[] },
      typeof args
    >(prisma.games, query.page, query.perPage, args);

    const cleanedResult = paginationResult.data.map(game => ({
      ...game,
      game_template: undefined,
      game_template_name: game.game_template.name,
      game_template_slug: game.game_template.slug,
      creator: undefined,
      is_published: is_private ? game.is_published : undefined,
      creator_id: user_id ? undefined : game.creator.id,
      creator_name: user_id ? undefined : game.creator.username,
      is_game_liked: current_user_id
        ? game.liked && game.liked.length > 0
        : undefined,
      liked: undefined,
      total_liked: game._count.liked,
      _count: undefined,
    }));

    return {
      data: cleanedResult,
      meta: paginationResult.meta,
    };
  }

  static async getAllGameTemplate(query: IGameTemplateQuery) {
    const gameTemplates = await prisma.gameTemplates.findMany({
      where: {
        AND: [
          {
            name: query.search
              ? { contains: query.search, mode: 'insensitive' }
              : undefined,
          },
          { is_time_limit_based: query.withTimeLimit },
          { is_life_based: query.withLifeLimit },
        ],
      },
      select: {
        slug: true,
        name: true,
        logo: true,
        id: !query.lite,
        description: !query.lite,
        is_time_limit_based: !query.lite,
        is_life_based: !query.lite,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return gameTemplates;
  }

  static async updateGamePublishStatus(
    data: IUpdatePublishStatus,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: data.game_id },
      select: { creator_id: true },
    });

    if (!game) throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User not allowed to edit this data',
      );

    return await prisma.games.update({
      where: { id: data.game_id },
      data: { is_published: data.is_publish },
      select: { is_published: true },
    });
  }

  static async updateGamePlayCount(game_id: string, user_id?: string) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: { is_published: true },
    });

    if (!game || !game.is_published)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    const transactionQueries: (
      | Prisma.Prisma__GamesClient<Games>
      | Prisma.Prisma__UsersClient<Users>
    )[] = [];

    transactionQueries.push(
      prisma.games.update({
        where: { id: game_id },
        data: { total_played: { increment: 1 } },
      }),
    );

    if (user_id) {
      transactionQueries.push(
        prisma.users.update({
          where: { id: user_id },
          data: { total_game_played: { increment: 1 } },
        }),
      );
    }

    await prisma.$transaction(transactionQueries);
  }

  static async updateGameLikeCount(
    game_id: string,
    user_id: string,
    is_like: boolean,
  ) {
    const [game, userLikedGame] = await prisma.$transaction([
      prisma.games.findUnique({
        where: { id: game_id },
        select: { is_published: true },
      }),
      prisma.likedGames.findFirst({
        where: {
          AND: [{ game_id }, { user_id }],
        },
        select: { id: true },
      }),
    ]);

    if (!game || !game.is_published)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (is_like) {
      if (userLikedGame)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'User already liked this game',
        );

      await prisma.likedGames.create({
        data: {
          game_id,
          user_id,
        },
      });
    } else {
      if (!userLikedGame)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'User did not liked this game',
        );

      await prisma.likedGames.delete({ where: { id: userLikedGame.id } });
    }
  }
}
