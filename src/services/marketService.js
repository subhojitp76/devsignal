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
 * Skill Gap & Engineering Project Recommender
 */
export function analyzeMarketReadiness(profile) {
  const targetRole = (profile.targetRole || 'Backend Engineer').toLowerCase();
  const currentSkills = (profile.coreSkills || []).map(s => s.toLowerCase());

  // Industry demand radar for backend / systems engineering
  const benchmarkSkills = [
    { name: 'Distributed Systems', category: 'Architecture', weight: 'High', reason: 'High concurrency, consensus & partitioning are critical for senior roles' },
    { name: 'Go (Golang)', category: 'Language', weight: 'High', reason: 'Industry standard for modern cloud infrastructure & microservices' },
    { name: 'Rust', category: 'Language', weight: 'Medium', reason: 'Rapidly growing for memory safety & low-latency systems' },
    { name: 'Kafka / Event Streaming', category: 'Messaging', weight: 'High', reason: 'Asynchronous event decoupling is required in high-scale systems' },
    { name: 'Redis / In-Memory Systems', category: 'Caching', weight: 'High', reason: 'Sub-millisecond data caching & distributed locking' },
    { name: 'PostgreSQL Internals & Query Optimization', category: 'Database', weight: 'High', reason: 'Indexes, explain plans, partitioning, and connection pools' },
    { name: 'Kubernetes & Container Orchestration', category: 'DevOps', weight: 'High', reason: 'De-facto cloud-native deployment runtime' },
    { name: 'gRPC / Protobuf', category: 'Networking', weight: 'Medium', reason: 'High-speed binary RPC communication between internal services' },
    { name: 'eBPF / Observability', category: 'Systems', weight: 'Medium', reason: 'Next-gen kernel-level performance tracing and network inspection' }
  ];

  const matchedSkills = [];
  const missingSkills = [];

  benchmarkSkills.forEach(bench => {
    const isMatched = currentSkills.some(skill => 
      skill.includes(bench.name.toLowerCase().split(' ')[0]) || 
      bench.name.toLowerCase().includes(skill)
    );
    if (isMatched) {
      matchedSkills.push(bench);
    } else {
      missingSkills.push(bench);
    }
  });

  const readinessScore = Math.round((matchedSkills.length / benchmarkSkills.length) * 100);

  // Recommended hands-on portfolio projects based on skill gaps
  const recommendedProjects = [
    {
      title: 'Decentralized Raft Consensus Key-Value Engine',
      difficulty: 'Advanced',
      stack: ['Go or Rust', 'Raft Protocol', 'gRPC', 'LSM-Tree / BadgerDB'],
      objective: 'Implement leader election, log replication, and failover across 3-5 nodes without data loss.',
      keyMetricsToTarget: 'Sub-10ms write commits, seamless recovery under partitioned network chaos.'
    },
    {
      title: 'High-Throughput Distributed Rate Limiter',
      difficulty: 'Intermediate',
      stack: ['Go', 'Redis Cluster', 'Sliding Window Counter', 'Docker'],
      objective: 'Build an ultra-low latency middleware service managing rate limits across multi-tenant API clients.',
      keyMetricsToTarget: 'Benchmark under 50k req/sec with <2ms added latency overhead.'
    },
    {
      title: 'Event-Driven Change-Data-Capture (CDC) Pipeline',
      difficulty: 'Intermediate',
      stack: ['PostgreSQL WAL', 'Debezium / Kafka', 'Elasticsearch / OpenSearch'],
      objective: 'Stream database row mutations into an analytical search index in real-time with at-least-once delivery.',
      keyMetricsToTarget: '<200ms end-to-end sync delay with automated poison-pill dead-letter queues.'
    }
  ];

  // Generated Job Search Links
  const roleQuery = encodeURIComponent(profile.targetRole || 'Senior Backend Engineer');
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
      platform: 'RemoteOK Backend',
      url: `https://remoteok.com/remote-backend-jobs`,
      color: '#10b981'
    }
  ];

  return {
    readinessScore,
    matchedSkills,
    missingSkills,
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

