# DevSignal ⚡

> **High-Signal SWE Career Engine: Tech Market Radar, Dev Journal & ATS-Compliant Resume Studio**

![DevSignal Banner](https://img.shields.io/badge/DevSignal-SWE%20Edition-38bdf8?style=for-the-badge&logo=react&logoColor=white)
![React 19](https://img.shields.io/badge/React-19.2-61dafb?style=flat-square&logo=react&logoColor=black)
![Vite 8](https://img.shields.io/badge/Vite-8.3-646cff?style=flat-square&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-emerald?style=flat-square)
![ATS Compliant](https://img.shields.io/badge/ATS-100%25%20Verified-brightgreen?style=flat-square)
![Privacy](https://img.shields.io/badge/Data-100%25%20Local-purple?style=flat-square)

---

## 📌 Overview

**DevSignal** is a career synthesis platform purpose-built for software engineers, backend developers, and systems architects. Traditional resume builders treat resumes as static text documents filled with low-signal fluff. **DevSignal** flips the paradigm: it bridges your real daily engineering output (code, pull requests, architectural trade-offs, and production incidents) with live market skill demands to produce quantified, high-impact, ATS-optimized developer resumes.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              DEVELOPER                                 │
└───────┬───────────────────────────────┬────────────────────────┬───────┘
        │ Uploads Resume (PDF/JSON/Text)│ Work Prompts & Updates │ Target Role
        ▼                               ▼                        ▼
┌──────────────────┐           ┌──────────────────┐     ┌────────────────┐
│   Profile &      │           │   Dev Journal    │     │  Tech Market   │
│ Ingestion Engine │           │ (Standups, Sprints│    │     Radar      │
│(pdfjs + AI/Regex)│           │  & Architecture) │     │ (Live HN/Devto)│
└───────┬──────────┘           └────────┬─────────┘     └────────┬───────┘
        │ Synchronizes                  │ Synthesizes            │ Context
        └───────────────► ┌─────────────▼──────────────┐ ◄───────┘
                          │   Live Resume Studio       │
                          │ - 3 SWE Tailored Templates │
                          │ - Realtime A4 Preview      │
                          │ - 100% Vector PDF Output   │
                          └────────────────────────────┘
```

---

## ✨ Core Pillars & Features

### 1. 📡 Tech Market Radar
- **Live Tech Signals**: Continuously monitors trending developer ecosystems, frameworks, and tools across Hacker News, Dev.to, and GitHub.
- **Skill Demand & Role Radar**: Benchmarks core competencies across Distributed Systems, Backend Engineering, Cloud Architecture, and DevOps.
- **Direct Skill Adoption**: Send in-demand technologies directly to your active resume skills list with a single click.

### 2. 📓 Dev Journal & Work Log
- **Daily Engineering Capture**: Document sprint accomplishments, architecture decisions, pull requests, and bug fixes as they happen.
- **Milestone Evolution Tracker**: Track project evolution from initial MVP to high-scale production milestones.
- **Automated Resume Synthesis**: Select journal milestones and instantly synthesize them into punchy, quantified STAR/XYZ resume bullets (`Built X using Y, achieving Z`).

### 3. 📄 SWE Resume Builder Studio
- **3 Developer-Tailored Templates**:
  1. **Modern SWE Minimalist**: Clean, modern tech aesthetic with subtle accent hues, bold role titles, and inline brand glyphs.
  2. **Terminal / Systems Engineer**: Retro-cyber CLI aesthetic with prompt markers (`$ whoami`, `gh/handle`, `in/handle`, `# [TECHNICAL_CAPABILITIES]`).
  3. **Clean ATS Corporate**: High-contrast, single-column standard layout engineered for 100% readability across corporate Applicant Tracking Systems (Workday, Greenhouse, Lever).
- **Interactive Drag-and-Drop & Section Ordering**: Reorder sections (Work Experience, Projects, Technical Skills, Education) and individual roles or projects with instant live re-rendering.
- **Live A4 Fit Engine**: Visual 1-page fit indicators, adjustable spacing densities (Compact, Normal, Spacious), and instant dual-column/stacked bottom layouts for Education & Certifications.
- **Short Profile Handles**: Automatically normalizes GitHub and LinkedIn handles to clean usernames (e.g. `subhojitp76`) while maintaining full, clickable canonical hyperlinks.
- **100% Vector Print & PDF**: True vector typography export with zero pixelation or blurry canvas rasterization.

### 4. 🧠 Dual-LLM Routing (Cloud & Local)
- **Google Gemini**: Built-in support for `gemini-3.8-flash` (with fallback to `gemini-2.5-flash` / `gemini-2.0-flash`).
- **100% Offline Local LLMs**: Direct Web API integration with **Ollama** (`http://localhost:11434`) and **LM Studio** (`http://localhost:1234`) for developers demanding complete data privacy.

### 5. 🔒 Zero-Knowledge & Local-First Privacy
- All resume data, work journals, and version histories are stored locally in your browser (`localStorage`).
- Complete data portability: Download full JSON backups or restore snapshots at any time.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
- **Styling**: Vanilla CSS Design Tokens (Cyber-Dark & Slate Theme, Glassmorphism, CSS Variables)
- **Icons**: [Lucide React](https://lucide.dev/) + Lightweight Custom Brand SVGs
- **PDF Extraction**: [PDF.js](https://mozilla.github.io/pdf.js/)
- **Micro-Interactions**: [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Linter**: [Oxlint](https://oxc.rs/)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm** / **yarn**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/subhojitp76/devsignal.git
   cd devsignal
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment (Optional)**:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key if you want cloud AI features out of the box:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(Note: You can also enter and manage your Gemini API key or Local LLM endpoint directly in the in-app settings modal without creating a `.env` file.)*

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173/`.

5. **Build for Production**:
   ```bash
   npm run build
   ```
   To test the production build locally:
   ```bash
   npm run preview
   ```

---

## 💻 Local LLM Setup (Ollama / LM Studio)

To run DevSignal entirely offline with zero cloud API dependencies:

### Using Ollama
1. Install and start [Ollama](https://ollama.com/).
2. Run your preferred model (e.g., Llama 3.2 or Mistral):
   ```bash
   ollama run llama3.2
   ```
3. Allow browser cross-origin requests by starting Ollama with `OLLAMA_ORIGINS`:
   ```bash
   # Windows (PowerShell)
   $env:OLLAMA_ORIGINS="*"
   ollama serve

   # macOS / Linux
   OLLAMA_ORIGINS="*" ollama serve
   ```
4. In DevSignal, click the **AI Settings** button (top right), switch provider to **Local (Ollama)**, and set Endpoint to `http://localhost:11434`.

---

## 📂 Project Structure

```
devsignal/
├── public/                     # Static assets
├── src/
│   ├── components/
│   │   ├── DevJournal/         # Work logging, standups, milestone timeline
│   │   ├── Navigation/         # Top navbar, route synchronization, modals
│   │   ├── ResumeBuilder/
│   │   │   ├── EditorSidebar/  # Section editors, ordering controls, profile inputs
│   │   │   ├── PreviewCanvas/  # A4 print preview, spacing controls, vector export
│   │   │   └── Templates/      # ModernTechTemplate, CleanAtsTemplate, TerminalTemplate
│   │   └── TechMarketRadar/    # Live HN trends, role radar, skill signals
│   ├── constants/              # Default SWE profile, baseline resume, radar feeds
│   ├── context/                # AppContext (centralized state, localStorage persistence)
│   ├── services/               # Gemini & Local LLM client, PDF resume parser
│   ├── utils/                  # Education grades, handle normalization, route utils
│   ├── App.jsx                 # Tab switching, top-level layout
│   ├── index.css               # Design system tokens, print CSS, typography
│   └── main.jsx                # Application root entry point
├── ARCHITECTURE_AND_DECISIONS.md # 20 Comprehensive Architecture Decision Records (ADR)
├── package.json
├── vite.config.js
└── README.md
```

---

## 🧭 Application Routes

DevSignal supports deterministic browser navigation with HTML5 History API:

| URL Path | Active View | Description |
| :--- | :--- | :--- |
| `/radar` | **1. Tech Market Radar** | Real-time tech trends, demand metrics & skill radar |
| `/journal` | **2. Dev Journal** | Daily work logging, standups, sprint milestones |
| `/resume` | **3. Resume Builder** | Live interactive A4 builder with 3 SWE templates |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
