# Architecture Decision Records (ADR) & Engineering Design Document

> **Project**: DevSignal (SWE Career & Resume Engine: Tech Market Radar, Dev Journal & ATS Resume Builder)  
> **Target Audience**: Backend Engineers, Systems Developers & Software Engineers  
> **Status**: In Active Development & Local Server Running (`http://localhost:5173/`)  
> **Author**: Antigravity & User  

---

## 1. System Vision & Architecture Overview

The system is designed as an all-in-one career acceleration and resume synthesis studio tailored specifically for software engineers. Unlike standard generic resume builders, this platform connects real daily engineering output (code, PRs, architecture decisions, bug fixes) to an intelligent market radar and an ATS-compliant resume generator.

### Core Data & Workflow Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                          USER / DEVELOPER                              │
└───────┬───────────────────────────────┬────────────────────────┬───────┘
        │ Uploads Resume (PDF/JSON/Text)│ Work Prompts to Claude │ Target Role
        ▼                               ▼                        ▼
┌──────────────────┐           ┌──────────────────┐     ┌────────────────┐
│   Profile &      │           │   Dev Journal    │     │  Tech Market   │
│ Resume Ingestion │           │ (Standups, Sprints│    │     Radar      │
│(pdfjs + AI/Regex)│           │  & Architecture) │     │ (Live HN/Devto)│
└───────┬──────────┘           └────────┬─────────┘     └────────┬───────┘
        │ Synchronizes                  │ Synthesizes            │ Context
        └───────────────► ┌─────────────▼──────────────┐ ◄───────┘
                          │   Live Resume Studio       │
                          │ - 3 SWE Tailored Templates │
                          │ - Realtime A4 Preview      │
                          │ - Vector PDF Generation    │
                          └────────────────────────────┘
```

---

## 2. Architecture Decision Records (ADR)

### ADR 001: Web Framework Selection — React 18 + Vite vs Next.js vs Vanilla JS

* **Status**: Accepted
* **Context**: We need a fast, reactive UI with live split-screen updating, complex dynamic forms (adding/removing work experience, projects, skills tags), tabbed switching, and local state persistence.
* **Options Considered**:
  1. *Vanilla HTML/CSS/JS*: Zero build setup, but managing deep nested state (e.g. `resumeData.experience[i].bullets[j]`), real-time preview re-rendering, and modular template switches becomes spaghetti code prone to DOM desynchronization.
  2. *Next.js (App Router / SSR)*: Excellent for SEO-driven public marketing blogs, but introduces Node server dependencies, cold starts, SSR hydration mismatches with browser `localStorage`, and deployment complexity for what is fundamentally a client-side reactive developer tool.
  3. *React 18 + Vite (Chosen)*: Fast build tool (esbuild/Rollup), instant Hot Module Replacement (HMR), single-page client architecture, runs entirely offline if needed, zero server hosting requirements.
* **Drawbacks of Rejected Approaches**:
  * *Vanilla JS*: High maintenance overhead for complex reactive state; lack of component modularity for multiple resume templates.
  * *Next.js*: Unnecessary SSR complexity; requires Node backend runtime; slower development loop for client-centric single-page apps.
* **Why React + Vite is Superior**:
  * Lightning-fast startup (<300ms) and HMR.
  * Purely static build output can be hosted on GitHub Pages, Cloudflare Pages, S3, or run locally via `npm run dev`.
  * Pure client-side reactivity guarantees that resume edits update the live preview at 60 FPS without lag.

---

### ADR 002: Dual-LLM Routing Strategy (Gemini API + Local Ollama / LM Studio)

* **Status**: Accepted
* **Context**: The user experienced frequent `"Timeout"` and `"No free server / quota exhausted"` errors when relying on cloud AI APIs in previous projects. Furthermore, engineering work logs may contain internal company context that a developer prefers processing locally.
* **Options Considered**:
  1. *Gemini API Only*: High quality and speed, but vulnerable to rate limits (HTTP 429), timeouts, and requires continuous internet connection.
  2. *Local LLM Only (Ollama / LM Studio)*: 100% private and offline, but requires user to have a running local model and sufficient GPU/RAM.
  3. *Pluggable Dual-Provider Architecture with Strategy Pattern (Chosen)*:
     * A unified `LLMService` that exposes common interfaces (`generateCompletion`, `testLlmConnection`).
     * Supports Google Gemini (via direct REST API with current Gemini 3 models: `gemini-3.8-flash` / `gemini-3.7-flash` / `gemini-3.6-flash` / `gemini-3.1-pro-preview`).
     * Supports Local LLM via OpenAI-compatible endpoint (`http://localhost:11434/v1/chat/completions` for Ollama, LM Studio, LocalAI).
     * Single-click toggle in UI Settings, with connection health check and clear fallback alerts.
* **Drawbacks of Alternatives**:
  * Single-cloud lock-in leaves user stranded when rate-limited or offline.
  * Local-only alienates users without local model setups.
* **Why Chosen Strategy is Superior**:
  * Absolute resilience: if Gemini times out or quota drops, switch to `localhost:11434` instantly.
  * Cost-free & private: Developers can run `deepseek-coder` or `llama3` completely offline without leaking proprietary company work logs.

---

### ADR 003: PDF Generation Engine — Engineered CSS `@media print` vs Canvas/Raster (`html2canvas`)

* **Status**: Accepted
* **Context**: Software engineer resumes are heavily scrutinized by Applicant Tracking Systems (ATS) and human recruiters. Resumes must have selectable text, clickable hyperlinks (GitHub, LinkedIn), sharp vector fonts, and exact A4/Letter margins.
* **Options Considered**:
  1. *`html2canvas` + `jspdf` (Raster Image)*: Converts the DOM element into an HTML5 canvas screenshot and embeds the PNG/JPEG into a PDF.
     * *Major Drawback*: **Fatal for ATS**. The resulting PDF is an image! Text cannot be highlighted, screen readers fail, hyperlinks do not work, and fonts look blurry on high-DPI screens or when zoomed in.
  2. *Server-side headless browser (Puppeteer / Playwright)*: High quality, but requires running a Node/Chromium backend server, adding heavy latency and infrastructure costs.
  3. *Client-side Vector Print CSS Engine with `@media print` (Chosen)*:
     * Uses the browser’s native print subsystem (`window.print()`).
     * Styled with strict `@page { size: A4; margin: 0; }` and isolated print stylesheet rules.
     * When the user clicks "Export PDF", the browser's native engine renders 100% crisp vector glyphs, preserved selectable text, active clickable URLs, and zero server roundtrips.
* **Why Chosen Approach is Superior**:
  * 100% ATS-compliant with true selectable text.
  * Zero blurriness at any zoom level.
  * Instant generation with zero backend overhead.

---

### ADR 004: State Management & Offline Persistence

* **Status**: Accepted
* **Context**: Users spend hours refining their resume, writing journal notes, and tweaking profile details. Data loss due to accidental refresh or browser closure is unacceptable.
* **Options Considered**:
  1. *Redux Toolkit / MobX*: Powerful, but introduces boilerplate, actions, dispatchers, and heavy bundle weight for single-user local state.
  2. *Remote Database (PostgreSQL / Firebase)*: Requires authentication, login walls, network availability, and database hosting.
  3. *Centralized React Context + LocalStorage Auto-Sync (Chosen)*:
     * Single source of truth in `AppContext`.
     * Direct state manipulation with clean updater functions.
     * Automatic sync to `localStorage` with versioned schema keys (`dev_resume_studio_v1`).
     * One-click "Export Data (JSON)" and "Import Data (JSON)" backup system.
* **Why Chosen Approach is Superior**:
  * Zero login barrier: users can open the app and start immediately.
  * 100% data privacy: the developer's work logs and resumes never leave their local browser unless they explicitly send text to the configured LLM.
  * Full JSON export/import provides easy backup and cross-device migration.

---

### ADR 005: Dev Journal Work Ingestion — Claude/Gemini Work Bridge

* **Status**: Accepted
* **Context**: Developers already use AI (Claude, Gemini) at their workplace. Typing long manual journal entries at the end of the day introduces friction and abandoned habits.
* **Design Decision**:
  * Instead of forcing users to draft in our UI, we provide **Pre-Engineered Prompts**:
    * **Prompt 1 (Project Architecture & Contributions)**: Summarizes an entire repo, design doc, or major PR into clean engineering architecture blocks.
    * **Prompt 2 (Daily Work & Commit Recap)**: Converts git commits, ticket notes, and standup thoughts into structured daily work logs.
  * Users click a one-click copy button, run in their work Claude/Gemini, and paste the answer into our **Smart Ingestion Box**.
  * A hybrid parser (`parserService.js`) extracts: `Date`, `Category`, `Summary`, `Tech Tags`, `Key Contributions`, and `Quantifiable Metrics`.
  * From the Dev Journal, entries can be selected and translated into **STAR-format resume bullets** with one click.

---

### ADR 006: Client-Side PDF Resume Parsing (`pdfjs-dist` vs Server OCR)

* **Status**: Accepted
* **Context**: Users want to upload their existing resume to start the process rather than retyping from scratch.
* **Options Considered**:
  1. *Server-side Python / Node parser (PyPDF, pdfminer, Tesseract OCR)*: Requires setting up a backend server with upload endpoints, file storage, and privacy implications.
  2. *Client-side `pdfjs-dist` text stream extraction (Chosen)*:
     * Runs completely inside the browser using Mozilla's `pdfjs-dist`.
     * Reads the binary stream, iterates through all pages, and aggregates raw text.
     * Passes the text to `parseResumeContent()` (which uses AI if available, or heuristic regex fallback).
* **Why Chosen Approach is Superior**:
  * Zero server infrastructure required.
  * Complete privacy: the user's resume PDF never leaves their computer.
  * Instant extraction in milliseconds.

---

### ADR 007: Information Architecture & Tab Sequence

* **Status**: Accepted
* **Context**: The user specified the exact workflow progression:
  1. **Tab 1: Tech Market Radar** (Find where the market is moving, study topics, project blueprints, and targeted jobs).
  2. **Tab 2: Dev Journal** (Log daily engineering tasks, pull requests, and architecture notes via Claude/Gemini bridge).
  3. **Tab 3: Resume Builder** (Synthesize profile + dev journal into ATS-ready SWE templates and export to vector PDF).
  4. **Profile & Ingestion Hub** (Top-level modal accessible from anywhere to verify base data or upload a resume).

---

### ADR 008: Dynamic Model Discovery & Deprecation Purge Strategy

* **Status**: Accepted
* **Context**: LLM model versions evolve and deprecate rapidly (e.g. `gemini-2.0-flash` reached end-of-life on June 1, 2026). Hardcoding model options in dropdowns guarantees eventual obsolescence and endpoint errors.
* **Options Considered**:
  1. *Hardcoded Static Model Lists*: Simple to implement, but inevitably breaks when Google sunsets versions or releases updates.
  2. *Live Dynamic Discovery via Google Models API (`GET /v1beta/models`)* (Chosen):
     * Implemented `fetchLiveGeminiModels(apiKey)` in `llmService.js`.
     * Queries Google's live models catalog in real-time.
     * Automatically filters models by capability (`generateContent`) and explicitly purges discontinued legacy generations (`1.0`, `1.5`, `2.0`, embeddings).
     * Added a **"Sync Live Models"** button and a **"Custom Model"** mode in the UI so the user can use any future release (e.g. `gemini-3.9`, `gemini-4.0`) immediately.
* **Why Chosen Approach is Superior**:
  * 100% future-proof: users are never blocked by hardcoded model choices.
  * Deprecated versions are automatically pruned from the selection.
  * Immediate access to newly released Google models on day zero.

---

## 3. Implementation Verification Log

* **Build Status**: Production bundle built cleanly with Vite in 424ms (`dist/index.html`, `dist/assets/index.js`, `dist/assets/index.css`).
* **Dev Server**: Running in background at `http://localhost:5173/` (`HTTP 200 OK` verified).
* **Features Implemented & Ready**:
  1. `Navbar`: Tab switcher, Profile trigger, Dual-LLM badge indicator, and JSON Backup export/import.
  2. `Tech Market Radar` (Tab 1): Live Hacker News developer feed with topic filters, Market Match Index %, gap analysis, recommended hands-on projects, and direct job search links.
  3. `Dev Journal` (Tab 2): Prompt 1 & Prompt 2 copy hub for work Claude/Gemini, Paste & Ingest smart parser, manual log entry form, timeline with search and category filters, and "Push to Resume" buttons.
  4. `Resume Builder` (Tab 3):
     - 3 Software Engineer templates: Modern SWE Minimalist, Terminal / Systems Monospace, Clean ATS Corporate.
     - Split-screen interface: Live editor accordions on the left + A4 visual preview canvas on the right.
     - Journal Extractor modal: Select journal entries and convert to STAR resume bullets.
     - Vector PDF export using native print engine (`window.print()`) with confetti celebration.
  5. `Profile & Resume Ingestion Hub`: Upload `.pdf`, `.txt`, or paste raw text; automatic extraction into profile and resume data; verification editor.
  6. `Dual-LLM Engine`: Switch between Google Gemini API and Local Ollama (`http://localhost:11434`), test connection button, timeout management.

---

## 4. Troubleshooting & Bugfix Log

### Issue 001: PDF Upload SyntaxError — `Invalid regular expression: /\bC++\b/i: Nothing to repeat`
* **Root Cause**:
  * In `parserService.js`, the fallback skill detector iterated through a dictionary containing `'C++'`, `'C#'`, and other languages, constructing `new RegExp(`\\b${tech}\\b`, 'i')`.
  * Because `+` is an unescaped regex quantifier, `++` caused JavaScript's `RegExp` constructor to throw `SyntaxError: Nothing to repeat`.
  * Additionally, word boundaries (`\b`) fail on non-word symbols like `+` in `C++`.
* **Fix Applied**:
  * Implemented `escapeRegex()` and a boundary-aware matcher `testTechKeyword(text, keyword)` that safely matches terms enclosed by whitespace, commas, brackets, or string boundaries without throwing.
  * Replaced the external CDN-hosted worker in `pdfParser.js` with Vite's built-in static asset worker import (`import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`), ensuring 100% offline reliability without CDN or CORS friction.
  * Verified with automated unit test (`test_parser.mjs`).

### Issue 002: Deprecated Gemini 2.0 / Legacy Model Purge & Dynamic Model Discovery
* **Root Cause**:
  * The initial template used legacy Gemini model identifiers (`gemini-2.0-flash`, `gemini-1.5-pro`) which have been superseded. Hardcoding static model lists risks rapid obsolescence as model providers update endpoint offerings.
* **Fix Applied**:
  * Updated default models to the modern Gemini 3 series (`gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.1-pro-preview`).
  * Implemented live dynamic model discovery via `fetchAvailableGeminiModels(apiKey)` which queries `GET https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, filters models by `supportedGenerationMethods.includes("generateContent")`, strips deprecated models, and sorts by newest version.
  * Added UI refresh trigger in Settings modal allowing users to query and sync the latest Google models with one click.

### Issue 003: "Live Tech News & Discussions" Empty Feed (Algolia Hacker News Search)
* **Root Cause**:
  * In `src/services/marketService.js`, `fetchTechNews()` constructed queries using boolean operators: `queryMap = { backend: 'backend OR "distributed systems" OR golang OR rust OR database', ... }`.
  * The standard Hacker News Algolia search endpoint (`https://hn.algolia.com/api/v1/search`) does not parse raw Boolean `OR` / quoted string syntax in the simple `query` parameter. It searches for the literal text `"OR"` and escaped quotes, returning `hits: []` (`nbHits: 0`).
  * Because `response.ok` was `true` (status 200), no network exception was caught, and the empty array `[]` was returned to the UI.
  * `MarketRadarTab.jsx` mapped directly over `newsStories` with no empty-state UI fallback when `length === 0`, leaving the card completely blank.
