import z from 'zod';

//skema untuk memeriksa jawaban anagram
export const CheckAnagramAnswerSchema = z.object({
  answers: z
    .array(
      z.object({
        //di anagram, kita memeriksa per soal (bukan index)
        question_id: z.string().uuid(),
        //kata yang ditebak oleh pemain
        guessed_word: z.string().max(50).trim(),
        //array selalu menandai apakah huruf di index tersebut didapat dari hint?
        //disini sangat penting untuk perhitungan skor unik di anagram
        is_hinted: z.array(z.boolean()).optional(), //optional karena pemain mungkin tidak menggunakan hint samsek
      }),
    )
    .min(1),
});

//tipe untuk memeriksa jawaban anagram
export type ICheckAnagramAnswer = z.infer<typeof CheckAnagramAnswerSchema>;
