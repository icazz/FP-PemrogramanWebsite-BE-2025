import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import { ErrorResponse, prisma } from '@/common';
import { type ITrueOrFalseJson } from '@/common/interface/games/true-or-false.interface';
import { FileManager } from '@/utils';

import {
  type ICheckAnswer,
  type ICreateTrueOrFalse,
  type IUpdateTrueOrFalse,
} from './schema';

export abstract class TrueOrFalseService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static TRUE_OR_FALSE_SLUG = 'true-or-false';

  static async createTrueOrFalse(data: ICreateTrueOrFalse, user_id: string) {
    await this.existGameCheck(data.name);

    const newGameId = v4();
    const gameTemplateId = await this.getGameTemplateId();

    const thumbnailImagePath = await FileManager.upload(
      `game/true-or-false/${newGameId}`,
      data.thumbnail_image,
    );

    const gameJson: ITrueOrFalseJson = {
      countdown: data.game_json.countdown,
      choices: data.game_json.choices,
      questions: data.game_json.questions,
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

  static async getTrueOrFalseGameDetail(
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

    if (!game || game.game_template.slug !== this.TRUE_OR_FALSE_SLUG)
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

  static async updateTrueOrFalse(
    data: IUpdateTrueOrFalse,
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

    if (!game || game.game_template.slug !== this.TRUE_OR_FALSE_SLUG)
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

    if (data.thumbnail_image) {
      thumbnailImagePath = await FileManager.upload(
        `game/true-or-false/${game_id}`,
        data.thumbnail_image,
      );
    }

    const oldGameJson = game.game_json as unknown as ITrueOrFalseJson | null;

    const gameJson: ITrueOrFalseJson = {
      countdown: data.game_json?.countdown ?? oldGameJson?.countdown ?? 30,
      choices: data.game_json?.choices ??
        oldGameJson?.choices ?? { A: 'True', B: 'False' },
      questions: data.game_json?.questions ?? oldGameJson?.questions ?? [],
    };

    await prisma.games.update({
      where: { id: game_id },
      data: {
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_published,
        game_json: gameJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    return { id: game_id };
  }

  static async deleteTrueOrFalse(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        creator_id: true,
        thumbnail_image: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.TRUE_OR_FALSE_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot access this game',
      );

    await FileManager.remove(game.thumbnail_image);

    await prisma.games.delete({
      where: { id: game_id },
    });
  }

  static async getTrueOrFalsePlay(
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
      game.game_template.slug !== this.TRUE_OR_FALSE_SLUG
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

    const gameJson = game.game_json as unknown as ITrueOrFalseJson | null;

    if (!gameJson)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game data not found');

    // Remove correct answers
    const questions = (gameJson.questions ?? []).map((q, index) => ({
      questionIndex: index,
      questionText: q.questionText,
    }));

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      countdown: gameJson.countdown,
      choices: gameJson.choices,
      questions: questions,
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

    if (!game || game.game_template.slug !== this.TRUE_OR_FALSE_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    const gameJson = game.game_json as unknown as ITrueOrFalseJson;
    const results = [];
    let correctCount = 0;
    const totalAnswered = data.answers.length;

    for (const answer of data.answers) {
      const questionIndex = answer.questionIndex;
      const selectedAnswer = answer.selectedAnswer;

      if (questionIndex < 0 || questionIndex >= gameJson.questions.length) {
        results.push({
          questionIndex: questionIndex,
          isCorrect: false,
          correctAnswer: 'N/A',
          error: 'Question index out of range',
        });
        continue;
      }

      const question = gameJson.questions[questionIndex];
      const isCorrect = question.correctAnswer === selectedAnswer;

      if (isCorrect) correctCount++;

      results.push({
        questionIndex: questionIndex,
        isCorrect: isCorrect,
        correctAnswer: question.correctAnswer,
        selectedAnswer: selectedAnswer,
      });
    }

    // Calculate score (assuming 100 is max score)
    const maxScore = 100;
    const score = (correctCount / data.answers.length) * maxScore;

    return {
      game_id,
      total_questions: gameJson.questions.length,
      correct_answers: correctCount,
      incorrect_answers: totalAnswered - correctCount,
      score: Math.round(score),
      max_score: maxScore,
      results,
    };
  }

  private static async existGameCheck(name: string) {
    const isNameExist = await prisma.games.findUnique({
      where: { name },
      select: { id: true },
    });

    if (isNameExist)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game name is already used',
      );
  }

  private static async getGameTemplateId() {
    const template = await prisma.gameTemplates.findUnique({
      where: { slug: this.TRUE_OR_FALSE_SLUG },
      select: { id: true },
    });

    if (!template)
      throw new ErrorResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Game template not found',
      );

    return template.id;
  }
}
