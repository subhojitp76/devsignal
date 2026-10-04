/**
 * Calculate human-friendly relative time string (e.g. 2h ago, yesterday)
 */
export function timeAgo(dateString) {
  if (!dateString) return 'recently';
  const now = Date.now();
  const past = new Date(dateString).getTime();
  if (isNaN(past)) return 'recently';
  const diffSec = Math.max(0, Math.floor((now - past) / 1000));

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}mo ago`;
}

/**
 * Market Intelligence Service: Live Hacker News & Dev.to real-time tech feeds
 */
export async function fetchTechNews(topic = 'trending', source = 'all') {
  const stories = [];

  // 1. Fetch Hacker News (Real-time fresh articles)
  try {
    let hnUrl;
    if (topic === 'trending') {
      // Current trending discussions on the Hacker News front page (today / yesterday)
      hnUrl = 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=18';
    } else {
      const topicHnQuery = {
        backend: 'backend',
        distributed: 'redis',
        cloud: 'kubernetes',
        ai: 'ai'
      };
      const query = encodeURIComponent(topicHnQuery[topic] || topic);
      // search_by_date guarantees most recent articles posted in the last few hours/days
      hnUrl = `https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=story&hitsPerPage=15`;
    }

    const res = await fetch(hnUrl, { signal: AbortSignal.timeout(4500) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.hits)) {
        data.hits.forEach(item => {
          if (!item.title) return;
          stories.push({
            id: `hn-${item.objectID}`,
            title: item.title,
            url: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`,
            points: item.points || 1,
            commentsCount: item.num_comments || 0,
            author: item.author || 'community',
            createdAt: item.created_at,
            timeAgo: timeAgo(item.created_at),
            source: 'Hacker News',
            sourceColor: '#f97316'
          });
        });
      }
    }
  } catch (hnError) {
    console.warn('Failed to fetch from Hacker News, continuing with secondary feeds:', hnError.message);
  }

  // 2. Fetch Dev.to (Active Developer Articles & Case Studies)
  try {
    const devToTagMap = {
      trending: 'programming',
      backend: 'backend',
      distributed: 'devops',
      cloud: 'cloud',
      ai: 'ai'
    };
    const tag = devToTagMap[topic] || 'backend';
    const devUrl = `https://dev.to/api/articles?tag=${tag}&per_page=8&top=2`;
    
    const res = await fetch(devUrl, { signal: AbortSignal.timeout(4500) });
    if (res.ok) {
      const devToArticles = await res.json();
      if (Array.isArray(devToArticles)) {
        devToArticles.forEach(item => {
          if (!item.title) return;
          stories.push({
            id: `devto-${item.id}`,
            title: item.title,
            url: item.url,
            points: item.public_reactions_count || 0,
            commentsCount: item.comments_count || 0,
            author: item.user?.username || 'developer',
            createdAt: item.published_at,
            timeAgo: timeAgo(item.published_at),
            source: 'Dev.to',
            sourceColor: '#38bdf8'
          });
        });
      }
    }
  } catch (devError) {
    console.warn('Failed to fetch from Dev.to:', devError.message);
  }

  // 3. Fallback if both networks fail or return 0 items
  if (stories.length === 0) {
    console.warn('Both live feeds unavailable, using curated fresh fallback feed.');
    return getFallbackTechNews(topic);
  }

  // Filter by source if user specified
  let filtered = stories;
  if (source === 'hn') {
    filtered = stories.filter(s => s.source === 'Hacker News');
  } else if (source === 'devto') {
    filtered = stories.filter(s => s.source === 'Dev.to');
  }

  // Sort by publication time descending (newest first)
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return filtered;
}

/**
 * Multi-Track Engineering Taxonomies
 */
