import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import { ErrorResponse, prisma } from '@/common';
import {
  type IImageQuizAnswer,
  type IImageQuizConfig,
  type IImageQuizJson,
  type IImageQuizQuestion,
} from '@/common/interface/games/image-quiz.interface';
import { FileManager } from '@/utils';

import { type ICheckAnswer, type ICreateImageQuiz } from './schema';
import { type IUpdateImageQuiz } from './schema/update-image-quiz.schema';

type CreateQuestionProps = ICreateImageQuiz['questions'][number];

export abstract class ImageQuizService {
  private static imageQuizSlug = 'image-quiz';
  private static readonly timeLimit = 30;
  private static readonly tileCount = 128;
  private static readonly revealInterval = 0.23;

  // mengambil data input, upload file, konversinya menjadi struktur akhir (IImageQuizJson), simpan ke db
  static async createImageQuiz(data: ICreateImageQuiz, user_id: string) {
    await this.existGameCheck(data.name);

    const newGameId = v4();
    const templateId = await this.getGameTemplateId();

    for (const [index, question] of data.questions.entries()) {
      const isValidCorrectId = question.answers.some(
        (ans: IImageQuizAnswer) => ans.answer_id === question.correct_answer_id,
      );

      if (!isValidCorrectId) {
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          `Question no. ${index + 1}: Correct Answer ID not found in options.`,
        );
      }
    }

    const thumbnailPath = await FileManager.upload(
      `game/${this.imageQuizSlug}/${newGameId}`,
      data.thumbnail_image,
    );

    const imageArray: string[] = [];

    if (data.files_to_upload) {
      for (const image of data.files_to_upload) {
        const path = await FileManager.upload(
          `game/${this.imageQuizSlug}/${newGameId}`,
          image,
        );
        imageArray.push(path);
      }
    }

    const gameJson: IImageQuizJson = {
      //   base_score: data.base_score,
      //   timeLimit_seconds: data.timeLimit,
      //   tileCount: data.tileCount,
      //   revealInterval: data.revealInterval,
      is_question_randomized: data.is_question_randomized,
      is_answer_randomized: data.is_answer_randomized,
      questions: data.questions.map(
        (q: CreateQuestionProps) =>
          ({
            question_id: q.question_id,
            question_text: q.question_text,
            correct_answer_id: q.correct_answer_id,
            answers: q.answers,
            question_image_url: imageArray[q.question_image_array_index] || '',
          }) as IImageQuizQuestion,
      ),
    };

    // 5. Simpan ke Database
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

