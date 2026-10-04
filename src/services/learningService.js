/**
 * Learning Service: Socratic AI Mentorship & Engineering Prompt Engine
 * Generates tailored, high-signal prompts for Claude, ChatGPT, Gemini, and Local LLMs (Ollama)
 * across 3 distinct learning modes to close technical skill gaps.
 */

import { generateLlmCompletion } from './llmService';

/**
 * Domain-specific curated concepts, starter questions, and failure modes
 * Provides instant 0ms offline capability when AI is offline or unconfigured.
 */
const DOMAIN_KNOWLEDGE_MAP = {
  kafka: {
    name: 'Apache Kafka',
    category: 'Event Streaming & Messaging',
    starterQuestion: 'We have a Kafka cluster processing 45,000 order events per second across 12 partitions. During a network blip between availability zones, a consumer group enters a continuous rebalance storm, causing consumer lag to spike by 800% and stalling downstream order fulfillment. How do you diagnose the root cause, what consumer configuration properties do you tune, and how do you prevent rebalance storms without losing message delivery guarantees?',
    pocConcept: 'Build a distributed, idempotent Kafka consumer service with cooperative sticky rebalancing, exponential backoff retries, and a dead-letter queue (DLQ) for poisoned messages.',
    failureModes: [
      'Consumer Group Rebalance Storms (heartbeat timeout vs max.poll.interval.ms mismatch)',
      'Split-Brain & Partition Leader Epoch Divergence during unclean leader election',
      'Page Cache Disk I/O Saturation caused by consumers reading from disk instead of OS page cache',
      'Thundering Herds & Producer Buffer Exhaustion during broker disconnects',
      'Zombie Consumers & Out-of-Order Processing without transactional idempotence'
    ],
    alternatives: ['RabbitMQ (Push vs Pull, AMQP routing)', 'AWS SQS/SNS (Managed, simpler queue semantics)', 'Apache Pulsar (Segmented storage architecture)']
  },
  redis: {
    name: 'Redis',
    category: 'In-Memory Data Store & Caching',
    starterQuestion: 'Your application uses Redis as a write-through cache for user session data and rate limiting at 60,000 req/sec. Under sudden traffic surges, Redis memory hits maxmemory-policy limits and latency spikes from 1.2ms to 450ms. How do you determine whether the issue is memory fragmentation, single-threaded CPU starvation (e.g., O(N) commands like KEYS or HGETALL), or slow AOF fsync? Walk me through your mitigation.',
    pocConcept: 'Implement a high-throughput Sliding Window Counter Rate Limiter in Redis using atomic Lua scripts or Redis Transactions (MULTI/EXEC) to prevent race conditions.',
    failureModes: [
      'Cache Stampede / Thundering Herd when hot cache keys expire simultaneously',
      'Single-Threaded Event Loop Starvation caused by blocking commands (KEYS, SMEMBERS, slow Lua scripts)',
      'Memory Fragmentation & OOM Eviction cascades dropping critical session keys',
      'Replication Buffer Overflow during high-throughput full resynchronization',
      'Split-Brain Data Loss in Redis Sentinel/Cluster during network partitioning without WAIT'
    ],
    alternatives: ['Memcached (Multi-threaded simplicity, key-value only)', 'Dragonfly / KeyDB (Multi-threaded Redis drop-in)', 'Aerospike (SSD-optimized hybrid memory)']
  },
  kubernetes: {
    name: 'Kubernetes',
    category: 'Container Orchestration & Cloud Infrastructure',
    starterQuestion: 'During a rolling deployment of a mission-critical backend service handling live TCP traffic, 1.8% of incoming client requests receive HTTP 502 / Connection Refused errors for 30 seconds. The pods pass health checks. Why does this happen during pod termination, how do the iptables/IPVS proxy rules propagate, and how do you configure preStop lifecycle hooks and terminationGracePeriodSeconds to achieve true zero-downtime rolling updates?',
    pocConcept: 'Develop a custom Kubernetes Admission Webhook or Operator using Go / client-go that intercepts deployment manifests, validates resource limits, and enforces pod disruption budgets (PDB).',
    failureModes: [
      'Premature Traffic Drops during Pod Termination (race condition between kube-proxy endpoint removal and SIGTERM)',
      'CrashLoopBackOff cascading to Node-level Resource Starvation from missing memory limits',
      'DNS Resolution Bottlenecks in CoreDNS under high pod churn',
      'etcd Raft Consensus Latency Spikes causing cluster-wide scheduling freeze',
      'Subnet IP Exhaustion in CNI plugins during sudden Horizontal Pod Autoscaler (HPA) scale-out'
    ],
    alternatives: ['Docker Swarm (Simpler single-node or small cluster ops)', 'HashiCorp Nomad (Lightweight single-binary orchestration)', 'AWS ECS / Google Cloud Run (Managed serverless container runtimes)']
  },
  docker: {
    name: 'Docker',
    category: 'Containerization & Build Systems',
    starterQuestion: 'Your team\'s CI/CD pipeline builds a Go / Node.js backend Docker image that has bloated to 1.8GB and takes 6 minutes to transfer across container registries. How do you architect a multi-stage Docker build utilizing distroless/scratch base images, optimize Docker build cache layer ordering, and securely run container processes as non-root with drop-capabilities?',
    pocConcept: 'Design a hardened, multi-stage Dockerfile with non-root UID execution, read-only root filesystems, and minimal Alpine/distroless runtimes reducing image size below 30MB.',
    failureModes: [
      'Container Root Privilege Escalation breaching host kernel namespace',
      'Cache Invalidation Cascades caused by poorly ordered COPY statements in Dockerfiles',
      'Orphaned Zombie Processes (PID 1 problem) failing to reap child processes or forward signals',
      'Exhausted Host Disk Space from dangling volume layers and untagged image build caches',
      'Port Collisions & Host Network Bridge Latency overhead'
    ],
    alternatives: ['Podman (Daemonless, rootless containers)', 'Containerd / CRI-O (Lightweight runtime without Docker engine CLI)', 'Buildah / Kaniko (Daemonless image builders in K8s)']
  },
  raft: {
    name: 'Distributed Consensus (Raft / Paxos)',
    category: 'Distributed Systems & Consistency',
    starterQuestion: 'In a 5-node Raft consensus cluster, network partitions isolate 2 nodes from the other 3. The 3-node majority continues committing log entries. After 5 minutes, the network heals. Exactly how does the leader reconcile log terms with the partitioned nodes, what happens to uncommitted entries on the minority side, and how does Raft prevent split-brain leader elections?',
    pocConcept: 'Build a minimal in-memory Raft node in Go implementing randomized election timers, RequestVote RPCs, AppendEntries heartbeats, and leader election failover.',
    failureModes: [
      'Split-Brain Risk when quorum calculations are misconfigured without strict (N/2 + 1) majority',
      'Election Storms caused by synchronized election timers or network latency jitter',
      'Log Compaction & Snapshotting latency stalls freezing active consensus commits',
      'Stale Reads from partitioned former leaders without ReadIndex / lease read verification',
      'Unbounded Log Growth when slow followers fail to acknowledge log replications'
    ],
    alternatives: ['Multi-Paxos (Classic consensus, more complex log synchronization)', 'ZAB (ZooKeeper Atomic Broadcast protocol)', 'EPaxos (Egalitarian Paxos with decentralized leaders)']
  },
  graphql: {
    name: 'GraphQL',
    category: 'API Design & Web Platforms',
    starterQuestion: 'A client submits an arbitrarily nested GraphQL query requesting users -> posts -> comments -> author -> posts -> comments. This triggers a catastrophic database CPU spike and crashes your API server. How do you implement query complexity analysis, depth limiting, and how do you solve the classic N+1 database query problem using DataLoader batching?',
    pocConcept: 'Implement a production GraphQL server with DataLoader request-level batching, query depth limiter middleware, and persist-query allowlisting.',
    failureModes: [
      'The N+1 Query Problem multiplying database queries across relational field resolvers',
      'Denial-of-Service (DoS) via deeply recursive or cyclic graph query execution',
      'HTTP Caching Invalidation complexities compared to standard REST URI endpoints',
      'Over-fetching at the database level when resolvers fetch complete ORM models for partial fields',
      'Unbounded Pagination payloads exhausting server memory'
    ],
    alternatives: ['REST with JSON:API / Sparse Fieldsets', 'gRPC / Protocol Buffers (High-performance internal RPC)', 'tRPC (Type-safe RPC for TypeScript monorepos)']
  },
  go: {
    name: 'Golang / Systems Programming',
    category: 'Backend Languages & Concurrency',
    starterQuestion: 'In a high-throughput Go service processing 20,000 HTTP requests/second, you observe resident memory steadily climbing over 48 hours until the OS OOM killer terminates the process. Go\'s GC pauses remain low (<1ms). How do you use pprof to identify goroutine leaks, unclosed channel references, or unbounded slice allocations?',
    pocConcept: 'Build a worker pool in Go with bounded channel capacity, context-based cancellation, worker graceful shutdown, and pprof profiling endpoints.',
    failureModes: [
      'Goroutine Leaks caused by blocking on unbuffered channels with no active receiver or cancellation',
      'Data Races on shared memory without proper sync.Mutex or atomic operations',
      'Heap Escape & Excessive GC pressure from returning pointer references from hot loops',
      'Nil Channel Panics & Deadlocks in select statements without default fallback',
      'Subtle Loop Variable Capture bugs in concurrent closures'
    ],
    alternatives: ['Rust (Zero-cost abstractions, compile-time borrow checker)', 'Java / Kotlin (JVM ecosystem, mature enterprise tooling)', 'C++ (Maximum manual memory and hardware control)']
  },
  python: {
    name: 'Python',
    category: 'Backend & Data Engineering',
    starterQuestion: 'You are deploying a CPU-intensive data transformation service in Python using asyncio and FastAPI. Under load, API response times jump from 15ms to 12 seconds, and all concurrent requests freeze. Why did asyncio fail to provide concurrency here (Global Interpreter Lock & CPU-bound blocking of the event loop), and how do you architect a solution using ProcessPoolExecutor or Celery background workers?',
    pocConcept: 'Build a high-performance hybrid async Python service that offloads CPU-bound mathematical work to a ProcessPoolExecutor worker while keeping the asyncio event loop responsive.',
    failureModes: [
      'Event Loop Blocking in asyncio caused by synchronous I/O or CPU-bound loops',
      'Global Interpreter Lock (GIL) contention preventing multi-threaded CPU parallelization',
      'Memory Leaks from cyclic object references evading immediate reference counting',
      'Unpinned Dependencies & Dependency Hell across transitive package updates',
      'Silent Type Coercion & Runtime TypeErrors in unvalidated legacy codebases'
    ],
    alternatives: ['Go (Native lightweight goroutines, compiled speed)', 'TypeScript/Node.js (Single-threaded event loop, rich web ecosystem)', 'Rust (High performance with PyO3 native extensions)']
  }
};

