export type ISpeedSortingTimerMode = 'NONE' | 'COUNT_UP' | 'COUNT_DOWN';

export interface ISpeedSortingCategory {
  id: string;
  name: string;
}

export interface ISpeedSortingItem {
  id: string;
  value: string;
  category_id: string;
  type: 'text' | 'image';
}

export interface ISpeedSortingJson {
  categories: ISpeedSortingCategory[];
  items: ISpeedSortingItem[];
}