* **Fix Applied**:
  * Refactored `queryMap` to clean, high-signal search terms (`backend architecture`, `distributed systems`, `kubernetes`, `LLM`) which reliably return 12+ live stories with upvotes and discussion counts.
  * Added fallback validation: If `!data.hits || data.hits.length === 0`, `fetchTechNews` automatically logs a warning and falls back to topic-specific curated engineering discussions.
  * Upgraded `getFallbackTechNews(topic)` with comprehensive fallback articles across all 4 topics (`backend`, `distributed`, `cloud`, `ai`).
  * Added an interactive empty-state placeholder in `MarketRadarTab.jsx` with a "Reload Stories" button and enhanced card hover micro-interactions.

### Issue 004: Resume Editor Accordions Truncation & Unscrollable Partial Views
* **Root Cause**:
  * In `src/components/ResumeBuilder/EditorSidebar.jsx`, the sidebar container was styled as a vertical flex column (`display: flex; flexDirection: column; height: calc(...)`).
  * In CSS Flexbox, all flex children have `flex-shrink: 1` by default. Each accordion panel had `className="glass-panel" style={{ overflow: 'hidden' }}`.
  * When multiple accordions were expanded (e.g. Personal Information and Work Experience simultaneously), the combined natural height of the open accordions exceeded the sidebar's viewport height.
  * Because `flex-shrink: 1` and `overflow: hidden` were active on the accordion cards, Flexbox forcibly squeezed and squished the open accordion cards down to fit the parent height.
  * As a consequence:
    1. Lower form fields were clipped off (e.g., Personal Information cut off after "Location/GitHub"; Work Experience cut off mid-bullet).
    2. The individual accordion cards could not scroll because they had `overflow: hidden`.
    3. The sidebar container never overflowed its own height (`scrollHeight === clientHeight`), so no scrollbar appeared on the sidebar either.
* **Fix Applied**:
  * Added `flexShrink: 0` to all accordion panels and action banners in `EditorSidebar.jsx`. This prevents Flexbox from squishing open accordion panels, allowing them to render at their natural full height.
  * Preserved `overflowY: 'auto'` on the sidebar container with stable padding, allowing smooth vertical scrolling through all open sections and fields.
  * Added quick section management controls (**"Expand All"** and **"Collapse All"**) to the top of `EditorSidebar`.
  * Fully implemented the **Education** and **Certifications** accordion editors to match the resume preview templates.
  * Adjusted split-screen studio layout heights in `ResumeBuilderTab.jsx` and `PreviewCanvas.jsx` to prevent outer viewport height contention.

### Issue 005: Resume PDF Ingestion Parsing Accuracy, Role Extraction & State Pollution
* **Problem Reported by User**:
  * Uploading a resume PDF did not parse all details properly:
    1. The candidate's real role in their resume was `"Software Engineer"`, but the application parsed and displayed it as `"Senior Backend Engineer"`.
    2. Work experience entries, real company names, dates, projects, education, and bullet points were either missing or replaced with placeholder mock data.
    3. Old dummy skills (`Go (Golang)`, `Kafka`, `PostgreSQL`, `System Design`) remained in the user's profile rather than being replaced by the candidate's actual skills.
* **Root Cause Analysis**:
  1. **Hardcoded Fallback in Line 1 Heuristic**:
     * In `src/services/parserService.js`, the fallback text parser had the following rule:
       ```javascript
       const title = lines[1] && lines[1].length < 60 && !lines[1].includes('@') ? lines[1] : 'Senior Backend Engineer';
       ```
     * In standard software engineer resumes, line 0 is the candidate's full name, while line 1 is almost always contact metadata (e.g. `subhojitp7@gmail.com | +91-9876543210 | Bangalore, India`).
     * Because line 1 contained an `@` symbol or exceeded the criteria, the conditional evaluated to false and directly assigned the default string: `'Senior Backend Engineer'`.
     * Furthermore, `DEFAULT_PROFILE` in `src/context/AppContext.jsx` also initialized `currentTitle` to `'Senior Backend Engineer'`, compounding the issue.
  2. **Interleaved Text Extraction in Modern PDFs**:
     * In `src/services/pdfParser.js`, text was extracted by iterating sequentially over PDF content items without spatial coordinate sorting.
     * In multi-column, table-based, or LaTeX/Word-compiled PDFs, text items often stream in non-visual order (e.g., column headers or sidebar elements interleaved with body text), breaking line boundaries and corrupting section recognition.
  3. **Placeholder Templates in Experience, Projects & Education**:
     * The fallback parser lacked a section segmenter. Instead of parsing the applicant's actual jobs and companies, it generated a static dummy work experience (`company: 'Technology Solutions', title: 'Senior Software Engineer'`) with mocked metrics.
     * The same applied to projects (which defaulted to `'Distributed Systems & Cloud Architecture'`) and education (which defaulted to `'B.S. in Computer Science / Engineering'`).
  4. **State Pollution in Profile Ingestion (`ProfileModal.jsx`)**:
     * When ingesting parsed skills, `ProfileModal.jsx` previously ran:
       ```javascript
       coreSkills: Array.from(new Set([...(draftProfile.coreSkills || []), ...parsedSkills]))
       ```
     * This merged the applicant's skills with pre-existing template skills (`Go (Golang)`, `Kafka`, `Microservices`, etc.), so the candidate's profile was cluttered with skills they never had.
* **Fix Applied**:
  1. **Visual Coordinate Sorting in PDF Extractor (`src/services/pdfParser.js`)**:
     * Sorted text items primarily by vertical position `Y` (descending, with a 4px line tolerance) and secondarily by horizontal position `X` (ascending).
     * Grouped items on the same horizontal plane into coherent text lines before joining them with newlines. This guarantees that multi-column and LaTeX resumes produce clean, sequential text.
  2. **Intelligent Section-Aware Parser (`src/services/parserService.js`)**:
     * Segmented the resume into logical sections using regex patterns for headers: `summary`, `experience`, `projects`, `skills`, `education`, `certifications`.
     * **Candidate Role Resolution**:
       - Scans top header lines with a comprehensive `TITLE_REGEX` (matching `Software Engineer`, `Frontend Developer`, `Full Stack Engineer`, etc.).
       - If the header only contains contact details, the parser inspects the candidate's latest position in the **Experience** section and extracts the actual role title (e.g., "Software Engineer").
       - Completely eliminated the hardcoded `'Senior Backend Engineer'` fallback. If no title is found, it uses the candidate's first job title or a clean default `'Software Engineer'`.
     * **Multi-Job Experience Parser**:
       - Detects individual jobs by role/company/date header patterns.
       - Parses company names, role titles, date ranges (`startDate`, `endDate`, `isCurrent`), locations, and bullet points.
       - Fixes date range tokenization to prevent splitting on letters in `"Present"` (e.g., `Presen`).
     * **Multi-Project & Education Parsers**:
       - Extracts individual projects, tech stacks, links, and bullet points from the Projects section.
       - Extracts degree (e.g., `B.Tech`, `Bachelor of Technology`, `M.S.`), university/institution, graduation dates, and CGPA/GPA.
     * **Clean Skill Extraction**:
       - Extracts skills from categorized lines (e.g., `Languages: JavaScript, Python`, `Frameworks: React, Node.js`) and matches against an engineering keyword catalog.
  3. **Clean Profile Seeding (`src/components/Profile/ProfileModal.jsx`)**:
     * Replaced the additive merge with clean replacement: if the resume contains extracted skills, it directly seeds `coreSkills: parsedSkills`, eradicating phantom template skills.
     * Automatically synchronizes `draftProfile.targetRole` and `draftProfile.currentTitle` to the extracted role title.
  4. **Build & Unit Verification**:
     * Automated unit tests with realistic SWE resume data confirmed accurate extraction of candidate name, title (`Software Engineer`), multi-role experiences with authentic companies and dates, projects with links, and B.Tech education with CGPA.
     * Production bundle built cleanly with Vite (0 errors, 429ms).

### Issue 006: Multi-line Bullet Wrapping, Sentence Fragmentation & Company Date Pollution
* **Problem Reported by User**:
  * In the A4 Live Print Canvas:
    1. **Featured Engineering Projects Section Broken**: Continuation lines of project bullet points (e.g. `"and secure media storage integration."`, `"maintainability."`, `"1000 concurrent users with <300ms average API response time."`, `"of training data"`, `"resources."`) were rendered as bold project titles instead of regular bullet text.
    2. **Work Experience Broken**: Bullets were truncated mid-sentence across lines (e.g. `"Developing full-stack features... for"` followed by `"configuration and administration..."`), single trailing words became separate bullets (`"scripts."`), and words were split mid-hyphen (`"func-"` and `"tions"`).
    3. **Company Names Polluted by Dates**: The company name was parsed as `"ServiceNow July 2024"` and `"Samsung Research Institute May 2023"` because start months were stuck to the company text.
    4. **Education & Certifications Broken**: Education degree was polluted with `"CGPA: 8.29"` and trailing `May 2024 - •`, while GATE ranking certification was split into 3 fragmented bullets (starting with comma `", demonstrating..."` and `"solving abilities."`).
* **Root Cause Analysis**:
  1. **Physical Line-Breaks vs. Semantic Sentences in PDF**:
     * In PDF documents, paragraphs and bullet points wrap physically across lines due to page margins ($Y$ coordinate step-down).
     * The original parser treated every raw newline (`\n`) as a distinct item.
     * In Work Experience, any wrapped line without a bullet symbol (`•`) was pushed as an independent bullet point (`curExp.bullets.push(cleanBullet)`).
     * In Projects, any wrapped line without a bullet symbol that was shorter than 80 characters was assumed to be a brand-new project title! This caused continuation fragments like `"maintainability."` and `"resources."` to be instantiated as projects and styled with `fontWeight: 700` (bold).
     * In Certifications, every wrapped line was pushed as a separate certification.
  2. **Hyphenation Severing**:
     * LaTeX and Word resumes hyphenate long words at margin boundaries (`utility func-` / `tions`). Without hyphen-reconstruction, words remained permanently broken.
  3. **Date Range Regex Month Blindspot**:
     * `DATE_RANGE_REGEX` previously looked for `(?:Jan|Feb|...|\d{4})\s*-\s*...` without allowing month + year in the start date.
     * For `July 2024 - Present`, the `July` did not match because `2024` was in between. The regex only captured `2024 - Present`, leaving `July` or `July 2024` appended to the preceding token (`ServiceNow`).
     * Similarly, for `May 2023 - July 2023`, it matched `2023 - July 2023`, leaving `May 2023` attached to `Samsung Research Institute`.
* **Fix Applied**:
  1. **Universal Bullet Normalization (`pdfParser.js` & `parserService.js`)**:
     * Normalized all font bullet variations (`\uF0B7`, `\uF0A7`, `\u25AA`, `\u25AB`, `\u25E6`, `\u2043`, `\u2023`, `\u2219`, `\u00B7`) into standard bullet symbols `•` upon text extraction.
  2. **Hyphenation & Sentence Continuation Merger (`mergeContinuation`)**:
     * Created `mergeContinuation(prevText, nextLine)`:
       - Automatically detects hyphenated line ends (`func-` followed by `tions`) and strips the trailing hyphen to rejoin the original word (`functions`).
       - Reconnects punctuation-leading lines (e.g. `, demonstrating...`) and space-separated sentence fragments.
  3. **Comprehensive Date Range & Month-Year Tokenizer**:
     * Rebuilt `DATE_RANGE_REGEX` and `SINGLE_DATE_REGEX` with `MONTH_NAMES` and `DATE_TOKEN` so that `July 2024 - Present` and `May 2023 - July 2023` are captured in their entirety.
     * Cleaned matched date strings out of `lineText` before parsing the company name, completely eliminating date pollution in company fields.
  4. **Robust Project & Education Parsers**:
     * Added `isFirstProject` handling and sentence completion checks: a line is only recognized as a new project if the previous bullet ended with terminal punctuation (`[.!?]`), does not start with lowercase letters or prepositions/conjunctions (`and`, `of`, `to`, `for`, `with`), and does not contain bullet metrics.
     * In Education, CGPA/GPA and dates are extracted first and cleaned from institution/degree strings, and templates were updated to format dates cleanly without dangling dashes when `startDate` is omitted.
  5. **Verification**:
     * Verified with unit tests (`scratch/verify_parser_service.mjs`) reproducing the user's exact PDF text: all 3 projects, 2 jobs, education, and certifications now parse with 100% complete, unbroken sentences.
     * Verified production build (`cmd /c npm run build`, 0 errors).

### Issue 007: Bottom Page Content Overflow, Canvas Clipping & Full LLM Resume Enhancement
* **Problem Reported by User**:
  1. The bottom section of the PDF / Live Print Canvas was broken: the text at the bottom (second degree: *Bachelor of Technology* and certifications) was overflowing past the white A4 page edge and rendering as dark text on top of the `#090d16` canvas background.
  2. The user requested: *"Also instead of just parsing the resume, can you have the LLM model go through the resume and enhance it if possible"*.
* **Root Cause Analysis**:
  1. **Flexbox Cross-Axis Sizing & Transform Scale Mismatch**:
     * In `src/components/ResumeBuilder/PreviewCanvas.jsx`, the canvas viewport container was set to `display: 'flex', justifyContent: 'center'` (default `flex-direction: row`).
     * In CSS flexbox, flex children in row mode stretch along the cross axis by default (`align-items: stretch`). Because `#printable-resume` was scaled using `transform: scale(zoomLevel)` with `transform-origin: top center` and fixed to `minHeight: '297mm'`, the layout box did not dynamically expand its background when child content extended past 297mm.
     * Elements exceeding 297mm overflowed visually onto the dark viewport canvas (`#090d16`) outside the white background sheet.
     * Furthermore, a full engineer resume containing 2 positions (5 bullets), 3 projects (7 bullets), 4 skill categories, 2 degrees, and 3 certifications naturally spans ~340mm under standard padding (`16mm 18mm`) and margins (`14px-16px`). There was no spacing or density mechanism allowing users to fit dense resumes onto a single A4 page.
     * In `@media print` (`src/index.css`), `#printable-resume` had hardcoded `padding: 16mm 18mm !important;` and lacked `height: auto !important` and `transform: none !important`, which could cause multi-page truncation or print scale errors.
  2. **Lack of AI Enhancement & Gemini Token Truncation**:
     * The ingestion pipeline previously operated solely as an extractor, reproducing source bullets as-is even if they lacked strong action verbs, technical impact, or quantifiable metrics.
     * In `src/services/llmService.js`, Gemini `maxOutputTokens` was capped at `2500`. For comprehensive resumes, full JSON responses exceeded 2500 tokens, resulting in mid-stream truncation at character 5212 and triggering `SyntaxError: Expected ',' or ']' after array element in JSON`.
