/**
 * ATS Score Calculator & Recommendation Utilities for DevSignal
 * Industry-standard weighted algorithm:
 * - Hard Skills & Keywords: 45% (contextual weighting: Experience > Projects > Skills list)
 * - Role & Seniority Fit: 20%
 * - Quantified STAR/XYZ Impact: 20%
 * - ATS Format & Structural Compliance: 15%
 */

// 1. Core Tech Skills Dictionary with Categories
export const TECH_SKILL_DICTIONARY = {
  // Languages
  'go': { canonical: 'Go (Golang)', category: 'Languages & Core', synonyms: ['golang', 'go lang'] },
  'rust': { canonical: 'Rust', category: 'Languages & Core', synonyms: ['rustlang'] },
  'python': { canonical: 'Python', category: 'Languages & Core', synonyms: ['python3', 'py'] },
  'java': { canonical: 'Java', category: 'Languages & Core', synonyms: ['java8', 'java11', 'java17', 'java21', 'core java'] },
  'c++': { canonical: 'C++', category: 'Languages & Core', synonyms: ['cpp', 'cplusplus'] },
  'c': { canonical: 'C', category: 'Languages & Core', synonyms: [] },
  'typescript': { canonical: 'TypeScript', category: 'Languages & Core', synonyms: ['ts'], relatedKeys: ['javascript'] },
  'javascript': { canonical: 'JavaScript', category: 'Languages & Core', synonyms: ['js', 'ecmascript'], relatedKeys: ['typescript'] },
  'sql': { canonical: 'SQL', category: 'Languages & Core', synonyms: ['rdbms', 'relational database', 'structured query language'], relatedKeys: ['postgresql', 'mysql'] },
  'bash': { canonical: 'Bash', category: 'Languages & Core', synonyms: ['shell scripting', 'shell', 'zsh'], relatedKeys: ['linux'] },
  'scala': { canonical: 'Scala', category: 'Languages & Core', synonyms: [], relatedKeys: ['java'] },
  'kotlin': { canonical: 'Kotlin', category: 'Languages & Core', synonyms: [], relatedKeys: ['java'] },

  // Distributed Systems & Messaging
  'distributed systems': { canonical: 'Distributed Systems', category: 'Distributed Systems & Architecture', synonyms: ['distributed computing', 'high availability', 'fault tolerant', 'distributed state'], relatedKeys: ['microservices', 'kafka', 'raft'] },
  'kafka': { canonical: 'Apache Kafka', category: 'Distributed Systems & Architecture', synonyms: ['apache kafka', 'event streaming', 'kafka streams', 'pub/sub', 'pubsub'], relatedKeys: ['rabbitmq'] },
  'rabbitmq': { canonical: 'RabbitMQ', category: 'Distributed Systems & Architecture', synonyms: ['amqp', 'message broker'], relatedKeys: ['kafka'] },
  'grpc': { canonical: 'gRPC', category: 'Distributed Systems & Architecture', synonyms: ['protobuf', 'protocol buffers', 'rpc'], relatedKeys: ['rest'] },
  'graphql': { canonical: 'GraphQL', category: 'Distributed Systems & Architecture', synonyms: ['apollo graphql'], relatedKeys: ['rest'] },
  'rest': { canonical: 'REST APIs', category: 'Distributed Systems & Architecture', synonyms: ['restful', 'rest api', 'rest apis', 'web api'], relatedKeys: ['grpc', 'graphql'] },
  'microservices': { canonical: 'Microservices', category: 'Distributed Systems & Architecture', synonyms: ['microservice architecture', 'service oriented architecture', 'soa'], relatedKeys: ['distributed systems', 'docker'] },
  'websockets': { canonical: 'WebSockets', category: 'Distributed Systems & Architecture', synonyms: ['websocket', 'socket.io', 'real-time streaming'], relatedKeys: [] },
  'redis': { canonical: 'Redis', category: 'Databases & Storage', synonyms: ['in-memory cache', 'redis cluster', 'redis caching'], relatedKeys: [] },
  'raft': { canonical: 'Raft Consensus', category: 'Distributed Systems & Architecture', synonyms: ['raft protocol', 'consensus algorithm', 'paxos'], relatedKeys: ['distributed systems'] },

  // Databases & Storage
  'postgresql': { canonical: 'PostgreSQL', category: 'Databases & Storage', synonyms: ['postgres', 'psql'], relatedKeys: ['sql'] },
  'mysql': { canonical: 'MySQL', category: 'Databases & Storage', synonyms: ['mariadb'], relatedKeys: ['sql'] },
  'mongodb': { canonical: 'MongoDB', category: 'Databases & Storage', synonyms: ['mongo', 'nosql document store'] },
  'cassandra': { canonical: 'Apache Cassandra', category: 'Databases & Storage', synonyms: ['cassandra', 'scylladb', 'wide-column'] },
  'dynamodb': { canonical: 'DynamoDB', category: 'Databases & Storage', synonyms: ['aws dynamodb'] },
  'elasticsearch': { canonical: 'Elasticsearch', category: 'Databases & Storage', synonyms: ['opensearch', 'elk stack', 'elastic search'] },
  'nosql': { canonical: 'NoSQL', category: 'Databases & Storage', synonyms: ['non-relational'] },

  // Cloud & DevOps
  'kubernetes': { canonical: 'Kubernetes', category: 'Cloud & Infrastructure', synonyms: ['k8s', 'kube', 'container orchestration'] },
  'docker': { canonical: 'Docker', category: 'Cloud & Infrastructure', synonyms: ['containers', 'containerization'] },
  'aws': { canonical: 'AWS', category: 'Cloud & Infrastructure', synonyms: ['amazon web services', 'ec2', 's3', 'rds', 'lambda', 'ecs', 'eks'] },
  'gcp': { canonical: 'GCP', category: 'Cloud & Infrastructure', synonyms: ['google cloud', 'google cloud platform', 'gke'] },
  'azure': { canonical: 'Azure', category: 'Cloud & Infrastructure', synonyms: ['microsoft azure'] },
  'terraform': { canonical: 'Terraform', category: 'Cloud & Infrastructure', synonyms: ['infrastructure as code', 'iac'] },
  'ci/cd': { canonical: 'CI/CD Pipelines', category: 'Cloud & Infrastructure', synonyms: ['cicd', 'continuous integration', 'continuous deployment', 'github actions', 'gitlab ci', 'jenkins', 'argocd'] },
  'prometheus': { canonical: 'Prometheus', category: 'Cloud & Infrastructure', synonyms: ['monitoring', 'metrics collection'] },
  'grafana': { canonical: 'Grafana', category: 'Cloud & Infrastructure', synonyms: ['dashboards', 'observability'] },
  'opentelemetry': { canonical: 'OpenTelemetry', category: 'Cloud & Infrastructure', synonyms: ['distributed tracing', 'otel', 'jaeger'] },
  'linux': { canonical: 'Linux', category: 'Cloud & Infrastructure', synonyms: ['unix', 'system internals', 'kernel'] },
  'ebpf': { canonical: 'eBPF', category: 'Cloud & Infrastructure', synonyms: ['bcc', 'kernel tracing'] },

  // Frontend & Fullstack
  'react': { canonical: 'React', category: 'Frontend & UI', synonyms: ['react.js', 'reactjs'] },
  'next.js': { canonical: 'Next.js', category: 'Frontend & UI', synonyms: ['nextjs', 'next'] },
  'node.js': { canonical: 'Node.js', category: 'Languages & Core', synonyms: ['nodejs', 'node'] },
  'tailwind': { canonical: 'Tailwind CSS', category: 'Frontend & UI', synonyms: ['tailwindcss'] }
};