export const ENGINEERING_TRACKS = [
  {
    id: 'backend',
    label: 'Backend & Systems',
    rolePattern: /backend|systems|distributed|server|infrastructure/i,
    description: 'High concurrency, consensus protocols, data storage engines, and low-latency microservices.',
    benchmarkSkills: [
      { name: 'Distributed Systems', category: 'Architecture', weight: 'High', reason: 'High concurrency, consensus & partitioning are critical for senior roles' },
      { name: 'Go (Golang)', category: 'Language', weight: 'High', reason: 'Industry standard for modern cloud infrastructure & microservices' },
      { name: 'Rust', category: 'Language', weight: 'Medium', reason: 'Rapidly growing for memory safety & low-latency systems' },
      { name: 'Kafka / Event Streaming', category: 'Messaging', weight: 'High', reason: 'Asynchronous event decoupling is required in high-scale systems' },
      { name: 'Redis / In-Memory Systems', category: 'Caching', weight: 'High', reason: 'Sub-millisecond data caching & distributed locking' },
      { name: 'PostgreSQL Internals & Query Optimization', category: 'Database', weight: 'High', reason: 'Indexes, explain plans, partitioning, and connection pools' },
      { name: 'Kubernetes & Container Orchestration', category: 'DevOps', weight: 'High', reason: 'De-facto cloud-native deployment runtime' },
      { name: 'gRPC / Protobuf', category: 'Networking', weight: 'Medium', reason: 'High-speed binary RPC communication between internal services' },
      { name: 'eBPF / Observability', category: 'Systems', weight: 'Medium', reason: 'Next-gen kernel-level performance tracing and network inspection' }
    ]
  },
  {
    id: 'fullstack',
    label: 'Full Stack & Web',
    rolePattern: /full\s*stack|web|software engineer|product engineer/i,
    description: 'End-to-end applications, real-time client state, resilient backend APIs, and database design.',
    benchmarkSkills: [
      { name: 'TypeScript', category: 'Language', weight: 'High', reason: 'Type safety standard across modern fullstack applications' },
      { name: 'React / Next.js', category: 'Frontend', weight: 'High', reason: 'Server components, client hydration, and rich interactive UIs' },
      { name: 'Node.js / Go', category: 'Backend', weight: 'High', reason: 'High-throughput microservices and concurrent async runtimes' },
      { name: 'GraphQL / REST APIs', category: 'API Design', weight: 'High', reason: 'Contract-first client-server data fetching and mutation' },
      { name: 'PostgreSQL / SQL', category: 'Database', weight: 'High', reason: 'Relational data modeling, transactions, and migration strategies' },
      { name: 'Redis Caching', category: 'Performance', weight: 'Medium', reason: 'Session state, rate limiting, and cache invalidation' },
      { name: 'Docker & CI/CD', category: 'DevOps', weight: 'High', reason: 'Containerized dev environments and automated deploy pipelines' },
      { name: 'WebSockets / Real-time', category: 'Networking', weight: 'Medium', reason: 'Bi-directional live updates and event dispatching' }
    ]
  },
  {
    id: 'cloud_devops',
    label: 'Cloud Infrastructure & SRE',
    rolePattern: /cloud|devops|sre|platform|site reliability|infrastructure/i,
    description: 'Cloud architecture, Infrastructure as Code, Kubernetes clusters, and automated observability.',
    benchmarkSkills: [
      { name: 'Kubernetes', category: 'Orchestration', weight: 'High', reason: 'Production container scheduling, ingress, and GitOps deployments' },
      { name: 'Terraform / IaC', category: 'Infrastructure', weight: 'High', reason: 'Declarative immutable multi-cloud infrastructure provisioning' },
      { name: 'AWS / GCP Cloud Architecture', category: 'Cloud', weight: 'High', reason: 'VPC peering, IAM policies, serverless, and managed databases' },
      { name: 'Docker / Containers', category: 'Containers', weight: 'High', reason: 'Multi-stage builds, rootless containers, and image optimization' },
      { name: 'Prometheus & Grafana', category: 'Observability', weight: 'High', reason: 'Telemetry metrics, alerting thresholds, and SLO/SLI tracking' },
      { name: 'CI/CD Pipelines (GitHub Actions)', category: 'Automation', weight: 'High', reason: 'Automated test suites, security scanning, and blue/green deploys' },
      { name: 'Linux Kernel & Bash Scripting', category: 'OS', weight: 'Medium', reason: 'System debugging, networking diagnostics, and shell automation' },
      { name: 'Service Mesh (Istio / Envoy)', category: 'Networking', weight: 'Medium', reason: 'mTLS encryption, traffic splitting, and distributed tracing' }
    ]
  },
  {
    id: 'frontend',
    label: 'Frontend & UI Platform',
    rolePattern: /frontend|ui|ux|client|web developer/i,
    description: 'Design systems, client-side performance, accessibility, and high-fidelity interactive web apps.',
    benchmarkSkills: [
      { name: 'TypeScript', category: 'Language', weight: 'High', reason: 'Strict type contracts and resilient component architectures' },
      { name: 'React Architecture & State', category: 'Framework', weight: 'High', reason: 'Concurrent features, custom hooks, and state management' },
      { name: 'Core Web Vitals & Performance', category: 'Performance', weight: 'High', reason: 'LCP/INP optimization, code splitting, and bundle size reduction' },
      { name: 'Tailwind CSS & Design Systems', category: 'Styling', weight: 'High', reason: 'Scalable token systems, dark mode, and responsive layouts' },
      { name: 'Web Accessibility (WCAG / a11y)', category: 'Compliance', weight: 'High', reason: 'Keyboard navigation, ARIA attributes, and screen-reader support' },
      { name: 'Vite / Webpack Build Tooling', category: 'Tooling', weight: 'Medium', reason: 'ESM bundling, tree-shaking, and dev server optimization' },
      { name: 'Component Testing (Vitest / Playwright)', category: 'Testing', weight: 'High', reason: 'Automated regression prevention and end-to-end user flows' },
      { name: 'WebSockets & Optimistic UI', category: 'Interaction', weight: 'Medium', reason: 'Real-time collaborative features with rollback capabilities' }
    ]
  },
  {
    id: 'data_ml',
    label: 'Data Platform & Applied AI',
    rolePattern: /data|ml|machine learning|ai|analytics|pipeline/i,
    description: 'High-volume data pipelines, feature stores, applied LLM embeddings, and model serving.',
    benchmarkSkills: [
      { name: 'Python', category: 'Language', weight: 'High', reason: 'Primary language for data manipulation, ETL, and AI integration' },
      { name: 'Apache Spark / Distributed Data', category: 'Processing', weight: 'High', reason: 'Petabyte-scale distributed batch and streaming computation' },
      { name: 'Apache Kafka / Flink', category: 'Streaming', weight: 'High', reason: 'Real-time event streams and stateful stream processing' },
      { name: 'PostgreSQL / Snowflake / BigQuery', category: 'Data Warehouse', weight: 'High', reason: 'Columnar storage, analytical queries, and dimensional modeling' },
      { name: 'Vector Databases (Pinecone / Qdrant / Pgvector)', category: 'Applied AI', weight: 'High', reason: 'Semantic similarity search, RAG pipelines, and embeddings' },
      { name: 'LLM Orchestration (LangChain / LlamaIndex)', category: 'Applied AI', weight: 'Medium', reason: 'Prompt chaining, agentic tools, and context window management' },
      { name: 'Docker & Containerization', category: 'DevOps', weight: 'Medium', reason: 'Reproducible model environments and containerized workers' },
      { name: 'Data Quality & Testing (dbt / Great Expectations)', category: 'Governance', weight: 'Medium', reason: 'Automated data assertions, lineage, and documentation' }
    ]
  }
];

