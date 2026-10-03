/**
 * Intelligent Text Parser: Combines LLM Structured Extraction with Heuristic Fallback
 * Used for:
 * 1. Resume Ingestion (PDF / Raw Text -> Profile & Resume schema)
 * 2. Dev Journal Ingestion (Pasted Claude / Gemini Digest -> Dev Journal entry)
 */

import { generateLlmCompletion } from './llmService.js';

/**
 * Escapes regex special characters to prevent RegExp crashes (e.g. C++, C#, .NET, etc.)
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Safely tests if a technical keyword appears in text with boundary awareness
 */
function testTechKeyword(text, keyword) {
  const escaped = escapeRegex(keyword);
  // Match keyword surrounded by whitespace, punctuation, brackets or start/end of line
  const regex = new RegExp(`(?:^|[\\s,;():/\\-\\[\\]])${escaped}(?=[\\s,;():/\\-\\[\\]]|$)`, 'i');
  return regex.test(text);
}

/**
 * Parses raw resume text into structured Resume JSON
 */
export async function parseResumeContent(rawText, aiConfig = {}, options = { enhanceWithAi: true }) {
  if (!rawText || rawText.trim().length < 15) {
    throw new Error('Provided resume text is too short to parse.');
  }

  // Attempt AI Extraction first if configured
  const hasAi = (aiConfig.provider === 'gemini' && aiConfig.geminiApiKey?.trim()) || 
                (aiConfig.provider === 'ollama' && aiConfig.ollamaBaseUrl);

  if (hasAi) {
    try {
      const enhanceInstructions = options.enhanceWithAi !== false
        ? `\nCRITICAL ENHANCEMENT DIRECTIVES (STAFF SWE / PRINCIPAL RECRUITER LEVEL):
1. WORK EXPERIENCE BULLETS:
   - Rewrite weak or passive bullet points into high-impact, metrics-driven STAR statements (Strong Action Verb + Technical Implementation + Quantifiable Result / Metric).
   - Use power verbs (e.g., "Architected", "Engineered", "Spearheaded", "Optimized", "Automated").
   - Retain complete factual accuracy regarding companies, dates, tools, frameworks, and metrics.
2. FEATURED PROJECTS:
   - Strengthen project bullets to emphasize architecture, scalability, and technical depth.
3. PROFESSIONAL SUMMARY:
   - Provide a compelling 2-3 sentence executive technical summary capturing the engineer's core competencies and impact.
4. SKILLS CATEGORIZATION:
   - Group skills into clean, standard categories (Languages, Frameworks, Databases, Developer Tools & Cloud).`
        : '';

      const prompt = `Extract and return a valid JSON object matching the exact schema below from this resume text:${enhanceInstructions}

SCHEMA:
{
  "personalInfo": {
    "fullName": "Full Name",
    "title": "Professional Title (e.g. Software Engineer)",
    "email": "email@example.com",
    "phone": "+1 ...",
    "location": "City, State/Country",
    "github": "username only without domain (e.g. 'subhojitp76')",
    "linkedin": "username only without domain (e.g. 'subhojitp76')",
    "portfolio": "portfolio url"
  },
  "summary": "High-impact technical summary...",
  "experience": [
    {
      "id": "exp-1",
      "role": "Job Title",
      "company": "Company Name",
      "location": "City, State",
      "startDate": "Month Year or Year",
      "endDate": "Month Year or Present",
      "current": false,
      "bullets": ["Action Verb + Technical Implementation + Metric..."]
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "name": "Project Name",
      "techStack": "Tech 1, Tech 2",
      "link": "url or github link",
      "bullets": ["Bullet 1", "Bullet 2"]
    }
  ],
  "skillCategories": [
    {
      "id": "skills-languages",
      "category": "Languages",
      "skills": ["Skill1", "Skill2"]
    },
    {
      "id": "skills-tools",
      "category": "Tools & Infrastructure",
      "skills": ["Tool1", "Tool2"]
    }
  ],
  "education": [
    {
      "id": "edu-1",
      "degree": "Degree and Major",
      "institution": "University / College",
      "location": "Location",
      "startDate": "YYYY",
      "endDate": "YYYY",
      "gpa": "Score or grade with type if known, e.g. 'CGPA: 8.29' or 'GPA: 3.8/4.0' or '8.29'",
      "highlights": "Academic honors or coursework only, e.g. 'Dean's List', or empty string. Never repeat GPA/CGPA here."
    }
  ],
  "certifications": [
    {
      "id": "cert-1",
      "title": "Certification Title",
      "issuer": "Issuing Org",
      "date": "Year"
    }
  ]
}

RESUME TEXT:
"""
${rawText.slice(0, 10000)}
"""

IMPORTANT: Output ONLY the valid JSON block enclosed in \`\`\`json and \`\`\` tags without conversational filler.`;

      const aiResponse = await generateLlmCompletion({
        prompt,
        systemInstruction: 'You are a Principal Software Engineering Leader and ATS Resume Optimization Engine. Always output pure, valid JSON.',
        aiConfig
      });

      // Extract JSON from markdown fences if present
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/{[\s\S]*}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return sanitizeParsedResume(parsed);
      }
    } catch (aiError) {
      console.warn('AI Parsing failed or timed out, falling back to heuristic regex parser:', aiError);
    }
  }

  // Heuristic Fallback Parser (Robust & safe for zero-AI / offline mode)
  return fallbackHeuristicResumeParser(rawText);
}

/**
 * Full-Resume AI Enhancer: Analyzes existing resume JSON and elevates bullets with STAR format,
 * metrics, action verbs, executive summary, and organized skill groups.
 */