// Quick lookup mapping each synonym/alias to its canonical key
const ALIAS_TO_CANONICAL = {};
Object.entries(TECH_SKILL_DICTIONARY).forEach(([key, info]) => {
  ALIAS_TO_CANONICAL[key] = key;
  ALIAS_TO_CANONICAL[info.canonical.toLowerCase()] = key;
  (info.synonyms || []).forEach(syn => {
    ALIAS_TO_CANONICAL[syn.toLowerCase()] = key;
  });
});

/**
 * Extracts recognized technical keywords from raw text (JD or resume)
 */
export function extractTechnicalSkills(text) {
  if (!text) return { foundSkills: [], skillCounts: {}, rawTokens: [] };
  const lowerText = ' ' + text.toLowerCase().replace(/[\r\n\t]/g, ' ') + ' ';
  const skillCounts = {};
  const foundSet = new Set();

  // Sort dictionary keys by word count descending to match multi-word phrases first
  const sortedKeys = Object.keys(ALIAS_TO_CANONICAL).sort((a, b) => b.length - a.length);

  sortedKeys.forEach(term => {
    // Exact word boundary match
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s,;:.()/\\[\\]{}"'\\-])${escaped}(?:[\\s,;:.()/\\[\\]{}"'\\-]|$)`, 'gi');
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      const canonicalKey = ALIAS_TO_CANONICAL[term];
      skillCounts[canonicalKey] = (skillCounts[canonicalKey] || 0) + matches.length;
      foundSet.add(canonicalKey);
    }
  });

  const foundSkills = Array.from(foundSet).map(key => ({
    key,
    canonical: TECH_SKILL_DICTIONARY[key]?.canonical || key,
    category: TECH_SKILL_DICTIONARY[key]?.category || 'Technical Skills',
    count: skillCounts[key] || 1
  }));

  // Sort by occurrence count descending
  foundSkills.sort((a, b) => b.count - a.count);

  return { foundSkills, skillCounts };
}

