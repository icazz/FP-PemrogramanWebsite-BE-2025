import z from 'zod';

export const GameIdSchema = z.object({
  game_id: z.string().uuid('Invalid game ID format (must be UUID)'),
});
