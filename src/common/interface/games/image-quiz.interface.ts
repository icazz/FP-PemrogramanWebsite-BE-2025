// Struktur jawaban di dalam database
export interface IImageQuizAnswer {
  answer_id: string;
  answer_text: string;
}

// Struktur pertanyaan di dalam database
export interface IImageQuizQuestion {
  question_id: string;
  question_text: string;
  question_image_url: string;
  answers: IImageQuizAnswer[];
  correct_answer_id: string;
}

// Struktur utama JSON yang disimpan di kolom game_json (Tabel Games)
export interface IImageQuizJson {
  questions: IImageQuizQuestion[];
  is_question_randomized: boolean;
  is_answer_randomized: boolean;
  theme?: 'adventure' | 'family100' | 'ocean';
}

// konfigurasi yang dikirim ke frontend
export interface IImageQuizConfig {
  time_limit_seconds: number;
  total_tiles: number;
  reveal_interval: number;
}
