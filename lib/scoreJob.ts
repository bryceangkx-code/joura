const keywords: { words: string[]; points: number }[] = [
  { words: ["operations", "partnerships", "strategy"], points: 20 },
  { words: ["manager", "lead", "head"], points: 15 },
  { words: ["business", "growth", "analytics"], points: 10 },
  { words: ["coordinator", "associate", "specialist"], points: 5 },
];

export async function scoreJob(
  title: string,
  _company: string,
  _jobType: string,
  _description?: string
): Promise<number> {
  const lower = title.toLowerCase();
  let score = 0;
  for (const { words, points } of keywords) {
    for (const word of words) {
      if (lower.includes(word)) score += points;
    }
  }
  return Math.min(100, score);
}