/**
 * Detect the candidate's engineering track based on role title or resume content
 */
export function detectEngineeringTrack(targetRole = '') {
  const role = (targetRole || '').trim().toLowerCase();
  for (const track of ENGINEERING_TRACKS) {
    if (track.rolePattern.test(role)) {
      return track.id;
    }
  }
  return 'backend';
}

/**
 * Skill-Indexed Portfolio Project Blueprints Catalog
 */
export const PROJECT_BLUEPRINTS_CATALOG = [
  {
    id: 'bp-raft',
    title: 'Decentralized Raft Consensus Key-Value Engine',
    difficulty: 'Advanced',
    targetSkills: ['Distributed Systems', 'Raft Consensus', 'Go', 'Rust'],
    stack: ['Go or Rust', 'Raft Protocol', 'gRPC', 'LSM-Tree / BadgerDB'],
    objective: 'Implement leader election, log replication, and failover across 3-5 nodes with zero data loss.',
    keyMetricsToTarget: 'Sub-10ms write commits, seamless recovery under partitioned network chaos.',
    starterMilestones: [
      'Phase 1: Build leader election with randomized election timeouts and heartbeat timers.',
      'Phase 2: Implement append-entries log replication with commit index consensus.',
      'Phase 3: Add snapshotting and Jepsen-style network partition chaos tests.'
    ]
  },
  {
    id: 'bp-rate-limiter',
    title: 'High-Throughput Distributed Rate Limiter',
    difficulty: 'Intermediate',
    targetSkills: ['Redis', 'Go', 'Microservices', 'Distributed Systems'],
    stack: ['Go', 'Redis Cluster', 'Sliding Window Counter', 'Docker'],
    objective: 'Build an ultra-low latency middleware service managing rate limits across multi-tenant API clients.',
    keyMetricsToTarget: 'Benchmark under 50k req/sec with <2ms added latency overhead.',
    starterMilestones: [
      'Phase 1: Implement memory-efficient sliding-window counter in Lua script inside Redis.',
      'Phase 2: Build high-concurrency Go HTTP middleware with atomic fallback circuit-breaker.',
      'Phase 3: Benchmark with Vegeta / k6 to prove sub-2ms p99 latency under 50k QPS.'
    ]
  },
  {
    id: 'bp-kafka-cdc',
    title: 'Event-Driven Change-Data-Capture (CDC) Pipeline',
    difficulty: 'Advanced',
    targetSkills: ['Kafka', 'PostgreSQL', 'Distributed Systems', 'Docker'],
    stack: ['PostgreSQL WAL', 'Debezium / Kafka', 'Elasticsearch / OpenSearch'],
    objective: 'Stream database row mutations into an analytical search index in real-time with at-least-once delivery.',
    keyMetricsToTarget: '<200ms end-to-end sync delay with automated poison-pill dead-letter queues.',
    starterMilestones: [
      'Phase 1: Configure PostgreSQL logical replication slots and Debezium CDC connector.',
      'Phase 2: Build Kafka consumer microservice with idempotency keys and error retry backoff.',
      'Phase 3: Synchronize to OpenSearch index with sub-200ms latency verification.'
    ]
  },
  {
    id: 'bp-terraform-aws',
    title: 'Multi-Region GitOps Cloud Infrastructure Platform',
    difficulty: 'Advanced',
    targetSkills: ['Terraform', 'AWS', 'Kubernetes', 'CI/CD Pipelines'],
    stack: ['Terraform', 'AWS (EKS, VPC, RDS)', 'GitHub Actions', 'ArgoCD'],
    objective: 'Architect automated multi-environment infrastructure-as-code with zero-drift enforcement.',
    keyMetricsToTarget: '100% automated blue/green canary deployments with <5 min rollback SLA.',
    starterMilestones: [
      'Phase 1: Modularize Terraform code for VPC peering, private subnets, and EKS cluster.',
      'Phase 2: Implement GitHub Actions workflow for automated `terraform plan` and security linting.',
      'Phase 3: Deploy ArgoCD GitOps operator with automated canary progression and Prometheus rollback.'
    ]
  },
  {
    id: 'bp-graphql-federation',
    title: 'Enterprise GraphQL Federation Subgraph Gateway',
    difficulty: 'Intermediate',
    targetSkills: ['GraphQL', 'TypeScript', 'Node.js', 'Redis'],
    stack: ['TypeScript', 'Apollo Federation / GraphQL Mesh', 'Node.js / Express', 'Redis'],
    objective: 'Unify 3 independent REST/gRPC backend microservices behind a unified, cached GraphQL supergraph.',
    keyMetricsToTarget: '60% reduction in client network requests; sub-25ms response time on aggregated queries.',
    starterMilestones: [
      'Phase 1: Define federated GraphQL schema types with entity resolvers and keys.',
      'Phase 2: Implement Redis subgraph response caching and DataLoader batching to eliminate N+1 queries.',
      'Phase 3: Add schema checks in CI to block breaking API changes.'
    ]
  },
  {
    id: 'bp-realtime-analytics',
    title: 'Real-Time Fullstack Metrics Streaming Dashboard',
    difficulty: 'Intermediate',
    targetSkills: ['React', 'TypeScript', 'WebSockets', 'Tailwind CSS'],
    stack: ['React', 'TypeScript', 'WebSockets', 'Vite', 'Recharts / Chart.js'],
    objective: 'Develop high-frequency telemetry dashboard handling 500+ live chart updates/sec without frame drops.',
    keyMetricsToTarget: 'Maintains steady 60 FPS during high-frequency WebSocket bursts with 0 layout thrashing.',
    starterMilestones: [
      'Phase 1: Build buffered WebSocket client with exponential reconnect and binary message unpacking.',
      'Phase 2: Implement virtualized data windowing to prevent DOM memory bloat over prolonged sessions.',
      'Phase 3: Optimize rendering using Web Workers and Canvas for zero-jank frame pacing.'
    ]
  },
  {
    id: 'bp-rag-vector-db',
    title: 'Hybrid RAG Knowledge Engine with Vector Embeddings',
    difficulty: 'Advanced',
    targetSkills: ['Python', 'Vector Databases', 'Applied AI', 'Docker'],
    stack: ['Python', 'FastAPI', 'Qdrant / Pgvector', 'OpenAI / Gemini Embeddings', 'Docker'],
    objective: 'Build semantic search and contextual retrieval pipeline with hybrid BM25 + dense vector ranking.',
    keyMetricsToTarget: 'Sub-40ms semantic retrieval across 100,000 technical engineering documentation chunks.',
    starterMilestones: [
      'Phase 1: Implement chunking and multi-threaded embedding ingestion pipeline into Pgvector.',
      'Phase 2: Build reciprocal rank fusion (RRF) combining keyword BM25 with cosine vector similarity.',
      'Phase 3: Expose FastAPI endpoint with contextual LLM reranking and citation grounding.'
    ]
  }
];