/**
 * Normalizes a skill string to find close matches in the knowledge map
 */
function findDomainMatch(skillName = '') {
  const clean = skillName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, val] of Object.entries(DOMAIN_KNOWLEDGE_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      return val;
    }
  }
  return null;
}

/**
 * Generates tailored Socratic prompts across 3 distinct learning modes
 * for both Cloud Frontier LLMs (Claude/ChatGPT) and Local LLMs (Ollama/LM Studio).
 */
export function generateLearningPrompts({
  skillName,
  targetRole = 'Senior Software Engineer',
  currentSkills = [],
  category = 'Technical Systems'
}) {
  const domainInfo = findDomainMatch(skillName);
  const normalizedSkill = domainInfo ? domainInfo.name : skillName;
  const skillsListStr = currentSkills.length > 0 ? currentSkills.slice(0, 8).join(', ') : 'Backend Systems, Distributed APIs, Databases';
  const displayCategory = domainInfo?.category || category || 'Software Engineering';

  // --- MODE A: Socratic Mock Interviewer ---
  const socraticCloudPrompt = `You are a Principal Software Engineer and Technical Bar Raiser at a top-tier tech company.
I am preparing for an upcoming technical interview for the role of: "${targetRole}".
My existing engineering background includes: ${skillsListStr}.
The specific focus topic of this interview round is: "${normalizedSkill}".

YOUR STRICT SOCRATIC RULES:
1. Do NOT give me a lecture, summary, or textbook explanation.
2. Adopt a rigorous, realistic, but collaborative interviewer persona.
3. Start by asking me ONE concrete, high-stakes production scenario question involving "${normalizedSkill}" (e.g. data loss during network partition, consumer lag spikes, cascading timeout storms, or race conditions).
4. Do NOT include the solution in your question.
5. Wait for my response. After I answer, evaluate my response:
   - Identify architectural trade-offs I missed.
   - Probe failure modes (e.g., "What happens if that node crashes during step 2?").
   - Rate my answer from Junior, Mid, Senior, to Staff Level with honest critique.
   - Then proceed to the next follow-up question.

Begin the interview now by asking your first scenario question.`;

  const socraticLocalPrompt = `Act as a Principal Engineer interviewing me on "${normalizedSkill}" for a "${targetRole}" position. My background is: ${skillsListStr}.
Rules:
1. Ask me ONE hard production scenario question about "${normalizedSkill}" failure modes or architectural trade-offs.
2. Do NOT provide the answer or a summary.
3. Wait for my response before asking follow-ups.
Ask your first interview question now:`;

  // --- MODE B: Hands-On 2-Hour POC Lab ---
  const labCloudPrompt = `You are a Senior Staff Engineer mentor helping me bridge a critical technical gap in "${normalizedSkill}" for my role as a "${targetRole}".
My core tech stack: ${skillsListStr}.

I want to build a hands-on, production-grade Proof of Concept (POC) in under 2 hours.
DO NOT give me a trivial "Hello World" or generic tutorial. I want to build a miniature version of a real production service.

Please provide a structured 4-step engineering blueprint:
1. SYSTEM ARCHITECTURE & PROBLEM: Describe the specific real-world micro-system we are building (e.g. distributed rate limiter, idempotent event pipeline, leader election lease). Explain the concurrency and failure edge cases we must solve.
2. TEST HARNESS FIRST: Provide the unit test / integration test harness code FIRST so I can test my implementation.
3. CORE IMPLEMENTATION CODE: Provide the clean, well-commented implementation skeleton with explicit error handling, retries, and cancellation (no pseudo-code).
4. VERIFICATION & CHAOS TEST: Give me the exact commands to benchmark throughput, induce network latency or node failure, and verify the POC succeeds.

Start with Section 1 and Section 2 now so I can set up my test environment.`;

  const labLocalPrompt = `Design a 2-hour hands-on coding lab to build a production "${normalizedSkill}" POC for a "${targetRole}" role.
Existing stack: ${skillsListStr}.
Requirements:
1. Realistic problem statement (not a Hello World).
2. Step 1: Unit test harness code.
3. Step 2: Core implementation with error handling and edge cases.
4. Commands to verify and run it.
Keep the explanation focused on code and architectural decisions.`;

  // --- MODE C: Production Failure Modes & Scale Trade-offs ---
  const failureCloudPrompt = `I am preparing for a "${targetRole}" system design interview and need deep, battle-tested expertise in "${normalizedSkill}".
My background: ${skillsListStr}.

Skip basic syntax and introductory definitions. Focus 100% on high-scale reality:
1. THE TOP 5 CATASTROPHIC FAILURE MODES: What breaks when "${normalizedSkill}" scales to 50k+ req/sec or multi-terabyte data volumes? (e.g. split-brain, thundering herds, memory fragmentation, disk write stalls, cascading rebalances).
2. METRIC ALARMS & ROOT CAUSE: For each failure mode, what exact Prometheus / Datadog metrics spike first, and what architectural pattern resolves it?
3. ARCHITECTURAL TRADE-OFF MATRIX: Compare "${normalizedSkill}" against its top 2 industry alternatives with a clear breakdown of Latency vs Consistency vs Operational Overhead vs Cost.
4. THE "NEVER USE" CRITERIA: In what specific production scenarios should an engineering team NEVER choose "${normalizedSkill}"?

Deliver a dense, technical engineering brief.`;

  const failureLocalPrompt = `Analyze "${normalizedSkill}" for a "${targetRole}" role at 50,000 req/sec scale:
1. Top 3 catastrophic failure modes and the exact metric alerts that trigger them.
2. How to fix each failure mode architecturally.
3. Contrast "${normalizedSkill}" with 1 primary alternative.
4. One scenario where you should NEVER use "${normalizedSkill}".
Keep the response technical and concise.`;

  return {
    skillName: normalizedSkill,
    category: displayCategory,
    targetRole,
    domainInfo,
    modes: {
      socratic: {
        id: 'socratic',
        name: 'Socratic Mock Interviewer',
        tagline: 'Principal Engineer persona who grills you interactively on trade-offs without giving away answers',
        badge: 'Interview Defense',
        starterQuestion: domainInfo?.starterQuestion || `In a high-scale production deployment of ${normalizedSkill}, you encounter sudden latency degradation and partial service unavailability under peak load. How do you isolate whether the bottleneck is network I/O, resource contention, or architectural misconfiguration?`,
        prompts: {
          cloud: socraticCloudPrompt,
          local: socraticLocalPrompt
        }
      },
      lab: {
        id: 'lab',
        name: '2-Hour Hands-On POC Lab',
        tagline: 'Zero-fluff coding lab to build a production micro-prototype with unit tests and edge cases',
        badge: 'Hands-On POC',
        pocConcept: domainInfo?.pocConcept || `Build a working, testable micro-service demonstrating ${normalizedSkill} with robust error handling, concurrency control, and automated unit tests.`,
        prompts: {
          cloud: labCloudPrompt,
          local: labLocalPrompt
        }
      },
      failureModes: {
        id: 'failureModes',
        name: 'Production Failure Modes & Scale',
        tagline: 'Skip basic syntax. Focus 100% on what breaks at 50k req/sec, metric alarms, and vs alternatives',
        badge: 'Architecture & Scale',
        highlights: domainInfo?.failureModes || [
          `Cascading latency degradation under sudden traffic surges`,
          `Data inconsistency or state drift during network partitions`,
          `Unbounded resource consumption (OOM / thread starvation)`,
          `Connection exhaustion between service clients and cluster nodes`
        ],
        alternatives: domainInfo?.alternatives || ['Industry standard alternatives based on your primary language and cloud provider'],
        prompts: {
          cloud: failureCloudPrompt,
          local: failureLocalPrompt
        }
      }
    }
  };
}

