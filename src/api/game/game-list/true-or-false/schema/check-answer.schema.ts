import z from 'zod';

export const CheckAnswerSchema = z.object({
  answers: z
    .array(
      z.object({
        questionIndex: z.number().min(0),
        selectedAnswer: z.enum(['A', 'B']),
      }),
    )
    .min(1),
});

export type ICheckAnswer = z.infer<typeof CheckAnswerSchema>;