* **Fix Applied**:
  1. **Token Limit Increase (`llmService.js`)**:
     * Increased Gemini `maxOutputTokens` from `2500` to `6000`, ensuring complete, untruncated JSON responses even for extensive multi-role profiles.
  2. **AI Resume Enhancer Engine (`parserService.js`)**:
     * Enriched `parseResumeContent` prompts with explicit STAR methodology directives (Situation/Task, Action, Result) to elevate bullets with power verbs (*Architected*, *Spearheaded*, *Engineered*, *Optimized*, *Automated*), quantifiable metrics, and concurrency/scale specifications.
     * Implemented and exported `enhanceResumeWithAi(resumeData, aiConfig)`, which runs any current resume through a dedicated Staff SWE / FAANG recruiter enhancement pipeline.
  3. **Canvas Viewport Fix & Density/Spacing System (`PreviewCanvas.jsx`, `AppContext.jsx`, `index.css`)**:
     * Re-engineered `PreviewCanvas.jsx` viewport layout:
       - Set viewport to `flexDirection: 'column'`, `alignItems: 'center'`.
       - Set `#printable-resume` to `height: 'auto'`, `minHeight: '297mm'`, and `alignSelf: 'center'`. The white page background now dynamically encapsulates 100% of the resume content, permanently eliminating text overflow onto the dark background.
     * Introduced a 3-tier Density system (`Compact (1-Page)`, `Normal`, `Spacious`):
       - `compact`: `10mm 14mm` padding, `9pt` font size, `1.32` line-height, `6px` entry gaps, `8px` section margins. Reduces resume height by over 50mm, enabling dense resumes to fit comfortably onto a single A4 page.
       - `standard`: `14mm 16mm` padding, `9.5pt` font size, balanced professional spacing.
       - `relaxed`: `18mm 20mm` padding, `10pt` font size, spacious layout.
     * Updated `ModernTechTemplate.jsx`, `CleanAtsTemplate.jsx`, and `TerminalSystemsTemplate.jsx` to accept `density` and scale font sizes, line heights, gaps, and margins smoothly.
     * Refactored `@media print` in `src/index.css`:
       - Added `height: auto !important; min-height: 297mm !important;` to ensure multi-page resumes print completely without clipping.
       - Added `transform: none !important;` so UI canvas zoom level never affects vector print scaling.
       - Added print density classes (`#printable-resume.density-compact`, etc.).
  4. **UI AI Enhancer Controls**:
     * Added a prominent **"AI Enhance Resume"** action button in `ResumeBuilderTab.jsx` with spinning loader state (`Loader2`), sparkles, and celebratory confetti upon completion.
     * Added an **"Auto-enhance with AI"** toggle in `ProfileModal.jsx` during PDF/text upload and text pasting.
  5. **Verification**:
     * Verified production build with Vite (`cmd /c npm run build`, 0 errors, 500ms).
     * Verified background dev server active at `http://localhost:5173/`.


### Issue 008: Normal & Spacious Spacing Clamping, Multi-Page Boundary Divider & Auto-Fit
* **Problem Reported by User**:
  * *"In normal and spacious spacing it's still the same"* — the user observed that switching between Normal and Spacious spacing left the bottom section (degrees and certifications) cut off at the exact same horizontal boundary over the dark #090d16 canvas background.
* **Root Cause Analysis (Measured via Chrome DevTools Protocol)**:
  1. **Flexbox Item Clamping (flex-shrink: 1)**:
     * In `src/components/ResumeBuilder/PreviewCanvas.jsx`, `#printable-resume` was a direct child of a vertical flex container (`display: flex; flex-direction: column; align-items: center;`).
     * By default, CSS flex items have `flex-shrink: 1`. When combined with `minHeight: '297mm'` (`1122.52px` at 96 CSS DPI), Flexbox treated `297mm` as a fixed ceiling constraint whenever the scroll container was constrained.
     * In Spacious mode (`density-relaxed`), the content height expanded to `1202px - 1295px`, but Flexbox clamped the white container's computed height to exactly `1122.52px`. Any content past 1122.52px spilled outside the white box onto the #090d16 dark canvas.
     * In Normal mode (`density-standard`), default vertical padding (`14mm 16mm` = 105.82px vertical padding) pushed standard SWE resumes (2 jobs, 3 projects, 4 skill lines, 2 degrees, 3 certs) to ~1150px. Because of the clamp, Normal mode also cut off at the exact same 1122.52px line.
     * To the user, toggling between Normal and Spacious resulted in the exact same cutoff line because the white container refused to expand past 1122.52px in either mode.
  2. **Lack of Multi-Page Awareness**:
     * There was no visual boundary indicating where Page 1 ended (297mm) and Page 2 began, nor an automated way to fit a multi-page resume onto 1 page.
* **Fix Applied**:
  1. **Eliminated Flex Clamping with `flexShrink: 0`**:
     * Added `flexShrink: 0`, `position: 'relative'`, `height: 'auto'`, and `minHeight: '297mm'` to `#printable-resume`.
     * In Spacious mode (or for any multi-page content), the white paper now expands smoothly to its full natural height (`1201.89px+`). Text never spills onto the dark canvas background.
  2. **Calibrated Normal Spacing for Single-Page A4 Guarantee**:
     * Set Normal mode padding to `10mm 14mm` (saving 30px of vertical padding compared to 14mm).
     * Calibrated font sizes (`8.9pt`), line heights (`1.28`), section margins (`6.5px`), and gap tokens across all three templates (`ModernTechTemplate.jsx`, `CleanAtsTemplate.jsx`, `TerminalSystemsTemplate.jsx`).
     * With these calibrations, full SWE profiles measure ~909px, comfortably fitting within 1122.52px (297mm) with ample breathing room.
  3. **Multi-Page Detection, Cutoff Line & Auto-Fit Engine**:
     * Implemented real-time height tracking via `ResizeObserver`:
       - If `scrollHeight <= 1126px`: Displays `✓ 1 Page (A4 Fit)` in emerald.
       - If `scrollHeight > 1126px`: Displays `⚠ 2 Pages (A4)` in amber and reveals an `⚡ Auto-Fit to 1 Page` button.
     * Added a visual Page 1 divider inside `#printable-resume`:
       - When content exceeds 297mm, renders an amber dashed line at `top: 297mm` with label `✂ Page 1 End (297mm A4) • Page 2 Starts Below` (with `.no-print` class so it never prints).
     * When clicking `Auto-Fit to 1 Page`, the resume density automatically switches to Compact, pulling the resume cleanly onto 1 page.
  4. **Print Stylesheet Synchronization (`src/index.css`)**:
     * Synced print paddings (`compact: 8mm 12mm`, `standard: 10mm 14mm`, `relaxed: 15mm 18mm`).
  5. **Verification**:
     * Ran automated Brave CDP tests (`scratch/verify_all_three.mjs`, `scratch/trace_clicks.mjs`):
       - Normal Mode: `computedHeight: 1122.52px`, `totalContent: 909.59px`, `fitsInA4: true`, `pageBadge: '✓ 1 Page (A4 Fit)'`.
       - Spacious Mode: `computedHeight: 1201.89px` (expanded!), `totalContent: 1202.39px`, `isClipped: false`, `hasCutoffDivider: true`, `pageBadge: '⚠ 2 Pages (A4)'`.
       - Compact Mode: `padding: 8mm 12mm`, fits 1 page.
     * Built production bundle (`cmd /c npm run build`, 0 errors, 442ms).


### Issue 009: LM Studio Local LLM Connection Error ('messages' field is required on OPTIONS Preflight)
* **Problem Reported by User**:
  While testing the connection of local LLM model from LM Studio (`google/gemma-4-12b-qat`), the user encountered:
  ```
  2026-10-02 17:13:29 [ERROR] [google/gemma-4-12b-qat] 'messages' field is required
  2026-10-02 17:13:29 [DEBUG] Received request: OPTIONS to /v1/chat/completions
  2026-10-02 17:13:29 [ERROR] [google/gemma-4-12b-qat] 'messages' field is required
  ```
* **Root Cause Analysis**:
  1. **LM Studio Server-Side Express Validation Bug on HTTP OPTIONS**:
     * In cross-origin browser requests (web app running at `http://localhost:5173` fetching LM Studio at `http://localhost:1234`), browsers must send an HTTP `OPTIONS` CORS preflight request whenever custom headers or `Content-Type: application/json` are specified.
     * LM Studio's Express router executes request body validation (`if (!req.body?.messages) throw "'messages' field is required"`) before evaluating or bypassing `req.method === 'OPTIONS'`.
     * Because HTTP `OPTIONS` preflight requests contain no body, LM Studio returns `400 Bad Request` with the error `[google/gemma-4-12b-qat] 'messages' field is required`, causing the browser to abort the preflight check with a CORS failure before any `POST` request is ever transmitted.
     * Sending `Content-Type: text/plain` to circumvent browser preflight fails because LM Studio strictly requires `Content-Type: application/json` (`HTTP 415 Unsupported Media Type`).
  2. **Direct Browser-to-Port Call Architectural Fragility**:
     * Calling localhost servers on different ports directly from client-side browser JS exposes calls to browser cross-origin security boundaries, preflight bugs, and port discrepancies.
  3. **Reasoning Models (`google/gemma-4-12b-qat`, `deepseek-r1`) Payload Structure**:
     * Local reasoning models return reasoning output in `choices[0].message.reasoning_content` and final answer in `choices[0].message.content`. If `message.content` is blank during thinking or structured parsing, consumers treating `message.content` as the sole text field fail with "no content returned".
* **Fix Applied**:
  1. **Built-in Same-Origin Vite Proxy Plugin (`vite.config.js`)**:
     * Added `localLlmProxyPlugin` middleware in `vite.config.js` intercepting `/api/local-llm/*`.
     * The proxy forwards requests server-to-server from Vite (Node.js) to the local LLM (`http://localhost:1234` or `http://localhost:11434`), carrying the `x-target-url` header.
     * Because `/api/local-llm/*` is on the same origin (`http://localhost:5173`), the browser sends 0 CORS preflight `OPTIONS` requests, completely eliminating LM Studio's body validation bug!
  2. **Dual-LLM Client Service Overhaul (`src/services/llmService.js`)**:
     * Updated `testLlmConnection` and `generateLlmCompletion` to route local requests through `/api/local-llm/chat/completions` in browser environments with `x-target-url` forwarding.
     * Added multi-field content extraction for reasoning models: `textOutput = msg?.content || msg?.reasoning_content`, and cleaned trailing thinking tags (`</think>`).
     * Added and exported `fetchLocalModels(baseUrl)` querying `/api/local-llm/models`.
  3. **UI Enhancements in AI Config Modal (`src/components/AIConfig/AIConfigModal.jsx`)**:
     * Added quick port preset toggle buttons for **LM Studio (1234)** and **Ollama (11434)**.
     * Added **"Sync Loaded Models"** button that queries `/v1/models` in real time, auto-detects running models (`google/gemma-4-12b-qat`, `deepseek/deepseek-r1-0528-qwen3-8b`, `qwen/qwen3.5-9b`, etc.), and populates a dropdown with one-click selection.
     * Supports switching between model dropdown list and custom tag input.
  4. **Verification**:
     * Ran end-to-end browser test via Chrome DevTools Protocol (`scratch/test_ai_modal_and_lmstudio.mjs`):
       - Successfully synced all 4 running models from LM Studio (`google/gemma-4-12b-qat`, etc.).
       - Clicked "Test Connection": completed with `Successfully connected to Local LLM with model "google/gemma-4-12b-qat"!`.
       - Verified zero errors in LM Studio logs.
     * Production build passed with code 0 (`cmd /c npm run build`, 483ms).

### Issue 010: AI Resume Enhancement Flow: Interactive Copilot with Accept/Reject Diffs & Custom Chat Guidance
* **Problem Reported by User**:
  "When clicking on 'AI Enhance Resume', there is no change. For this the flow should be like it provides the changes as accept/reject as well as there should be a chat box to provide some instruction to refine the output"
* **Root Cause Analysis**:
  1. **Silent Non-Interactive Execution**:
     * Previously, clicking "AI Enhance Resume" invoked an invisible background routine `enhanceEntireResume` in `ResumeBuilderTab.jsx` that attempted to overwrite `resumeData` directly.
     * If Gemini was selected without an API key, or if a local LLM timed out, the promise failed with an error that evaporated in a temporary toast, leaving the user with zero visual change or indication of what happened.
     * Users had no opportunity to review what the AI proposed, customize the guidance or tone, or selectively accept/reject changes.
  2. **Unbounded Context Payload on Local Reasoning LLMs**:
     * The old function dumped the entire raw resume JSON (including personal contact details, links, education, degrees, coursework, certifications) into the prompt.
     * When using local reasoning models such as `google/gemma-4-12b-qat`, generating a full resume rewrite triggered thousands of tokens of internal reasoning chain-of-thought, easily surpassing the 120s timeout or running out of tokens before writing the final JSON.
* **Fix Applied**:
  1. **Created `AIEnhanceModal.jsx` (`src/components/ResumeBuilder/AIEnhanceModal.jsx`)**:
     * **Interactive Chat / Instruction Box**: Textarea allowing the user to provide custom guidance to refine the output (e.g., *"Focus on distributed caching, Go, and Redis"*, *"Emphasize leadership and cross-functional mentoring"*, *"Shorten bullets to 1-2 punchy lines"*).
     * **One-Click Quick Prompt Chips**: Pre-curated chips (`🚀 More Metrics & Scale (STAR)`, `⚡ Punchy & Concise (1-2 lines)`, `🏗️ Distributed Systems & Backend`, `👑 Staff Framing`, `🎯 Tailor for Target Role`) that instantly populate or append to the instruction box.
     * **Target Scope Selector**: Option to choose `All Sections (Full Resume)`, `Work Experience Only (~20s)`, `Summary Only (~5s)`, or `Projects Only`. Scoped enhancements cut local LLM generation time from 100s down to ~15-20s.
     * **Before vs. After Diff Viewer**:
       - Clear comparison cards with original content on the left/top (muted) and enhanced content on the right/bottom (emerald glow with `STAR Refined` badges).
       - Per-section toggle filters (`All`, `Summary`, `Work Experience`, `Projects`, `Skills`) with granular checkboxes (`[✓] Summary`, `[✓] Experience`, `[✓] Projects`, `[✓] Skills`) so users can selectively accept only the sections they want.
     * **Accept / Reject Flow**:
       - **Accept & Apply to Resume**: Applies the selected diffs to `resumeData`, triggers confetti celebration, notifies via toast, and closes modal.
       - **Reject & Discard**: Closes modal and discards the proposed draft, guaranteeing zero changes to the user's resume.
     * **Live Timer & Provider Badge**: Displays active provider (`Local LLM (Gemma 4)` vs. `Gemini 2.5 Flash`) and an elapsed timer during generation.
  2. **Refactored `enhanceResumeWithAi` (`src/services/parserService.js`)**:
     * **Compact Context Extraction**: Only extracts mutable sections (summary, experience bullets, project descriptions, skills) for AI processing, cutting payload tokens by >60%.
     * **Safe Merge Guarantee**: Deep-merges AI enhancements while 100% preserving personal information, contact links, education, degrees, coursework, and certifications.
     * **Reasoning Model Compatibility**: Handles `choices[0].message.reasoning_content` and trailing `</think>` tags seamlessly.
  3. **Tuned Local LLM Settings (`src/services/llmService.js`)**:
     * Increased local timeout to 180s and set `max_tokens: 3500` to guarantee ample token budget for local reasoning models to think and complete JSON output.
  4. **State Plumbing (`src/context/AppContext.jsx` & `ResumeBuilderTab.jsx`)**:
     * Added `isAiEnhanceOpen` state and wired the top "AI Enhance Resume" button to open the modal immediately with zero lag.
