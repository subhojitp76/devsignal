/**
 * Dual-LLM Service: Supports Google Gemini API and Local Ollama / LM Studio
 * Provides unified interface with timeout protection and robust error reporting.
 */

export async function testLlmConnection(aiConfig) {
  const { provider, geminiApiKey, geminiModel, ollamaBaseUrl, ollamaModel } = aiConfig;

  if (provider === 'gemini') {
    if (!geminiApiKey || geminiApiKey.trim() === '') {
      throw new Error('Gemini API Key is missing. Please enter your API key in AI Config.');
    }
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel || 'gemini-3.8-flash'}:generateContent?key=${geminiApiKey.trim()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with the exact word: CONNECTED' }] }]
        })
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: Failed to connect to Gemini API`);
      }
      return { success: true, message: 'Successfully connected to Google Gemini API!' };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') throw new Error('Gemini API connection timed out after 10s.');
      throw err;
    }
  } else {
    // Local Ollama / LM Studio
    const baseUrl = (ollamaBaseUrl || 'http://localhost:1234').replace(/\/+$/, '');
    // In browser, route through Vite proxy to eliminate CORS preflight OPTIONS rejection
    const isBrowser = typeof window !== 'undefined' && window.location?.origin;
    const endpoint = isBrowser ? '/api/local-llm/chat/completions' : `${baseUrl}/v1/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-target-url': baseUrl
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: ollamaModel || 'google/gemma-4-12b-qat',
          messages: [{ role: 'user', content: 'Respond with the single word: CONNECTED' }],
          max_tokens: 15
        })
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Local LLM returned HTTP ${response.status}. Make sure your model is loaded.`);
      }

      const data = await response.json().catch(() => ({}));
      const activeModel = data.model || ollamaModel || 'Local Model';
      return { success: true, message: `Successfully connected to Local LLM with model "${activeModel}"!` };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error(`Connection timed out after 10s. Ensure your local server is running at ${baseUrl}`);
      }
      throw new Error(`Cannot reach Local LLM at ${baseUrl}: ${err.message}. Ensure LM Studio (port 1234) or Ollama (port 11434) local server is started.`);
    }
  }
}

/**
 * Fetches the live list of supported, non-deprecated generateContent models directly from Google's API
 */
export async function fetchLiveGeminiModels(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Please enter your Gemini API Key first.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${res.status}: Failed to fetch models`);
    }

    const data = await res.json();
    if (!data.models || !Array.isArray(data.models)) return [];

    // Filter only active text generation models, eliminating embeddings, vision-only, and known deprecated lines
    const activeModels = data.models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => {
        const id = m.name.replace(/^models\//, '');
        return {
          id,
          name: m.displayName || id,
          description: m.description || ''
        };
      })
      // Purge non-text models and discontinued legacy generations
      .filter(m =>
        !m.id.includes('embedding') &&
        !m.id.includes('aqa') &&
        !m.id.includes('imagen') &&
        !m.id.includes('gemini-1.0') &&
        !m.id.includes('gemini-1.5') &&
        !m.id.includes('gemini-2.0')
      );

    return activeModels;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Fetching models timed out. Please check your network or key.');
    throw err;
  }
}

/**
 * Fetches the live list of models loaded or available in LM Studio / Ollama
 */
export async function fetchLocalModels(baseUrl = 'http://localhost:1234') {
  const cleanUrl = (baseUrl || 'http://localhost:1234').replace(/\/+$/, '');
  const isBrowser = typeof window !== 'undefined' && window.location?.origin;
  const endpoint = isBrowser ? '/api/local-llm/models' : `${cleanUrl}/v1/models`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'x-target-url': cleanUrl
      }
    });
    clearTimeout(timeout);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch local models from ${cleanUrl}`);
    }
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }
    return data.data.map(m => ({
      id: m.id,
      name: m.id
    }));
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error(`Fetching local models timed out after 6s. Ensure server is active at ${cleanUrl}.`);
    }
    throw err;
  }
}

/**
 * Universal text generation through active LLM provider
 */
export async function generateLlmCompletion({ prompt, systemInstruction = '', aiConfig }) {
  const { provider, geminiApiKey, geminiModel, ollamaBaseUrl, ollamaModel, timeoutSeconds = 90 } = aiConfig;
  const isLocal = provider === 'ollama';
  const effectiveTimeout = timeoutSeconds && timeoutSeconds >= 120 ? timeoutSeconds : (isLocal ? 180 : 45);
  const controller = new AbortController();
  const timeoutMs = effectiveTimeout * 1000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (provider === 'gemini') {
      if (!geminiApiKey) {
        throw new Error('Please configure your Gemini API Key in the AI Settings (top-right gear icon) or switch to Local Ollama.');
      }
      const model = geminiModel || 'gemini-3.8-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey.trim()}`;

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction ? systemInstruction + '\n\n' : ''}${prompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 6000
        }
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(payload)
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const msg = errorJson.error?.message || `Gemini API returned status ${res.status}`;
        throw new Error(msg);
      }

      const data = await res.json();
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textOutput) throw new Error('No response returned from Gemini API.');
      return textOutput;

    } else {
      // Local Ollama / LM Studio
      const baseUrl = (ollamaBaseUrl || 'http://localhost:1234').replace(/\/+$/, '');
      const isBrowser = typeof window !== 'undefined' && window.location?.origin;
      const endpoint = isBrowser ? '/api/local-llm/chat/completions' : `${baseUrl}/v1/chat/completions`;

      const messages = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-target-url': baseUrl
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: ollamaModel || 'google/gemma-4-12b-qat',
          messages,
          temperature: 0.2,
          max_tokens: 26214
        })
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Local LLM error (${res.status}): ${errText || 'Failed to generate completion'}`);
      }

      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      let textOutput = msg?.content;
      if (!textOutput && msg?.reasoning_content) {
        textOutput = msg.reasoning_content;
      }
      // If reasoning model wrapped thinking tags, extract content after thinking tags
      if (textOutput && textOutput.includes('</think>')) {
        const parts = textOutput.split('</think>');
        const afterThink = parts[parts.length - 1].trim();
        if (afterThink) {
          textOutput = afterThink;
        }
      }
      if (!textOutput) throw new Error('No content returned from Local LLM.');
      return textOutput;
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutSeconds}s. Try increasing timeout in AI Config or switching models.`);
    }
    throw error;
  }
}

