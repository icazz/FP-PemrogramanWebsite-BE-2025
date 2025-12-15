export interface IAirplaneQuestion {
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
}

export interface IAirplaneGameData {
  questions: IAirplaneQuestion[];
}
