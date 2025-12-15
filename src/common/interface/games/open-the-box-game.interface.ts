// Interface untuk item di dalam setiap kotak
export interface IOpenTheBoxItem {
  id: string;
  boxNumber: number;
  type: 'text' | 'image';
  content: string;
  isLocked?: boolean;
}

export interface IOpenTheBoxGameData {
  items: IOpenTheBoxItem[];
  settings: {
    theme: 'classic' | 'modern' | 'mystery';
    randomize: boolean;
  };
}