  // Get Game Detail untuk Creator atau Super Admin
  static async getImageQuizDetail(
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

    // 1. Cek apakah game ada dan slug-nya benar
    if (!game || game.game_template.slug !== this.imageQuizSlug)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    // 2. Cek Hak Akses: Hanya Pembuat atau Super Admin yang boleh lihat
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

  // berhasil mengambil data, memvalidasi akses, dan membuang kunci jawaban (security)
  static async getImageQuizPlay(
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
        creator_id: true,
        game_json: true,
        game_template: { select: { slug: true } },
      },
    });

    if (!game || game.game_template.slug !== this.imageQuizSlug)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (is_public && !game.is_published)
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Game not found or private',
      );

    if (
      !is_public &&
      user_role !== 'SUPER_ADMIN' &&
      game.creator_id !== user_id
    )
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot access this game',
      );

    const gameJson = game.game_json as unknown as IImageQuizJson;

    const config: IImageQuizConfig = {
      time_limit_seconds: ImageQuizService.timeLimit,
      total_tiles: ImageQuizService.tileCount,
      reveal_interval: ImageQuizService.revealInterval,
    };

    const safeQuestions = gameJson.questions.map(q => ({
      question_id: q.question_id,
      question_text: q.question_text,
      question_image_url: q.question_image_url,
      answers: gameJson.is_answer_randomized
        ? this.shuffleArray(q.answers)
        : q.answers,
    }));

    // const safeQuestions = gameJson.questions.map(q => {
    //   // Destructure untuk membuang correct_answer_id
    //   const { correct_answer_id: _correctAnswerId, ...rest } = q;

    //   return {
    //     ...rest,
    //     // Cek flag is_answer_randomized
    //     answers: gameJson.is_answer_randomized
    //       ? this.shuffleArray(rest.answers)
    //       : rest.answers,
    //   };
    // });

    const finalQuestions = gameJson.is_question_randomized
      ? this.shuffleArray(safeQuestions)
      : safeQuestions;

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      tile_config: config,
      questions: finalQuestions,
    };
  }

  // delete game
  static async deleteImageQuiz(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    // 1. Cari game untuk validasi hak akses dan mendapatkan path file yang perlu dihapus
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        thumbnail_image: true,
        game_json: true,
        creator_id: true,
        game_template: { select: { slug: true } },
      },
    });

    if (!game || game.game_template.slug !== this.imageQuizSlug)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    // 2. Validasi Hak Akses (Hanya pembuat atau Super Admin yang boleh hapus)
    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot delete this game',
      );

    // 3. Kumpulkan Path File untuk Dihapus
    const gameJson = game.game_json as unknown as IImageQuizJson;
    const oldImagePaths: string[] = [];

    if (game.thumbnail_image) oldImagePaths.push(game.thumbnail_image);

    if (gameJson.questions) {
      for (const q of gameJson.questions) {
        if (q.question_image_url) oldImagePaths.push(q.question_image_url);
      }
    }

    // 4. Hapus Data dari Database
    await prisma.games.delete({ where: { id: game_id } });

    // 5. Hapus File Fisik dari Server (FileManager)
    for (const path of oldImagePaths) {
      await FileManager.remove(path); // Asumsi FileManager.remove tersedia di utilitas proyek
    }

    return { id: game_id };
  }

  static async updateImageQuiz(
    data: IUpdateImageQuiz,
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
        game_template: { select: { slug: true } },
      },
    });

    if (!game || game.game_template.slug !== this.imageQuizSlug)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot update this game',
      );

    const oldQuizJson = game.game_json as IImageQuizJson | null;
    const oldImagePaths: string[] = [];

    // 2. Kumpulkan semua path gambar lama (Thumbnail + Questions)
    if (game.thumbnail_image) oldImagePaths.push(game.thumbnail_image);

    if (oldQuizJson?.questions) {
      for (const question of oldQuizJson.questions) {
        if (question.question_image_url)
          oldImagePaths.push(question.question_image_url);
      }
    }

    // 3. Handle Upload File Baru (Thumbnail & Soal)
    let thumbnailImagePath = game.thumbnail_image;

    if (data.thumbnail_image) {
      thumbnailImagePath = await FileManager.upload(
        `game/${this.imageQuizSlug}/${game_id}`,
        data.thumbnail_image,
      );
    }

    const imageArray: string[] = [];

    if (data.files_to_upload) {
      for (const image of data.files_to_upload) {
        const newImagePath = await FileManager.upload(
          `game/${this.imageQuizSlug}/${game_id}`,
          image,
        );
        imageArray.push(newImagePath);
      }
    }

    // 4. Konstruksi JSON Baru (Mempertahankan data lama yang tidak di-update)
    const questionsToUpdate = data.questions ?? oldQuizJson?.questions ?? [];

    const newQuestions = questionsToUpdate.map(question => {
      let questionImageUrl: string | null = null;

      // Cek apakah user mengirim index file baru (number) atau path file lama (string)
      if (question && 'question_image_array_index' in question) {
        // 1. Cek apakah user mengirim index file baru (number)
        if (typeof question.question_image_array_index === 'number') {
          questionImageUrl = imageArray[question.question_image_array_index]; // File baru
        }
        // 2. Cek apakah user mengirim path file lama (string)
        else if (typeof question.question_image_array_index === 'string') {
          questionImageUrl = question.question_image_array_index; // Path lama
        }
      }

      // 3. Jika tidak ada index/path, cari path lama dari JSON lama
      else {
        const oldQuestion = oldQuizJson?.questions.find(
          q => q.question_id === question.question_id,
        );
        questionImageUrl = oldQuestion?.question_image_url ?? null;
      }

      return {
        ...question,
        question_image_url: questionImageUrl,
      };
    });

    const quizJson: IImageQuizJson = {
      // Gabungkan flags randomization dengan flags lama
      is_question_randomized:
        data.is_question_randomized ??
        oldQuizJson?.is_question_randomized ??
        false,
      is_answer_randomized:
        data.is_answer_randomized ?? oldQuizJson?.is_answer_randomized ?? false,

      // [BASE SCORE DIHAPUS, TIDAK PERLU DISALIN LAGI]

      questions: newQuestions as IImageQuizQuestion[],
    };

    // 5. Update Database
    const updatedGame = await prisma.games.update({
      where: { id: game_id },
      data: {
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_publish,
        game_json: quizJson as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    // 6. Hapus File Lama yang Tidak Digunakan Lagi
    // (Logic ini menyalin QuizService untuk menghindari sampah file di server)
    const newImagePaths: string[] = [thumbnailImagePath];

    if (quizJson.questions) {
      for (const question of quizJson.questions) {
        if (question.question_image_url)
          newImagePaths.push(question.question_image_url);
      }
    }

    for (const oldPath of oldImagePaths) {
      if (!newImagePaths.includes(oldPath)) {
        await FileManager.remove(oldPath);
      }
    }

    return updatedGame;
  }

  // memvalidasi jawaban, menghitung skor, mengembalikan hasil
  static async checkAnswer(data: ICheckAnswer, game_id: string) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: { game_json: true, game_template: { select: { slug: true } } },
    });

    if (!game || game.game_template.slug !== this.imageQuizSlug)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    const gameJson = game.game_json as unknown as IImageQuizJson;

    // Variabel untuk menampung hasil total
    let totalScore = 0;
    let correctCount = 0;
    const results = [];

    // LOOPING: Cek setiap jawaban yang dikirim frontend
    for (const userAnswer of data.answers) {
      const question = gameJson.questions.find(
        q => q.question_id === userAnswer.question_id,
      );

      // Jika pertanyaan tidak ditemukan (misal ID salah), kita skip atau tandai salah
      if (!question) {
        results.push({
          question_id: userAnswer.question_id,
          is_correct: false,
          score: 0,
          error: 'Question ID not found',
        });
        continue;
      }

      const isCorrect =
        question.correct_answer_id === userAnswer.selected_answer_id;
      let scoreGained = 0;

      if (isCorrect) {
        correctCount++;
        const timeSpentSeconds = userAnswer.time_spent_ms / 1000;

        // LOGIKA BONUS KECEPATAN (Sama seperti sebelumnya)
        if (timeSpentSeconds >= this.timeLimit) {
          scoreGained = 1;
        } else if (timeSpentSeconds >= 20) {
          scoreGained = 2;
        } else if (timeSpentSeconds >= 10) {
          scoreGained = 3;
        } else if (timeSpentSeconds >= 0) {
          scoreGained = 4;
        }
      }

      // Akumulasi Total Skor
      totalScore += scoreGained;

      results.push({
        question_id: userAnswer.question_id,
        is_correct: isCorrect,
        score: scoreGained,
        correct_answer_id: question.correct_answer_id, // Opsional: Beri kunci jawaban
      });
    }

    // Kembalikan hasil rekapitulasi
    return {
      total_questions: gameJson.questions.length,
      total_answered: data.answers.length,
      correct_count: correctCount,
      total_score: totalScore,
      details: results, // Detail per soal
    };
  }

  static async updatePlayCount(game_id: string) {
    await prisma.games.update({
      where: { id: game_id },
      data: { total_played: { increment: 1 } },
    });
  }

  // --- Helpers --- (berinteraksi dengan Prisma)

  private static async existGameCheck(game_name?: string) {
    if (!game_name) return;
    const game = await prisma.games.findFirst({
      where: { name: game_name },
      select: { id: true },
    });
    if (game)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game name already exists',
      );
  }

  private static async getGameTemplateId() {
    const template = await prisma.gameTemplates.findUnique({
      where: { slug: this.imageQuizSlug },
      select: { id: true },
    });
    if (!template)
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Template Image Quiz not found',
      );

    return template.id;
  }

  private static shuffleArray<T>(array: T[]): T[] {
    return array.sort(() => Math.random() - 0.5);
  }
}
