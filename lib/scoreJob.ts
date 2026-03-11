import Anthropic from "@anthropic-ai/sdk";
import { PROFILE } from "./profile";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function scoreJob(
  title: string,
  company: string,
  jobType: string,
  description?: string
): Promise<number> {
  if (!process.env.ANTHROPIC_API_KEY) return 0;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 16,
    messages: [
      {
        role: "user",
        content: `You are a career advisor. Score how well this job fits the candidate's profile. Reply with ONLY a number from 0 to 100. No explanation.

Candidate Profile:
- Title: ${PROFILE.title}
- Skills: ${PROFILE.skills.join(", ")}
- Experience: ${PROFILE.experience}
- Preferences: ${PROFILE.preferences}

Job:
- Title: ${title}
- Company: ${company}
- Type: ${jobType}
${description ? `- Description: ${description.slice(0, 1500)}` : ""}

Fit score (0-100):`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text.trim() : "0";
  const score = parseInt(text);
  return isNaN(score) ? 0 : Math.min(100, Math.max(0, score));
}