export async function enhanceResumeWithAi(resumeData, aiConfig = {}, options = {}) {
  const hasAi = (aiConfig.provider === 'gemini' && aiConfig.geminiApiKey?.trim()) || 
                (aiConfig.provider === 'ollama' && aiConfig.ollamaBaseUrl);

  if (!hasAi) {
    throw new Error('Please configure your Gemini API Key in AI Config (top-right gear icon) or switch to Local LLM (LM Studio / Ollama).');
  }

  const userInstructions = options.instruction || options.instructions || '';
  const targetRole = options.targetRole ? `\nTARGET CAREER ROLE: ${options.targetRole}` : '';
  const customDirective = userInstructions.trim()
    ? `\nCRITICAL USER REFINEMENT INSTRUCTIONS (HIGHEST PRIORITY):
The user has provided the following specific refinement directives. You MUST strictly apply these modifications while maintaining the JSON schema:
"${userInstructions.trim()}"\n`
    : '';

  const scope = options.scope || 'all';

  let compactContext = {};
  let schemaInstruction = '';

  if (scope === 'experience') {
    compactContext = {
      experience: (resumeData.experience || []).map(e => ({
        id: e.id,
        role: e.role,
        company: e.company,
        bullets: e.bullets
      }))
    };
    schemaInstruction = `Return pure valid JSON matching this exact structure:
{
  "experience": [
    { "id": "...", "bullets": ["...", "..."] }
  ]
}`;
  } else if (scope === 'summary') {
    compactContext = {
      summary: resumeData.summary || '',
      title: profile?.targetRole || resumeData?.personalInfo?.title || 'Software Engineer'
    };
    schemaInstruction = `Return pure valid JSON matching this exact structure:
{
  "summary": "..."
}`;
  } else if (scope === 'projects') {
    compactContext = {
      projects: (resumeData.projects || []).map(p => ({
        id: p.id,
        name: p.name,
        techStack: p.techStack,
        bullets: p.bullets
      }))
    };
    schemaInstruction = `Return pure valid JSON matching this exact structure:
{
  "projects": [
    { "id": "...", "bullets": ["...", "..."] }
  ]
}`;
  } else {
    compactContext = {
      summary: resumeData.summary || '',
      experience: (resumeData.experience || []).map(e => ({
        id: e.id,
        role: e.role,
        company: e.company,
        bullets: e.bullets
      })),
      projects: (resumeData.projects || []).map(p => ({
        id: p.id,
        name: p.name,
        techStack: p.techStack,
        bullets: p.bullets
      })),
      skillCategories: resumeData.skillCategories || []
    };
    schemaInstruction = `Return pure valid JSON matching this exact structure:
{
  "summary": "...",
  "experience": [
    { "id": "...", "bullets": ["...", "..."] }
  ],
  "projects": [
    { "id": "...", "bullets": ["...", "..."] }
  ],
  "skillCategories": [
    { "category": "...", "skills": ["..."] }
  ]
}`;
  }

  const prompt = `You are a Principal Software Engineering Recruiter and Staff Software Engineer at Google/Meta.
Enhance this Software Engineer resume content into top-tier STAR format (Situation, Task, Action, Result).
${targetRole}
${customDirective}
MANDATORY DIRECTIVES:
1. WORK EXPERIENCE BULLETS:
   - For each role, provide 2-3 high-impact achievement bullets using strong action verbs (e.g. "Architected", "Engineered", "Spearheaded", "Optimized", "Automated").
   - Highlight technical depth, distributed systems, concurrency, latency reduction, and measurable metrics.
   - Retain complete factual accuracy regarding companies and tools.
2. FEATURED PROJECTS:
   - Strengthen project bullets with architecture and concrete scale metrics.
3. PROFESSIONAL SUMMARY:
   - Polish into an executive 2-3 sentence technical summary.
4. SKILLS CATEGORIZATION:
   - Group skills into clean standard categories (Languages, Frameworks, Databases, Cloud & DevOps).

CURRENT CONTENT:
${JSON.stringify(compactContext, null, 2)}

${schemaInstruction}`;

  const aiResponse = await generateLlmCompletion({
    prompt,
    systemInstruction: 'You are an elite software engineering resume enhancer. Always output pure, valid JSON.',
    aiConfig
  });

  let cleaned = (aiResponse || '').trim();
  // Strip reasoning thinking tags if present from reasoning models
  if (cleaned.includes('</think>')) {
    const parts = cleaned.split('</think>');
    cleaned = parts[parts.length - 1].trim();
  }

  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || cleaned.match(/{[\s\S]*}/);
  if (!jsonMatch) {
    throw new Error('AI did not return a valid JSON block.');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } catch (err) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } else {
      throw new Error('Failed to parse AI enhancement output: ' + err.message);
    }
  }

  // Safe merge: Preserve all personalInfo, education, certifications, and existing metadata
  const merged = {
    ...resumeData,
    summary: parsed.summary || resumeData.summary,
    experience: (resumeData.experience || []).map((exp, idx) => {
      const match = (parsed.experience || []).find(e => e.id === exp.id || e.company === exp.company) || parsed.experience?.[idx];
      return match && Array.isArray(match.bullets) && match.bullets.length > 0
        ? { ...exp, bullets: match.bullets }
        : exp;
    }),
    projects: (resumeData.projects || []).map((proj, idx) => {
      const match = (parsed.projects || []).find(p => p.id === proj.id || p.name === proj.name) || parsed.projects?.[idx];
      return match && Array.isArray(match.bullets) && match.bullets.length > 0
        ? { ...proj, bullets: match.bullets }
        : proj;
    }),
    skillCategories: (Array.isArray(parsed.skillCategories) && parsed.skillCategories.length > 0)
      ? parsed.skillCategories
      : resumeData.skillCategories
  };

  return sanitizeParsedResume(merged);
}

/**
 * Parses Claude / Gemini daily recap or project digest into a Dev Journal entry
 */
export async function parseJournalDigest(pastedText, aiConfig = {}) {
  if (!pastedText || pastedText.trim().length < 15) {
    throw new Error('Pasted digest is too short.');
  }

  const hasAi = (aiConfig.provider === 'gemini' && aiConfig.geminiApiKey?.trim()) || 
                (aiConfig.provider === 'ollama' && aiConfig.ollamaBaseUrl);

  if (hasAi) {
    try {
      const prompt = `Convert this developer work recap or personal project digest into a single JSON object:
{
  "title": "Concise engineering title (e.g. KubeWatch — Real-Time Kubernetes Cluster Event Streamer)",
  "category": "Personal Project" | "Optimization" | "Architecture" | "Feature" | "Bug Fix" | "DevOps" | "Learning",
  "date": "YYYY-MM-DD" (use date from text or today's date),
  "link": "GitHub repo or live demo link if mentioned (e.g. github.com/user/project)",
  "summary": "1-2 sentence engineering summary of what was built or accomplished",
  "techStack": ["Tag1", "Tag2", "Tag3"],
  "impact": "Quantifiable impact, metrics, or performance gain",
  "bullets": [
    "High-impact resume bullet point 1 starting with strong action verb",
    "High-impact resume bullet point 2 starting with strong action verb"
  ],
  "rawNotes": "Key bullet points of technical details and decisions"
}

DIGEST:
"""
${pastedText}
"""

Output ONLY the JSON object within \`\`\`json and \`\`\`.`;

      const aiResponse = await generateLlmCompletion({
        prompt,
        systemInstruction: 'You are an engineering work log and portfolio parser. Output pure JSON.',
        aiConfig
      });

      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/{[\s\S]*}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        let category = parsed.category || 'Feature';
        if (/personal project|side[- ]project|open[- ]source|github repo|portfolio project|project (?:name|title)|core objective|architecture & key engineering/i.test(pastedText)) {
          category = 'Personal Project';
        }
        category = normalizeJournalCategory(category);

        const bullets = Array.isArray(parsed.bullets) && parsed.bullets.length > 0 
          ? parsed.bullets 
          : (parsed.summary ? [parsed.summary] : []);

        return {
          id: `journal-${Date.now()}`,
          date: parsed.date || new Date().toISOString().split('T')[0],
          category,
          title: parsed.title || 'Engineering Task Recap',
          summary: parsed.summary || (bullets[0] || ''),
          techStack: Array.isArray(parsed.techStack) ? parsed.techStack : ['General'],
          impact: parsed.impact || 'Completed sprint milestone',
          link: parsed.link || '',
          bullets,
          rawNotes: parsed.rawNotes || pastedText.slice(0, 300)
        };
      }
    } catch (e) {
      console.warn('AI Journal parse failed, using heuristic regex parser:', e);
    }
  }

  // Heuristic regex parser for Claude / Gemini output format
  return fallbackJournalParser(pastedText);
}

