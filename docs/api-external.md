# RecruitRAG External API (Phase 21)

Secure, workspace-scoped endpoints for external ATS/CRM integrations. Every
request is authenticated with an HMAC signature — there is no OAuth in this phase.

## Authentication

Each request must include an `X-RAG-Signature` header:

```
X-RAG-Signature: HMAC_SHA256(RAG_API_SECRET, payload)   # lowercase hex
```

- The shared secret is `RAG_API_SECRET` (server env). Local/demo default:
  `recruitrag-dev-secret`.
- **POST** requests sign the **raw JSON body**.
- **GET** requests sign the string `"<projectId>:<workspaceId>"`.

Requests are rejected with `401` when the signature is missing or invalid, and
`403` when the `workspaceId` is unknown. All data access is scoped to the
provided workspace — cross-workspace access is impossible.

### Computing the signature

Node:

```js
const crypto = require("node:crypto");
const body = JSON.stringify({ name: "Amir Khan", resumeText: "…", workspaceId: "ws-startup" });
const sig = crypto.createHmac("sha256", process.env.RAG_API_SECRET).update(body).digest("hex");
```

Shell (openssl):

```bash
BODY='{"name":"Amir Khan","resumeText":"React, TypeScript, 5 years","workspaceId":"ws-startup"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$RAG_API_SECRET" | awk '{print $2}')
```

## Endpoints

### POST /api/external/candidates

Create a candidate in a workspace.

```bash
curl -X POST http://localhost:3000/api/external/candidates \
  -H "Content-Type: application/json" \
  -H "X-RAG-Signature: $SIG" \
  -d "$BODY"
```

Body: `{ "name": string, "resumeText": string, "workspaceId": string }`
Response `201`: `{ "id": string, "name": string }`

### POST /api/external/analyze

Analyze a stored candidate against a project (defaults to the workspace's first
project when `projectId` is omitted).

```bash
BODY='{"candidateId":"<uuid>","workspaceId":"ws-startup"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$RAG_API_SECRET" | awk '{print $2}')
curl -X POST http://localhost:3000/api/external/analyze \
  -H "Content-Type: application/json" -H "X-RAG-Signature: $SIG" -d "$BODY"
```

Body: `{ "candidateId": string, "workspaceId": string, "projectId"?: string }`
Response `200`: `{ "analysisId", "projectId", "finalScore", "status", "automationDecision" }`

### GET /api/external/projects/[id]

Project summary + candidate rankings (by effective, review-adjusted score).

```bash
ID="<projectId>"; WS="ws-startup"
SIG=$(printf '%s' "$ID:$WS" | openssl dgst -sha256 -hmac "$RAG_API_SECRET" | awk '{print $2}')
curl "http://localhost:3000/api/external/projects/$ID?workspaceId=$WS" \
  -H "X-RAG-Signature: $SIG"
```

Response `200`:

```json
{
  "id": "…",
  "title": "Frontend Engineer (Next.js/TS)",
  "requirements": "React, TypeScript, …",
  "candidateCount": 2,
  "averageScore": 71,
  "rankings": [
    { "candidateId": "…", "name": "Amir_Frontend.pdf", "score": 82, "status": "shortlisted", "automationDecision": "Auto-shortlisted" }
  ]
}
```

## Status codes

| Code | Meaning |
| --- | --- |
| 200 | OK |
| 201 | Candidate created |
| 400 | Missing/invalid parameters or JSON |
| 401 | Missing or invalid HMAC signature |
| 403 | Unknown `workspaceId` |
| 404 | Candidate/project not found in the workspace |
