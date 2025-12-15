// src/common/interface/games/crossword.interface.ts

export type ICrosswordDirection = 'horizontal' | 'vertical';

export interface ICrosswordWord {
  id: string; // ID unik internal untuk referensi checking
  number: number; // Nomor soal yang tampil di UI (1, 2, dst)
  direction: ICrosswordDirection;
  row_index: number; // Koordinat Y awal
  col_index: number; // Koordinat X awal
  answer: string; // Jawaban benar (disimpan UPPERCASE)
  clue: string; // Soal/Petunjuk
}

export interface ICrosswordJson {
  rows: number; // Total baris grid
  cols: number; // Total kolom grid
  words: ICrosswordWord[];
}

// Interface data untuk pemain (jawaban disembunyikan)
export interface ICrosswordPlayData {
  rows: number;
  cols: number;
  // Mengirim panjang kata (length) sebagai pengganti answer agar FE bisa merender kotak input
  words: (Omit<ICrosswordWord, 'answer'> & { length: number })[];
}
