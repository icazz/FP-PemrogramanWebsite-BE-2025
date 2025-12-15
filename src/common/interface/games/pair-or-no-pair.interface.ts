export interface IPairOrNoPairItem {
  id: string;
  left_content: string;
  right_content: string;
}

export interface IPairOrNoPairGameData {
  items: IPairOrNoPairItem[];
}

export interface IStackCard {
  id: string;
  content: string;
}