/**
 * Skill Gap & Engineering Project Recommender (Multi-Track & Active Job Overlay)
 */
export function analyzeMarketReadiness(profile = {}, options = {}) {
  const { 
    activeTrackId = null, 
    targetJobDescription = null, 
    atsScoreResult = null,
    resumeData = null
  } = options;

  // 1. Determine active engineering track
  const detectedTrackId = detectEngineeringTrack(profile.targetRole || '');
  const trackId = activeTrackId || detectedTrackId;
  const trackConfig = ENGINEERING_TRACKS.find(t => t.id === trackId) || ENGINEERING_TRACKS[0];

  // 2. Aggregate verified candidate skills from profile and active resume
  const candidateSkillsSet = new Set([
    ...(profile.coreSkills || []).map(s => s.toLowerCase().trim()),
    ...(profile.targetSkills || []).map(s => s.toLowerCase().trim())
  ]);

  if (resumeData?.skillCategories) {
    resumeData.skillCategories.forEach(cat => {
      (cat.skills || []).forEach(s => candidateSkillsSet.add(s.toLowerCase().trim()));
    });
  }

  // 3. Evaluate candidate skills against track benchmark skills
  const benchmarkSkills = trackConfig.benchmarkSkills;
  const matchedSkills = [];
  const missingSkills = [];

  benchmarkSkills.forEach(bench => {
    const benchTokens = bench.name.toLowerCase().split(/[\s/]+/);
    const isMatched = Array.from(candidateSkillsSet).some(skill => 
      benchTokens.some(token => token.length > 2 && skill.includes(token)) || 
      bench.name.toLowerCase().includes(skill)
    );

    if (isMatched) {
      matchedSkills.push(bench);
    } else {
      missingSkills.push(bench);
    }
  });

  // 4. Incorporate ATS Job Description Overlay (if available)
  const isAtsOverlayActive = Boolean(targetJobDescription && atsScoreResult);
  let atsDeficitSkills = [];

  if (isAtsOverlayActive && Array.isArray(atsScoreResult?.missingSkills)) {
    atsDeficitSkills = atsScoreResult.missingSkills.map(s => ({
      name: s.canonical || s.key,
      category: s.category || 'Target JD Requirement',
      weight: 'Critical',
      reason: `Directly required by target job: ${atsScoreResult.targetTitle || 'Target Role'}`
    }));

    // Add any unique ATS deficits not already in missingSkills
    atsDeficitSkills.forEach(atsDef => {
      const alreadyPresent = missingSkills.some(m => m.name.toLowerCase() === atsDef.name.toLowerCase());
      if (!alreadyPresent) {
        missingSkills.unshift(atsDef);
      }
    });
  }

  const readinessScore = Math.max(
    10,
    Math.min(100, Math.round((matchedSkills.length / Math.max(1, benchmarkSkills.length)) * 100))
  );

  // 5. Select personalized project blueprints that directly target the candidate's skill gaps
  const missingNamesLower = missingSkills.map(m => m.name.toLowerCase());

  // Score each blueprint by how many missing skills it bridges
  const scoredBlueprints = PROJECT_BLUEPRINTS_CATALOG.map(bp => {
    const bridged = bp.targetSkills.filter(ts => 
      missingNamesLower.some(mn => mn.includes(ts.toLowerCase()) || ts.toLowerCase().includes(mn))
    );
    return {
      ...bp,
      bridgedGaps: bridged,
      relevanceScore: bridged.length
    };
  });

  // Sort by highest gap coverage first
  scoredBlueprints.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const recommendedProjects = scoredBlueprints.slice(0, 3);

  // 6. Generate targeted Job Search Links
  const roleQuery = encodeURIComponent(profile.targetRole || trackConfig.label);
  const jobLinks = [
    {
      platform: 'LinkedIn Jobs',
      url: `https://www.linkedin.com/jobs/search/?keywords=${roleQuery}&f_TPR=r604800`,
      color: '#0a66c2'
    },
    {
      platform: 'Wellfound (AngelList)',
      url: `https://wellfound.com/jobs?role=${roleQuery}`,
      color: '#e11d48'
    },
    {
      platform: 'Indeed Tech',
      url: `https://www.indeed.com/jobs?q=${roleQuery}&l=Remote`,
      color: '#2563eb'
    },
    {
      platform: 'RemoteOK',
      url: `https://remoteok.com/remote-${trackConfig.id}-jobs`,
      color: '#10b981'
    }
  ];

  return {
    readinessScore,
    trackConfig,
    activeTrackId: trackConfig.id,
    isAtsOverlayActive,
    targetJobTitle: atsScoreResult?.targetTitle || profile.targetRole,
    matchedSkills,
    missingSkills,
    atsDeficitSkills,
    recommendedProjects,
    jobLinks
  };
}

