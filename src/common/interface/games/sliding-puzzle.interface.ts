export interface ISlidingPuzzleJson {
  puzzle_image: string; // URL to the puzzle image
  grid_size: number; // 3, 4, 5, or 6 (for 3x3, 4x4, 5x5, 6x6 grid)
  time_limit?: number; // Optional time limit in seconds
  max_hint_percent?: number; // Percentage of max steps (0-100)
}
