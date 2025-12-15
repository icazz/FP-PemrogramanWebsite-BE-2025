import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import { ErrorResponse, prisma } from '@/common';
import { type IFindTheMatchJson } from '@/common/interface/games/find-the-match.interface';
import { FileManager } from '@/utils';

import {
  type ICheckAnswer,
  type ICreateFindTheMatch,
  type IUpdateFindTheMatch,
} from './schema';

export abstract class FindTheMatchService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static FIND_THE_MATCH_SLUG = 'find-the-match';

  static async createFindTheMatch(
    data: ICreateFindTheMatch & { thumbnail_image?: File },
    user_id: string,
  ) {
    await this.existGameCheck(data.name);

    const newFindTheMatchId = v4();
    const gameTemplateId = await this.getGameTemplateId();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (data.items.length === 0) {
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'At least one item is required for Find The Match game',
      );
    }

    const thumbnailImagePath = await (async () => {
      if (!data.thumbnail_image) {
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Thumbnail image is required',
        );
      }

      return FileManager.upload(
        `game/find-the-match/${newFindTheMatchId}`,
        data.thumbnail_image,
      );
    })();

    const findTheMatchJson: IFindTheMatchJson = {
      initial_lives: data.initial_lives,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      items: (data.items as Array<{ question: string; answer: string }>).map(
        item => ({
          question: item.question,
          answer: item.answer,
        }),
      ),
    };

    const newGame = await prisma.games.create({
      data: {
        id: newFindTheMatchId,
        game_template: {
          connect: {
            id: gameTemplateId,
          },
        },
        creator: {
          connect: {
            id: user_id,
          },
        },
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_publish_immediately,
        game_json: findTheMatchJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    return newGame;
  }

  static async getFindTheMatchGameDetail(
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
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.FIND_THE_MATCH_SLUG)
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

  static async updateFindTheMatch(
    data: IUpdateFindTheMatch & { thumbnail_image?: File },
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

    if (!game || game.game_template.slug !== this.FIND_THE_MATCH_SLUG)
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

    let thumbnailImagePath = game.thumbnail_image;
    const oldImagePathsToDelete: string[] = [];

    // Handle thumbnail_image update
    if (data.thumbnail_image) {
      if (game.thumbnail_image) {
        oldImagePathsToDelete.push(game.thumbnail_image);
      }

      thumbnailImagePath = await FileManager.upload(
        `game/find-the-match/${game_id}`,
        data.thumbnail_image,
      );
    }

    const oldFindTheMatchJson = game.game_json as IFindTheMatchJson | null;

    const findTheMatchJson: IFindTheMatchJson = {
      initial_lives:
        data.initial_lives ?? oldFindTheMatchJson?.initial_lives ?? 3,
      items: data.items
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (data.items as Array<{ question: string; answer: string }>).map(
            item => ({
              question: item.question,
              answer: item.answer,
            }),
          )
        : oldFindTheMatchJson?.items || [],
    };

    const updatedGame = await prisma.games.update({
      where: { id: game_id },
      data: {
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_published,
        game_json: findTheMatchJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    // Delete old images
    for (const oldPath of oldImagePathsToDelete) {
      await FileManager.remove(oldPath);
    }

    return updatedGame;
  }

  static async getFindTheMatchPlay(
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
      game.game_template.slug !== this.FIND_THE_MATCH_SLUG
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

    const findTheMatchJson =
      game.game_json as unknown as IFindTheMatchJson | null;

    if (!findTheMatchJson)
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Find The Match data not found',
      );

    // Untuk game "Find The Match", kita perlu mengirimkan daftar pertanyaan dan daftar jawaban yang belum cocok.
    // Frontend akan menampilkan pertanyaan satu per satu dan memungkinkan pengguna memilih jawaban dari daftar yang tersedia.
    // Jawaban yang benar akan dihapus dari daftar.

    const questions = findTheMatchJson.items.map(item => item.question);
    const answers = findTheMatchJson.items.map(item => item.answer);

    this.shuffleArray(answers); // Acak jawaban

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      initial_lives: findTheMatchJson.initial_lives,
      questions,
      answers,
      is_published: game.is_published,
    };
  }

  static async checkAnswer(data: ICheckAnswer, game_id: string) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        game_json: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.FIND_THE_MATCH_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    const findTheMatchJson = game.game_json as unknown as IFindTheMatchJson;

    const {
      question,
      answer,
      remaining_answers: remainingAnswers,
      current_lives: currentLives,
    } = data;
    let newLives = currentLives ?? findTheMatchJson.initial_lives;
    let isCorrect = false;
    let isGameOver = false;

    const matchedItem = findTheMatchJson.items.find(
      item => item.question === question && item.answer === answer,
    );

    let newRemainingAnswers = remainingAnswers ?? [];

    if (matchedItem) {
      isCorrect = true;
      newRemainingAnswers = newRemainingAnswers.filter(ans => ans !== answer);
    } else {
      isCorrect = false;

      if (newLives > 0) {
        newLives--;
      }

      if (newLives <= 0) {
        isGameOver = true;
      }
    }

    return {
      is_correct: isCorrect,
      new_remaining_answers: newRemainingAnswers,
      new_lives: newLives,
      is_game_over: isGameOver,
    };
  }

  static async deleteFindTheMatch(
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
      where: { slug: this.FIND_THE_MATCH_SLUG },
      select: { id: true },
    });

    if (!result)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game template not found');

    return result.id;
  }

  private static shuffleArray<T>(array: T[]): T[] {
    for (let index = array.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
    }

    return array;
  }
}
