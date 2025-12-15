export function shuffleWord(word: string): string[] {
  const chars = [...word.toUpperCase()];
  let currentIndex = chars.length;
  let randomIndex: number;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [chars[currentIndex], chars[randomIndex]] = [
      chars[randomIndex],
      chars[currentIndex],
    ];
  }

  return chars;
}

export function shuffleArray<T>(array: T[]): T[] {
  for (let index = array.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }

  return array;
}
