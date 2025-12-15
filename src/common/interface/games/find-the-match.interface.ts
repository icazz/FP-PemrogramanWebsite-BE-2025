export interface IFindTheMatchJson {
  initial_lives: number;
  items: IFindTheMatchItem[];
}

export interface IFindTheMatchItem {
  question: string;
  answer: string;
}
