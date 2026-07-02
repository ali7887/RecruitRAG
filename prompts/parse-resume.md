You are parsing a resume into a small, structured profile. Use ONLY the resume text below — do not invent skills, titles, or years that are not present.

Extract:
- headline: the candidate's current role / seniority in a short phrase (max ~80 chars). If unclear, use the most senior recent title.
- skills: 5–12 concrete technical skills or tools explicitly evidenced. Short canonical names (e.g. "TypeScript", "PostgreSQL", "RAG"). No sentences, no duplicates.
- experienceYears: total years of professional experience as an integer. Use the clearest signal in the text; if none is stated, use null.
- workSummary: a compressed 1–3 sentence summary of the work history — roles, domains, and scope. No bullet lists, no filler.

Return STRICT JSON only — no markdown, no commentary — exactly this shape:

{
  "headline": string,
  "skills": string[],
  "experienceYears": number | null,
  "workSummary": string
}

Resume:
{{resume_text}}
