/**
 * Pre-engineered prompts for Claude / Gemini to bridge daily work into Dev Journal
 */

export const WORK_PROMPTS = [
  {
    id: 'project_deepdive',
    title: 'Prompt 1: Project Architecture & Contribution Deep-Dive',
    subtitle: 'Extract comprehensive engineering resume data from PRs, design docs, or repository overview',
    badge: 'Project / Architecture',
    promptText: `You are helping me document an engineering project I contributed to or built for my senior developer career portfolio and resume.

Based on the following repository context, PR details, or design notes:
---
[PASTE YOUR REPO README, PR DIFFS, ARCHITECTURE NOTES, OR TICKET SUMMARY HERE]
---

Please analyze and format the response into this clean, structured digest:
1. Project Title: (Punchy engineering name)
2. Core Objective: (1-2 sentences on what problem this system solves)
3. Architecture & Tech Stack: (e.g., Go, Kafka, Redis, Docker, gRPC, PostgreSQL)
4. My Key Contributions:
   - Specific system, service, or pipeline built
   - Concurrency, data flow, or caching strategies implemented
   - Key APIs or data schemas designed
5. Technical Challenges & Solutions: (How bottlenecks, race conditions, or edge cases were handled)
6. Quantifiable Performance & Business Impact: (e.g., "Reduced p99 latency by 45%", "Handled 15k req/sec with <10ms response", "Saved $4k/mo in cloud egress costs")`
  },
  {
    id: 'daily_standup_recap',
    title: 'Prompt 2: Daily Dev Standup & Work Recap',
    subtitle: 'Transform raw daily commits, Slack updates, or terminal logs into structured journal records',
    badge: 'Daily Standup / Sprints',
    promptText: `Here is a dump of my commits, ticket updates, code review notes, or rough developer thoughts from today:
---
[PASTE TODAY'S RAW COMMITS, PULL REQUEST COMMENTS, OR NOTES HERE]
---

Please convert this into a clean engineering work log format:
• Date: [Today's Date, e.g., 2026-10-02]
• Focus Area / Category: [Feature / Performance / Bug Fix / Architecture / DevOps / Refactor]
• What I Built & Solved: (Concise, engineering-level bullet points explaining the problem, the implementation, and the code logic)
• Technologies & Tools Used: [Comma-separated tags, e.g., Go, PostgreSQL, Docker, Redis, pprof]
• Measurable Impact or Milestone: (Any latency decrease, test coverage gain, memory leak resolved, or sprint milestone achieved)`
  },
  {
    id: 'personal_project_deepdive',
    title: 'Prompt 3: Personal & Open-Source Project Deep-Dive',
    subtitle: 'Transform your GitHub repos, side projects, or indie hacking experiments into high-impact portfolio & resume project entries',
    badge: 'Personal / Side Project',
    promptText: `You are helping me document a personal / open-source engineering project for my developer career portfolio and resume.

Here are my project details, GitHub README, architecture notes, or code overview:
---
[PASTE YOUR PERSONAL PROJECT README, GITHUB REPO LINK, TECH STACK, OR ARCHITECTURE NOTES HERE]
---

Please analyze and format this into a clean, structured personal project entry:
• Project Name: (Punchy engineering name, e.g., "KubeWatch — Real-Time Kubernetes Cluster Event Streamer")
• Category: Personal Project
• Live / GitHub URL: (e.g., https://github.com/yourusername/project or live demo link)
• Tech Stack: (e.g., Go, React, Redis, Docker, Tailwind, AWS)
• Core Objective: (1-2 sentences on what real-world problem this project solves)
• Architecture & Key Engineering Features:
  - Core system modules, APIs, or database models implemented
  - Concurrency, caching, state management, or streaming pipeline designed
  - Performance benchmarks, testing coverage, or CI/CD deployment setup
• Measurable Results & Impact: (e.g., "Deployed to production on AWS with Docker; handles 1,000+ test req/sec with <15ms latency", "50+ GitHub stars, 100+ active users")`
  }
];