function getFallbackTechNews(topic = 'trending') {
  const now = new Date();
  const makeDate = (hoursAgo) => new Date(now.getTime() - hoursAgo * 3600 * 1000).toISOString();

  const fallbacks = {
    trending: [
      {
        id: 'fb-tr-1',
        title: 'DeepSeek-V3 and Gemma 4 Architecture: Multi-Token Prediction and Sparse MoE Scaling',
        url: 'https://news.ycombinator.com',
        points: 489,
        commentsCount: 162,
        author: 'ai_architect',
        createdAt: makeDate(3),
        timeAgo: '3h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      },
      {
        id: 'fb-tr-2',
        title: 'Go 1.25 Released with Enhanced Thread Profiling and Allocation Zero-Copy Buffers',
        url: 'https://news.ycombinator.com',
        points: 341,
        commentsCount: 88,
        author: 'golang_core',
        createdAt: makeDate(6),
        timeAgo: '6h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      },
      {
        id: 'fb-tr-3',
        title: 'Building a High-Performance Distributed Task Queue from Scratch with Go and Redis',
        url: 'https://dev.to',
        points: 124,
        commentsCount: 22,
        author: 'systems_dev',
        createdAt: makeDate(8),
        timeAgo: '8h ago',
        source: 'Dev.to',
        sourceColor: '#38bdf8'
      }
    ],
    backend: [
      {
        id: 'fb-be-1',
        title: 'Optimizing Go Memory Allocation with sync.Pool and Pointers',
        url: 'https://news.ycombinator.com',
        points: 284,
        commentsCount: 96,
        author: 'golang_lead',
        createdAt: makeDate(4),
        timeAgo: '4h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      },
      {
        id: 'fb-be-2',
        title: 'Designing Resilient Distributed Locks with Redis and Redlock: Pitfalls to Avoid',
        url: 'https://news.ycombinator.com',
        points: 412,
        commentsCount: 153,
        author: 'systems_architect',
        createdAt: makeDate(7),
        timeAgo: '7h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      },
      {
        id: 'fb-be-3',
        title: 'PostgreSQL 17 Released: High-Performance Query Optimization and Memory Scaling',
        url: 'https://news.ycombinator.com',
        points: 590,
        commentsCount: 221,
        author: 'db_insider',
        createdAt: makeDate(10),
        timeAgo: '10h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      },
      {
        id: 'fb-be-4',
        title: 'Why Top Engineering Teams Are Adopting Kafka Tiered Storage for Cost Reduction',
        url: 'https://news.ycombinator.com',
        points: 178,
        commentsCount: 64,
        author: 'kafka_core',
        createdAt: makeDate(14),
        timeAgo: '14h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      }
    ],
    distributed: [
      {
        id: 'fb-dist-1',
        title: 'Implementing Raft Distributed Consensus from Scratch in Go',
        url: 'https://news.ycombinator.com',
        points: 445,
        commentsCount: 112,
        author: 'consensus_eng',
        createdAt: makeDate(5),
        timeAgo: '5h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      },
      {
        id: 'fb-dist-2',
        title: 'Anatomy of a Distributed WAL: How RocksDB and Kafka Prevent Data Corruption',
        url: 'https://news.ycombinator.com',
        points: 310,
        commentsCount: 88,
        author: 'storage_dev',
        createdAt: makeDate(9),
        timeAgo: '9h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      },
      {
        id: 'fb-dist-3',
        title: 'Vector Clocks vs Lamport Timestamps in Conflict-Free Distributed Replicas',
        url: 'https://news.ycombinator.com',
        points: 228,
        commentsCount: 61,
        author: 'dist_sys',
        createdAt: makeDate(12),
        timeAgo: '12h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      }
    ],
    cloud: [
      {
        id: 'fb-cld-1',
        title: 'Kubernetes Ephemeral Containers: Debugging Microservices Live in Production',
        url: 'https://news.ycombinator.com',
        points: 335,
        commentsCount: 94,
        author: 'k8s_ops',
        createdAt: makeDate(3),
        timeAgo: '3h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      },
      {
        id: 'fb-cld-2',
        title: 'Zero-Downtime Aurora PostgreSQL Upgrades with pg_roll and Blue-Green Deployments',
        url: 'https://news.ycombinator.com',
        points: 279,
        commentsCount: 73,
        author: 'cloud_infra',
        createdAt: makeDate(6),
        timeAgo: '6h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      },
      {
        id: 'fb-cld-3',
        title: 'eBPF-Based Network Observability: Inspecting Kubernetes Ingress Latency',
        url: 'https://news.ycombinator.com',
        points: 412,
        commentsCount: 130,
        author: 'cilium_user',
        createdAt: makeDate(11),
        timeAgo: '11h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      }
    ],
    ai: [
      {
        id: 'fb-ai-1',
        title: 'Building Production RAG Systems with Hybrid Vector and BM25 Lexical Retrieval',
        url: 'https://news.ycombinator.com',
        points: 520,
        commentsCount: 184,
        author: 'ai_builder',
        createdAt: makeDate(2),
        timeAgo: '2h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      },
      {
        id: 'fb-ai-2',
        title: 'High-Throughput LLM Serving: vLLM PagedAttention Benchmark vs TensorRT-LLM',
        url: 'https://news.ycombinator.com',
        points: 388,
        commentsCount: 105,
        author: 'inference_guru',
        createdAt: makeDate(5),
        timeAgo: '5h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      },
      {
        id: 'fb-ai-3',
        title: 'Quantization at the Edge: Performance Analysis of AWQ, GGUF, and FP8',
        url: 'https://news.ycombinator.com',
        points: 295,
        commentsCount: 82,
        author: 'ml_researcher',
        createdAt: makeDate(8),
        timeAgo: '8h ago',
        source: 'Hacker News',
        sourceColor: '#f97316'
      }
    ]
  };

  return fallbacks[topic] || fallbacks.trending;
}

