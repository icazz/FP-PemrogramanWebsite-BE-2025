import { type z } from 'zod';

import { CreateAirplaneSchema } from './create-airplane.schema';

export const UpdateAirplaneSchema = CreateAirplaneSchema.partial();

export type IUpdateAirplane = z.infer<typeof UpdateAirplaneSchema>;