* **Verification**:
  * Automated Brave CDP verification (`scratch/test_ai_modal_ui.mjs`):
    - "AI Enhance Resume" button opened modal with 0ms delay.
    - Verified chat box, chips, scope selector, and reject/accept action buttons rendered properly.
    - Verified clicking chips dynamically filled the instruction textarea.
    - Verified clicking "Reject & Discard" dismissed the modal cleanly without mutating resume state.
  * Local LLM verification (`scratch/test_targeted_full.mjs`):
    - Gemma 4 on port 1234 completed enhancement with high-impact STAR bullets and valid JSON extraction.
  * Production build passed with code 0 (`cmd /c npm run build`, 442ms).

### Issue 011: Resume Version History & Reflection Suite (Snapshots, Semantic Diffing & Safe Rollback)
* **Problem Reported by User**:
  "Can we add the resume history, so that we can reflect back?"
* **Requirements & Design Goals**:
  1. **Continuous Version History**:
     * Track all meaningful resume mutations across the studio lifecycle: AI enhancements, PDF imports, Dev Journal syntheses, manual snapshots, and demo resets.
     * Persist version history across page reloads in `localStorage` (`dev_resume_history_v1`) with an automatic baseline initialization.
  2. **Reflect Back (Semantic Diff & Evolution Tracking)**:
     * Empower users to compare any historical version against their current live resume side-by-side or stacked.
     * Deep semantic diffing for:
       - Summary modifications (word counts, text changes).
       - Bullet-by-bullet work experience tracking (retained, modified, added, removed).
       - Project evolution (descriptions, tech stacks).
       - Skills delta (tags added in live resume vs tags present in snapshot only).
  3. **Safe Rollback & Restoration**:
     * 1-click restore to any historical snapshot.
     * Guaranteed safety: automatically takes a "Pre-Rollback State" snapshot before restoring so the user never risks losing current live work.
  4. **Manual & Automated Snapshot Triggers**:
     * Top-level "+ Save Current Snapshot" button with custom naming (e.g. "Pre-Interview Polish", "Google Application", "Quant Backend Version").
     * Automatic snapshots on accepting AI enhancements (`AIEnhanceModal.jsx`), uploading PDFs/pasting text (`ProfileModal.jsx`), or synthesizing journal achievements (`JournalExtractorModal.jsx`).
* **Implementation Details**:
  1. **Semantic Diff Calculator (`src/utils/diffUtils.js`)**:
     * Analyzes `historicalResume` vs `currentResume` to produce structured diff models for summaries, experience bullets, projects, and skill categories.
     * Computes similarity and word overlap to pair modified bullets and categorize additions/deletions.
  2. **Central State Management (`src/context/AppContext.jsx`)**:
     * Added `resumeHistory`, `isHistoryOpen`, `setIsHistoryOpen`.
     * Added `saveResumeSnapshot`, `restoreResumeSnapshot`, `deleteResumeSnapshot`, `renameResumeSnapshot`, and `clearResumeHistory`.
     * Capped history safely at 35 snapshots to stay well under browser `localStorage` limits.
     * Bundled `resumeHistory` into `exportFullBackup` and `importFullBackup` for complete portable data ownership.
  3. **History & Reflection Modal (`src/components/ResumeBuilder/ResumeHistoryModal.jsx`)**:
     * Two-column split-screen layout:
       - Left: Searchable, filterable timeline of snapshots with origin badges (`AI Enhanced`, `PDF Import`, `Manual Snapshot`, `Journal`, `Auto-Save`, `LIVE ACTIVE`), relative timestamps, and bullet stats.
       - Right: Reflection workspace featuring:
         - **🪞 Reflect & Compare**: Detailed side-by-side/stacked diffs with green/red/gray highlights.
         - **📄 Snapshot View**: Complete formatted preview of that historical resume.
         - **📦 Raw JSON**: Monospace JSON with 1-click clipboard copy.
         - **↺ Restore This Version**: Restores live resume with celebratory confetti and auto-backup.
  4. **Studio Toolbar Integration (`src/components/ResumeBuilder/ResumeBuilderTab.jsx`)**:
     * Added a top-bar **"History (N)"** button displaying the current number of saved versions.
  5. **Hooks & Auto-Snapshots**:
     * Wired `AIEnhanceModal.jsx` to auto-snapshot upon accepting AI enhancements.
     * Wired `ProfileModal.jsx` to auto-snapshot upon PDF upload or text paste.
     * Wired `JournalExtractorModal.jsx` to auto-snapshot upon journal bullet synthesis.
* **Verification**:
  * Automated Brave CDP testing:
    - History button correctly discovered in toolbar with initial baseline version (`History (1)`).
    - Modal opens with 0ms lag.
    - Verified manual snapshot creation (`Pre-Interview Stripe Polish`), timeline ordering, and inline renaming.
    - Verified Snapshot View, Reflect & Compare diff highlights, and modal dismiss.
  * Verified `npm run build` passed with 0 errors (325ms).

### Issue 012: Modal Scrollbar Visibility & Flexbox Content Shrinkage Fix
* **Problem Reported by User**:
  "There is no scroll bar in the modal" (screenshot `media_1790946567880.png`). The right-hand diff workspace content (Work Experience, Skills Comparison) was clipped at the bottom boundary of the modal with 0 scrollbar visible, preventing the user from viewing or scrolling down to inspect the rest of the historical diff / resume content.
* **Root Cause Analysis**:
  1. **Flexbox `min-height: auto` on Intermediate Column Containers**:
     - The modal container had `height: 88vh; maxHeight: 920px; overflow: hidden; display: flex; flexDirection: column;`.
     - Inside it, the Two-Column layout and the Right Workspace Column (`<div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#080d16' }}>`) had default `min-height: auto`.
     - Because flex items default to `min-height: auto`, the Right Column and its child diff container were allowed to expand to their full content height instead of being constrained by the modal. The outer modal (`overflow: hidden`) clipped whatever exceeded 88vh without engaging internal scrollbars.
  2. **Flex Item Compression (`flex-shrink: 1`) on Child Cards**:
     - The diff container was configured as `display: flex; flex-direction: column; overflow-y: auto;`.
     - In CSS Flexbox, all direct children default to `flex-shrink: 1`. When their total natural height exceeded the container height, the browser shrunk the child cards (clipping long bullets inside their own `overflow: hidden` boundaries) rather than expanding them to their natural height and driving container scroll.
     - Consequently, the container's `scrollHeight` stayed equal to `clientHeight`, meaning the browser calculated that no scrolling was necessary, and suppressed the scrollbar entirely.
  3. **Low Scrollbar Contrast & Auto-Hiding Windows Overlays**:
     - Standard scrollbars had low contrast against dark backgrounds and lacked reserved gutters (`scrollbar-gutter: stable`), causing them to be invisible in modern browsers with overlay scrollbars.
* **Fix Applied**:
  1. **Strict Flexbox Constraints & Anti-Shrinkage Hierarchy (`ResumeHistoryModal.jsx`)**:
     - Added `minHeight: 0`, `minWidth: 0`, and `overflow: 'hidden'` to the Two-Column container and Right Column workspace.
     - Added `flexShrink: 0` to the Top Header bar, Bottom History action bar, and the Selected Version Action Toolbar.
     - Added `flexShrink: 0` to all child diff cards:
       - Reflection Overview Banner (`flexShrink: 0`)
       - Section 1: Professional Summary Diff (`flexShrink: 0`)
       - Section 2: Work Experience Diff (`flexShrink: 0`)
       - Section 3: Featured Projects Diff (`flexShrink: 0`)
       - Section 4: Technical Skills Comparison Diff (`flexShrink: 0`)
     - In Tab 2 ("Snapshot Full View"), added `flexShrink: 0` to the paper container to prevent document compression.
     - In Tab 3 ("Raw JSON"), added `flexShrink: 0` to the `<pre>` monospace code block.
  2. **AIEnhanceModal Consistency (`AIEnhanceModal.jsx`)**:
     - Added `minHeight: 0`, `overflowY: 'auto'`, and `.custom-scroll` to the scrollable main area.
     - Added `flexShrink: 0` to the Interactive Chat & Refinement Box, Quick Prompt chips, and AI Proposal Workspace.
  3. **High-Contrast Cyber Scrollbar Engine (`src/index.css`)**:
     - Upgraded `::-webkit-scrollbar` with higher contrast: `width: 9px; height: 9px;`.
     - Styled thumb with vivid `#0284c7` (hover: `#38bdf8` with glow `0 0 10px rgba(56, 189, 248, 0.5)`) and dark slate track `rgba(15, 23, 42, 0.85)`.
     - Created `.custom-scroll` utility featuring `scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: #0284c7 rgba(15, 23, 42, 0.85);` guaranteeing a dedicated, non-collapsing 10px gutter.
* **Verification**:
  1. **Browser CDP DOM Measurement & Scroll Testing (`scratch/test_tab1_overflow.mjs`)**:
     - Loaded multi-experience resume with deep diff modifications.
     - Measured `scrollHeight: 1874px`, `clientHeight: 499px`, `isOverflowing: true`.
     - Confirmed `scrollbarWidthCalculated: 10px` (reserved stable gutter).
     - Executed full scroll to bottom (`scrollTop: 1375px`, 100% of max scroll):
       - Verified `isLastCardInView: true` — the Skills Comparison card is 100% visible and accessible.
     - Captured and verified screenshot `diff_scrollbar_fixed.png` showing the bright cyan thumb and full cards.
  2. **Tab 2 & Tab 3 Verification**:
     - Tab 2 (Preview): `scrollHeight: 948px`, `clientHeight: 499px`, `isOverflowing: true`, `scrollbarWidth: 10px`.
     - Tab 3 (JSON): `scrollHeight: 948px`, `clientHeight: 499px`, `isOverflowing: true`, `scrollbarWidth: 10px`.
  3. **Production Build Integrity**:
     - `cmd /c npm run build` completed with code 0 in 294ms.

### Issue 013: Education & Certifications Visual Hierarchy & "Huge Paragraph" Overhaul
* **Problem Reported by User**:
  `"Education" and "Certifications" sections looks very confusing, specially the certifications which looks like a huge paragraph` (screenshot `media_1790956432792.png`).
* **Root Cause Analysis**:
  1. **Certifications Appeared as a Single Dense Block of Bold Text**:
     - In all templates (`ModernTechTemplate`, `CleanAtsTemplate`, `TerminalSystemsTemplate`), certifications were mapped into plain `<div>`s with `fontWeight: 600` on the entire item, with zero bullet markers (`listStyleType: 'none'` or plain `<div>`) and microscopic spacing (`certMarginBottom: 1.5px` to `2.5px`).
     - In the user's resume, items were 2-to-3-line achievement statements (e.g., *"Achieved a top 0.6% national ranking (Rank 494 out of 77,000+) in GATE 2022"*, *"Published 2 research paper on Hyperspectral Image Classification..."*, *"Honored with the Best Intern Award at Samsung..."*).
     - Because each statement was completely bolded with 2.5px gap and no bullet points or hanging indents, all 8 wrapped lines visually fused into an overwhelming, unbroken paragraph of bold text.
  2. **Education Formatting Confusion**:
     - Degrees were rendered with minimal vertical separation (`eduMarginBottom: 2px` to `3px`).
     - Key metrics (`CGPA: 8.29`) were dumped as tiny, faint raw text (`7.5pt`, `#64748b`) immediately touching the second degree (`Bachelor of Technology...`), creating a continuous 6-line block of confusing unformatted text.
     - Dates and institutions lacked clean right-alignment and visual hierarchy.
  3. **Rigid Layout & Mismatched Section Semantics**:
     - Tech resumes often contain awards, competitive exam rankings (GATE), research publications, and corporate honors. Forcing them under a generic, rigid "CERTIFICATIONS" header in a cramped 2-column layout (~320px column width) without an option for full-width stacked presentation or dynamic titling created semantic and visual confusion.
* **Fix Applied**:
  1. **Bulleted Achievement & Certification Engine (`ModernTechTemplate.jsx`, `CleanAtsTemplate.jsx`, `TerminalSystemsTemplate.jsx`)**:
     - Converted Certifications from flat `<div>`s into an elegant unordered list (`<ul><li ...>`) with `listStyleType: 'disc'` and accent-colored bullet dots.
     - Added hanging indents so multi-line text wraps cleanly aligned under the sentence rather than under the bullet.
     - Replaced universal bolding (`fontWeight: 600`) with high-readability normal weight (`fontWeight: 400`, `#334155`, `lineHeight: 1.28`).
     - Supported markdown bolding (`**Rank 494**`) for targeted keyword emphasis.
     - Increased separation between items to `certGap: 4.5px` (normal) / `7px` (relaxed).
     - Structured certs (e.g., AWS Solutions Architect) retain bold title with clearly delimited issuer and date (`— Amazon Web Services (2023)`).
  2. **Dynamic Section Titling**:
     - Automatically detects achievement, honor, award, publication, or exam keywords (`rank`, `gate`, `award`, `honored`, `publish`, `paper`, `patent`, `scholar`) and displays `Certifications & Achievements` (or `CERTIFICATIONS & ACHIEVEMENTS`), with optional user custom override.
  3. **Education Visual Hierarchy & Pill Badges**:
     - Prominent degree titles in bold (`#0f172a`, `fontWeight: 700`).
     - Right-aligned graduation dates and clear institution separation.
     - Transformed raw `CGPA` and honors strings into sleek, accent-tinted pill badges (`background: accentColor + '12'`, `border: accentColor + '30'`, `color: accentColor`, `borderRadius: 3px`).
     - Increased separation between educational degrees to `eduGap: 6.5px` (normal) / `9px` (relaxed).
  4. **Flexible Bottom Section Layout (2-Col Grid vs Stacked)**:
     - Added `bottomLayout: 'grid' | 'stacked'` support across all templates.
     - In **2-Col Grid** mode: Education and Certifications sit side-by-side with balanced column widths (`1.1fr 1fr`), ideal for single-page A4 fitting.
     - In **Stacked** mode: Both sections expand to full page width, giving achievements maximum breathing room.
     - Added 1-click **"Bottom: [ 2-Col Grid | Stacked ]"** toggle buttons to both the `PreviewCanvas` toolbar and `EditorSidebar` accordions.
* **Verification**:
  - Automated Brave CDP test (`scratch/test_education_certs.mjs`) verified:
    - `certHeader`: `"Certifications & Achievements"`
    - `certItemsCount`: `3` with `listStyleType: 'disc'` and `fontWeight: '400'`
    - `eduBadges`: Extracted `CGPA: 8.29` and `CGPA: 7.98` with background tint and radius
    - Captured and visually confirmed `education_certs_grid.png` and `education_certs_stacked.png`
    - Maintained strict single-page A4 fit (`✓ 1 Page (A4 Fit)`).
  - Production build (`npm run build`) succeeded with 0 errors in 309ms.

### 15. Issue 014: Stale Tech News Feeds in "Live Tech News & Discussions" (Algolia Search vs Search_by_Date & Multi-Source Hybrid Engine)