const MONTH_NAMES = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Sept|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DATE_TOKEN = `(?:${MONTH_NAMES}\\s*\\.?\\s*(?:19|20)\\d{2}|\\d{1,2}\\/(?:19|20)?\\d{2}|${MONTH_NAMES}|\\b(?:19|20)\\d{2}\\b)`;
const END_DATE_TOKEN = `(?:Present|Current|Now|Till\\s+Date|${MONTH_NAMES}\\s*\\.?\\s*(?:19|20)\\d{2}|\\d{1,2}\\/(?:19|20)?\\d{2}|${MONTH_NAMES}|\\b(?:19|20)\\d{2}\\b)`;
const DATE_RANGE_REGEX = new RegExp(`(${DATE_TOKEN})\\s*(?:[-–—~]|\\bto\\b)\\s*(${END_DATE_TOKEN})`, 'i');
const SINGLE_DATE_REGEX = new RegExp(`\\b(?:${MONTH_NAMES}\\s*\\.?\\s*(?:19|20)\\d{2}|(?:19|20)\\d{2})\\b`, 'i');

const BULLET_START_REGEX = /^(?:[•\-*–—▪▫◦⁃‣∙\uF0B7\uF0A7\uF076\u25AA\u25AB\u25E6\u2023\u2219\u00B7]|\d+[\.)])\s*/;

const TITLE_REGEX = /\b(?:Senior\s+|Junior\s+|Lead\s+|Staff\s+|Principal\s+|Associate\s+|Chief\s+)?(?:Software|Backend|Frontend|Full[\s-]?Stack|Systems|DevOps|Site\s+Reliability|Cloud|Data|Mobile|iOS|Android|Web|Machine\s+Learning|AI|Platform|Infrastructure|Security|QA|Automation|Application)\s+(?:Engineer|Developer|Architect|Specialist|Consultant|Intern|Programmer|Lead|Manager)\b/i;

const SECTION_HEADERS = {
  summary: /^(?:PROFESSIONAL\s+)?(?:SUMMARY|PROFILE|OBJECTIVE|ABOUT(?:\s+ME)?|OVERVIEW)\b/i,
  experience: /^(?:WORK\s+|PROFESSIONAL\s+|RELEVANT\s+|EMPLOYMENT\s+)?(?:EXPERIENCE|HISTORY|EMPLOYMENT)\b/i,
  projects: /^(?:KEY\s+|TECHNICAL\s+|PERSONAL\s+|ACADEMIC\s+|FEATURED(?:\s+ENGINEERING)?\s+)?PROJECTS\b/i,
  skills: /^(?:TECHNICAL\s+|CORE\s+|KEY\s+)?(?:SKILLS|COMPETENCIES|EXPERTISE|TECHNOLOGIES|TECH\s+STACK|TOOLING)\b/i,
  education: /^(?:EDUCATION|ACADEMICS|ACADEMIC\s+BACKGROUND|QUALIFICATIONS)\b/i,
  certifications: /^(?:CERTIFICATIONS|CERTIFICATES|LICENSES(?:\s+AND\s+CERTIFICATIONS)?|ACHIEVEMENTS)\b/i
};

// Helper for splitting date ranges cleanly
function splitDateRangeClean(dateStr) {
  const match = dateStr.match(DATE_RANGE_REGEX);
  if (match) {
    return {
      start: match[1] ? match[1].trim() : '',
      end: match[2] ? match[2].trim() : ''
    };
  }
  const parts = dateStr.split(/\s*(?:[-–—]|(?:\bto\b))\s*/i);
  return {
    start: parts[0] ? parts[0].trim() : '',
    end: parts[1] ? parts[1].trim() : ''
  };
}

/**
 * Merges a wrapped line into the previous bullet or string.
 * Handles hyphenation (e.g. func- + tions => functions) and punctuation.
 */
function mergeContinuation(prevText, nextLine) {
  const cleanNext = nextLine.replace(BULLET_START_REGEX, '').trim();
  if (!cleanNext) return prevText;
  
  if (prevText.endsWith('-') && !prevText.endsWith(' -')) {
    // Hyphenated word across line break
    return prevText.slice(0, -1) + cleanNext;
  }
  if (/^[,\.;\):]/.test(cleanNext)) {
    return prevText + cleanNext;
  }
  return prevText + ' ' + cleanNext;
}

/**
 * Intelligent client-side fallback for resume text when AI is not connected or fails
 */