/**
 * Deep Recruiter & Hiring Manager Analysis comparing Resume vs Job Description
 */
export async function analyzeResumeWithLlm({ resumeData, jobDescription, targetTitle = '', aiConfig }) {
  if (!jobDescription || jobDescription.trim().length < 20) {
    throw new Error('Please provide a job description to analyze.');
  }

  const systemInstruction = `You are a Principal Software Engineer and Staff Technical Hiring Manager at a top-tier tech company.
Your job is to provide an objective, rigorous, and candid technical assessment comparing a candidate's resume against a job description.
DO NOT flatter the candidate. Be direct, objective, and constructive. Point out real discrepancies in seniority, scale, and domain depth.
You MUST output valid JSON ONLY matching the requested schema.`;

  const resumeSummaryData = {
    fullName: resumeData.personalInfo?.fullName,
    currentTitle: resumeData.personalInfo?.title,
    summary: resumeData.summary,
    skills: (resumeData.skillCategories || []).map(c => ({
      category: c.category,
      skills: Array.isArray(c.skills) ? c.skills.join(', ') : c.skills
    })),
    experience: (resumeData.experience || []).map(e => ({
      role: e.role,
      company: e.company,
      bullets: e.bullets
    })),
    projects: (resumeData.projects || []).map(p => ({
      title: p.title,
      tech: p.technologies,
      bullets: p.bullets
    }))
  };

  const prompt = `Evaluate this candidate's resume against the target Job Description.

TARGET ROLE:
${targetTitle || resumeData.personalInfo?.title || 'Software Engineer'}

JOB DESCRIPTION:
${jobDescription.trim()}

CANDIDATE RESUME:
${JSON.stringify(resumeSummaryData, null, 2)}

Provide your analysis in strictly valid JSON format with this exact structure:
{
  "fitVerdict": "Strong Match" | "Moderate Match" | "High Risk / Gaps",
  "fitSummary": "2-3 concise sentences giving an honest, unvarnished hiring manager assessment of whether this candidate would pass a technical resume screen for this role.",
  "seniorityAlignment": "Assessment of whether the candidate's demonstrated scope matches the requested seniority (Junior, Mid, Senior, Staff, Lead).",
  "keyStrengths": [
    "Specific technical strength 1 with evidence from resume",
    "Specific technical strength 2",
    "Specific technical strength 3"
  ],
  "criticalGaps": [
    "Specific missing domain, architecture, or scale proof 1",
    "Specific missing requirement 2"
  ],
  "tailoredBulletRewrites": [
    {
      "originalContext": "Context or quote from candidate's experience",
      "suggestedRewrite": "High-impact STAR/XYZ bullet rewrite that speaks directly to the JD's technical challenges without fabricating skills",
      "rationale": "Why this rewrite stands out to a technical hiring manager"
    }
  ],
  "interviewProbingAreas": [
    "Technical deep-dive question 1 interviewers will ask based on the gap between resume and JD",
    "Technical deep-dive question 2"
  ]
}`;

  const rawOutput = await generateLlmCompletion({
    prompt,
    systemInstruction,
    aiConfig
  });

  // Extract and parse JSON
  let parsed = null;
  try {
    let clean = rawOutput.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }
    parsed = JSON.parse(clean);
  } catch (e) {
    console.warn('Could not parse JSON from LLM response, wrapping raw text:', e);
    parsed = {
      fitVerdict: 'Analysis Complete',
      fitSummary: rawOutput.slice(0, 500),
      seniorityAlignment: 'See detailed report below.',
      keyStrengths: ['Technical background evaluated against job requirements.'],
      criticalGaps: ['Review specific job requirements against resume details.'],
      tailoredBulletRewrites: [],
      interviewProbingAreas: []
    };
  }

  return {
    ...parsed,
    timestamp: new Date().toISOString(),
    modelUsed: aiConfig.provider === 'gemini' ? (aiConfig.geminiModel || 'gemini-3.8-flash') : (aiConfig.ollamaModel || 'Local Model')
  };
}

