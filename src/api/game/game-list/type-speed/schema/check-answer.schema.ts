import z from 'zod';

export const CheckAnswerSchema = z.object({
  text_id: z.string().regex(/^text-\d{3}$/, 'Invalid text_id format'),
  user_input: z.string().min(1).max(500),
  time_taken: z.number().min(1).max(300),
});

export type ICheckAnswer = z.infer<typeof CheckAnswerSchema>;
