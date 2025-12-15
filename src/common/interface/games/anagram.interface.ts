export interface IAnagramJson {
  score_per_question: number; //score dasar per huruf
  is_question_randomized: boolean; //apakah pertanyaan diacak

  questions: {
    question_id: string;
    image_url: string;
    correct_word: string;
  }[];
}

//data yang dikirim ke FE saat pemain memulai game
export interface IAnagramGamePlayItem {
  question_id: string;
  image_url: string;
  shuffled_letters: string[]; //huruf yang sudah diacak
}

//data yang dikirim ke FE saat membuat game baru
export interface ICreateAnagramQuestion {
  correct_word: string;
  //index file untuk memetakan gambar yang diupload ke soal ini
  question_image_array_index: number;
}