* **Problem Statement**:
  - The "Live Tech News & Discussions" card on the "Tech Market Radar" tab was fetching obsolete articles from 10–14 years ago (e.g. 2012, 2013, 2016).
  - Stories lacked any relative timestamps (e.g. "15m ago", "2h ago"), making them appear timeless and confusing to developers tracking active tech trends.
  - The feed only queried Hacker News without diversifying sources or supporting developer community discussions (e.g., Dev.to).
* **Root Cause**:
  1. **Algolia Hacker News Search Sorting Algorithm**:
     - `src/services/marketService.js` previously called:
       `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=12`
     - In Algolia's Hacker News API, `/search` ranks hits by **all-time keyword relevance and popularity score** across 18+ years of archives. Keyword queries like "backend architecture" or "distributed systems" naturally matched viral landmark posts from 2012–2016.
  2. **Missing Real-Time Sorting (`search_by_date` vs `front_page`)**:
     - Algolia provides two distinct endpoints:
       - `/api/v1/search_by_date`: strictly sorts hits chronologically (newest first).
       - `/api/v1/search?tags=front_page`: fetches the live, current front page of news.ycombinator.com (stories from the last 24–48 hours with hundreds of points).
  3. **Absence of Relative Timestamps & Source Badging**:
     - The story cards rendered titles and links, but did not compute or display relative publish times (`timeAgo`) or source attribution badges.
* **Fix Applied**:
  1. **Real-Time Feed Engine (`src/services/marketService.js`)**:
     - Added `timeAgo(dateString)` utility computing human-friendly relative offsets (`"just now"`, `"15m ago"`, `"2h ago"`, `"yesterday"`).
     - For default trending news (`topic === 'trending'`), queries `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=15`, reflecting the active live front page of Hacker News.
     - For specialized tech topics (`backend`, `distributed`, `cloud`, `ai`), queries `https://hn.algolia.com/api/v1/search_by_date?query=...&tags=story&hitsPerPage=12`, guaranteeing brand new stories from the current hour/day.
     - Integrated **Dev.to API** (`https://dev.to/api/articles?tag=${tag}&per_page=6&top=2`) to fetch fresh engineering articles, case studies, and tutorials from the developer community.
     - Unified multi-source normalization, merged results, removed duplicates, and sorted all stories strictly by `createdAt` descending.
     - Updated `getFallbackTechNews` with modern 2026 tech topics and realistic relative timestamps to ensure offline/network-failure resilience.
  2. **Enhanced Real-Time UI (`src/components/MarketRadar/MarketRadarTab.jsx`)**:
     - Added live status indicator: `🟢 Real-Time`.
     - Added Source filter toggle: `[ All | HN | Dev.to ]`.
     - Added rich topic selector pills: `🔥 Top Trending`, `⚡ Backend & APIs`, `🌐 Distributed & DBs`, `☁️ Cloud & K8s`, `🤖 AI & LLMs`.
     - In story cards, added branded source badges (orange for Hacker News, cyan for Dev.to), Clock icon with relative timestamp (`timeAgo`), upvotes, comments count, and author attribution.
* **Verification**:
  - Automated Brave CDP test (`scratch/test_market_radar_ui.mjs`):
    - Verified live stories loaded from the current day/hours (e.g. `4h ago`, `10h ago`, `11h ago`).
    - Verified dynamic switching to `🤖 AI & LLMs` fetched brand-new stories from minutes ago (`5m ago`, `13m ago`, `17m ago`).
    - Captured and visually confirmed screenshots (`live_market_radar.png` and `market_radar_ai_topic.png`).
  - Production build (`npm run build`) succeeded with 0 errors in 384ms.

### 16. Issue 015: "Live Tech News & Discussions" Content Covering Only Partial Block (Hardcoded maxHeight vs Dynamic 100% Flex Stretch)

* **Problem Statement**:
  - The "Live Tech News & Discussions" card on the "Tech Market Radar" tab was covering only the upper half of its container card.
  - The outer glass panel stretched to ~895px to align with the left column, but the news feed abruptly stopped after ~5 stories at ~430px, leaving a massive ~350px empty dark hole at the bottom of the card.
* **Root Cause**:
  1. **Hardcoded `maxHeight: '430px'`**:
     - The inner scroll container had `maxHeight: '430px'` applied as an inline style.
     - While the card panel stretched to fill the right column, the inner list was artificially restricted to 430px with its own cut-off scrollbar track.
  2. **Grid Row Expansion vs Flex Stretch**:
     - In CSS Grid with `align-items: stretch`, if a child flex column contains an unbound scrollable element with `flex: 1`, the grid expands the entire row to the child's `max-content` (~2800px for 26 stories).
     - To allow the left column to set the natural section baseline while having the right column's news feed fill 100% of the remaining height cleanly, the right column required `height: '0'`, `minHeight: '100%'`, with the news scroll container having `flex: 1`, `minHeight: '0'`, `overflowY: 'auto'`.
* **Fix Applied**:
  1. **Dynamic Full-Height Layout (`src/components/MarketRadar/MarketRadarTab.jsx`)**:
     - Set Right Column to: `height: '0', minHeight: '100%'`.
     - Set Card 4 ("Live Tech News & Discussions") to: `flex: 1, minHeight: '380px'`.
     - Replaced `maxHeight: '430px'` on the news scroll container with:
       `flex: 1, minHeight: '0', overflowY: 'auto', scrollbarGutter: 'stable', scrollbarWidth: 'thin'`.
     - News stories now stretch 100% down to the bottom padding of the card (~757px of scrollable area, 0px empty void).
  2. **Increased Story Fetch Count (`src/services/marketService.js`)**:
     - Increased Hacker News `hitsPerPage` from 12 to 18 (front page) and 10 to 15 (topic searches).
     - Increased Dev.to `per_page` from 6 to 8.
     - Generates 20–26 stories so the taller card is populated with plenty of content.
