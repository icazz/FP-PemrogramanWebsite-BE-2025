export interface ISpinTheWheelJson {
  totalRounds: number;
  questions: ISpinTheWheelQuestion[];
}

export interface ISpinTheWheelQuestion {
  question: string;
  options: string[];
  answerIndex: number;
}
