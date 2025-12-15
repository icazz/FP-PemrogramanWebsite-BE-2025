import { z } from 'zod';

export const CreateAirplaneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  game_data: z.any(),
});

export type ICreateAirplane = z.infer<typeof CreateAirplaneSchema>;
