export interface ITypeSpeedGameData {
  time_limit: number;
  texts: ITypeSpeedText[];
}

export interface ITypeSpeedText {
  id: string;
  content: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ITypeSpeedResult {
  total_characters: number;
  correct_characters: number;
  incorrect_characters: number;
  wpm: number;
  accuracy: number;
  time_taken: number;
}
