import z from 'zod';

export const CheckMazeChaseAnswerSchema = z.object({
  answers: z
    .array(
      z.object({
        question_index: z.number().min(0),
        selected_answer_index: z.number().min(0),
      }),
    )
    .min(1),
});

export type ICheckMazeChaseAnswer = z.infer<typeof CheckMazeChaseAnswerSchema>;
