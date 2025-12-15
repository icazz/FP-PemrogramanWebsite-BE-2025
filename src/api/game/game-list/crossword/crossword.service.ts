import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 as uuidv4 } from 'uuid';

import { ErrorResponse, prisma } from '@/common';
import {
  type ICrosswordJson,
  type ICrosswordPlayData,
} from '@/common/interface/games/crossword.interface';
import { FileManager } from '@/utils';

import {
  type ICheckCrosswordAnswer,
  type ICreateCrossword,
  type IUpdateCrossword,
} from './schema';

export abstract class CrosswordService {
  private static gameSlug = 'crossword';

  // --- UTILS ---
  private static async getGameTemplateId() {
    const template = await prisma.gameTemplates.findUnique({
      where: { slug: this.gameSlug },
      select: { id: true },
    });

    if (!template) {
      throw new ErrorResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Crossword template not found',
      );
    }

    return template.id;
  }

  // --- 1. CREATE GAME ---
  static async createCrossword(data: ICreateCrossword, user_id: string) {
    const existing = await prisma.games.findFirst({
      where: { name: data.name },
      select: { id: true },
    });

    if (existing) {
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game name already exists',
      );
    }

    this.validateGridIntegrity(data.words);

    const newGameId = uuidv4();
    const templateId = await this.getGameTemplateId();

    let thumbnailPath = '';

    if (data.thumbnail_image) {
      thumbnailPath = await FileManager.upload(
        `game/crossword/${newGameId}`,
        data.thumbnail_image,
      );
    }

    const gameJson: ICrosswordJson = {
      rows: data.rows,
      cols: data.cols,
      words: data.words.map(w => ({
        id: uuidv4(),
        number: w.number,
        direction: w.direction,
        row_index: w.row_index,
        col_index: w.col_index,
        answer: w.answer.toUpperCase(),
        clue: w.clue,
      })),
    };

    const newGame = await prisma.games.create({
      data: {
        id: newGameId,
        game_template_id: templateId,
        creator_id: user_id,
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailPath,
        is_published: data.is_publish_immediately,
        game_json: gameJson as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    return newGame;
  }

  // --- 2. UPDATE GAME ---
  static async updateCrossword(
    game_id: string,
    data: IUpdateCrossword,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        creator_id: true,
        thumbnail_image: true,
        game_json: true,
        game_template: { select: { slug: true } },
      },
    });

    if (!game || game.game_template.slug !== this.gameSlug) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id) {
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'Unauthorized to update this game',
      );
    }

    // --- VALIDASI TAMBAHAN (FIX) ---
    // Cek apakah user mencoba update parsial pada Grid
    const hasGridUpdate =
      data.rows !== undefined ||
      data.cols !== undefined ||
      data.words !== undefined;

    const isCompleteGridUpdate =
      data.rows !== undefined &&
      data.cols !== undefined &&
      data.words !== undefined;

    // Jika ada salah satu properti grid dikirim, tapi tidak lengkap, lempar Error
    if (hasGridUpdate && !isCompleteGridUpdate) {
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Invalid Grid Update: If you want to update the grid layout, you MUST provide "rows", "cols", and "words" together.',
      );
    }
    // --------------------------------

    let newGameJson = game.game_json as unknown as ICrosswordJson;

    // Jika user mengirim update grid lengkap
    if (isCompleteGridUpdate) {
      // TypeScript sekarang tahu data.words, rows, cols pasti ada (karena validasi di atas)
      this.validateGridIntegrity(data.words!);

      newGameJson = {
        rows: data.rows!,
        cols: data.cols!,
        words: data.words!.map(w => ({
          id: uuidv4(),
          number: w.number,
          direction: w.direction,
          row_index: w.row_index,
          col_index: w.col_index,
          answer: w.answer.toUpperCase(),
          clue: w.clue,
        })),
      };
    }

    // ... sisa kode logic update image dan prisma update sama seperti sebelumnya
    let thumbnailPath = game.thumbnail_image;

    if (data.thumbnail_image) {
      if (game.thumbnail_image) await FileManager.remove(game.thumbnail_image);
      thumbnailPath = await FileManager.upload(
        `game/crossword/${game_id}`,
        data.thumbnail_image,
      );
    }

    const updated = await prisma.games.update({
      where: { id: game_id },
      data: {
        name: data.name,
        description: data.description,
        is_published: data.is_publish,
        thumbnail_image: thumbnailPath,
        game_json: newGameJson as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    return updated;
  }

  // --- 3. GET GAME DATA (PLAY) ---
  static async getCrosswordPlay(
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
        game_template: { select: { slug: true } },
      },
    });

    if (!game || game.game_template.slug !== this.gameSlug) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    if (is_public && !game.is_published) {
      throw new ErrorResponse(StatusCodes.FORBIDDEN, 'Game is not published');
    }

    if (
      !is_public &&
      user_role !== 'SUPER_ADMIN' &&
      game.creator_id !== user_id
    ) {
      throw new ErrorResponse(StatusCodes.FORBIDDEN, 'Unauthorized access');
    }

    const fullJson = game.game_json as unknown as ICrosswordJson;

    const playData: ICrosswordPlayData = {
      rows: fullJson.rows,
      cols: fullJson.cols,
      words: fullJson.words.map(w => ({
        id: w.id,
        number: w.number,
        direction: w.direction,
        row_index: w.row_index,
        col_index: w.col_index,
        clue: w.clue,
        length: w.answer.length,
      })),
    };

    return {
      ...game,
      game_json: undefined,
      ...playData,
    };
  }

  // --- 4. CHECK ANSWER ---
  static async checkAnswer(game_id: string, data: ICheckCrosswordAnswer) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: { game_json: true, game_template: { select: { slug: true } } },
    });

    if (!game || game.game_template.slug !== this.gameSlug) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    const gameJson = game.game_json as unknown as ICrosswordJson;
    const correctAnswerMap = new Map<string, string>();

    for (const w of gameJson.words) {
      correctAnswerMap.set(w.id, w.answer);
    }

    const results = [];
    let correctCount = 0; // Hitung jumlah benar

    for (const ans of data.answers) {
      const correctWord = correctAnswerMap.get(ans.word_id);

      if (!correctWord) {
        results.push({
          word_id: ans.word_id,
          is_correct: false,
          error: 'Word ID not found',
        });
        continue;
      }

      const isCorrect = correctWord === ans.user_answer.toUpperCase();

      if (isCorrect) {
        correctCount++;
      }

      results.push({
        word_id: ans.word_id,
        is_correct: isCorrect,
      });
    }

    // Hitung total skor (0 - 100) berdasarkan jumlah soal yang ada di Game (bukan yang dikirim user)
    const totalQuestions = gameJson.words.length;
    const score =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;

    return {
      summary: {
        total_questions: totalQuestions,
        correct_count: correctCount,
        score: score,
      },
      results,
    };
  }

  // --- 5. DELETE GAME ---
  static async deleteGame(game_id: string, user_id: string, user_role: ROLE) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: { id: true, creator_id: true, thumbnail_image: true },
    });

    if (!game) throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id) {
      throw new ErrorResponse(StatusCodes.FORBIDDEN, 'Cannot delete this game');
    }

    if (game.thumbnail_image) {
      await FileManager.remove(game.thumbnail_image);
    }

    await prisma.games.delete({ where: { id: game_id } });

    return { id: game_id };
  }

  // --- 6. READ DETAIL (Untuk Edit/Creator) ---
  static async getCrosswordDetail(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        creator_id: true,
        name: true,
        description: true,
        thumbnail_image: true,
        is_published: true, // Penting untuk status di form edit
        game_json: true,
        game_template: { select: { slug: true } },
      },
    });

    if (!game || game.game_template.slug !== this.gameSlug) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    // Validasi Akses: Hanya Creator atau Super Admin yang boleh lihat kunci jawaban
    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id) {
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'Unauthorized to view game details',
      );
    }

    // Return full game data (termasuk answer di dalam game_json)
    return game;
  }

  // --- HELPER ---
  private static validateGridIntegrity(
    words: {
      answer: string;
      direction: 'horizontal' | 'vertical';
      row_index: number;
      col_index: number;
    }[],
  ) {
    const grid: Record<string, string> = {};

    for (const word of words) {
      const length = word.answer.length;

      for (let index = 0; index < length; index++) {
        const r =
          word.direction === 'vertical'
            ? word.row_index + index
            : word.row_index;
        const c =
          word.direction === 'horizontal'
            ? word.col_index + index
            : word.col_index;
        const char = word.answer[index].toUpperCase();
        const key = `${r},${c}`;

        if (grid[key] && grid[key] !== char) {
          throw new ErrorResponse(
            StatusCodes.BAD_REQUEST,
            `Grid Conflict at [Row ${r}, Col ${c}]. Words intersecting here must share the same letter ('${grid[key]}' vs '${char}').`,
          );
        }

        grid[key] = char;
      }
    }
  }
}
