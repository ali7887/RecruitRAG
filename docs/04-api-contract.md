# API Contract

## POST /api/analyze

### Request

multipart/form-data

Fields:
- file
- jobDescription

### Response
```json
{
  "finalScore": 84,
  "similarityScore": 81,
  "llmScore": 87,
  "strengths": [],
  "gaps": [],
  "interviewQuestions": []
}