/**
 * Analyzes resume content across distinct sections to compute weighted contextual presence
 */
export function extractResumeSkills(resumeData) {
  const sources = {
    experience: [],
    projects: [],
    skillsList: [],
    headerAndSummary: []
  };

  // Header & Title
  if (resumeData.personalInfo?.title) sources.headerAndSummary.push(resumeData.personalInfo.title);
  if (resumeData.summary) sources.headerAndSummary.push(resumeData.summary);

  // Work Experience bullets
  (resumeData.experience || []).forEach(exp => {
    if (exp.role) sources.experience.push(exp.role);
    (exp.bullets || []).forEach(b => sources.experience.push(b));
  });

  // Projects
  (resumeData.projects || []).forEach(proj => {
    if (proj.name) sources.projects.push(proj.name);
    if (proj.techStack) sources.projects.push(proj.techStack);
    (proj.bullets || []).forEach(b => sources.projects.push(b));
  });

  // Dedicated Skills section
  (resumeData.skillCategories || []).forEach(cat => {
    if (cat.category) sources.skillsList.push(cat.category);
    (cat.skills || []).forEach(s => sources.skillsList.push(s));
  });

  const expExtracted = extractTechnicalSkills(sources.experience.join(' '));
  const projExtracted = extractTechnicalSkills(sources.projects.join(' '));
  const skillsExtracted = extractTechnicalSkills(sources.skillsList.join(' '));
  const headerExtracted = extractTechnicalSkills(sources.headerAndSummary.join(' '));

  const allFoundKeys = new Set([
    ...expExtracted.foundSkills.map(s => s.key),
    ...projExtracted.foundSkills.map(s => s.key),
    ...skillsExtracted.foundSkills.map(s => s.key),
    ...headerExtracted.foundSkills.map(s => s.key)
  ]);

  const skillLocations = {};
  allFoundKeys.forEach(key => {
    skillLocations[key] = {
      inExperience: expExtracted.skillCounts[key] || 0,
      inProjects: projExtracted.skillCounts[key] || 0,
      inSkillsList: skillsExtracted.skillCounts[key] || 0,
      inHeaderSummary: headerExtracted.skillCounts[key] || 0
    };
  });

  return {
    allSkillsSet: allFoundKeys,
    skillLocations
  };
}

/**
 * Audits quantifiable metrics in work experience and project bullets (STAR/XYZ format)
 */