* **Verification**:
  - Measured live via automated Brave CDP (`scratch/inspect_news_height.mjs`):
    - `leftColHeight`: `1163.5px`
    - `rightColHeight`: `1163.5px`
    - `newsCardHeight`: `895.5px`
    - `newsScrollContainerHeight`: `757.5px`
    - `emptySpaceInNewsCard`: `23px` (matching the card's 22px padding, 0 wasted space).
    - Captured screenshot `news_full_height_fixed.png` showing stories seamlessly filling the card from top to bottom.
  - Production build (`npm run build`) succeeded with 0 errors in 306ms.

### 17. Issue 016: Personal Projects Support in "Claude & Gemini Work Bridge"

* **Problem Statement**:
  - The "Claude & Gemini Work Bridge" section in the Dev Journal tab only supported company employment work (PRs, architecture design docs, and daily standups).
  - Developers had no dedicated prompt or ingestion flow to bridge their personal side-projects, open-source GitHub repositories, and indie hacking tools into the Dev Journal or directly into the Resume's Featured Projects section (`resumeData.projects`).
* **Root Cause**:
  1. `WORK_PROMPTS` in `src/constants/promptTemplates.js` only provided templates for work PRs and daily sprint standups.
  2. The ingestion flow in `src/components/DevJournal/DevJournalTab.jsx` only appended entries to the Dev Journal timeline or pushed bullets to `resumeData.experience` (work history), with no ability to target `resumeData.projects`.
  3. `parseJournalDigest` and `fallbackJournalParser` lacked extraction logic for personal project signals, GitHub repository URLs, and project bullet structures.
* **Fix Applied**:
  1. **Prompt 3: Personal & Open-Source Project Deep-Dive (`src/constants/promptTemplates.js`)**:
     - Added a dedicated pre-engineered prompt template tailored for personal engineering projects, open-source repos, and side tools.
     - Formats output with Project Name, Category (`Personal Project`), Live/GitHub URL, Tech Stack, Core Objective, Architecture & Key Engineering Features, and Measurable Results & Impact.
  2. **Multi-Destination Ingestion Hub (`src/components/DevJournal/DevJournalTab.jsx`)**:
     - Added quick prompt filter pills: `[ All Templates (3) | 🚀 Personal Projects | 💼 Company Work ]`.
     - Added Target Destination selector: `[ ⚡ Both (Journal & Resume) | 🚀 Resume Personal Project | 📓 Dev Journal ]`.
     - Added an optional `Project GitHub / Live URL` input field in the ingestion box.
     - When ingesting a personal project, automatically creates and inserts a structured project object into `resumeData.projects` (with name, techStack, link, and bullet points) and logs it into the Dev Journal timeline under category `"Personal Project"`.
  3. **Personal Projects in Manual Entry & Timeline Actions**:
     - Added `'Personal Project'` category to the manual log form along with an explicit `Project GitHub / Live URL` input and an `Also add directly to Resume Featured Projects` checkbox.
     - Added a `🚀 Push to Projects` button to all timeline entry cards (highlighted in purple for personal projects), allowing any entry to be pushed to the resume's projects list with one click.
     - Added `'Personal Project'` pill to the timeline category filter.
     - Supported project link rendering with `ExternalLink` icon on timeline cards.
  4. **Parser Enhancements (`src/services/parserService.js`)**:
     - Updated LLM prompt and regex fallback to detect personal project keywords, extract repository URLs, and generate project bullet points.
* **Verification**:
  - Automated Brave CDP test (`scratch/test_dev_journal_personal_projects.mjs`):
    - Confirmed Prompt 3 renders with purple badge and copy button.
    - Successfully ingested a sample personal project (*"KubeMesh — Service Mesh Control Plane"*).
    - Verified `hasKubeMeshInTimeline`: `true` with clickable GitHub link.
    - Verified `hasKubeMeshInResume`: `true` with project name, tech stack, and bullet points added to `resumeData.projects`.
    - Captured and visually confirmed screenshots (`dev_journal_personal_projects.png` and `dev_journal_timeline_scrolled.png`).
  - Production build (`npm run build`) succeeded with 0 errors in 326ms.

### 18. Issue 017: Dev Journal Timeline Visibility & Project Ingestion Reconciliation

* **Problem Statement**:
  - The user reported: *"Dev Journal is not working as I added one of my project and it processed it but it's not visible in the timeline"*.
* **Root Cause**:
  1. **Exclusionary Destination Mode**:
     - Previously, the destination selector included a button labeled `🚀 Resume Personal Project`. Users intending to add their personal project naturally selected this button.
     - However, when `targetDestination === 'resume_project'`, `handleIngestDigest` only executed `updateResumeData(prev => ({ ...prev, projects: [...] }))` and skipped `addJournalEntry(parsedEntry)`.
     - Consequently, the personal project was saved only to `resumeData.projects` in the background, leaving the Dev Journal timeline on the active screen completely empty of the new record.
  2. **Unsafe Timeline Filtering & Category Discrepancies**:
     - `entry.category.toLowerCase()` in `filteredEntries` was unsafe against `undefined`/`null` or non-string category representations from LLM responses, risking uncaught runtime errors.
     - Diverse category strings from LLMs or raw text (e.g., `"Personal Projects"`, `"Side Project"`, `"Open Source"`) did not match exact filter string `'Personal Project'`.
  3. **Heuristic Parser Metadata Bleed**:
     - In offline/fallback mode, `fallbackJournalParser` took the first two non-empty lines as `summary`, causing raw metadata headers (e.g., `• Category: Personal Project • Live / GitHub URL: ...`) to bleed into the project summary, and treated metadata lines as bullets.
* **Fix Applied**:
  1. **Guaranteed Dev Journal Timeline Logging (`src/components/DevJournal/DevJournalTab.jsx`)**:
     - Replaced the exclusionary mode buttons with an inclusive sync toggle: `[✓] 🚀 Also Add to Resume Featured Projects` (default: checked).
     - Every ingested entry in the Dev Journal tab is now **unconditionally logged to `journalEntries`**, while optionally pushing to `resumeData.projects`.
     - Added auto-scroll to the newly added card with glowing cyan focus highlighting (`highlightedEntryId`).
  2. **Automatic Resume Projects Reconciliation (`useEffect`)**:
     - Added an automatic reconciliation effect on Dev Journal mount: if any personal project exists in `resumeData.projects` (e.g., projects processed previously before this fix) that is not in `journalEntries`, it is automatically converted and inserted into the Dev Journal timeline.
     - Added a manual **"Sync from Resume Projects"** button in the Timeline header for instant 1-click synchronization.
  3. **Robust Category Normalization & Safe Filtering (`src/services/parserService.js` & `DevJournalTab.jsx`)**:
     - Created and exported `normalizeJournalCategory()` mapping any variation (`personal`, `project`, `side`, `portfolio`, `open source`, `repo`) to standard `'Personal Project'`.
     - Made `filteredEntries` completely null-safe across all fields (`title`, `summary`, `impact`, `techStack`, `link`).
  4. **Heuristic Parser Refinement (`fallbackJournalParser`)**:
     - Explicitly extracts `summary` from `Core Objective:`, `What I Built:`, `Summary:`, or `Description:`.
     - Filters out all metadata header lines (`Project Name:`, `Category:`, `Live / GitHub URL:`, `Tech Stack:`) from bullet point collections.
* **Verification**:
  - Automated headless Brave browser verification (`scratch/test_journal_timeline_visibility.mjs`):
    - Verified auto-reconciliation of existing projects from `resumeData.projects` (`hasAether: true`).
    - Ingested new personal project (*NexusProxy — High-Performance API Gateway*); verified `hasNexus: true`, cyan highlight border, clickable GitHub link, and purple badge.
    - Verified `Personal Project` category filter pill displays all personal projects cleanly without errors.
    - Captured visual verification artifacts:
      - [dev_journal_timeline_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/dev_journal_timeline_verified.png)
      - [dev_journal_top_controls.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/dev_journal_top_controls.png)
  - Production build (`cmd /c npm run build`) passed with 0 errors in 315ms.

---

### 10. Multi-Layer Deduplication for Projects & Dev Journal Records (October 2026)
* **Problem**:
  - The user observed that multiple copies of the same personal project could exist or appear across the **Dev Journal Timeline** and the **Resume Featured Projects**.
* **Root Causes**:
  1. **Blind State Appends**:
     - `handleIngestDigest` and `handlePushToProjects` in `DevJournalTab.jsx` used unconditional array spreads (`projects: [...(prev.projects || []), newProject]`). Repeated ingesting or multiple clicks on "Push to Projects" appended duplicate copies.
     - `JournalExtractorModal.jsx` similarly prepended projects (`projects: [newProject, ...prev.projects]`) without checking if a project by the same name already existed.
  2. **Reconciliation Stale Closure & Re-runs**:
     - The auto-reconciliation `useEffect` in `DevJournalTab.jsx` re-evaluated dependencies on every state change without a persistent run-guard (`useRef`) and without a functional state updater, causing existing entries to be checked against stale closures.
     - Template demo baseline projects (`proj-1`, `proj-2`, `proj-3`) were candidate targets for reconciliation into the journal.
  3. **Absence of Unified Normalization**:
     - Projects could have minor spacing differences, varying URL formats (e.g. `https://github.com/foo` vs `github.com/foo/`), leading to duplicate identities.
* **Architecture & Fix Applied**:
  1. **Core Deduplication Engine (`src/context/AppContext.jsx`)**:
     - `deduplicateProjects(projects)`: Normalizes project names (`trim().toLowerCase()`) and links (stripping protocol and trailing slashes). Skips duplicate names or URLs, preserving existing project IDs and technical bullets.
     - `deduplicateJournalEntries(entries)`: Deduplicates journal entries by normalized ID, title, and link keys.
     - **Initial Load Sanitization (`loadSavedState`)**: Automatically sanitizes existing LocalStorage data on app boot, purging any pre-existing duplicates immediately.
     - **Global State Guard (`updateResumeData`)**: Intercepts all state changes to `resumeData.projects` and pipes them through `deduplicateProjects()`, guaranteeing no caller can inadvertently introduce duplicate projects.
     - **In-Place Upsert (`addJournalEntry`)**: Matches incoming entries by ID, normalized title, or URL. If an existing entry is found, it updates it in-place rather than prepending duplicate cards.
  2. **Action-Layer Upserts (`DevJournalTab.jsx` & `JournalExtractorModal.jsx`)**:
     - Both `handleIngestDigest` and `handlePushToProjects` now check if a project with the same normalized name or repository link exists in `resumeData.projects`. If found, the existing entry is updated with latest tech stack and bullets while keeping the original ID; otherwise, it is appended.
     - "Push to Projects" displays a dedicated toast indicating whether the project was newly added or updated in-place.
     - Auto-reconciliation in `DevJournalTab.jsx` is guarded by `hasReconciledRef` to execute strictly once on mount, ignores default template project IDs, and uses functional state setters.
  3. **Render-Layer Guarantee (`DevJournalTab.jsx`)**:
     - Computes `const displayedEntries = deduplicateJournalEntries(filteredEntries);`, ensuring that even in unusual race conditions or dirty states, the visual timeline and counter strictly display unique records with 0 duplicate cards.
  4. **Distinct Default Project Names (`EditorSidebar.jsx`)**:
     - Manual "Add Project" creates a numbered default (`Project ${count}`) with a clean placeholder, preventing collisions between newly added manual projects.
* **Verification**:
  - Automated headless Brave browser test (`scratch/test_dedup_projects.mjs`):
    - Initial Dev Journal stats: 3 baseline records, 0 duplicates.
    - Ingested new personal project (*StreamPulse Engine*): timeline count increased to 4.
    - Re-ingested the exact same project with updated v2 accomplishments: timeline count remained at 4, updating in-place with 0 duplicates.
    - Clicked "Push to Projects" multiple times on the card: Resume Featured Projects retained exactly 1 copy of *StreamPulse Engine* in both memory/storage and the PDF preview canvas.
    - Zero duplicates confirmed across both Dev Journal and Resume Builder.
  - Visual verification screenshot saved to [dedup_verification.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/dedup_verification.png).
  - Production build (`npm run build`) succeeded with 0 errors.

---

### 11. Context-Aware Timeline Record Updates & Follow-up Prompt System (October 2026)
* **Problem**:
  - Previously, entries on the Dev Journal timeline were static once logged. Users wanted an option to continuously update each timeline record with a tailored prompt that explicitly incorporates the previous entry's context and asks for the latest updates achieved after that previous entry.
* **Architecture & Solution**:
  1. **Context-Aware Prompt Generator (`generateFollowUpUpdatePrompt` in `src/services/parserService.js`)**:
     - Automatically constructs an engineering review prompt carrying forward:
       - Previous title, category, and date of the log.
       - Previous state & architecture summary.
       - Existing tech stack and previous repository / live URL.
       - Previous STAR accomplishments and quantifiable impact.
     - Formats a targeted instruction asking Claude / Gemini:
       - *"Reviewing what was already accomplished above, what are the LATEST UPDATES and developments completed AFTER this previous entry on [Date]?"*
       - Prompts for updated summary, new STAR bullets, new technologies introduced, and updated quantifiable impact.
  2. **Intelligent Milestone Parser (`parseMilestoneUpdate` & `fallbackMilestoneParser`)**:
     - Supports direct LLM generation via Gemini / Ollama when API keys are configured, synthesizing rough standup notes or prompt output into structured milestones.
     - Features a robust heuristic fallback parser that handles multiline headers, extracts STAR bullets, merges newly detected technologies with previous tech tags, and updates metrics without duplicate bleed.
  3. **Interactive Update Workspace on Each Timeline Card (`DevJournalTab.jsx`)**:
     - Each timeline card now features a prominent **`Prompt for Updates`** action button.
     - Clicking opens an in-card workspace:
       - **Section 1**: Preformatted context-aware prompt with 1-click **"Copy Update Prompt for Claude / Gemini"** button.
       - **Section 2**: In-app AI generator for instant updates with rough notes (if Gemini/Ollama connected).
       - **Section 3**: Paste response / notes textarea with auto-extraction.
       - **Actions**:
         - **`Apply Updates to Record`**: Merges new accomplishments in-place, updates summary and tech stack, and preserves previous milestones in `entry.updates`.
         - **`Log as New Chained Card`**: Creates a connected follow-up record on the timeline.
         - Checkbox: `🚀 Also Sync Latest Bullets & Tech Stack to Resume Featured Projects` keeps the resume up to date.
  4. **Milestone Badge & Evolution History Accordion (`DevJournalTab.jsx`)**:
     - Updated cards display an emerald badge: `Milestone X (Updated [Date])`.
     - Clicking the badge expands a collapsible milestone timeline detailing the evolution from baseline to the latest achievement.
* **Verification**:
  - Automated headless Brave browser verification (`scratch/test_update_prompt.mjs`):
    - Verified "Prompt for Updates" button exists on timeline cards.
    - Verified opening the workspace generates a 2,200+ char prompt containing full previous context and follow-up directives.
    - Verified pasting updates: summary updated, new technologies (`ClickHouse`, `OpenTelemetry`, `Grafana`) merged uniquely, bullets updated.
    - Verified milestone badge appears (`Milestone 2 (Updated 2026-10-03)`) and expands milestone history accordion.
  - Screenshots captured:
    - [update_workspace_open.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/update_workspace_open.png)
    - [update_prompt_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/update_prompt_verified.png)
  - Production build (`cmd /c npm run build`) passed with 0 errors in 329ms.

---

### 12. Timeline Record In-Place Edit Functionality & Bi-Directional Resume Sync (October 2026)
* **Problem**:
  - While developers could log entries via LLM digests or quick notes and update them via milestone follow-ups, they needed a direct **Edit** capability to make manual modifications, adjust typos, refine STAR bullet points, update tech stack tags, change repository URLs, or adjust dates and impact metrics directly without re-ingesting or clearing cards.
* **Architecture & Solution**:
  1. **Action Toolbar Integration (`DevJournalTab.jsx`)**:
     - Added a dedicated **`Edit`** button (with `Edit3` icon) to the header action toolbar of every timeline card alongside `Prompt for Updates`, `Push to Experience`, `Push to Projects`, and `Delete`.
  2. **In-Place Card Transformation (`editingEntryId === entry.id`)**:
     - Rather than opening an unwieldy modal that conceals timeline context, clicking `Edit` transforms the card in-place into a sleek glassmorphic editing console (`linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))` with cyan glow border `rgba(56, 189, 248, 0.45)`).
     - Form controls pre-fill with all existing record properties:
       - **Title / Task Name**: Text input for task name.
       - **Category**: Select dropdown (`Personal Project`, `Feature`, `Architecture`, `Optimization`, `Bug Fix`).
       - **Date**: Date picker with ISO string pre-filling.
       - **GitHub / Live URL**: Repository or deployment link input.
       - **Quantifiable Impact / Result**: Metric input (e.g. p99 latency reduction, traffic milestones).
       - **Executive / Engineering Summary**: Multi-line summary textarea.
       - **Tech Stack Tags**: Comma-separated tag input (auto-split and trimmed upon saving).
       - **Dynamic Accomplishment Bullet Points List**:
         - Shows indexed rows (`1.`, `2.`, etc.) for each STAR bullet point.
         - Text input for each bullet with action-verb placeholder.
         - Individual `Trash2` icon button to remove unnecessary bullets.
         - `+ Add Bullet Point` button to append new accomplishment rows dynamically.
       - **Sync Toggle**: `🚀 Also Sync Edits to Resume Featured Projects` checkbox (checked by default).
       - **Form Actions**: `Cancel` (reverts without persisting) and `Save Changes` (with check icon).
  3. **Bi-Directional Synchronization & Deduplication**:
     - `handleSaveEdit(entryId)` commits the updated entry to `journalEntries` via `updateJournalEntry`.
     - When `editFormData.syncToResume` is active (or category is `Personal Project`), it locates the matching project in `resumeData.projects` using both original and newly modified names/URLs.
     - Modifies the project's `name`, `techStack`, `link`, and `bullets` in-place and executes `deduplicateProjects()`, guaranteeing **0 duplicate project records** on the resume or preview canvas.
* **Verification**:
  - Automated headless Brave browser verification (`scratch/test_edit_entry.mjs`):
    - Verified `Edit` button exists on timeline cards.
    - Verified clicking `Edit` opens the inline editing form with pre-populated values.
    - Verified appending `[Production Ready]` to title, adding a new bullet point (`"Spearheaded automated regression suite and CI/CD pipelines reducing release failures by 95%."`), and appending `Terraform, Docker` to tech stack.
    - Verified clicking `Save Changes`:
      - Card cleanly exited edit mode.
      - Updated title, 2 bullets, and new tags (`Terraform`, `Docker`) rendered immediately on screen.
      - Success toast notification verified.
      - Confirmed `resumeData.projects` in `dev_resume_studio_v1` local storage was updated in-place with 0 duplicate projects.
  - Screenshots captured:
    - [edit_form_open.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/edit_form_open.png)
    - Production build (`cmd /c npm run build`) passed with 0 errors in 315ms.

---

### 13. Featured Engineering Projects: Multi-Tier Layout, Vector Link Badges, and Dedicated Tech Stack Subheader (October 2026)
* **Problem**:
  - The "Featured Engineering Projects" section previously placed project titles, repository links, and technology stacks together in a single flex row (`justify-content: space-between; align-items: baseline`).
  - This caused three distinct visual defects:
    1. **Awkward Title Wrapping & Text Collisions**: Long titles (e.g. *Hyperspectral Image Classification Using Deep Learning Techniques*) were squeezed by the right-hand tech stack column, breaking words awkwardly across multiple lines.
    2. **Raw Bracketed URLs**: Links were rendered as un-styled raw text brackets `[{proj.link}]` (e.g. `[https://github.com/subhojitp76/antigravity-ai-studio]`), which hyphenated in the middle of words and were not clickable hyperlinks.
    3. **Right-Column Tech Stack Overflow**: Projects with extensive tech stacks (e.g. 10 technologies for *AI Studio*) wrapped into 3-4 cramped lines of narrow italic text on the right margin, pushing against the left column and creating an unbalanced layout.
* **Architecture & Solution**:
  1. **Decoupled Project Metadata Parser (`src/utils/projectUtils.js`)**:
     - Created `parseProjectMeta(proj)` and `formatProjectLink(rawLink)`.
     - Automatically separates dates (e.g. `Jan 2025 - Feb 2025`, `Sep 2023 - Feb 2024`) and supervisor/mentor affiliations (e.g. `Prof. Rajeev Srivastava, IIT BHU`) even when bundled into raw import strings.
     - Normalizes repository and demo links into structured `{ href, cleanDisplay, label, isGithub }` objects, stripping unnecessary `https://` protocols while preserving valid anchor links.
  2. **Multi-Tier Hierarchical Layout Across Templates (`ModernTechTemplate.jsx`, `CleanAtsTemplate.jsx`, `TerminalSystemsTemplate.jsx`)**:
     - **Line 1 (Primary Header)**:
       - **Left**: Project title in bold (`fontWeight: 700`, `#0f172a`), given up to 100% of the line width to prevent awkward wraps.
       - **Interactive Vector Link Badge**: Directly beside the title, renders a clickable `<a>` tag with crisp vector SVG icons (GitHub mark or external link icon) and clean label (`GitHub ↗`, `GitLab ↗`, `Live Demo ↗`).
       - **Right**: Right-aligned, formatted date/period in subtle italics (`#64748b`), perfectly aligned with work experience dates.
     - **Line 2 (Dedicated Subheader)**:
       - Gives the technology stack 100% horizontal width directly below the title.
       - Preceded by a semi-bold label `<strong style={{ fontWeight: 600, color: '#334155' }}>Technologies: </strong>`, followed by cleanly formatted technology tags.
       - Renders supervisor/advisor affiliations cleanly without colliding with project titles.
     - **Line 3 (Accomplishment Bullets)**:
       - Indented bullet points with markdown bolding support (`renderFormattedText`).
  3. **Enhanced Editor Controls (`EditorSidebar.jsx`)**:
     - Added dedicated fields for `Repository / Demo Link` and `Date / Period (Optional)`, plus a full-width `Technologies / Tools` input with descriptive placeholders.
* **Verification**:
  - Automated headless Brave browser verification (`scratch/test_featured_projects_view.mjs`):
    - Tested with exact user projects (*VidTube*, *Hyperspectral Image Classification*, *Unmanned Aerial Vehicle*, *AI Studio*).
    - Verified all 4 titles render cleanly with zero title collision or word breaking.
    - Verified *VidTube* and *AI Studio* display interactive vector GitHub badges (`[GitHub ↗]`) with direct `href` links.
    - Verified *Hyperspectral...* and *Unmanned Aerial Vehicle* titles fit completely on a single line, with dates right-aligned and affiliations on Line 2.
    - Verified *AI Studio* displays its 10-item tech stack on a dedicated full-width subheader with `Technologies: ...`.
    - Verified single-page fit in Compact density mode (`✓ 1 Page (A4 Fit)`).
  - Screenshots captured:
    - [featured_projects_fixed.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/featured_projects_fixed.png)
    - [featured_projects_autofit.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/featured_projects_autofit.png)
  - Production build (`cmd /c npm run build`) passed with 0 errors in 307ms.

---

### 14. Resume Section & Item Reordering Engine (Top-Level Layout Presets + Fine-Grained Item & Bullet Hierarchy) (October 2026)
* **Problem**:
  - Previously, all three resume templates (`ModernTechTemplate.jsx`, `CleanAtsTemplate.jsx`, `TerminalSystemsTemplate.jsx`) had hardcoded top-to-bottom section rendering orders (`summary` -> `skills` -> `experience` -> `projects` -> `education` / `certifications`).
  - Users targeting different career stages or recruiter requirements could not customize the document hierarchy. For example:
    - New graduates or developers with standout portfolio repositories needed **Projects First** or **Academic / New Grad** (Education near the top).
    - Experienced enterprise engineers needed **Traditional ATS** (Experience directly after summary).
    - Full-stack engineers needed **Skills & Projects Lead** before work experience.
  - Additionally, users had no mechanism to rearrange the chronological or importance ordering of:
    - Work experience roles (e.g. promoting a more relevant contract or senior role).
    - Individual accomplishment bullets within each role.
    - Featured engineering projects.
    - Technical skills categories (e.g. placing Languages & Core or Distributed Systems first).
    - Education institutions and Certifications / Achievements.
* **Architecture & Solution**:
  1. **Schema & Presets (`src/constants/defaultData.js`)**:
     - Added `DEFAULT_SECTION_ORDER = ['summary', 'skills', 'experience', 'projects', 'education', 'certifications']`.
     - Added `SECTION_ORDER_PRESETS` featuring 5 industry-standard layout presets:
       - **Standard SWE**: `Summary -> Skills -> Experience -> Projects -> Education -> Certifications`
       - **Projects First**: `Summary -> Skills -> Projects -> Experience -> Education -> Certifications`
       - **Traditional ATS**: `Summary -> Experience -> Skills -> Projects -> Education -> Certifications`
       - **Skills & Projects Lead**: `Summary -> Skills -> Projects -> Education -> Experience -> Certifications`
       - **Academic / New Grad**: `Summary -> Education -> Skills -> Projects -> Experience -> Certifications`
     - Extended `DEFAULT_RESUME` with `sectionOrder: DEFAULT_SECTION_ORDER` and guaranteed backward compatibility through fallback guards (`resumeData.sectionOrder || DEFAULT_SECTION_ORDER`).
  2. **Modular Dynamic Section Renderers Across All Templates**:
     - Refactored `ModernTechTemplate.jsx`, `CleanAtsTemplate.jsx`, and `TerminalSystemsTemplate.jsx` to modularize each section into dedicated pure render functions:
       - `renderSummary()`, `renderSkills()`, `renderExperience()`, `renderProjects()`, `renderEducation()`, `renderCertifications()`.
     - Replaced hardcoded JSX stacks with dynamic section iteration driven by `sectionOrder`.
     - Intelligently handled the 2-column grid vs stacked layout: when `education` and `certifications` are adjacent in the custom order and `bottomLayout !== 'stacked'`, the templates render them side-by-side in a responsive 2-column grid and skip the second one in the loop. If separated by other sections or set to `stacked`, they render full-width independently.
  3. **Interactive Reordering UI & Two-Tier Control System (`EditorSidebar.jsx`)**:
     - **Dedicated "Section Order & Presets (REORDERABLE)" Accordion**:
       - 1-Click quick presets toolbar with active state highlighting.
       - Drag-free, deterministic `Move Up` / `Move Down` controls for each of the 6 sections with real-time rank badges (`#1` to `#6`) and section icons.
       - `Reset Default` button to restore standard SWE layout.
     - **Section-Level In-Context Indicators & Quick Controls**:
       - Added live `#rank` position badges in each section's accordion header (e.g. `#{getSectionRank('projects')}`).
       - Added in-context quick position controls inside each section body (`Position on Resume: #3 of 6` with `▲ Move Up` / `▼ Move Down` buttons).
     - **Fine-Grained Item & Bullet Reordering**:
       - **Work Experience**: `#index` badge on every role card with role `Move Up` / `Move Down` buttons, plus dedicated up/down chevrons for reordering individual STAR bullet points (`moveExperienceBullet`).
       - **Featured Projects**: `#index` badges and project `Move Up` / `Move Down` buttons (`moveProject`).
       - **Skill Categories**: `#index` badges and category `Move Up` / `Move Down` buttons (`moveSkillCategory`).
       - **Education**: `#index` badges and entry `Move Up` / `Move Down` buttons (`moveEducation`).
       - **Certifications & Achievements**: `#index` badges and achievement `Move Up` / `Move Down` buttons (`moveCertification`).
* **Verification**:
  - Automated headless Brave browser verification (`scratch/test_resume_reordering.mjs`):
    - Verified opening "Section Order & Presets" accordion and rendering all 5 presets and 6 section cards.
    - Verified clicking "Projects First" preset:
      - Live preview updated immediately, moving `FEATURED ENGINEERING PROJECTS` before `WORK EXPERIENCE`.
      - Sidebar badges updated to `#3 Featured Projects` and `#4 Work Experience`.
      - Toast notification `"Applied preset: Projects First"` displayed.
    - Verified item-level project reordering:
      - Swapped project #1 (`DistriQueue`) with project #2 (`FluxCache`).
      - Verified `FluxCache` rendered as #1 in both editor inputs and live preview with zero lag.
      - Toast notification `"Moved project "DistriQueue — High-Throughput Distributed Task Queue" down"` displayed.
    - Verified item-level work experience reordering:
      - Swapped `Senior Backend Engineer` with `Backend Software Engineer`.
      - Verified `Backend Software Engineer` rendered as #1 in both editor cards and live preview.
      - Maintained exact A4 single-page fit (`✓ 1 Page (A4 Fit)`).
  - Screenshots captured:
    - [section_reordering_sidebar_open.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/section_reordering_sidebar_open.png)
    - [section_reordering_projects_first_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/section_reordering_projects_first_verified.png)
    - [item_reordering_projects_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/item_reordering_projects_verified.png)
    - [item_reordering_experience_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/item_reordering_experience_verified.png)
  - Production build (`cmd /c npm run build`) passed with 0 errors in 328ms.

---

### 15. URL Routing & Navigation Engine (HTML5 History API + Hash Fallback + Multi-Alias Resolution) (October 2026)
* **Problem**:
  - The application previously managed top-level navigation (`marketRadar`, `devJournal`, `resumeBuilder`) purely through ephemeral in-memory React state (`activeTab`).
  - This introduced several UX and developer friction points:
    1. **Loss of Context on Refresh / HMR**: Refreshing or hot-reloading the browser while editing a resume or viewing the Dev Journal always forced a reset back to the default tab (`marketRadar`).
    2. **Un-bookmarkable & Un-shareable Views**: Users could not bookmark, link, or share direct URLs like `/resume` or `/journal`.
    3. **Broken Browser Back / Forward Controls**: Navigating between tabs did not create browser history entries. Pressing the browser "Back" button either navigated away from the application or did nothing.
    4. **Inaccessible Navigation Elements**: Tab navigation buttons were generic `<button>` elements instead of semantic `<a>` anchor links, preventing right-click "Open in new tab", middle-click navigation, and SEO crawlers.
* **Architecture & Solution**:
  1. **Canonical Route Schema & Multi-Alias Resolver (`src/utils/routeUtils.js`)**:
     - Canonical Routes:
       - `marketRadar`: `/radar`
       - `devJournal`: `/journal`
       - `resumeBuilder`: `/resume`
     - Robust multi-alias resolution table (`ROUTE_MAP`):
       - Maps `/`, `/radar`, `/market-radar`, `/market`, `/tech-radar` -> `'marketRadar'`
       - Maps `/journal`, `/dev-journal`, `/devjournal`, `/work-log` -> `'devJournal'`
       - Maps `/resume`, `/resume-builder`, `/resumebuilder`, `/builder`, `/editor` -> `'resumeBuilder'`
     - Dynamic Document Titles:
       - `marketRadar`: `Tech Market Radar | Dev Resume Studio`
       - `devJournal`: `Dev Journal & Work Log | Dev Resume Studio`
       - `resumeBuilder`: `Resume Builder Studio | Dev Resume Studio`
     - Dual-Mode Resolution (`getTabFromUrl`):
       - First inspects hash routes (`#/radar`, `#/journal`, `#/resume`) for maximum resilience in static hosting environments without rewrite engines.
       - Then inspects HTML5 pathnames (`/radar`, `/journal`, `/resume`).
  2. **Reactive History Synchronization in Global Context (`AppContext.jsx`)**:
     - `activeTab` initializes directly from the browser URL on first paint (`useState(() => getTabFromUrl())`).
     - `setActiveTab(tab, pushToHistory = true)` executes `syncUrlWithTab()` using `window.history.pushState` on user action, while updating document title.
     - Registers global `popstate` and `hashchange` listeners to seamlessly sync browser Back and Forward navigation without duplicate history states.
     - On initial mount, automatically normalizes root `/` or aliases (e.g. `/resume-builder`) to canonical URLs via `replaceState`.
     - Exposes `currentRoute` and `navigateToRoute(route)` in context value.
  3. **Accessible Semantic Anchor Navigation (`Navbar.jsx`)**:
     - Converted brand logo and tab navigation buttons from `<button>` to semantic `<a>` links with `href={TAB_ROUTES[key]}`.
     - Implemented `handleNavClick` interceptor: prevents default reload for standard left clicks to provide instantaneous SPA transitions, while cleanly preserving native browser behaviors (Ctrl+Click, Cmd+Click, Shift+Click, middle click, right-click "Open link in new tab").
* **Verification**:
  - Automated headless Brave browser verification (`scratch/test_url_routing.mjs`):
    - **Test 1 (Root Navigation)**: Verified landing on `/` normalizes pathname to `/radar`, sets page title to `Tech Market Radar | Dev Resume Studio`, and highlights `1. Tech Market Radar` tab.
    - **Test 2 (Direct Path Navigation)**: Verified direct browser navigation to `http://localhost:5173/resume` immediately loads `Resume Builder Studio` on first paint.
    - **Test 3 (Direct Path Navigation)**: Verified direct browser navigation to `http://localhost:5173/journal` immediately loads `Dev Journal & Work Log`.
    - **Test 4 (In-App Tab Switching)**: Verified clicking `Resume Builder` in Navbar transitions seamlessly, sets URL to `/resume`, and updates document title without page reload.
    - **Test 5 (Browser History Back/Forward)**: Verified executing `history.back()` returns to `/journal` and updates the active tab and title automatically via `popstate`.
    - **Test 6 (Friendly Alias Routing)**: Verified direct navigation to `/resume-builder` resolves correctly to `/resume`.
  - Screenshots captured:
    - [route_radar_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/route_radar_verified.png)
    - [route_resume_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/route_resume_verified.png)
    - [route_journal_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/route_journal_verified.png)
  - Production build (`cmd /c npm run build`) passed with 0 errors in 294ms.

---

### 16. Education GPA / CGPA Normalization & Deduplication Engine (October 2026)
* **Problem**:
  - In the Education section, grades were rendering with awkward nested prefixes such as `"GPA: CGPA: 8.29"` accompanied by a duplicate badge `"CGPA: 8.29"`.
  - The user reported: *"We are getting CGPA twice in the education section 'GPA: CGPA: 8.29' and 'CGPA: 8.29', it should be either GPA or CGPA"*.
* **Root Causes**:
  1. **Template Prefix Hardcoding**:
     - In `ModernTechTemplate.jsx` (line 382), `GPA: {edu.gpa}` prepended `"GPA: "` unconditionally to `edu.gpa`. When `edu.gpa` was already formatted as `"CGPA: 8.29"`, the output rendered as `"GPA: CGPA: 8.29"`.
     - Similarly, in `CleanAtsTemplate.jsx` and `TerminalSystemsTemplate.jsx`, `"GPA: "` was prepended without checking if `edu.gpa` already started with `"CGPA:"` or `"GPA:"`.
  2. **Duplicate Badges across GPA and Highlights**:
     - In `ModernTechTemplate.jsx`, both `{edu.gpa}` (as a colored badge) and `{edu.highlights}` (as a second badge) were rendered side-by-side.
  3. **Parser Duplication Bug**:
     - In `src/services/parserService.js` (line 805), the fallback parser executed `curEdu.highlights = gpa;` AND `curEdu.gpa = gpa;`, populating both properties with identical strings.
     - In the AI prompt schema (lines 111–112), both `"gpa"` and `"highlights"` examples were set to `"CGPA: ..."`, causing LLMs to generate duplicate fields.
  4. **Editor Input Conflation**:
     - `EditorSidebar.jsx` provided only a single input labeled `"Academic Honors / CGPA / Coursework"`, conflating GPA scores and honors and offering no discrete field for `edu.gpa`.
* **Fix Applied**:
  1. **Normalization Engine (`src/utils/educationUtils.js`)**:
     - `cleanGradeString(rawGrade)`:
       - Strips nested/redundant stacked prefixes (e.g. `GPA: CGPA: 8.29` -> `CGPA: 8.29`, `GPA: GPA:` -> `GPA:`).
       - Automatically infers correct scale prefix for raw numbers: scores > 4.0 or out of 10 default to `CGPA: `, 4.0 scales default to `GPA: `.
     - `formatEducationDisplay(edu)`:
       - Returns `{ gradeBadge, honorsBadge }`.
       - Deduplicates `highlights` against `gradeBadge`: if `highlights` duplicates the score or grade, it is suppressed to prevent twin badges. If `highlights` contains legitimate honors (e.g. `"Magna Cum Laude"`), it is preserved as `honorsBadge`.
  2. **Template Updates (`ModernTechTemplate.jsx`, `CleanAtsTemplate.jsx`, `TerminalSystemsTemplate.jsx`)**:
     - All 3 templates now consume `formatEducationDisplay(edu)`:
       - **ModernTechTemplate**: Renders clean `{gradeBadge}` (e.g. `[CGPA: 8.29]`) and optional distinct `{honorsBadge}`.
       - **CleanAtsTemplate**: Renders `[gradeBadge, honorsBadge].filter(Boolean).join(' • ')`.
       - **TerminalSystemsTemplate**: Renders `> [gradeBadge, honorsBadge].filter(Boolean).join(' | ')`.
  3. **Parser Service Fixes (`src/services/parserService.js`)**:
     - Removed `curEdu.highlights = gpa;` so regex parser only assigns to `curEdu.gpa`.
     - Clarified AI prompt schema so `gpa` accepts grade scores and `highlights` strictly accepts honors/coursework without repeating the grade.
  4. **Dedicated Editor Inputs (`EditorSidebar.jsx`)**:
     - Replaced single combined input with dual grid inputs:
       - `GPA / CGPA` (`edu.gpa`, placeholder: `"E.g., CGPA: 8.29 or 3.8 / 4.0"`).
       - `Honors / Coursework (Optional)` (`edu.highlights`, placeholder: `"E.g., Magna Cum Laude"`).
  5. **Session Data Sanitizer (`src/context/AppContext.jsx`)**:
     - Sanitizes legacy `localStorage` entries upon boot, stripping duplicate `highlights` that match `gpa` and fixing existing stored profiles immediately.
* **Verification**:
  - Unit tests (`scratch/test_cgpa_units.mjs`) verified all 6 edge cases:
    - `GPA: CGPA: 8.29` + `CGPA: 8.29` -> `gradeBadge: 'CGPA: 8.29', honorsBadge: null` (PASS)
    - `8.29` raw number -> `gradeBadge: 'CGPA: 8.29'` (PASS)
    - `3.8 / 4.0` + `Dean's List` -> `gradeBadge: 'GPA: 3.8 / 4.0', honorsBadge: "Dean's List"` (PASS)
    - `CGPA: 8.29` + `CGPA: 8.29 | Magna Cum Laude` -> `gradeBadge: 'CGPA: 8.29', honorsBadge: 'Magna Cum Laude'` (PASS)
  - Live Browser Integration Test (`scratch/test_cgpa_browser.mjs` & `scratch/inspect_cgpa_scroll.mjs`):
    - Modern SWE Minimalist: Zero occurrences of `"GPA: CGPA"`, exactly 1 occurrence of `CGPA: 8.29`.
    - Clean ATS: Exactly 1 occurrence of `CGPA: 8.29`.
    - Terminal Hacker: Exactly 1 occurrence of `> CGPA: 8.29`.
    - Screenshots captured: [education_cgpa_scrolled_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/education_cgpa_scrolled_verified.png).
  - Production build (`cmd /c npm run build`) passed with 0 errors in 331ms.

---

### 17. Issue 018: Clean ATS Corporate Template Heading Visibility & Font Color Fix (October 2026)
* **Problem**:
  - In the "Clean ATS Corporate" template, the user name (`h1`) and all resume section names (`h2` for Professional Summary, Technical Skills, Professional Experience, Key Technical Projects, Education, Certifications) appeared virtually invisible (faint white ghost text).
  - The user reported: *"The resume section names, user name, etc are not visible in 'Clean ATS Corporate' template, as per my analysis it's due to the font color, please verify and fix it"*.
* **Root Cause**:
  1. In `src/index.css` (lines 106–112), the global typography reset defined:
     ```css
     h1, h2, h3, h4, h5, h6 {
       font-family: var(--font-heading);
       color: var(--text-primary);
       font-weight: 600;
       line-height: 1.25;
     }
     ```
     where `--text-primary` is `#f8fafc` (cyber-dark theme light text / almost pure white).
  2. In `src/components/ResumeBuilder/Templates/CleanAtsTemplate.jsx`, the header `<h1 ...>` and every section header `<h2 ...>` were styled with inline font sizes, weights, and margins, but omitted an explicit `color` declaration.
  3. Consequently, the global CSS rule applied `color: var(--text-primary)` (`rgb(248, 250, 252)`), causing white headings to be rendered against the pure white resume canvas background (`#ffffff`), producing zero contrast.
* **Fix Applied**:
  1. **Explicit Dark Colors in `CleanAtsTemplate.jsx`**:
     - Added `color: '#111827'` explicitly to `<h1 ...>` (user name) in the header.
     - Added `color: '#111827'` explicitly to all section `<h2 ...>` headers:
       - `PROFESSIONAL SUMMARY`
       - `TECHNICAL SKILLS`
       - `PROFESSIONAL EXPERIENCE`
       - `KEY TECHNICAL PROJECTS`
       - `EDUCATION`
       - `CERTIFICATIONS`
  2. **Global Print & Paper Scoped Rule in `src/index.css`**:
     - Added a targeted rule ensuring that any heading inside `#printable-resume` or `.resume-paper` defaults to high-contrast dark text `#111827`, protecting all current and future templates against global dark theme variable bleeding:
       ```css
       #printable-resume h1,
       #printable-resume h2,
       #printable-resume h3,
       #printable-resume h4,
       #printable-resume h5,
       #printable-resume h6,
       .resume-paper h1,
       .resume-paper h2,
       .resume-paper h3,
       .resume-paper h4,
       .resume-paper h5,
       .resume-paper h6 {
         color: #111827;
       }
       ```
* **Verification**:
  - Live browser CDP inspection (`scratch/inspect_clean_ats_bug.mjs`):
    - Verified `h1` computed color: `rgb(17, 24, 39)` (`#111827`).
    - Verified all 6 `h2` computed colors: `rgb(17, 24, 39)` (`#111827`).
    - PASS: All headings confirmed dark and high-contrast.
  - Screenshots captured and verified:
    - [clean_ats_before_fix.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/clean_ats_before_fix.png) (demonstrating the white-on-white text bug).
    - [clean_ats_after_fix.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/clean_ats_after_fix.png) (demonstrating bold, crisp, dark headings in top half).
    - [clean_ats_bottom_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/clean_ats_bottom_verified.png) (demonstrating bold, crisp, dark headings in bottom half: Projects, Education, Certifications).
  - Production build (`cmd /c npm run build`) passed with 0 errors in 315ms.

---

### 18. Issue 019: Profile Link Normalization & Short Handle Extraction (October 2026)
* **Problem**:
  - Across all resume templates and form inputs, GitHub and LinkedIn profile links were displayed with full verbose domain prefixes (e.g., `github.com/subhojitp76`, `https://www.linkedin.com/in/subhojitp76/`).
  - This consumed excessive horizontal space in resume contact headers (causing awkward wrapping on A4 sheets, especially in Clean ATS Corporate), looked visually clunky, and violated modern SWE design aesthetics.
  - The user requested: *"For user github and linkedin profiles links should be short, for example 'github.com/subhojitp76' should be 'subhojitp76' etc"*.
* **Key Requirements & Design Decisions**:
  1. **Visual Handle Display**:
     - Links must display clean usernames/handles (e.g. `subhojitp76`), stripping `https://`, `http://`, `www.`, `github.com/`, `linkedin.com/in/`, query parameters, hashes, and trailing slashes.
  2. **Clickable & Printable Destination**:
     - The rendered HTML anchor (`<a href="...">`) must always retain a valid, canonical absolute URL (`https://github.com/subhojitp76`, `https://linkedin.com/in/subhojitp76`) so clicking the link or exporting to PDF navigates seamlessly.
  3. **Visual Brand Identity (Disambiguation)**:
     - When both GitHub and LinkedIn use identical handles (e.g. `subhojitp76`), users and recruiters must immediately know which is which.
     - Modern SWE Minimalist & Clean ATS: Paired with crisp 11px inline SVG brand icons (GitHub Octocat and LinkedIn `in` glyphs) and descriptive `title` / `aria-label` attributes.
     - Terminal / Systems Engineer: Uses developer CLI conventions (`gh/subhojitp76` and `in/subhojitp76`).
  4. **Multi-Layer Defensive Normalization**:
     - `linkUtils.js`: Central utility with `formatProfileHandle()`, `formatProfileUrl()`, and `getProfileLinkInfo()`.
     - `AppContext.jsx`: Sanitizes legacy profile links upon loading from `localStorage`.
     - `EditorSidebar.jsx`: Form inputs display short handle placeholders (`e.g. subhojitp76`) and run `onBlur` normalization to auto-strip pasted full URLs.
     - `parserService.js`: AI and regex resume parsers extract clean handles directly during resume upload.
* **Files Modified**:
  - `src/utils/linkUtils.js` (created with unit tests in `scratch/test_link_utils.mjs`).
  - `src/components/ResumeBuilder/Templates/ModernTechTemplate.jsx`.
  - `src/components/ResumeBuilder/Templates/CleanAtsTemplate.jsx`.
  - `src/components/ResumeBuilder/Templates/TerminalSystemsTemplate.jsx`.
  - `src/components/ResumeBuilder/EditorSidebar.jsx`.
  - `src/context/AppContext.jsx`.
  - `src/constants/defaultData.js`.
  - `src/services/parserService.js`.
* **Verification & Testing**:
  - **Unit Testing** (`scratch/test_link_utils.mjs`):
    - 15 test cases verifying bare handles, `github.com/user`, `https://github.com/user/`, `linkedin.com/in/user?trk=p`, `@user`, portfolio domains. 100% pass rate.
  - **Browser CDP End-to-End Testing** (`scratch/test_short_social_links.mjs`):
    - Injected full URLs into `localStorage`: `github.com/subhojitp76`, `https://www.linkedin.com/in/subhojitp76/`, `https://subhojit.dev/`.
    - Modern SWE Minimalist: GitHub rendered as `subhojitp76` (`https://github.com/subhojitp76`), LinkedIn rendered as `subhojitp76` (`https://linkedin.com/in/subhojitp76`).
    - Clean ATS Corporate: GitHub rendered as `subhojitp76` (`https://github.com/subhojitp76`), LinkedIn rendered as `subhojitp76` (`https://linkedin.com/in/subhojitp76`).
    - Terminal / Systems Engineer: GitHub rendered as `gh/subhojitp76` (`https://github.com/subhojitp76`), LinkedIn rendered as `in/subhojitp76` (`https://linkedin.com/in/subhojitp76`).
  - **Screenshots Captured**:
    - [social_links_modern_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/social_links_modern_verified.png)
    - [social_links_ats_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/social_links_ats_verified.png)
    - [social_links_terminal_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/social_links_terminal_verified.png)
  - **Production Build**: `cmd /c npm run build` passed with 0 errors in 345ms.

---

### 19. Issue 020: Product Identity & Rebranding to "DevSignal" (October 2026)
* **Context**:
  - The application has grown beyond a standard resume generator into a unified engineering platform connecting **Tech Market Radar**, a continuous **Dev Journal & Work Log**, and an **ATS Resume Synthesizer**.
  - Following review of brand archetypes (Developer-Native, Ops-Engine, Radar Signals, and Modern SaaS), the product was officially named **DevSignal**.
  - "DevSignal" highlights the high signal-to-noise ratio in developer hiring: cutting through low-signal fluff with verified engineering metrics, live market skill demand, and quantified impact.
* **Updates Implemented**:
  1. **Navigation Header & Brand Typography** (`src/components/Navigation/Navbar.jsx`):
     - Updated header text to `DEV` (bright white) + `SIGNAL` (cyber cyan `#38bdf8`) with `SWE ED.` pill badge.
     - Updated tagline to: `Tech Radar • Work Journal • ATS Resume`.
  2. **Page Titles & SEO Meta Tags** (`index.html`, `src/utils/routeUtils.js`):
     - `index.html`: `<title>DevSignal | SWE Career &amp; Resume Engine</title>`.
     - Route utilities updated with dynamic route titles:
       - `Tech Market Radar | DevSignal`
       - `Dev Journal & Work Log | DevSignal`
       - `Resume Builder Studio | DevSignal`
  3. **Storage & State Migration** (`src/context/AppContext.jsx`):
     - Introduced `devsignal_v1` and `devsignal_history_v1` storage keys.
     - Added backward-compatible fallback to `dev_resume_studio_v1` and `dev_resume_history_v1` to guarantee zero data loss for existing users.
     - Updated JSON backup file exports to `devsignal_backup_YYYY-MM-DD.json`.
  4. **Package Configuration** (`package.json`):
     - Project name updated to `"name": "devsignal"`.
* **Verification & Visual Confirmation**:
  - Browser CDP automated inspection (`scratch/test_devsignal_branding.mjs`):
    - Title verified: `Resume Builder Studio | DevSignal`.
    - Brand element verified: `DEVSIGNAL`.
    - Screenshot captured: [devsignal_brand_verified.png](file:///C:/Users/subho/.gemini/antigravity-ide/brain/75e65e7d-aa78-4665-8026-7b2cbc730b76/devsignal_brand_verified.png).
  - Production build (`npm run build`) succeeded with 0 errors in 324ms.

---

### 20. Issue 021: ATS Score Matcher & Objective 3-Tier Keyword Recommendation Engine (Phase 1)
* **Context**:
  - Technical candidates applying to modern engineering roles frequently fail initial Applicant Tracking System (ATS) screening (Workday, Taleo, Greenhouse, Lever) or human recruiter screens due to keyword mismatches, lack of quantified impact metrics, or formatting non-compliance.
  - The user requested an ATS Calculator that compares target Job Descriptions (JD) against the resume, computes an objective match score, provides actionable skill/keyword recommendations, and avoids naive keyword stuffing.
* **Architectural Decisions & Industry-Standard Weighted Formula**:
  - We benchmarked commercial screening systems (Jobscan, Teal, Resume Worded) and internal recruiter heuristics:
    1. **Hard Skills & Keywords (45% Weight)**:
       - Evaluates technical terms against both frequency and contextual location.
       - **Anti-Keyword Stuffing Rule**: Skills listed only in a skills summary receive 50% weight. Skills demonstrated inside Work Experience bullets receive 100% weight, and Projects receive 85% weight.
    2. **Role & Seniority Fit (20% Weight)**:
       - Audits title token alignment (e.g. `Backend`, `Distributed Systems`, `Staff`, `Senior`, `Lead`) across target title, resume title, and professional summary.
    3. **Quantified STAR/XYZ Impact (20% Weight)**:
       - Audits percentage gains (`400%`), latencies (`48ms`), scale multipliers (`10M+`, `18k req/sec`), throughput, and dollar values across all bullet points.
    4. **ATS Format & Structural Compliance (15% Weight)**:
       - Validates contact metadata completeness, standard section headers, and 1-page A4 density (400–800 words).
* **Objective 3-Tier Recommendation Engine**:
  - Rather than treating all missing words equally, DevSignal implements an honest 3-tier triage:
    - **Tier 1 (Safe Synonyms & Exact Match)**: Detects when the candidate has verified experience in related tech (e.g., candidate has `javascript` but JD asks for `TypeScript`, or candidate has `sql` but JD asks for `PostgreSQL`). Offers a 1-click `+ Add to Skills` button that immediately updates resume state and recomputes the score in real time.
    - **Tier 2 (Contextual STAR Bullets)**: Identifies architectural requirements (e.g., `AWS`, `Kafka`) that demand real engineering context. Provides pre-built STAR bullet templates with metric placeholders (`[Throughput]`, `[Latency ms]`, `[Result]`) with a 1-click `Copy Template` button.
    - **Tier 3 (True Skill Deficits - Objective Analysis)**: Flags core skills with no foundation in the candidate's resume. Displays an **Engineering Integrity Warning**: *"Do not blindly keyword stuff—technical screeners will probe deep into real production scenarios. Instead, use these as your roadmap for Dev Journal projects."*
* **Implementation Highlights**:
  - `src/utils/atsUtils.js`: 250+ technical skills taxonomy with bidirectional synonyms, `extractTechnicalSkills`, `extractResumeSkills`, `auditQuantifiedMetrics`, `auditRoleAlignment`, `auditAtsStructure`, and `calculateAtsScore`.
  - `src/components/ResumeBuilder/AtsScoreModal.jsx`: Cyber-dark 2-column studio with Quick-Load Sample JDs, SVG circular score gauge, 4-pillar progress bars, 3-Tier recommendation cards, Matched Keywords pill list, and ATS Structural Checklist.
  - `src/components/ResumeBuilder/ResumeBuilderTab.jsx`: Toolbar integration with dynamic ATS score badge (`ATS: 85% Exceptional`) and modal trigger.
  - `src/context/AppContext.jsx`: Added `targetJobDescription`, `updateTargetJobDescription`, `atsScoreResult`, `updateAtsScoreResult`, and `addSkillToResume`.
* **Phased Roadmap**:
  - **Phase 1 (Complete)**: Local deterministic weighted scoring engine, 3-tier recommendations, and interactive studio modal.
  - **Phase 2 (Next)**: Tech Market Radar Personalization & Dev Journal growth milestone sync.
  - **Phase 3 (Future)**: Removing hardcoded requirements in favor of dynamic LLM/API-driven keyword extraction and customizable company heuristics.
* **Verification & Visual Confirmation**:
  - Unit tests passed 100% (`scratch/test_ats_utils.mjs`, `scratch/test_ats_recommendations.mjs`).
  - Production build (`cmd /c npm run build`) passed with 0 errors in 325ms.
  - Headless browser CDP testing (`scratch/test_tab_clicks.mjs`, `scratch/test_fullstack_sample.mjs`):
    - Score calculated accurately (90% for Senior Distributed Systems, 85% for Senior Full Stack).
    - Tier 1 1-click skill addition immediately updated resume state, fired toast notification, and recalculated match score.
    - Screenshots verified: [modal_after_sample.png](file:///c:/Users/subho/OneDrive/Desktop/Projects/Resume%20Builder/scratch/modal_after_sample.png), [fullstack_sample_results.png](file:///c:/Users/subho/OneDrive/Desktop/Projects/Resume%20Builder/scratch/fullstack_sample_results.png), [tab_matched_verified.png](file:///c:/Users/subho/OneDrive/Desktop/Projects/Resume%20Builder/scratch/tab_matched_verified.png), [tab_structural_verified.png](file:///c:/Users/subho/OneDrive/Desktop/Projects/Resume%20Builder/scratch/tab_structural_verified.png), [toolbar_with_score.png](file:///c:/Users/subho/OneDrive/Desktop/Projects/Resume%20Builder/scratch/toolbar_with_score.png).

