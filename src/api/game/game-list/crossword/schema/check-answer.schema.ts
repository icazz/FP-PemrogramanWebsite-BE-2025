import z from 'zod';

export const CheckCrosswordAnswerSchema = z.object({
  // User bisa mengirim satu kata saja (untuk cek instan) atau semua kata sekaligus
  answers: z
    .array(
      z.object({
        word_id: z.string(), // ID kata yang sedang dicek
        user_answer: z.string().trim(), // Jawaban inputan user
      }),
    )
    .min(1),
});

export type ICheckCrosswordAnswer = z.infer<typeof CheckCrosswordAnswerSchema>;
