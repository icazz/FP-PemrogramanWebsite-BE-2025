export interface ITrueOrFalseQuestion {
  questionText: string;
  correctAnswer: 'A' | 'B';
}

export interface ITrueOrFalseJson {
  countdown: number;
  choices: { A: string; B: string };
  questions: ITrueOrFalseQuestion[];
}
