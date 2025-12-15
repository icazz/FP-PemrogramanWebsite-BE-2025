import { StatusCodes } from 'http-status-codes';

import { ErrorResponse, prisma } from '@/common';

export abstract class WhackAMoleScoreService {
  /**
   * Get top 10 scores for a specific whack-a-mole game
   */
  static async getTopScores(game_id: string) {
    const scores = await prisma.leaderboard.findMany({
      where: { game_id },
      orderBy: { score: 'desc' },
      take: 10,
      select: {
        id: true,
        score: true,
        time_taken: true,
        created_at: true,
        user: {
          select: {
            username: true,
            profile_picture: true,
          },
        },
      },
    });

    return scores;
  }

  /**
   * Save new score for whack-a-mole game
   * User can be optional (for guest players)
   */
  static async saveScore(
    game_id: string,
    score: number,
    user_id?: string,
    time_taken?: number,
    mode?: 'normal' | 'nightmare',
  ) {
    // Verify game exists
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: { id: true },
    });

    if (!game) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    // Increment total played
    await prisma.games.update({
      where: { id: game_id },
      data: { total_played: { increment: 1 } },
    });

    // Create leaderboard entry
    const newScore = await prisma.leaderboard.create({
      data: {
        game_id,
        user_id: user_id || null,
        score: Number(score),
        time_taken: time_taken ? Number(time_taken) : null,
      },
      select: {
        id: true,
        score: true,
        time_taken: true,
        created_at: true,
      },
    });

    return {
      ...newScore,
      mode: mode || 'normal',
    };
  }

  /**
   * Get global top scores across all whack-a-mole games
   */
  static async getGlobalTopScores() {
    const scores = await prisma.leaderboard.findMany({
      where: {
        game: {
          game_template: {
            slug: 'whack-a-mole',
          },
        },
      },
      orderBy: { score: 'desc' },
      take: 10,
      select: {
        id: true,
        score: true,
        time_taken: true,
        created_at: true,
        user: {
          select: {
            username: true,
            profile_picture: true,
          },
        },
        game: {
          select: {
            name: true,
          },
        },
      },
    });

    return scores;
  }
}
