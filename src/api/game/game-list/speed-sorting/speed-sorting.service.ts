import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 as uuidv4 } from 'uuid';

import { ErrorResponse, type ISpeedSortingJson, prisma } from '@/common';
import { FileManager } from '@/utils';

import { type ICreateSpeedSorting, type IUpdateSpeedSorting } from './schema';

export abstract class SpeedSortingService {
  private static speedSortingSlug = 'speed-sorting';

  static async createSpeedSorting(data: ICreateSpeedSorting, user_id: string) {
    await this.ensureNameNotDuplicate(data.name);

    const newGameId = uuidv4();
    const gameTemplateId = await this.getGameTemplateId();

    const thumbnailImagePath = await FileManager.upload(
      `game/speed-sorting/${newGameId}`,
      data.thumbnail_image,
    );

    const categories = data.categories.map((cat, index) => ({
      id: `cat-${index}`,
      name: cat.name,
    }));

    const items = [];

    for (const [index, item] of data.items.entries()) {
      const cat = categories[item.category_index];

      if (!cat) {
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          `Invalid category_index at item no. ${index + 1}`,
        );
      }

      let textForJson = item.type === 'text' ? item.value : '';

      if (item.type === 'image') {
        if (!item.file) {
          throw new ErrorResponse(
            StatusCodes.BAD_REQUEST,
            `Item no. ${index + 1} marked as file but no file data provided`,
          );
        }

        const bytes = new Uint8Array(item.file.buffer);

        const bunFile = new File([bytes], item.file.filename, {
          type: item.file.mimetype ?? 'application/octet-stream',
        });

        const itemFilePath = await FileManager.upload(
          `game/speed-sorting/${newGameId}/items`,
          bunFile,
        );

        textForJson = itemFilePath;
      }

      items.push({
        id: `item-${index}`,
        value: textForJson,
        type: item.type,
        category_id: cat.id,
      });
    }

    const json: ISpeedSortingJson = {
      categories,
      items,
    };

    const newGame = await prisma.games.create({
      data: {
        id: newGameId,
        game_template_id: gameTemplateId,
        creator_id: user_id,
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_published,
        game_json: json as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    return newGame;
  }

  static async updateSpeedSorting(
    game_id: string,
    data: IUpdateSpeedSorting,
    user: { user_id: string; role: ROLE },
  ) {
    const existing = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnail_image: true,
        is_published: true,
        creator_id: true,
        game_template: {
          select: { slug: true },
        },
        game_json: true,
      },
    });

