import type { AnalysisResult } from "@/lib/types";

// Static, realistic analysis used when USE_DEMO_MODE=true, so the app can be
// demonstrated without OpenAI/Anthropic credits. Never used in real mode.
export function getDemoAnalysisResult(): AnalysisResult {
  return {
    finalScore: 82,
    similarityScore: 78,
    llmScore: 86,
    strengths: [
      "Strong React and TypeScript alignment with the role's core stack",
      "Relevant frontend architecture experience across Next.js App Router projects",
      "Good fit for product-focused engineering teams and fast iteration",
    ],
    gaps: [
      "Limited explicit backend ownership beyond API integration",
      "More production AI/RAG experience would strengthen the profile",
    ],
    interviewQuestions: [
      "Describe how you structure a large Next.js application.",
      "How do you prevent hydration issues in the App Router?",
      "How would you optimize a resume-matching RAG pipeline?",
    ],
  };
}
