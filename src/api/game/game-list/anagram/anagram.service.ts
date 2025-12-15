import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import { ErrorResponse, prisma } from '@/common';
import { type IAnagramJson } from '@/common/interface/games/anagram.interface';
import { FileManager } from '@/utils';
import { shuffleArray, shuffleWord } from '@/utils/word-shuffle.util';

import {
  type ICheckAnagramAnswer,
  type ICreateAnagram,
  type IUpdateAnagram,
} from './schema';

export abstract class AnagramService {
  //menyesuaikan slug dengan yang ada di game-templates.data.csv
  private static anagramSlug = 'anagram';

  // utility 1 : cek nama game sudah ada
  //diambil dari logika existsgamecheck di quizservice dengan sedikit penyesuaian
  private static async existsGameCheck(game_name: string, game_id?: string) {
    const where: Record<string, unknown> = {};
    if (game_name) where.name = game_name;
    //hanya menambahkan game_id jika ada, biasanya untuk cek nama saat update
    if (Object.keys(where).length === 0) return null;

    const game = await prisma.games.findFirst({
      where: { name: game_name }, //check hanya berdasarkan nama
      select: { id: true, creator_id: true },
    });

    if (game && game.id !== game_id)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game name is already exists',
      );

    return game;
  }

  // utility 2 : mendapatkan template id
  private static async getGameTemplateId() {
    const result = await prisma.gameTemplates.findUnique({
      where: { slug: this.anagramSlug },
      select: { id: true },
    });

    if (!result)
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Anagram Game template not found',
      );

    return result.id;
  }

  //1. LOGIKA CREATE GAME ANAGRAM
  static async createAnagram(data: ICreateAnagram, user_id: string) {
    //cek nama game unik
    await this.existsGameCheck(data.name);

    const newGameId = v4(); //membuat id game baru
    //dapatkan template id anagram
    const anagramTemplateId = await this.getGameTemplateId();

    //1. VALIDASI FILE DAN INDEX
    const questionWithImageAmount = data.questions.length;
    if (questionWithImageAmount !== data.files_to_upload.length)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'All questions must have a corresponding image file uploaded',
      );

    // 2. Upload Thumbnail (jika ada)
    let thumbnailImagePath: string | undefined;

    if (data.thumbnail_image) {
      thumbnailImagePath = await FileManager.upload(
        `game/anagram/${newGameId}`,
        data.thumbnail_image,
      );
    }

    //3. upload gambar soal dan buat array url
    const imageArray: string[] = [];

    for (const image of data.files_to_upload) {
      const newImagePath = await FileManager.upload(
        `game/anagram/${newGameId}`,
        image,
      );
      imageArray.push(newImagePath);
    }

    //4. membuat objek IAnagramJson
    const anagramJson: IAnagramJson = {
      score_per_question: 1,
      is_question_randomized: data.is_question_randomized,
      questions: data.questions.map(
        (question: ICreateAnagram['questions'][number]) => ({
          question_id: v4(),
          correct_word: question.correct_word.toUpperCase(),
          image_url: imageArray[question.question_image_array_index],
        }),
      ),
    };

    //5. simpan ke database
    const newGame = await prisma.games.create({
      data: {
        id: newGameId,
        game_template_id: anagramTemplateId,
        creator_id: user_id,
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath ?? '', // empty string fallback for non-nullable Prisma field
        is_published: data.is_publish_immediately,
        game_json: anagramJson as unknown as Prisma.InputJsonValue, //pastikan di cast ke JsonObject
      },
      select: { id: true },
    });

    return newGame;
  }

  //2. LOGIKA PLAY GAME ANAGRAM (GET)
  static async getAnagramPlay(
    game_id: string,
    is_public: boolean,
    user_id?: string,
    user_role?: ROLE,
  ) {
    //mengambil game dari database
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnail_image: true,
        game_json: true,
        creator_id: true,
        is_published: true,
        game_template: { select: { slug: true } },
      },
    });

    //1. validasi game ditemukan dan slug benar
    if (
      !game ||
      game.game_template.slug !== this.anagramSlug ||
      (is_public && !game.is_published) //cek status publik jika diminta akses publik
    )
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Anagram game not found or not published',
      );

    //2. validasi akses (jika akses privat)
    if (
      !is_public &&
      user_role !== 'SUPER_ADMIN' &&
      game.creator_id !== user_id
    )
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You do not have access to this game',
      );
    const anagramJson = game.game_json as unknown as IAnagramJson;

    if (
      !anagramJson ||
      !anagramJson.questions ||
      anagramJson.questions.length === 0
    )
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Anagram data not found or empty questions',
      );

    let questions = anagramJson.questions;

    //3. randomisasi urutan soal jika is_question_randomized = true
    if (anagramJson.is_question_randomized) {
      questions = shuffleArray(questions); //menggunakan utilitas shufflearray
    }

    //4. menyiapkan data untuk FE (melakukan SHUFFLE HURUF di BE)
    const cleanedQuestions = questions.map(q => {
      //melakukan SHUFFLE HURUF
      const shuffledLetters = shuffleWord(q.correct_word);

      return {
        question_id: q.question_id,
        image_url: q.image_url,
        shuffled_letters: shuffledLetters, //array huruf acak
        //menambahkan informasi batas hint (setiap 5 huruf = 1 hint, dibulatkan ke atas)
        hint_limit: Math.ceil(q.correct_word.replaceAll(/\s/g, '').length / 5),
        correct_word: q.correct_word,
      };
    });

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      is_published: game.is_published,
      questions: cleanedQuestions,
    };
  }

  // 3. LOGIKA CHECK ANSWER (POST)
  static async checkAnagramAnswer(data: ICheckAnagramAnswer, game_id: string) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        game_json: true,
        game_template: { select: { slug: true } },
      },
    });

    if (!game || game.game_template.slug !== this.anagramSlug)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    const anagramJson = game.game_json as unknown as IAnagramJson;
    const result = [];
    let totalScore = 0;

    const correctWordMap = new Map(
      anagramJson.questions.map(q => [q.question_id, q.correct_word]),
    );

    //max score dihitung berdasarkan perfect score (x2)
    const totalLetters = anagramJson.questions.reduce(
      (accumulator, q) => accumulator + q.correct_word.length,
      0,
    );
    const maxScore = totalLetters * 2;

    for (const answer of data.answers) {
      const correctWord = correctWordMap.get(answer.question_id);
      const guessedWord = answer.guessed_word.toUpperCase();
      const isHinted = answer.is_hinted ?? []; //ambil array hint

      if (!correctWord) continue;

      // Remove spaces for letter counting (is_hinted doesn't include spaces)
      const correctWordNoSpaces = correctWord.replaceAll(/\s/g, '');
      const letterCount = correctWordNoSpaces.length;
      const hintCount = isHinted.filter(Boolean).length;

      // Compare guessed word with correct word (both with spaces for accuracy)
      const isPerfect = guessedWord === correctWord && hintCount === 0;

      let questionScore = 0;

      //VALIDASI LANJUTAN : CEK KONSISTENSI PANJANG DATA
      if (isHinted.length > 0 && isHinted.length != letterCount) {
        //FE mengirim data hint yang tidak sesuai panjang kata (tanpa spasi)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          `Hint array length mismatch for question ${answer.question_id}`,
        );
      }

      // ========== REVISED SCORING LOGIC (3 MUTUALLY EXCLUSIVE CONDITIONS) ==========
      // Condition 1: PERFECT (x2) - Correct answer WITHOUT any hints
      if (isPerfect) {
        //point x2/huruf
        questionScore = letterCount * 2;
      }
      // Condition 2: INCORRECT/PARTIAL (x1) - Wrong answer WITHOUT hints
      else if (hintCount === 0 && guessedWord !== correctWord) {
        // Count correct letters in correct positions
        let correctMatch = 0;

        for (let index = 0; index < letterCount; index++) {
          if (guessedWord[index] === correctWord[index]) correctMatch++;
        }

        questionScore = correctMatch * 1;
      }
      // Condition 3: HINT USED (Penalty) - Only score non-hinted letters
      else if (hintCount > 0) {
        // Score only the letters that were NOT revealed by hints
        const scoredLetters = letterCount - hintCount;
        questionScore = scoredLetters * 1;
      }
      // Condition 4: Answer submitted but empty
      else {
        questionScore = 0;
      }

      totalScore += questionScore;

      result.push({
        question_id: answer.question_id,
        guessed_word: answer.guessed_word,
        is_correct: guessedWord === correctWord, // Correct if answer matches, regardless of hints
        score: questionScore,
        correct_word: correctWord,
      });
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    return {
      game_id,
      total_questions: anagramJson.questions.length,
      score: totalScore,
      max_score: maxScore,
      percentage: Math.round(percentage * 100) / 100,
      results: result,
    };
  }

  // 4. LOGIKA GET GAME DETAIL
  static async getAnagramGameDetail(
    game_id: string,
    user_id: string,
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
        created_at: true,
        game_json: true,
        creator_id: true,
        total_played: true,
        game_template: { select: { slug: true } },
      },
    });

    if (!game || game.game_template.slug !== this.anagramSlug)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Anagram game not found');

    //check otorisasi: hanya creator atau SUPER ADMIN yang bisa mengakses detail
    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You do not have access to this game',
      );

    const anagramJson = game.game_json as unknown as IAnagramJson;

    return {
      //mengembalikan semua field dari prisma.games
      ...game,
      //menambahkan detail yang diekstrak dari game_json
      is_question_randomized: anagramJson.is_question_randomized,
      questions: anagramJson.questions,

      //hapus field internal yang tidak perlu dikirim ke FE
      creator_id: undefined,
      game_json: undefined,
      game_template: undefined,
    };
  }

  //5. LOGIKA UPDATE GAME
  static async updateAnagram(
    data: IUpdateAnagram,
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    //1. ambil game lama dan cek akses/slug
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        thumbnail_image: true,
        game_json: true,
        creator_id: true,
        game_template: { select: { slug: true } },
      },
    });

    if (!game || game.game_template.slug !== this.anagramSlug)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Anagram Game not Found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot update this game',
      );

    //2. cek nama game unik (jika nama diubah)
    if (data.name && data.name !== game.name) {
      const isNameExist = await prisma.games.findUnique({
        where: {
          name: data.name,
        },
        select: { id: true },
      });

      if (isNameExist && isNameExist.id !== game_id)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Game name is already used',
        );
    }

    const oldAnagramJson = game.game_json as IAnagramJson | null;
    const oldImagePaths: string[] = [];

    //mengumpulkan semua path gambar lama (thumbnail dan soal)
    if (oldAnagramJson?.questions) {
      for (const question of oldAnagramJson.questions) {
        oldImagePaths.push(question.image_url);
      }
    }

    if (game.thumbnail_image) {
      oldImagePaths.push(game.thumbnail_image);
    }

    //3. VALIDASI FILE BARU YANG DIUPLOAD
    // Only validate if files_to_upload exists
    if (data.files_to_upload && data.questions) {
      // Count how many questions have new images (numeric index)
      const questionsWithNewImages = data.questions.filter(
        q => typeof q.question_image_array_index === 'number',
      ).length;

      if (questionsWithNewImages !== data.files_to_upload.length) {
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          `Number of uploaded files (${data.files_to_upload.length}) must match number of questions with new images (${questionsWithNewImages}).`,
        );
      }
    }

    //4. PROSES UPLOAD GAMBAR BARU
    let thumbnailImagePath = game.thumbnail_image;

    if (data.thumbnail_image) {
      thumbnailImagePath = await FileManager.upload(
        `game/anagram/${game_id}`,
        data.thumbnail_image,
      );
    }

    const imageArray: string[] = [];

    if (data.files_to_upload) {
      for (const image of data.files_to_upload) {
        const newImagePath = await FileManager.upload(
          `game/anagram/${game_id}`,
          image,
        );
        imageArray.push(newImagePath);
      }
    }

    //5. CREATE OBJECT IANAGRAM JSON BAru
    const anagramJson: IAnagramJson = {
      score_per_question: oldAnagramJson?.score_per_question ?? 1,
      is_question_randomized:
        data.is_question_randomized ??
        oldAnagramJson?.is_question_randomized ??
        false,
      questions: data.questions
        ? data.questions.map((question, index) => {
            let imageUrl: string = '';

            //jika index berupa angka, ambil dari imageArray baru
            if (typeof question.question_image_array_index === 'number') {
              imageUrl = imageArray[question.question_image_array_index];
            } else if (
              typeof question.question_image_array_index === 'string'
            ) {
              imageUrl = question.question_image_array_index;
            } else {
              // If no question_image_array_index provided, preserve old image
              const oldQuestion = oldAnagramJson?.questions.find(
                q => q.question_id === question.question_id,
              );
              imageUrl = oldQuestion?.image_url ?? '';
            }

            //menentukan id soal:
            // Use question_id from the request if provided, otherwise try to find from old data
            const qId =
              question.question_id ??
              oldAnagramJson?.questions[index]?.question_id ??
              v4();

            return {
              question_id: qId, // menggunakan ID lama atau ID baru
              correct_word: question.correct_word.toUpperCase(),
              image_url: imageUrl,
            };
          })
        : (oldAnagramJson?.questions ?? []),
    };

    //6. Update database
    const updatedGame = await prisma.games.update({
      where: { id: game_id },
      data: {
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath ?? '',
        is_published: data.is_publish, // update publish status from data.is_publish
        game_json: anagramJson as unknown as Prisma.InputJsonValue,
      },

      select: { id: true },
    });

    //7. HAPUS GAMBAR LAMA YANG TIDAK TERPAKAI
    const newImagePaths: string[] = [thumbnailImagePath].filter(
      (p): p is string => !!p,
    ); //filter thumbnail

    if (anagramJson.questions) {
      for (const question of anagramJson.questions) {
        newImagePaths.push(question.image_url);
      }
    }

    //hapus file lama yang tidak ada di path gambar baru
    for (const oldPath of oldImagePaths) {
      if (!newImagePaths.includes(oldPath)) {
        await FileManager.remove(oldPath);
      }
    }

    return updatedGame;
  }

  // 6. LOFIKA DELETE GAME
  static async deleteAnagram(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    //1. ambil game lama dan cek akses/slug
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        thumbnail_image: true,
        game_json: true,
        creator_id: true,
      },
    });

    if (!game)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Anagram Game not Found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot delete this game',
      );

    const oldAnagramJson = game.game_json as IAnagramJson | null;
    const oldImagePaths: string[] = [];

    //mengumpulkan semua path gambar lama (thumbnail dan soal)
    if (oldAnagramJson?.questions) {
      for (const question of oldAnagramJson.questions) {
        oldImagePaths.push(question.image_url);
      }
    }

    //menambahkan path thumbnail
    if (game.thumbnail_image) oldImagePaths.push(game.thumbnail_image);

    //hapus semua file gambar yang terkait
    for (const path of oldImagePaths) {
      await FileManager.remove(path);
    }

    //hapus entri di database
    await prisma.games.delete({ where: { id: game_id } });

    return { id: game_id };
  }
}