    if (!existing) {
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Speed Sorting game not found',
      );
    }

    if (existing.game_template.slug !== this.speedSortingSlug) {
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game is not a Speed Sorting template',
      );
    }

    if (existing.creator_id !== user.user_id && user.role !== 'SUPER_ADMIN') {
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You are not allowed to update this game',
      );
    }

    const oldJson = existing.game_json as unknown as ISpeedSortingJson;
    const oldItemImagePaths =
      oldJson.items
        ?.filter(item => item.type === 'image' && !!item.value)
        .map(item => item.value) ?? [];

    let json = oldJson;
    let newItemImagePaths: string[] | null = null;

    let thumbnailImagePath = existing.thumbnail_image;

    if (data.thumbnail_image) {
      thumbnailImagePath = await FileManager.upload(
        `game/speed-sorting/${game_id}`,
        data.thumbnail_image,
      );
      await FileManager.remove(existing.thumbnail_image);
    }

    if (data.categories || data.items) {
      if (!data.categories || !data.items) {
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'categories and items must both be provided when updating dataset',
        );
      }

      const categories = data.categories.map((cat, index) => ({
        id: `cat-${index}`,
        name: cat.name,
      }));

      const items: ISpeedSortingJson['items'] = [];
      const newImages: string[] = [];

      for (const [index, item] of data.items.entries()) {
        const cat = categories[item.category_index];

        if (!cat) {
          throw new ErrorResponse(
            StatusCodes.BAD_REQUEST,
            `Invalid category_index at item no. ${index + 1}`,
          );
        }

        let textForJson = item.value;

        if (item.type === 'image') {
          if (item.valid_file) {
            if (!item.file) {
              throw new ErrorResponse(
                StatusCodes.BAD_REQUEST,
                `Item no. ${index + 1} marked as file but no file data provided`,
              );
            }

            const bytes = new Uint8Array(item.file.buffer);

            const bunFile = new File([bytes], item.file.filename);

            const itemFilePath = await FileManager.upload(
              `game/speed-sorting/${game_id}/items`,
              bunFile,
            );

            textForJson = itemFilePath;
          } else if (!item.value) {
            throw new ErrorResponse(
              StatusCodes.BAD_REQUEST,
              `Item no. ${index + 1} is missing its value`,
            );
          }

          if (textForJson) newImages.push(textForJson);
        }

        items.push({
          id: `item-${index}`,
          value: textForJson,
          type: item.type,
          category_id: cat.id,
        });
      }

      json = {
        categories: categories.length > 0 ? categories : json.categories,
        items: items.length > 0 ? items : json.items,
      };

      newItemImagePaths = items.length > 0 ? newImages : null;
    }

    const updated = await prisma.games.update({
      where: { id: game_id },
      data: {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        thumbnail_image: thumbnailImagePath,
        is_published:
          data.is_publish == null ? existing.is_published : data.is_publish,
        game_json: json as unknown as Prisma.InputJsonValue,
      },
      select: { id: true, game_json: true },
    });

    if (newItemImagePaths) {
      for (const oldPath of oldItemImagePaths) {
        if (!newItemImagePaths.includes(oldPath)) {
          await FileManager.remove(oldPath);
        }
      }
    }

    return updated;
  }

  static async getSpeedSortingGameDetail(
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

    if (!game || game.game_template.slug !== this.speedSortingSlug)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot access this game',
      );

    const json = game.game_json as unknown as ISpeedSortingJson;

    return {
      ...game,
      categories: json.categories,
      items: json.items,
      game_json: undefined,
      creator_id: undefined,
      game_template: undefined,
    };
  }

  static async getSpeedSortingForPlay(game_id: string) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnail_image: true,
        is_published: true,
        game_template: {
          select: { slug: true },
        },
        game_json: true,
      },
    });

    if (!game) {
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Speed Sorting game not found',
      );
    }

    if (game.game_template.slug !== this.speedSortingSlug) {
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game is not a Speed Sorting template',
      );
    }

    if (!game.is_published) {
      throw new ErrorResponse(StatusCodes.FORBIDDEN, 'Game is not published');
    }

    const json = game.game_json as unknown as ISpeedSortingJson;

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      categories: json.categories,
      items: json.items,
    };
  }

  static async deleteSpeedSorting(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const existing = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        creator_id: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!existing) {
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Speed Sorting game not found',
      );
    }

    if (existing.game_template.slug !== this.speedSortingSlug) {
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game is not a Speed Sorting template',
      );
    }

    if (existing.creator_id !== user_id && user_role !== 'SUPER_ADMIN') {
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You are not allowed to delete this game',
      );
    }

    await prisma.games.delete({
      where: { id: game_id },
    });

    await FileManager.removeFolder(`uploads/game/speed-sorting/${game_id}`);

    return { id: game_id };
  }

  private static async ensureNameNotDuplicate(name: string) {
    const existing = await prisma.games.findFirst({
      where: {
        name,
        game_template: {
          slug: this.speedSortingSlug,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game name already used',
      );
    }
  }

  private static async getGameTemplateId() {
    const template = await prisma.gameTemplates.findFirst({
      where: { slug: this.speedSortingSlug },
      select: { id: true },
    });

    if (!template) {
      throw new ErrorResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Speed Sorting game template not found',
      );
    }

    return template.id;
  }
}
