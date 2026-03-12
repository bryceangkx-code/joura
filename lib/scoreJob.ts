import Anthropic from "@anthropic-ai/sdk";

export type UserProfile = {
  skills?: string[];
  preferred_job_types?: string[];
  preferred_locations?: string[];
};

export type ScoreResult = {
  score: number;
  reason: string | null;
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
  company: string,
  jobType: string,
  _description?: string,
  profile?: UserProfile,
  plan?: string,
  userJobTitle?: string
): Promise<ScoreResult> {
  if (plan === "premium") {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const candidateContext = [
      `Title: ${userJobTitle ?? "Not specified"}`,
      `Skills: ${(profile?.skills ?? []).join(", ") || "Not specified"}`,
    ].join("\n");

    const jobContext = [
      `Job Title: ${title}`,
      `Company: ${company}`,
      `Type: ${jobType}`,
    ].join("\n");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 128,
      messages: [
        {
          role: "user",
          content: `Score how well this candidate matches this job. Return ONLY valid JSON: {"score": <integer 0-100>, "reason": "<one concise sentence>"}

CANDIDATE:
${candidateContext}

JOB:
${jobContext}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const { score, reason } = JSON.parse(cleaned);
    return {
      score: Math.min(100, Math.max(0, Math.round(score))),
      reason: reason ?? null,
    };
  }

  // Keyword scoring for basic/free
  const titleLower = title.toLowerCase();
  let score = 0;

  if (profile?.skills && profile.skills.length > 0) {
    for (const skill of profile.skills) {
      if (titleLower.includes(skill.toLowerCase())) score += 15;
    }
    if (
      profile.preferred_job_types?.some((t) =>
        jobType.toLowerCase().includes(t.toLowerCase())
      )
    ) {
      score += 10;
    }
  } else {
    for (const { words, points } of FALLBACK_KEYWORDS) {
      for (const word of words) {
        if (titleLower.includes(word)) score += points;
      }
    }
  }

  return { score: Math.min(100, score), reason: null };
}