/**
 * Generates a tailored engineering portfolio project blueprint targeting a specific skill gap
 */
export async function generateCustomProjectBlueprint({
  skillGap = 'Distributed Systems',
  targetRole = 'Senior Software Engineer',
  currentSkills = [],
  aiConfig = {}
}) {
  const hasAi = (aiConfig.provider === 'gemini' && aiConfig.geminiApiKey?.trim()) ||
                (aiConfig.provider === 'ollama' && aiConfig.ollamaBaseUrl);

  if (!hasAi) {
    return generateHeuristicProjectBlueprint(skillGap, targetRole);
  }

  const systemInstruction = `You are a Staff Software Architect & Principal Technical Interviewer.
Your task is to design a high-signal, resume-worthy engineering project blueprint that bridges a specific technical skill gap for a candidate.
The project must NOT be a toy tutorial or clone; it must address real-world system architecture, high concurrency, resilience, or data scale.
Provide strictly valid JSON with no markdown wrapping or preamble.`;

  const prompt = `Design an architectural project blueprint to bridge this skill gap:
TARGET SKILL GAP: ${skillGap}
TARGET ROLE: ${targetRole}
CANDIDATE EXISTING SKILLS: ${currentSkills.slice(0, 8).join(', ') || 'Standard Software Engineering'}

Respond with this exact JSON structure:
{
  "title": "Concise, impressive production project name",
  "difficulty": "Intermediate" | "Advanced",
  "targetSkills": ["${skillGap}", "complementary skill 1", "complementary skill 2"],
  "stack": ["3-5 specific modern tools and frameworks"],
  "objective": "2 sentences outlining the engineering problem, concurrency challenge, and architecture.",
  "keyMetricsToTarget": "Specific quantifiable benchmarks (throughput, p99 latency reduction, or scale)",
  "starterMilestones": [
    "Phase 1: Core setup and foundational protocol/service",
    "Phase 2: Concurrency, caching, or distributed resilience",
    "Phase 3: Automated load testing, benchmarking, and telemetry"
  ],
  "interviewTalkingPoints": "A key architectural trade-off or failure mode to highlight in technical screens."
}`;

  try {
    const rawOutput = await generateLlmCompletion({
      prompt,
      systemInstruction,
      aiConfig
    });

    let clean = rawOutput.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(clean);
    return {
      id: `bp-custom-${Date.now()}`,
      ...parsed,
      isAiGenerated: true,
      modelUsed: aiConfig.provider === 'gemini' ? (aiConfig.geminiModel || 'gemini-3.8-flash') : 'Local Model'
    };
  } catch (err) {
    console.warn('Failed to generate AI custom blueprint, falling back to heuristic engine:', err);
    return generateHeuristicProjectBlueprint(skillGap, targetRole);
  }
}

/**
 * Deterministic heuristic project blueprint generator (Instant offline fallback)
 */
export function generateHeuristicProjectBlueprint(skillGap = 'Distributed Systems', targetRole = 'Senior Backend Engineer') {
  const cleanSkill = skillGap.trim();
  return {
    id: `bp-heur-${Date.now()}`,
    title: `High-Throughput ${cleanSkill} Resiliency Engine`,
    difficulty: 'Advanced',
    targetSkills: [cleanSkill, 'Distributed Systems', 'Docker', 'Observability'],
    stack: [cleanSkill, 'Go or Python', 'Prometheus', 'Docker Compose'],
    objective: `Architect an event-driven system leveraging ${cleanSkill} to ensure zero data loss under simulated network partitions and high traffic spikes.`,
    keyMetricsToTarget: 'Benchmark at 20k+ operations/sec with sub-15ms p99 latency and automated health self-healing.',
    starterMilestones: [
      `Phase 1: Deploy baseline service scaffolding integrated with ${cleanSkill} client drivers.`,
      `Phase 2: Implement idempotency keys, circuit-breaker backoffs, and partition failover.`,
      `Phase 3: Run load stress tests with automated Prometheus SLO metric dashboards.`
    ],
    interviewTalkingPoints: `Discuss how ${cleanSkill} handles distributed consensus and how retry storms were mitigated with exponential jitter.`,
    isAiGenerated: false,
    modelUsed: 'DevSignal Heuristic Engine (Deterministic)'
  };
}


