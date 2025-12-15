export interface IMazeChaseJson<T = IMazeChaseAnswer> {
  score_per_question: number;
  is_question_randomized: boolean;
  is_answer_randomized: boolean;
  map_id: string;
  countdown: number;
  questions: IMazeChaseQuestion<T>[];
}

export interface IMazeChaseQuestion<T> {
  question_text: string;
  answers: T[];
}

export interface IMazeChaseAnswer {
  answer_text: string;
  is_correct: boolean;
}