function fallbackHeuristicResumeParser(text) {
  // Normalize non-standard bullet characters from various font encodings
  const normalizedText = text.replace(/[\uF0B7\uF0A7\uF076\u25AA\u25AB\u25E6\u2043\u2023\u2219\u00B7]/g, '•');
  const rawLines = normalizedText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Global metadata extraction
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  const githubMatch = text.match(/(?:github\.com\/|https?:\/\/(?:www\.)?github\.com\/)([a-zA-Z0-9-_]+)/i);
  const github = githubMatch ? githubMatch[1] : '';

  const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|https?:\/\/(?:www\.)?linkedin\.com\/in\/)([a-zA-Z0-9-_%]+)/i);
  const linkedin = linkedinMatch ? linkedinMatch[1] : '';

  const locationMatch = text.match(/([A-Z][a-zA-Z\s]+,\s*(?:India|USA|United States|UK|Canada|Germany|Remote|Bangalore|Bengaluru|Hyderabad|Pune|Mumbai|Delhi|Chennai|Kolkata|Austin|San Francisco|Seattle|New York|London|\b[A-Z]{2}\b))/i);
  const location = locationMatch ? locationMatch[0].trim() : '';

  // 2. Segment lines into sections
  const sections = {
    header: [],
    summary: [],
    experience: [],
    projects: [],
    skills: [],
    education: [],
    certifications: []
  };

  let currentSection = 'header';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const cleanLine = line.replace(/^[#*_\-\s]+|[#*_\-\s:]+$/g, '').trim();

    let matchedSection = null;
    if (cleanLine.length < 45) {
      for (const [secName, regex] of Object.entries(SECTION_HEADERS)) {
        if (regex.test(cleanLine)) {
          matchedSection = secName;
          break;
        }
      }
    }

    if (matchedSection) {
      currentSection = matchedSection;
    } else {
      sections[currentSection].push(line);
    }
  }

  // 3. Extract Name & Title from header lines
  let fullName = '';
  let title = '';

  for (const hLine of sections.header) {
    if (email && hLine.includes(email)) continue;
    if (phone && hLine.includes(phone)) continue;
    if (hLine.includes('github.com') || hLine.includes('linkedin.com') || hLine.includes('http')) continue;
    if (/^(resume|curriculum\s+vitae|cv)$/i.test(hLine)) continue;

    const titleMatch = hLine.match(TITLE_REGEX);
    if (titleMatch && !title) {
      title = titleMatch[0].trim();
      continue;
    }

    if (!fullName && /^[A-Z][a-zA-Z\s.'-]{1,35}$/.test(hLine) && hLine.split(/\s+/).length <= 4) {
      fullName = hLine.trim();
    }
  }

  if (!fullName && rawLines[0] && !rawLines[0].includes('@') && rawLines[0].length < 40) {
    fullName = rawLines[0].replace(/[|•].*$/, '').trim();
  }

  // 4. Parse Work Experience
  const experiences = [];
  let curExp = null;

  for (let i = 0; i < sections.experience.length; i++) {
    const line = sections.experience[i];
    const isBullet = BULLET_START_REGEX.test(line);
    const dateMatch = line.match(DATE_RANGE_REGEX);
    const hasTitle = TITLE_REGEX.test(line);

    // Job header detection: line has title or date and is not a bullet
    if (!isBullet && (dateMatch || (hasTitle && line.length < 80))) {
      if (curExp) experiences.push(curExp);

      let role = '';
      let company = '';
      let expLocation = '';
      let startDate = '';
      let endDate = '';
      let isCurrent = false;

      let lineText = line;
      if (dateMatch) {
        const parsedDates = splitDateRangeClean(dateMatch[0]);
        startDate = parsedDates.start;
        endDate = parsedDates.end;
        isCurrent = /present|current|now/i.test(endDate);
        // Remove date from lineText so it does not pollute the company name
        lineText = lineText.replace(dateMatch[0], ' ');
      }

      const tMatch = lineText.match(TITLE_REGEX);
      if (tMatch) {
        role = tMatch[0].trim();
        lineText = lineText.replace(tMatch[0], ' ');
      }

      const parts = lineText.split(/[|•–—]+/).map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (/india|usa|united states|uk|canada|remote|[a-z]+,\s*[a-z]{2}/i.test(part)) {
          expLocation = part;
          continue;
        }
        if (!company && part.length < 50 && !/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})/i.test(part)) {
          company = part;
        }
      }

      // Check adjacent next line if company/dates were on the next line
      const nextLine = sections.experience[i + 1];
      if (nextLine && !BULLET_START_REGEX.test(nextLine) && nextLine.length < 80) {
        const nextDateMatch = nextLine.match(DATE_RANGE_REGEX);
        let nextLineText = nextLine;
        if (nextDateMatch && !startDate) {
          const parsedDates = splitDateRangeClean(nextDateMatch[0]);
          startDate = parsedDates.start;
          endDate = parsedDates.end;
          isCurrent = /present|current|now/i.test(endDate);
          nextLineText = nextLineText.replace(nextDateMatch[0], ' ');
        }
        const nextTMatch = nextLineText.match(TITLE_REGEX);
        if (nextTMatch && !role) {
          role = nextTMatch[0].trim();
          nextLineText = nextLineText.replace(nextTMatch[0], ' ');
        }
        if (!company) {
          const nextParts = nextLineText.split(/[|•–—]+/).map(p => p.trim()).filter(Boolean);
          for (const np of nextParts) {
            if (/india|usa|uk|canada|remote/i.test(np)) {
              if (!expLocation) expLocation = np;
              continue;
            }
            if (!company && np.length < 50 && !/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})/i.test(np)) {
              company = np;
            }
          }
        }
        i++; // advance since next line was part of header
      }

      curExp = {
        id: `exp-${experiences.length + 1}-${Date.now()}`,
        role: role || (hasTitle ? line.split(/[|•–—]/)[0].trim() : 'Software Engineer'),
        company: company || 'Company',
        location: expLocation || location || 'Remote',
        startDate: startDate || '2022',
        endDate: endDate || 'Present',
        current: isCurrent,
        bullets: []
      };
    } else if (curExp) {
      if (isBullet) {
        const cleanBullet = line.replace(BULLET_START_REGEX, '').trim();
        if (cleanBullet.length > 0) curExp.bullets.push(cleanBullet);
      } else if (curExp.bullets.length > 0) {
        // Line continuation of previous bullet point
        const lastIdx = curExp.bullets.length - 1;
        curExp.bullets[lastIdx] = mergeContinuation(curExp.bullets[lastIdx], line);
      }
    }
  }
  if (curExp) experiences.push(curExp);

  // If no title found in header, derive title from first job role!
  if (!title && experiences.length > 0 && experiences[0].role) {
    title = experiences[0].role;
  }
  if (!title) {
    title = 'Software Engineer';
  }

  // 5. Parse Summary
  let summary = sections.summary.join(' ').trim();
  if (!summary && sections.header.length > 2) {
    const candidateSummary = sections.header.find(l => 
      l.length > 50 && 
      !l.includes('@') && 
      !l.includes('http') && 
      !l.includes('github') && 
      !l.includes('linkedin')
    );
    if (candidateSummary) summary = candidateSummary.trim();
  }

  // 6. Parse Projects
  const projects = [];
  let curProj = null;

  for (let i = 0; i < sections.projects.length; i++) {
    const line = sections.projects[i];
    const isBullet = BULLET_START_REGEX.test(line);
    const dateMatch = line.match(DATE_RANGE_REGEX);
    const isLinkOnly = /^(?:https?:\/\/|github\.com\/)[^\s]+$/i.test(line);
    const isTechStackLine = /^(?:tech\s+stack|technologies|tools):/i.test(line);

    if (curProj && isLinkOnly) {
      curProj.link = line;
      continue;
    }

    if (curProj && isTechStackLine) {
      curProj.techStack = line.replace(/^(?:tech\s+stack|technologies|tools):\s*/i, '').trim();
      continue;
    }

    const startsWithLowercase = /^[a-z]/.test(line);
    const startsWithConnectingWord = /^(?:and|or|with|for|by|in|at|to|using|of|supporting|leading|across)\b/i.test(line);
    const isSubtitleOrAdvisor = /^\([^\)]+\)$/.test(line) || /^\(Prof\./i.test(line);
    const hasMetricOrSentenceEnding = /\b(?:users|response\s+time|per\s+flight|accuracy|throughput|models|latency|ms|queries)\b/i.test(line);

    if (curProj && curProj.bullets.length === 0 && (isSubtitleOrAdvisor || (line.length < 70 && !isBullet && !dateMatch))) {
      // Subtitle / advisor / tech tagline for current project before bullets have started
      curProj.techStack = curProj.techStack ? `${curProj.techStack} • ${line}` : line;
      continue;
    }

    const prevBullet = curProj && curProj.bullets.length > 0 ? curProj.bullets[curProj.bullets.length - 1] : null;
    const prevIncomplete = prevBullet && (
      /[,:;\-\–—]$/.test(prevBullet.trim()) ||
      /\b(?:to|for|with|and|or|by|in|at|of|using|including|across|from|up|down|on|into|than|as)$/i.test(prevBullet.trim()) ||
      !/[.!?]$/.test(prevBullet.trim())
    );

    const isFirstProject = curProj === null && !isBullet && !startsWithLowercase && !startsWithConnectingWord && line.length < 80;

    // Condition to start a NEW project:
    const canBeNewProject = isFirstProject || (!isBullet && !startsWithLowercase && !startsWithConnectingWord && !isSubtitleOrAdvisor && !hasMetricOrSentenceEnding &&
      (dateMatch || line.includes('|') || line.includes('github.com') || (!prevIncomplete && curProj && curProj.bullets.length > 0 && /^[A-Z]/.test(line) && line.length < 60)));

    if (canBeNewProject) {
      if (curProj) projects.push(curProj);

      let pName = line;
      let pStack = '';
      let pLink = '';

      if (dateMatch) {
        pStack = dateMatch[0];
        pName = pName.replace(dateMatch[0], ' ');
      }

      const linkMatch = line.match(/(?:github\.com\/[^\s]+|https?:\/\/[^\s]+)/i);
      if (linkMatch) {
        pLink = linkMatch[0];
        pName = pName.replace(linkMatch[0], ' ');
      }

      const parts = pName.split(/[|–—]+/).map(p => p.trim()).filter(Boolean);
      pName = parts[0] || 'Technical Project';
      if (parts[1]) {
        pStack = pStack ? `${pStack} • ${parts[1]}` : parts[1];
      }

      curProj = {
        id: `proj-${projects.length + 1}-${Date.now()}`,
        name: pName.trim(),
        techStack: pStack.trim(),
        link: pLink.trim(),
        bullets: []
      };
    } else if (curProj) {
      if (isBullet) {
        const cleanB = line.replace(BULLET_START_REGEX, '').trim();
        if (cleanB.length > 0) curProj.bullets.push(cleanB);
      } else if (curProj.bullets.length > 0) {
        // Continuation of previous project bullet
        const lastIdx = curProj.bullets.length - 1;
        curProj.bullets[lastIdx] = mergeContinuation(curProj.bullets[lastIdx], line);
      }
    }
  }
  if (curProj) projects.push(curProj);

  // 7. Parse Education
  const education = [];
  let curEdu = null;

  for (let i = 0; i < sections.education.length; i++) {
    let line = sections.education[i];
    const degreeRegex = /\b(?:Master\s+of\s+Technology|Bachelor\s+of\s+Technology|Master|Bachelor|M\.?Tech|B\.?Tech|M\.?S\.?|B\.?S\.?|B\.?E\.?|M\.?E\.?|Ph\.?D|Diploma)\b/i;
    const isDegree = degreeRegex.test(line);
    const hasInst = /\b(?:Indian\s+Institute\s+of\s+Technology|IIT|NIT|University|Institute|College|Academy|School|Techno\s+India)\b/i.test(line);
    const dateRangeMatch = line.match(DATE_RANGE_REGEX);
    const singleDateMatch = line.match(SINGLE_DATE_REGEX);

    // Extract GPA/CGPA first
    let gpa = '';
    const gpaMatch = line.match(/(?:CGPA|GPA|Percentage|Score)[:\s]*([0-9.]+(?:\s*\/\s*[0-9.]+)?%?)/i);
    if (gpaMatch) {
      gpa = gpaMatch[0].trim();
      line = line.replace(gpaMatch[0], ' ').trim();
    }

    // Extract dates
    let eduStart = '';
    let eduEnd = '';
    if (dateRangeMatch) {
      const parsed = splitDateRangeClean(dateRangeMatch[0]);
      eduStart = parsed.start;
      eduEnd = parsed.end;
      line = line.replace(dateRangeMatch[0], ' ').trim();
    } else if (singleDateMatch) {
      eduEnd = singleDateMatch[0];
      line = line.replace(singleDateMatch[0], ' ').trim();
    }
    // Clean trailing hyphens or bullets
    line = line.replace(/[-–—•*|]+$/, '').replace(/^[-–—•*|]+/, '').trim();

    if (isDegree && curEdu && curEdu.degree) {
      education.push(curEdu);
      curEdu = null;
    }

    if (!curEdu) {
      curEdu = {
        id: `edu-${education.length + 1}-${Date.now()}`,
        degree: '',
        institution: '',
        location: '',
        startDate: '',
        endDate: '',
        gpa: '',
        highlights: ''
      };
    }

    if (gpa) {
      curEdu.gpa = gpa;
    }
    if (eduStart) curEdu.startDate = eduStart;
    if (eduEnd) curEdu.endDate = eduEnd;

    if (isDegree && !curEdu.degree) {
      const parts = line.split(/[|•–—]+/).map(p => p.trim()).filter(Boolean);
      curEdu.degree = (parts[0] || line).replace(/[-–—•*|\s]+$/, '').trim();
      if (parts[1]) curEdu.institution = parts[1].replace(/[-–—•*|\s]+$/, '').trim();
    } else if (!curEdu.institution && line.length > 2 && line.length < 80) {
      const parts = line.split(/[|•–—]+/).map(p => p.trim()).filter(Boolean);
      curEdu.institution = (parts[0] || line).replace(/[-–—•*|\s]+$/, '').trim();
      if (parts[1]) curEdu.location = parts[1].replace(/[-–—•*|\s]+$/, '').trim();
    }
  }
  if (curEdu) education.push(curEdu);

  // 8. Parse Certifications
  const certifications = [];
  for (let i = 0; i < sections.certifications.length; i++) {
    const line = sections.certifications[i];
    if (line.length < 3) continue;
    const isBullet = BULLET_START_REGEX.test(line);

    if (isBullet || certifications.length === 0) {
      const cleanLine = line.replace(BULLET_START_REGEX, '').trim();
      const dateMatch = cleanLine.match(/\b(19|20)\d{2}\b/);
      const date = dateMatch ? dateMatch[0] : '';
      const withoutDate = cleanLine.replace(/\(?\b(19|20)\d{2}\b\)?/, '').trim();
      const parts = withoutDate.split(/[-–—|•]/).map(p => p.trim()).filter(Boolean);

      certifications.push({
        id: `cert-${certifications.length + 1}-${Date.now()}`,
        title: parts[0] || cleanLine,
        issuer: parts[1] || '',
        date
      });
    } else if (certifications.length > 0) {
      // Continuation line for previous certification
      const last = certifications[certifications.length - 1];
      const mergedTitle = mergeContinuation(last.title, line);
      const dateMatch = mergedTitle.match(/\(?\b(19|20)\d{2}\b\)?/);
      if (dateMatch && !last.date) {
        last.date = dateMatch[0].replace(/[\(\)]/g, '').trim();
      }
      last.title = mergedTitle.replace(/\(?\b(19|20)\d{2}\b\)?/, '').replace(/\s{2,}/g, ' ').trim();
    }
  }

  // 9. Parse Skills
  const skillCategories = [];

  for (const line of sections.skills) {
    if (line.includes(':')) {
      const [catName, skillStr] = line.split(':');
      if (catName && skillStr && catName.trim().length < 35) {
        const skillsList = skillStr.split(/[,•|/]/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 35);
        if (skillsList.length > 0) {
          skillCategories.push({
            id: `skills-${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            category: catName.trim(),
            skills: skillsList
          });
        }
      }
    }
  }

  // If no categorized skills, extract known catalog keywords
  if (skillCategories.length === 0) {
    const techCatalog = [
      'Go', 'Golang', 'Python', 'Java', 'Rust', 'C++', 'C#', '.NET', 'TypeScript', 'JavaScript',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'RabbitMQ', 'Docker',
      'Kubernetes', 'AWS', 'GCP', 'Azure', 'gRPC', 'GraphQL', 'REST', 'Linux',
      'Terraform', 'CI/CD', 'Git', 'Prometheus', 'Grafana', 'Elasticsearch', 'Spring Boot',
      'Node.js', 'Express', 'FastAPI', 'Django', 'React', 'Next.js', 'Cassandra', 'DynamoDB'
    ];
    const detected = [];
    techCatalog.forEach(t => {
      const reg = new RegExp(`(?:^|[\\s,;():/\\-\\[\\]])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[\\s,;():/\\-\\[\\]]|$)`, 'i');
      if (reg.test(text)) detected.push(t);
    });
    skillCategories.push({
      id: 'skills-core',
      category: 'Technical Skills & Tools',
      skills: detected.length > 0 ? detected : ['Software Engineering', 'Problem Solving', 'Git']
    });
  }

  return {
    personalInfo: {
      fullName: fullName || 'Software Engineer',
      title,
      email,
      phone,
      location,
      github,
      linkedin,
      portfolio: ''
    },
    summary,
    experience: experiences.length > 0 ? experiences : [
      {
        id: `exp-1-${Date.now()}`,
        role: title,
        company: 'Software Engineering',
        location: location || 'Remote',
        startDate: '2022',
        endDate: 'Present',
        current: true,
        bullets: ['Designed and developed software components and backend services.']
      }
    ],
    projects,
    skillCategories,
    education,
    certifications
  };
}

/**
 * Normalizes user/LLM categories into standardized Dev Journal categories
 */
export function normalizeJournalCategory(cat) {
  if (Array.isArray(cat)) cat = cat[0];
  if (typeof cat !== 'string') return 'Feature';
  const c = cat.trim().toLowerCase();
  if (c.includes('personal') || c.includes('side') || c.includes('portfolio') || c.includes('open source') || c.includes('open-source') || c.includes('repo') || c.includes('project')) {
    return 'Personal Project';
  }
  if (c.includes('optimi')) return 'Optimization';
  if (c.includes('arch')) return 'Architecture';
  if (c.includes('bug') || c.includes('fix')) return 'Bug Fix';
  if (c.includes('devops') || c.includes('infra') || c.includes('deploy') || c.includes('ci/cd')) return 'DevOps';
  if (c.includes('learn') || c.includes('study')) return 'Learning';
  if (c.includes('feat')) return 'Feature';
  return cat.trim();
}

/**
 * Intelligent Heuristic parser for Claude/Gemini pasted work recap & personal projects
 */
function fallbackJournalParser(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let title = '';
  let category = '';
  let summary = '';
  let impact = '';
  let link = '';
  const detectedTags = [];
  const bullets = [];

  // Extract link if any (GitHub, http, https)
  const urlMatch = text.match(/(?:https?:\/\/|git@|github\.com\/)[^\s\)"']+/i);
  if (urlMatch) {
    link = urlMatch[0].replace(/[,\.;\)]$/, '');
  }

  // Detect Personal Project signals
  if (/personal project|side[- ]project|open[- ]source|github repo|portfolio project|project (?:name|title)|core objective|architecture & key engineering/i.test(text)) {
    category = 'Personal Project';
  }

  const techCatalog = [
    'Go', 'Rust', 'Kafka', 'Redis', 'PostgreSQL', 'Docker', 'Kubernetes', 'AWS', 
    'gRPC', 'Python', 'Java', 'CI/CD', 'C++', 'C#', 'React', 'TypeScript', 'Node.js', 
    'Next.js', 'Tailwind', 'GraphQL', 'MongoDB', 'Temporal', 'Postgres', 'Linux'
  ];
  techCatalog.forEach(t => {
    if (testTechKeyword(text, t)) {
      if (!detectedTags.includes(t)) detectedTags.push(t);
    }
  });

  const metadataPrefixes = /^(?:•|[-*]|\d+\.)?\s*(?:project (?:name|title)|title|category|focus(?: area)?|live \/ github url|repo|url|tech stack|technologies(?: & tools used)?|core objective|architecture & key engineering features|what i built & solved|what i built|measurable results & impact|measurable impact|impact|date):/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(?:•|[-*]|\d+\.)?\s*project (?:title|name):/i.test(line) || /^(?:•|[-*]|\d+\.)?\s*title:/i.test(line)) {
      title = line.replace(/^(?:•|[-*]|\d+\.)?\s*(?:project )?(?:title|name):?\s*/i, '').replace(/[*#]/g, '').trim();
    } else if (/^(?:•|[-*]|\d+\.)?\s*(?:category|focus(?: area)?):/i.test(line)) {
      const rawCat = line.replace(/^(?:•|[-*]|\d+\.)?\s*(?:category|focus(?: area)?):?\s*/i, '').replace(/[*#]/g, '').trim();
      category = normalizeJournalCategory(rawCat);
    } else if (/^(?:•|[-*]|\d+\.)?\s*(?:core objective|what i built & solved|what i built|summary|description|about):/i.test(line)) {
      summary = line.replace(/^(?:•|[-*]|\d+\.)?\s*(?:core objective|what i built & solved|what i built|summary|description|about):?\s*/i, '').replace(/[*#]/g, '').trim();
    } else if (/^(?:•|[-*]|\d+\.)?\s*(?:measurable results & impact|measurable impact|impact|gain|metric|result):/i.test(line)) {
      impact = line.replace(/^(?:•|[-*]|\d+\.)?\s*(?:measurable results & impact|measurable impact|impact|gain|metric|result):?\s*/i, '').replace(/[*#]/g, '').trim();
    } else if (/^(?:•|[-*]|\d+\.)?\s*(?:tech stack|technologies(?: & tools used)?):/i.test(line)) {
      const stackText = line.replace(/^(?:•|[-*]|\d+\.)?\s*(?:tech stack|technologies(?: & tools used)?):?\s*/i, '').replace(/[*#]/g, '').trim();
      stackText.split(/[,|/]/).forEach(s => {
        const cleaned = s.trim();
        if (cleaned && cleaned.length < 25 && !detectedTags.includes(cleaned)) {
          detectedTags.push(cleaned);
        }
      });
    } else if (/^(?:•|[-*]|\d+\.)?\s*(?:live \/ github url|repo|url):/i.test(line) && !link) {
      const parsedLink = line.replace(/^(?:•|[-*]|\d+\.)?\s*(?:live \/ github url|repo|url):?\s*/i, '').replace(/[*#]/g, '').trim();
      if (parsedLink.includes('.') || parsedLink.includes('/')) link = parsedLink;
    } else if (/^(?:•|[-*]|\d+\.)\s+/.test(line)) {
      // Bullet point line - ensure it is not a metadata header
      if (!metadataPrefixes.test(line)) {
        const cleanBullet = line.replace(/^(?:•|[-*]|\d+\.)\s+/, '').replace(/[*]/g, '').trim();
        if (cleanBullet.length > 20 && !cleanBullet.toLowerCase().startsWith('date:')) {
          bullets.push(cleanBullet);
        }
      }
    }
  }

  // Fallbacks if not set
  if (!title && lines.length > 0) {
    const firstNonMeta = lines.find(l => !metadataPrefixes.test(l));
    if (firstNonMeta) {
      title = firstNonMeta.replace(/^#+\s*/, '').replace(/[*]/g, '').slice(0, 60);
    } else {
      title = 'Personal Engineering Project';
    }
  }

  if (!summary) {
    if (bullets.length > 0) {
      summary = bullets[0];
    } else {
      const contentLine = lines.find(l => !metadataPrefixes.test(l) && l.length > 25);
      summary = contentLine ? contentLine.slice(0, 180) : text.slice(0, 150);
    }
  }

  if (bullets.length === 0) {
    if (summary) bullets.push(summary);
    if (impact) bullets.push(`Impact: ${impact}`);
  }

  return {
    id: `journal-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    category: normalizeJournalCategory(category || 'Personal Project'),
    title: title || 'Personal Engineering Project',
    summary: summary,
    techStack: detectedTags.length > 0 ? detectedTags : ['Engineering'],
    impact: impact || 'Completed milestone and verified architecture',
    link: link,
    bullets: bullets.slice(0, 5),
    rawNotes: text
  };
}

/**
 * Generates an LLM prompt asking for the latest updates, achievements, and metrics
 * for a specific project/task AFTER its previous timeline entry.
 */
export function generateFollowUpUpdatePrompt(entry) {
  if (!entry) return '';

  const techStr = Array.isArray(entry.techStack) 
    ? entry.techStack.join(', ') 
    : (entry.techStack || 'Engineering');

  const bulletsFormatted = (entry.bullets && entry.bullets.length > 0)
    ? entry.bullets.map(b => `  - ${b}`).join('\n')
    : `  - ${entry.summary || 'Initial project foundation'}`;

  const todayStr = new Date().toISOString().split('T')[0];
  const updateCount = (entry.updates?.length || 0) + 1;

  return `You are a Staff Technical Lead & Principal Career Coach conducting a milestone progress review.
We need to capture the next milestone and latest progress achieved for this project/task AFTER its previous entry.

==================================================
PREVIOUS ENTRY CONTEXT (${entry.date}):
==================================================
• Project / Task Name: ${entry.title}
• Category: ${entry.category || 'Personal Project'}
• Logged On: ${entry.date}
• Previous State & Summary:
  ${entry.summary}
• Technologies Used Previously: ${techStr}
${entry.link ? `• Repository / URL: ${entry.link}\n` : ''}${entry.impact ? `• Previous Quantifiable Impact: ${entry.impact}\n` : ''}• Accomplishments Logged Previously:
${bulletsFormatted}

==================================================
REQUEST FOR LATEST UPDATES (AFTER PREVIOUS ENTRY):
==================================================
Reviewing what was already accomplished above, what are the LATEST UPDATES and developments completed AFTER this previous entry on ${entry.date}?
(Consider: next milestone reached, new features/modules built, bug fixes, refactoring, scalability improvements, new tests, or production metrics).

Please format the response in this exact structured format:

• Project Name: ${entry.title}
• Milestone / Update Date: ${todayStr} (Milestone ${updateCount + 1})
• What Was Built / Updated (Since Previous Entry):
  [1-2 sentences summarizing the latest progress beyond what was previously accomplished]
• Latest Accomplishments & Results (STAR Method):
  - [Action Verb + Technical Implementation + Measurable Result]
  - [Next technical advancement or optimization completed]
• New Technologies or Tools Introduced: [e.g., Redis, gRPC, Prometheus, Docker, or "Same stack"]
• Updated Measurable Impact: [e.g., "Reduced p99 latency from X to Y; achieved 99.9% uptime; 200+ stars"]
• Overall Updated Project Summary: [A cohesive updated summary combining latest progress]`;
}

/**
 * Parses latest milestone updates (either from LLM response or user notes)
 * and returns an updated entry payload merged with the previous entry context.
 */
export async function parseMilestoneUpdate(updateText, previousEntry, aiConfig = {}) {
  if (!updateText || updateText.trim().length === 0) {
    throw new Error('Please provide text or notes describing the latest updates.');
  }

  const hasAi = (aiConfig.provider === 'gemini' && aiConfig.geminiApiKey?.trim()) || 
                (aiConfig.provider === 'ollama' && aiConfig.ollamaBaseUrl);

  if (hasAi) {
    try {
      const prompt = `You are a Principal Software Engineer.
Given this previous engineering record:
- Title: ${previousEntry.title}
- Previous Summary: ${previousEntry.summary}
- Previous Accomplishments: ${JSON.stringify(previousEntry.bullets || [])}
- Previous Tech Stack: ${JSON.stringify(previousEntry.techStack || [])}
- Previous Impact: ${previousEntry.impact || ''}

And the following notes/output describing the LATEST UPDATES completed AFTER the previous entry:
"""
${updateText}
"""

Extract and synthesize the updates into a valid JSON object matching this schema:
{
  "summary": "1-2 sentence cohesive updated summary including latest progress",
  "newBullets": [
    "Action Verb + technical implementation + metric for newest accomplishment",
    "Action Verb + technical implementation + metric for next accomplishment"
  ],
  "newTechStack": ["NewlyIntroducedTech1", "NewlyIntroducedTech2"],
  "impact": "Quantifiable impact/metrics of the latest update (e.g. latency, throughput, scale, stars)",
  "milestoneTitle": "Short descriptive title for this milestone update"
}
Return ONLY valid JSON without markdown fences.`;

      const responseText = await generateLlmCompletion({
        prompt,
        systemInstruction: 'You are an expert technical resume architect extracting milestone progress updates.',
        aiConfig
      });

      const cleaned = responseText.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
        return buildMergedMilestoneEntry(previousEntry, {
          summary: parsed.summary,
          bullets: Array.isArray(parsed.newBullets) ? parsed.newBullets : [],
          techStack: Array.isArray(parsed.newTechStack) ? parsed.newTechStack : [],
          impact: parsed.impact,
          rawNotes: updateText,
          milestoneTitle: parsed.milestoneTitle
        });
      }
    } catch (e) {
      console.warn('AI milestone parsing failed, falling back to heuristic parser:', e);
    }
  }

  // Heuristic Fallback
  return fallbackMilestoneParser(updateText, previousEntry);
}

function fallbackMilestoneParser(text, previousEntry) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let summary = '';
  let impact = '';
  const newBullets = [];
  const detectedTags = [];
  const metadataPrefixes = /^(?:•|[-*]|\d+\.)?\s*(?:project (?:name|title)|title|category|milestone (?:date|\w+)?|date|what was built[^:]*|what i built[^:]*|latest accomplishments[^:]*|new technologies[^:]*|updated measurable impact[^:]*|overall updated[^:]*|summary|impact|tech stack):/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(?:•|[-*]|\d+\.)?\s*(?:what was built[^:]*|what i built[^:]*|overall updated[^:]*|summary):/i.test(line)) {
      let content = line.replace(/^(?:•|[-*]|\d+\.)?\s*(?:what was built[^:]*|what i built[^:]*|overall updated[^:]*|summary):?\s*/i, '').replace(/[*#]/g, '').trim();
      if (!content && i + 1 < lines.length && !metadataPrefixes.test(lines[i + 1])) {
        content = lines[i + 1].replace(/^(?:•|[-*]|\d+\.)\s*/, '').replace(/[*#]/g, '').trim();
      }
      if (content) summary = content;
    } else if (/^(?:•|[-*]|\d+\.)?\s*(?:updated measurable impact[^:]*|measurable impact[^:]*|impact|results?):/i.test(line)) {
      let content = line.replace(/^(?:•|[-*]|\d+\.)?\s*(?:updated measurable impact[^:]*|measurable impact[^:]*|impact|results?):?\s*/i, '').replace(/[*#]/g, '').trim();
      if (!content && i + 1 < lines.length && !metadataPrefixes.test(lines[i + 1])) {
        content = lines[i + 1].replace(/^(?:•|[-*]|\d+\.)\s*/, '').replace(/[*#]/g, '').trim();
      }
      if (content) impact = content;
    } else if (/^(?:•|[-*]|\d+\.)?\s*(?:new technologies[^:]*|tech stack|technologies):/i.test(line)) {
      let stackText = line.replace(/^(?:•|[-*]|\d+\.)?\s*(?:new technologies[^:]*|tech stack|technologies):?\s*/i, '').replace(/[*#]/g, '').trim();
      if (!stackText && i + 1 < lines.length && !metadataPrefixes.test(lines[i + 1])) {
        stackText = lines[i + 1].trim();
      }
      stackText.split(/[,|/]/).forEach(t => {
        const cleaned = t.replace(/[*#]/g, '').trim();
        if (cleaned && cleaned.length < 25 && !detectedTags.includes(cleaned)) {
          detectedTags.push(cleaned);
        }
      });
    } else if (/^(?:•|[-*]|\d+\.)\s+/.test(line)) {
      // Must NOT match metadata headers
      if (!metadataPrefixes.test(line)) {
        const cleanBullet = line.replace(/^(?:•|[-*]|\d+\.)\s+/, '').replace(/[*]/g, '').trim();
        if (cleanBullet.length > 20) {
          newBullets.push(cleanBullet);
        }
      }
    }
  }

  // If no bullets extracted from prefix, treat non-meta lines as potential bullets/summary
  if (!summary) {
    const firstNonMeta = lines.find(l => !metadataPrefixes.test(l) && l.length > 25);
    summary = firstNonMeta || previousEntry.summary;
  }

  return buildMergedMilestoneEntry(previousEntry, {
    summary: summary || previousEntry.summary,
    bullets: newBullets,
    techStack: detectedTags,
    impact: impact || previousEntry.impact,
    rawNotes: text
  });
}

function buildMergedMilestoneEntry(previousEntry, updateData) {
  const today = new Date().toISOString().split('T')[0];
  const existingUpdates = Array.isArray(previousEntry.updates) ? previousEntry.updates : [];

  const updateRecord = {
    id: `update-${Date.now()}`,
    date: today,
    milestoneNumber: existingUpdates.length + 2,
    milestoneTitle: updateData.milestoneTitle || `Milestone ${existingUpdates.length + 2}`,
    summary: updateData.summary || previousEntry.summary,
    bullets: updateData.bullets || [],
    impact: updateData.impact || '',
    newTechStack: updateData.techStack || [],
    rawNotes: updateData.rawNotes || ''
  };

  const prevTech = Array.isArray(previousEntry.techStack) ? previousEntry.techStack : [];
  const mergedTech = Array.from(new Set([...prevTech, ...(updateData.techStack || [])])).filter(Boolean);

  const prevBullets = (Array.isArray(previousEntry.bullets) ? previousEntry.bullets : []).filter(b => b && b !== previousEntry.summary);
  const freshBullets = (updateData.bullets || []).filter(b => b && b !== updateData.summary);
  // Place newest high-impact bullets first, followed by previous key bullets (up to 5 total)
  const combinedBullets = Array.from(new Set([
    ...freshBullets,
    ...prevBullets
  ])).slice(0, 5);

  return {
    ...previousEntry,
    summary: updateData.summary || previousEntry.summary,
    impact: updateData.impact || previousEntry.impact,
    techStack: mergedTech.length > 0 ? mergedTech : prevTech,
    bullets: combinedBullets.length > 0 ? combinedBullets : (previousEntry.bullets || []),
    lastUpdatedDate: today,
    milestoneCount: existingUpdates.length + 2,
    updates: [updateRecord, ...existingUpdates]
  };
}

function sanitizeParsedResume(data) {
  return {
    personalInfo: {
      fullName: data.personalInfo?.fullName || 'Full Name',
      title: data.personalInfo?.title || 'Software Engineer',
      email: data.personalInfo?.email || '',
      phone: data.personalInfo?.phone || '',
      location: data.personalInfo?.location || '',
      github: data.personalInfo?.github || '',
      linkedin: data.personalInfo?.linkedin || '',
      portfolio: data.personalInfo?.portfolio || ''
    },
    summary: data.summary || '',
    experience: Array.isArray(data.experience) ? data.experience.map((e, idx) => ({
      id: e.id || `exp-${idx}-${Date.now()}`,
      role: e.role || 'Software Engineer',
      company: e.company || 'Company',
      location: e.location || '',
      startDate: e.startDate || '',
      endDate: e.endDate || 'Present',
      current: !!e.current,
      bullets: Array.isArray(e.bullets) ? e.bullets : [e.bullets].filter(Boolean)
    })) : [],
    projects: Array.isArray(data.projects) ? data.projects.map((p, idx) => ({
      id: p.id || `proj-${idx}-${Date.now()}`,
      name: p.name || 'Project',
      techStack: p.techStack || '',
      link: p.link || '',
      bullets: Array.isArray(p.bullets) ? p.bullets : [p.bullets].filter(Boolean)
    })) : [],
    skillCategories: Array.isArray(data.skillCategories) ? data.skillCategories.map((s, idx) => ({
      id: s.id || `skills-${idx}-${Date.now()}`,
      category: s.category || 'Skills',
      skills: Array.isArray(s.skills) ? s.skills : []
    })) : [],
    education: Array.isArray(data.education) ? data.education.map((ed, idx) => ({
      id: ed.id || `edu-${idx}-${Date.now()}`,
      degree: ed.degree || 'Degree',
      institution: ed.institution || 'University',
      location: ed.location || '',
      startDate: ed.startDate || '',
      endDate: ed.endDate || '',
      gpa: ed.gpa || '',
      highlights: ed.highlights || ''
    })) : [],
    certifications: Array.isArray(data.certifications) ? data.certifications.map((c, idx) => ({
      id: c.id || `cert-${idx}-${Date.now()}`,
      title: c.title || 'Certification',
      issuer: c.issuer || '',
      date: c.date || ''
    })) : [],
    bottomLayout: data.bottomLayout || 'grid',
    certificationsTitle: data.certificationsTitle || ''
  };
}