/**
 * Runs an in-app Socratic learning interaction via the active configured LLM
 * or returns a structured offline brief if AI is unconfigured.
 */
export async function runInAppLearningSession({
  prompt,
  systemInstruction = 'You are a Principal Software Engineer and Bar Raiser mentor conducting a technical deep-dive session. Be concise, direct, and rigorous.',
  aiConfig
}) {
  try {
    const responseText = await generateLlmCompletion({
      prompt,
      systemInstruction,
      aiConfig
    });
    return {
      success: true,
      text: responseText,
      source: aiConfig?.provider === 'gemini' ? (aiConfig.geminiModel || 'Gemini 3.8 Flash') : (aiConfig?.ollamaModel || 'Local LLM')
    };
  } catch (err) {
    console.warn('AI execution in learning session failed, falling back to heuristic guidance:', err);
    throw err;
  }
}

/**
 * Generates an instant heuristic Socratic Starter Brief for offline / unconfigured use
 */
export function getOfflineSocraticBrief(skillName, mode = 'socratic') {
  const domain = findDomainMatch(skillName);
  const name = domain ? domain.name : skillName;

  if (mode === 'socratic') {
    return {
      title: `Interview Defense: ${name}`,
      question: domain?.starterQuestion || `Explain the core concurrency model and failure boundaries of ${name}. What happens when a cluster node dies during an in-flight operation?`,
      tips: [
        'Frame your answer using the STAR method (Situation, Task, Action, Result).',
        'Explicitly mention telemetry metrics you would inspect (e.g. p99 latency, CPU throttling, error rates).',
        'Discuss failure recovery: how does the system recover without human intervention?'
      ]
    };
  }

  if (mode === 'lab') {
    return {
      title: `Hands-On POC Lab: ${name}`,
      concept: domain?.pocConcept || `Build a lightweight, standalone prototype demonstrating ${name} integration with unit tests.`,
      recommendedSteps: [
        '1. Set up a minimal repo with Docker Compose or local test containers.',
        '2. Write a failing integration test validating positive and negative flows.',
        '3. Implement client connection pooling and graceful shutdown.',
        '4. Benchmark throughput with a simple load generator.'
      ]
    };
  }

  return {
    title: `Scale & Failure Modes: ${name}`,
    failureModes: domain?.failureModes || [
      'Connection pool exhaustion under sustained concurrency',
      'Unbounded queue memory growth during downstream backpressure',
      'Split-brain state during network partitions'
    ],
    alternatives: domain?.alternatives || ['Evaluate managed cloud options vs self-hosted clusters.']
  };
}
