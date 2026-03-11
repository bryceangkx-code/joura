export type UserProfile = {
  skills?: string[];
  preferred_job_types?: string[];
  preferred_locations?: string[];
};

// Fallback keyword scoring used when no user profile exists
const FALLBACK_KEYWORDS = [
  { words: ["operations", "partnerships", "strategy"], points: 20 },
  { words: ["manager", "lead", "head"], points: 15 },
  { words: ["business", "growth", "analytics"], points: 10 },
  { words: ["coordinator", "associate", "specialist"], points: 5 },
];

export async function scoreJob(
  title: string,
  _company: string,
  jobType: string,
  _description?: string,
  profile?: UserProfile
): Promise<number> {
  const titleLower = title.toLowerCase();
  let score = 0;

  if (profile?.skills && profile.skills.length > 0) {
    // Score based on how many of the user's skills appear in the job title
    for (const skill of profile.skills) {
      if (titleLower.includes(skill.toLowerCase())) {
        score += 15;
      }
    }
    // Bonus if job type matches a preference
    if (
      profile.preferred_job_types?.some((t) =>
        jobType.toLowerCase().includes(t.toLowerCase())
      )
    ) {
      score += 10;
    }
  } else {
    // No profile — use hardcoded keyword fallback
    for (const { words, points } of FALLBACK_KEYWORDS) {
      for (const word of words) {
        if (titleLower.includes(word)) score += points;
      }
    }
  }

  return Math.min(100, score);
}
