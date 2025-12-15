import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import { ErrorResponse, prisma } from '@/common';
import {
  type ITypeSpeedGameData,
  type ITypeSpeedResult,
} from '@/common/interface/games';
import { FileManager } from '@/utils';

import {
  type ICheckAnswer,
  type ICreateTypeSpeed,
  type IUpdateTypeSpeed,
} from './schema';

export abstract class TypeSpeedService {
  private static gameSlug = 'type-speed';

  static async createGame(data: ICreateTypeSpeed, user_id: string) {
    await this.existGameCheck(data.name);

    const newGameId = v4();
    const gameTemplateId = await this.getGameTemplateId();

    const thumbnailImagePath = await FileManager.upload(
      `game/type-speed/${newGameId}`,
      data.thumbnail_image,
    );

    const gameJson: ITypeSpeedGameData = {
      time_limit: data.time_limit,
      texts: data.texts.map((text, index) => ({
        id: `text-${String(index + 1).padStart(3, '0')}`,
        content: text.content,
        difficulty: text.difficulty,
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

    if (!game || game.game_template.slug !== this.gameSlug)
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

  static async updateGame(
    data: IUpdateTypeSpeed,
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        thumbnail_image: true,
        game_json: true,
        creator_id: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.gameSlug)
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

    const oldGameJson = game.game_json as ITypeSpeedGameData | null;

    let thumbnailImagePath = game.thumbnail_image;

    if (data.thumbnail_image) {
      if (game.thumbnail_image) {
        await FileManager.remove(game.thumbnail_image);
      }

      thumbnailImagePath = await FileManager.upload(
        `game/type-speed/${game_id}`,
        data.thumbnail_image,
      );
    }

    const gameJson: ITypeSpeedGameData = {
      time_limit: data.time_limit ?? oldGameJson?.time_limit ?? 60,
      texts: data.texts
        ? data.texts.map((text, index) => ({
            id: `text-${String(index + 1).padStart(3, '0')}`,
            content: text.content,
            difficulty: text.difficulty,
          }))
        : (oldGameJson?.texts ?? []),
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
      where: { slug: this.gameSlug },
      select: { id: true },
    });

    if (!result)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game template not found');

    return result.id;
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
      game.game_template.slug !== this.gameSlug
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

    const gameJson = game.game_json as unknown as ITypeSpeedGameData | null;

    if (!gameJson)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game data not found');

    // Random pilih 1 text untuk dimainkan
    const randomText =
      gameJson.texts[Math.floor(Math.random() * gameJson.texts.length)];

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      time_limit: gameJson.time_limit,
      text: {
        id: randomText.id,
        content: randomText.content,
        difficulty: randomText.difficulty,
      },
      is_published: game.is_published,
    };
  }

  static async checkAnswer(data: ICheckAnswer, game_id: string) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        game_json: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.gameSlug)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    const gameJson = game.game_json as unknown as ITypeSpeedGameData;
    const text = gameJson.texts.find(t => t.id === data.text_id);

    if (!text) throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Text not found');

    // Calculate metrics
    const originalText = text.content;
    const userInput = data.user_input;

    const totalChars = originalText.length;
    let correctChars = 0;

    for (
      let index = 0;
      index < Math.min(originalText.length, userInput.length);
      index++
    ) {
      if (originalText[index] === userInput[index]) {
        correctChars++;
      }
    }

    const incorrectChars = totalChars - correctChars;
    const accuracy = Math.round((correctChars / totalChars) * 100);

    // WPM = (Characters Typed / 5) / (Time in Minutes)
    const timeInMinutes = data.time_taken / 60;
    const wpm = Math.round(userInput.length / 5 / timeInMinutes);

    const result: ITypeSpeedResult = {
      total_characters: totalChars,
      correct_characters: correctChars,
      incorrect_characters: incorrectChars,
      wpm,
      accuracy,
      time_taken: data.time_taken,
    };

    return result;
  }
}