export function auditQuantifiedMetrics(resumeData) {
  const allBullets = [];
  (resumeData.experience || []).forEach(exp => {
    (exp.bullets || []).forEach(b => allBullets.push({ text: b, source: exp.role || 'Experience' }));
  });
  (resumeData.projects || []).forEach(proj => {
    (proj.bullets || []).forEach(b => allBullets.push({ text: b, source: proj.name || 'Project' }));
  });

  if (allBullets.length === 0) {
    return { ratio: 0, totalBullets: 0, quantifiedCount: 0, nonQuantifiedBullets: [] };
  }

  // Regex patterns detecting numbers, percentages, latencies, scale, and currency
  const metricRegex = /(?:\b\d+(?:\.\d+)?%|\$\d+(?:,\d+)*(?:\.\d+)?[kmb]?|\b\d+[kmb]\+?|\b\d+\s*(?:ms|seconds|sec|min|hours|req\/s|rps|qps|tb|gb|mb|users|nodes|services|pod|events|daily|monthly)\b|\b\d+x\b|\b[1-9]\d{1,}\b)/i;

  const quantified = [];
  const nonQuantified = [];

  allBullets.forEach(b => {
    if (metricRegex.test(b.text)) {
      quantified.push(b);
    } else {
      nonQuantified.push(b);
    }
  });

  const ratio = Math.min(1, quantified.length / allBullets.length);

  return {
    ratio,
    totalBullets: allBullets.length,
    quantifiedCount: quantified.length,
    nonQuantifiedBullets: nonQuantified
  };
}

/**
 * Checks standard ATS structural checklist & formatting compliance
 */
