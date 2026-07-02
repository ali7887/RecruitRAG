# 🚀 RecruitRAG: Enterprise AI-Powered Recruitment SaaS

**RecruitRAG** is a production-ready, multi-tenant hiring intelligence platform. It leverages **RAG (Retrieval-Augmented Generation)** to analyze resumes against job descriptions with precision, providing automated scoring, human-in-the-loop reviews, and deep candidate insights.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![PostgreSQL](https://img.shields.io/badge/Postgres-Drizzle-336791?style=for-the-badge&logo=postgresql)
![AI-Powered](https://img.shields.io/badge/AI-RAG_Driven-cyan?style=for-the-badge)

---

## ✨ Key Features

### 🧠 Core AI & RAG Engine
- **RAG-based Analysis:** Context-aware resume evaluation using semantic search and LLM scoring.
- **Smart Resume Parsing:** Automated extraction of skills, experience, and work history.
- **Scoring Rubric:** Transparent, criteria-based evaluation (0-100) with detailed AI rationale.

### 🏢 Enterprise SaaS Architecture
- **L1 Multi-Tenancy:** Isolated Workspaces for different teams or organizations.
- **RBAC (Role-Based Access Control):** Granular permissions for `Owner`, `Recruiter`, and `Viewer`.
- **Audit Logs:** Full traceability of every critical action (Status changes, Analysis runs, etc.).

### 🤖 Automation & Intelligence
- **Smart Pipeline:** Automated shortlisting/rejecting based on configurable AI thresholds.
- **Feedback Loop:** Human-in-the-loop scoring adjustments to refine AI logic.
- **Portfolio Analytics:** Cross-project insights to find reusable talent across your entire organization.

### 🔌 External Integration
- **Secure External API:** HMAC-signed (SHA256) endpoints for seamless ATS/CRM integrations.
- **Webhook-ready:** Designed for automated candidate ingestion.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Styling:** Tailwind CSS + Shadcn/UI
- **Security:** HMAC Request Signing, Cookie-based Auth, RBAC
- **State Management:** Server Components + Server Actions

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL instance
- API Keys for OpenAI/Anthropic (optional, features demo mode)

### Installation
1. Clone the repository:
```bash
   git clone https://github.com/yourusername/recruit-rag.git
   
