import { z } from 'zod';

export const CheckAnswerSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  remaining_answers: z.array(z.string()).optional(),
  current_lives: z
    .number()
    .min(0, 'Current lives cannot be negative')
    .optional(),
});

export type ICheckAnswer = z.infer<typeof CheckAnswerSchema>;