export function auditAtsStructure(resumeData) {
  const checks = [];
  let passedCount = 0;

  // 1. Contact Info Completeness
  const info = resumeData.personalInfo || {};
  const hasName = Boolean(info.fullName && info.fullName.trim().length > 2);
  const hasEmail = Boolean(info.email && info.email.includes('@'));
  const hasPhone = Boolean(info.phone && info.phone.trim().length >= 7);
  const hasLocation = Boolean(info.location && info.location.trim().length > 2);
  const hasSocial = Boolean(info.github || info.linkedin || info.portfolio);

  const contactScore = [hasName, hasEmail, hasPhone, hasLocation, hasSocial].filter(Boolean).length;
  checks.push({
    title: 'Complete Contact Header',
    description: 'Name, email, phone, location, and GitHub/LinkedIn profiles',
    passed: contactScore >= 4,
    status: contactScore === 5 ? 'excellent' : contactScore >= 4 ? 'good' : 'warning'
  });
  if (contactScore >= 4) passedCount++;

  // 2. Standard Core Sections Present
  const hasExperience = Array.isArray(resumeData.experience) && resumeData.experience.length > 0;
  const hasSkills = Array.isArray(resumeData.skillCategories) && resumeData.skillCategories.length > 0;
  const hasProjects = Array.isArray(resumeData.projects) && resumeData.projects.length > 0;
  const hasEducation = Array.isArray(resumeData.education) && resumeData.education.length > 0;

  const sectionScore = [hasExperience, hasSkills, hasProjects, hasEducation].filter(Boolean).length;
  checks.push({
    title: 'Standard ATS Section Architecture',
    description: 'Work Experience, Technical Skills, Projects, and Education sections',
    passed: sectionScore >= 3,
    status: sectionScore === 4 ? 'excellent' : sectionScore >= 3 ? 'good' : 'warning'
  });
  if (sectionScore >= 3) passedCount++;

  // 3. Word Count & Single Page A4 Density (Ideal SWE length: 400 - 800 words)
  const fullText = JSON.stringify(resumeData).replace(/[{}\[\]",:]/g, ' ');
  const wordCount = fullText.trim().split(/\s+/).filter(w => w.length > 1).length;
  const isHealthyDensity = wordCount >= 380 && wordCount <= 850;

  checks.push({
    title: '1-Page A4 Content Density',
    description: `Current word count: ~${wordCount} words (ideal target: 400–800 words)`,
    passed: isHealthyDensity,
    status: isHealthyDensity ? 'excellent' : wordCount < 380 ? 'warning' : 'warning'
  });
  if (isHealthyDensity) passedCount++;

  const structuralScore = Math.round((passedCount / checks.length) * 100);

  return {
    structuralScore,
    checks,
    wordCount
  };
}

/**
 * Evaluates Role Title and Seniority Alignment between JD and Resume
 */
export function auditRoleAlignment(resumeData, jdText, targetJobTitle = '') {
  const combinedJd = (targetJobTitle + ' ' + (jdText || '')).toLowerCase();
  const resumeTitle = (resumeData.personalInfo?.title || '').toLowerCase();
  const resumeSummary = (resumeData.summary || '').toLowerCase();

  const seniorityKeywords = ['senior', 'staff', 'lead', 'principal', 'architect', 'junior', 'mid', 'intern'];
  const roleKeywords = ['backend', 'frontend', 'fullstack', 'systems', 'distributed', 'devops', 'platform', 'sre', 'cloud', 'data', 'infrastructure', 'software engineer'];

  // Check matching title tokens
  let matchedSeniority = false;
  let jdSeniority = null;
  for (const s of seniorityKeywords) {
    if (combinedJd.includes(s)) {
      jdSeniority = s;
      if (resumeTitle.includes(s) || resumeSummary.includes(s)) {
        matchedSeniority = true;
      }
      break;
    }
  }

  // Count role token matches
  let matchedRoleTokens = 0;
  let searchedRoleTokens = 0;
  roleKeywords.forEach(r => {
    if (combinedJd.includes(r)) {
      searchedRoleTokens++;
      if (resumeTitle.includes(r) || resumeSummary.includes(r)) {
        matchedRoleTokens++;
      }
    }
  });

  // Calculate experience years in resume
  const experienceYears = (resumeData.experience || []).length * 1.5; // Heuristic based on roles

  let score = 70; // baseline neutral
  if (matchedSeniority) score += 15;
  else if (jdSeniority && !matchedSeniority) score -= 10;

  if (searchedRoleTokens > 0) {
    score += Math.round((matchedRoleTokens / searchedRoleTokens) * 20);
  }

  return {
    alignmentScore: Math.max(30, Math.min(100, score)),
    jdSeniority,
    matchedSeniority
  };
}

/**
 * 3-Tier Recommendation Engine
 * - Tier 1: Safe Vocabulary / Synonym Alignment
 * - Tier 2: Latent Contextual Experience (Experience bullet rewrites)
 * - Tier 3: True Knowledge Deficits (Gaps to learn, not fabricate)
 */
export function generate3TierRecommendations(jdSkills, resumeSkillsInfo, nonQuantifiedBullets) {
  const tier1 = []; // Synonyms / vocabulary
  const tier2 = []; // Contextual bullet additions
  const tier3 = []; // True skill gaps

  jdSkills.forEach(skill => {
    const isPresent = resumeSkillsInfo.allSkillsSet.has(skill.key);
    if (!isPresent) {
      const dictItem = TECH_SKILL_DICTIONARY[skill.key];
      // Check if user has a related synonym or family tech in their resume
      const hasSynonymInResume = (dictItem?.synonyms || []).some(syn => {
        const synKey = ALIAS_TO_CANONICAL[syn.toLowerCase()];
        return synKey && resumeSkillsInfo.allSkillsSet.has(synKey);
      });
      const hasRelatedInResume = (dictItem?.relatedKeys || []).some(relKey => {
        return resumeSkillsInfo.allSkillsSet.has(relKey);
      });

      if (hasSynonymInResume || hasRelatedInResume) {
        // TIER 1: User already has related tech, safe vocabulary alignment
        tier1.push({
          skill: skill.canonical,
          category: skill.category,
          reason: `Matches your related experience. Align with "${skill.canonical}" for recruiter search queries.`,
          actionType: 'add_to_skills',
          actionLabel: `+ Add "${skill.canonical}" to Skills`,
          confidence: 'High'
        });
      } else if (skill.count >= 2) {
        // Repeated heavily in JD -> Crucial requirement
        if (dictItem?.category === 'Cloud & Infrastructure' || dictItem?.category === 'Distributed Systems & Architecture') {
          // TIER 2: Can be integrated into work experience bullets if candidate touched it
          tier2.push({
            skill: skill.canonical,
            category: skill.category,
            reason: `Mentioned ${skill.count}x in JD. If used in production or staging, integrate into work experience.`,
            suggestedBulletTemplate: `Engineered and maintained ${skill.canonical} pipeline, achieving improved deployment velocity and reliability.`,
            actionType: 'suggest_bullet',
            actionLabel: `Incorporate ${skill.canonical} into Bullet`,
            confidence: 'Medium'
          });
        } else {
          // TIER 3: Core tech stack deficit
          tier3.push({
            skill: skill.canonical,
            category: skill.category,
            reason: `Prominently required (${skill.count}x in JD). Not detected in resume.`,
            actionType: 'dev_journal_milestone',
            actionLabel: `Start "${skill.canonical}" Milestone in Dev Journal`,
            warning: 'Honest Skill Gap: Do not add without genuine hands-on experience.',
            confidence: 'Advisory'
          });
        }
      } else {
        // TIER 3: Standard missing skill
        tier3.push({
          skill: skill.canonical,
          category: skill.category,
          reason: `Requested in JD. Not found in current resume.`,
          actionType: 'dev_journal_milestone',
          actionLabel: `Learn in Dev Journal`,
          warning: 'Do not keyword stuff without experience.',
          confidence: 'Advisory'
        });
      }
    }
  });

  return { tier1, tier2, tier3 };
}

/**
 * MASTER ATS SCORER: Computes full weighted ATS score and comprehensive report
 */
export function calculateAtsScore(resumeData, jdText, targetJobTitle = '') {
  if (!jdText || jdText.trim().length < 25) {
    return null;
  }

  // 1. Extract skills from JD and Resume
  const jdAnalysis = extractTechnicalSkills(jdText);
  const resumeSkillsInfo = extractResumeSkills(resumeData);

  const matchedSkills = [];
  const missingSkills = [];
  let weightedSkillPoints = 0;
  let maxPossibleSkillPoints = 0;

  jdAnalysis.foundSkills.forEach(jdSkill => {
    const loc = resumeSkillsInfo.skillLocations[jdSkill.key];
    const isPresent = Boolean(loc);
    const weight = Math.min(3, jdSkill.count); // frequency cap to prevent keyword stuffing distortion
    maxPossibleSkillPoints += weight;

    if (isPresent) {
      // Contextual weighting: Experience bullets give 100%, Projects give 80%, Skills-only gives 50%
      let multiplier = 0.5;
      if (loc.inExperience > 0) multiplier = 1.0;
      else if (loc.inProjects > 0) multiplier = 0.85;

      weightedSkillPoints += weight * multiplier;
      matchedSkills.push({
        ...jdSkill,
        locations: loc
      });
    } else {
      missingSkills.push(jdSkill);
    }
  });

  const skillsMatchScore = maxPossibleSkillPoints > 0 
    ? Math.round((weightedSkillPoints / maxPossibleSkillPoints) * 100) 
    : 80;

  // 2. Role & Seniority alignment (20%)
  const roleAnalysis = auditRoleAlignment(resumeData, jdText, targetJobTitle);

  // 3. Quantified STAR/XYZ metrics (20%)
  const metricAnalysis = auditQuantifiedMetrics(resumeData);
  const metricsScore = Math.round(metricAnalysis.ratio * 100);

  // 4. Structural ATS compliance (15%)
  const structureAnalysis = auditAtsStructure(resumeData);
  const formatScore = structureAnalysis.structuralScore;

  // 5. Total Weighted Score Formula
  // 45% Skills + 20% Role + 20% Metrics + 15% Format
  const totalScore = Math.round(
    (skillsMatchScore * 0.45) +
    (roleAnalysis.alignmentScore * 0.20) +
    (metricsScore * 0.20) +
    (formatScore * 0.15)
  );

  // Score tier
  let tier = 'good';
  let tierLabel = 'Strong Match';
  let tierColor = '#38bdf8'; // Cyan
  if (totalScore >= 85) {
    tier = 'exceptional';
    tierLabel = 'Exceptional Match';
    tierColor = '#34d399'; // Emerald
  } else if (totalScore < 55) {
    tier = 'low';
    tierLabel = 'Needs Optimization';
    tierColor = '#f87171'; // Rose
  } else if (totalScore < 70) {
    tier = 'moderate';
    tierLabel = 'Moderate Match';
    tierColor = '#fbbf24'; // Amber
  }

  // 6. Generate 3-Tier Recommendations
  const recommendations = generate3TierRecommendations(
    jdAnalysis.foundSkills,
    resumeSkillsInfo,
    metricAnalysis.nonQuantifiedBullets
  );
  recommendations.tier1_safeSynonyms = recommendations.tier1;
  recommendations.tier2_contextualKeywords = recommendations.tier2;
  recommendations.tier3_trueGaps = recommendations.tier3;

  return {
    totalScore: Math.min(100, Math.max(10, totalScore)),
    tier,
    tierLabel,
    tierColor,
    subscores: {
      skillsMatch: skillsMatchScore,
      roleAlignment: roleAnalysis.alignmentScore,
      quantifiedMetrics: metricsScore,
      atsFormat: formatScore
    },
    matchedSkills,
    missingSkills,
    recommendations,
    checklist: structureAnalysis.checks,
    metricAudit: {
      ratio: metricAnalysis.ratio,
      totalBullets: metricAnalysis.totalBullets,
      quantifiedCount: metricAnalysis.quantifiedCount
    },
    wordCount: structureAnalysis.wordCount
  };
}

// 7. Curated Realistic Sample Job Descriptions for Fast 1-Click Audits
export const SAMPLE_JOB_DESCRIPTIONS = [
  {
    id: 'dist_sys',
    title: 'Senior Distributed Systems Engineer',
    company: 'CloudScale Infrastructure',
    targetTitle: 'Senior Distributed Systems Engineer',
    text: `About the Role:
We are looking for a Senior Distributed Systems Engineer to scale our real-time streaming data platform processing billions of events daily.

Key Responsibilities & Qualifications:
- 5+ years building high-throughput distributed systems in Go (Golang) or Rust.
- Deep hands-on experience with Apache Kafka, Raft consensus, or distributed state management.
- Expertise with PostgreSQL, Redis caching, and low-latency database query optimization.
- Strong proficiency in Docker, Kubernetes, and AWS infrastructure (EC2, EKS, S3).
- Track record of designing gRPC and REST APIs processing 10,000+ requests per second with sub-50ms latency.
- Experience with Prometheus, Grafana, and OpenTelemetry observability pipelines.`
  },
  {
    id: 'staff_backend',
    title: 'Staff Backend Platform Engineer',
    company: 'Fintech Core Systems',
    targetTitle: 'Staff Software Engineer',
    text: `About the Role:
We are hiring a Staff Backend Platform Engineer to lead architectural design and resilience for our core transaction clearing engine.

Requirements:
- 7+ years of professional backend engineering in Java, Go, or Python.
- Proven experience architecting microservices, CI/CD pipelines, and Terraform infrastructure.
- Mastery of relational databases (PostgreSQL/MySQL) and high-scale data stores (Cassandra/DynamoDB).
- Experience leading performance tuning, reducing p99 latency, and achieving 99.99% system availability.
- Excellent communication skills, mentorship experience, and technical leadership across cross-functional teams.`
  },
  {
    id: 'senior_fullstack',
    title: 'Senior Full Stack Engineer',
    company: 'NextGen Cloud SaaS',
    targetTitle: 'Senior Full Stack Engineer',
    text: `About the Role:
Seeking an experienced Full Stack Engineer to develop high-performance web applications and cloud backend microservices.

Requirements:
- 4+ years working across the full stack with TypeScript, React, and Node.js or Go.
- Strong proficiency with GraphQL and RESTful APIs.
- Experience with Docker, Kubernetes, and CI/CD automation via GitHub Actions.
- Solid understanding of SQL databases, indexing, and Redis caching.
- Focus on web performance, accessibility, and clean responsive UI design.`
  }
];
