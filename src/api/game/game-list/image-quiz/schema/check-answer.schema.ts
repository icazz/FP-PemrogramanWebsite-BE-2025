import z from 'zod';

// Skema untuk satu item jawaban
const SingleAnswerSchema = z.object({
  question_id: z.string().uuid(),
  selected_answer_id: z.string().uuid(),
  time_spent_ms: z.number().min(0),
});

// Skema Utama: Menerima Array 'answers'
export const CheckAnswerSchema = z.object({
  answers: z.array(SingleAnswerSchema).min(1),
});

export type ICheckAnswer = z.infer<typeof CheckAnswerSchema>;
