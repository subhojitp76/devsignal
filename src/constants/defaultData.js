/**
 * Initial Default Data for Software Engineer Profile, Resume, and Dev Journal
 */

export const DEFAULT_PROFILE = {
  fullName: 'Subhadeep Das',
  currentTitle: 'Senior Backend Engineer',
  targetRole: 'Staff / Senior Backend Engineer (Distributed Systems)',
  yearsOfExperience: '5+ years',
  email: 'subhadeep.dev@example.com',
  phone: '+1 (555) 234-5678',
  location: 'San Francisco, CA / Remote',
  github: 'https://github.com/example-backend',
  linkedin: 'https://linkedin.com/in/example-swe',
  portfolio: 'https://subhadeep.engineer',
  summary: 'Backend Engineer with 5+ years specializing in high-throughput distributed systems, event-driven microservices, and high-performance APIs. Experienced in Go, Java/Kotlin, Rust, Kafka, Redis, and cloud-native Kubernetes architectures.',
  coreSkills: [
    'Go (Golang)', 'Distributed Systems', 'Kafka', 'Redis', 'PostgreSQL', 
    'Kubernetes', 'gRPC', 'Docker', 'AWS', 'Microservices', 'System Architecture', 'CI/CD'
  ],
  interests: ['Event Sourcing', 'eBPF', 'High-Frequency Messaging', 'Database Internals']
};

export const DEFAULT_RESUME = {
  personalInfo: {
    fullName: 'Subhadeep Das',
    title: 'Senior Backend Engineer | Distributed Systems',
    email: 'subhadeep.dev@example.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA / Remote',
    github: 'example-backend',
    linkedin: 'example-swe',
    portfolio: 'subhadeep.engineer'
  },
  summary: 'High-performance Backend Engineer with 5+ years of experience designing and scaling fault-tolerant microservices handling 50k+ req/sec. Proven track record in optimizing database queries, eliminating latency bottlenecks, and architecting event-driven pipelines using Go, Kafka, Redis, and Kubernetes.',
  experience: [
    {
      id: 'exp-1',
      role: 'Senior Backend Engineer',
      company: 'Apex Cloud Systems',
      location: 'San Francisco, CA',
      startDate: '2023-03',
      endDate: 'Present',
      current: true,
      bullets: [
        'Architected an asynchronous event-streaming pipeline in Go and Apache Kafka, scaling event throughput by 400% to process over 85M events daily with zero data loss.',
        'Refactored centralized PostgreSQL database bottleneck by implementing Redis distributed cache cluster with read-through and cache-invalidation strategies, reducing p99 API latency from 420ms to 48ms.',
        'Engineered resilient gRPC microservices with circuit breaking, retries, and rate limiting via Envoy proxy, boosting overall cluster availability to 99.995%.',
        'Spearheaded automated CI/CD deployment pipelines on Kubernetes using Helm and ArgoCD, reducing service release cycle time from 3 days to under 20 minutes.'
      ]
    },
    {
      id: 'exp-2',
      role: 'Backend Software Engineer',
      company: 'DataStream Technologies',
      location: 'Austin, TX',
      startDate: '2021-01',
      endDate: '2023-02',
      current: false,
      bullets: [
        'Built core ingestion REST APIs handling 18k req/sec using Go, Gin, and PostgreSQL with connection pooling and optimized multi-column indexing.',
        'Designed database partitioning and vacuuming automation for high-write tables containing 200M+ rows, slashing complex analytical query execution time by 62%.',
        'Implemented distributed tracing and telemetry using OpenTelemetry and Prometheus, reducing Mean Time to Detection (MTTD) for microservice incidents by 55%.'
      ]
    }
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'DistriQueue — High-Throughput Distributed Task Queue',
      techStack: 'Go, Raft Consensus, gRPC, BadgerDB',
      link: 'github.com/example-backend/distriqueue',
      bullets: [
        'Built a decentralized, durable task broker in Go utilizing the Raft consensus protocol to achieve leader election and distributed state replication without single points of failure.',
        'Achieved sub-5ms commit latency with zero message loss during node failure simulations, handling up to 35,000 enqueued jobs per second on commodity hardware.'
      ]
    },
    {
      id: 'proj-2',
      name: 'FluxCache — Multi-Tier In-Memory Key-Value Store',
      techStack: 'Rust, Tokio, RESP Protocol, Lock-Free Concurrency',
      link: 'github.com/example-backend/fluxcache',
      bullets: [
        'Developed a Redis-compatible in-memory caching engine in Rust with lock-free skip-lists and zero-copy RESP parser, decreasing memory footprint by 28% compared to standard Redis instances.'
      ]
    }
  ],
  skillCategories: [
    {
      id: 'skills-languages',
      category: 'Languages & Core',
      skills: ['Go (Golang)', 'Rust', 'Java', 'SQL', 'TypeScript', 'Bash']
    },
    {
      id: 'skills-distributed',
      category: 'Distributed & Systems',
      skills: ['Apache Kafka', 'Redis', 'gRPC / Protobuf', 'RabbitMQ', 'WebSockets', 'GraphQL']
    },
    {
      id: 'skills-database',
      category: 'Databases & Storage',
      skills: ['PostgreSQL', 'MySQL', 'MongoDB', 'Cassandra', 'DynamoDB', 'Elasticsearch']
    },
    {
      id: 'skills-infra',
      category: 'Cloud & Infrastructure',
      skills: ['Docker', 'Kubernetes', 'AWS (ECS, S3, RDS, Lambda)', 'Terraform', 'Prometheus', 'Grafana', 'Git']
    }
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'B.S. in Computer Science',
      institution: 'State University of Technology',
      location: 'Austin, TX',
      startDate: '2016-08',
      endDate: '2020-05',
      gpa: '3.8 / 4.0',
      highlights: 'Focus on Operating Systems, Database Management, and Distributed Algorithms.'
    }
  ],
  certifications: [
    {
      id: 'cert-1',
      title: 'AWS Certified Solutions Architect – Associate',
      issuer: 'Amazon Web Services',
      date: '2023'
    },
    {
      id: 'cert-2',
      title: 'Certified Kubernetes Application Developer (CKAD)',
      issuer: 'Cloud Native Computing Foundation (CNCF)',
      date: '2024'
    }
  ],
  bottomLayout: 'grid',
  certificationsTitle: '',
  sectionOrder: ['summary', 'skills', 'experience', 'projects', 'education', 'certifications']
};

export const DEFAULT_SECTION_ORDER = [
  'summary',
  'skills',
  'experience',
  'projects',
  'education',
  'certifications'
];

export const SECTION_ORDER_PRESETS = [
  {
    id: 'default',
    label: 'Standard SWE',
    subtitle: 'Summary → Skills → Exp → Projects',
    order: ['summary', 'skills', 'experience', 'projects', 'education', 'certifications']
  },
  {
    id: 'projects_first',
    label: 'Projects First',
    subtitle: 'Summary → Skills → Projects → Exp',
    order: ['summary', 'skills', 'projects', 'experience', 'education', 'certifications']
  },
  {
    id: 'experience_first',
    label: 'Traditional ATS',
    subtitle: 'Summary → Exp → Skills → Projects',
    order: ['summary', 'experience', 'skills', 'projects', 'education', 'certifications']
  },
  {
    id: 'skills_projects_lead',
    label: 'Skills & Projects Lead',
    subtitle: 'Skills → Projects → Exp → Summary',
    order: ['skills', 'projects', 'experience', 'summary', 'education', 'certifications']
  },
  {
    id: 'academic',
    label: 'Academic / New Grad',
    subtitle: 'Summary → Edu → Skills → Projects → Exp',
    order: ['summary', 'education', 'skills', 'projects', 'experience', 'certifications']
  }
];

export const DEFAULT_JOURNAL_ENTRIES = [
  {
    id: 'journal-1',
    date: '2026-10-01',
    category: 'Optimization',
    title: 'Migrated Payment Callback Webhook to Go Worker Pool',
    summary: 'Replaced synchronous webhook handler with a bounded worker pool in Go using buffered channels and backpressure controls.',
    techStack: ['Go', 'Concurrency', 'Channels', 'Redis'],
    impact: 'P99 response dropped from 850ms to 42ms; dropped 0 packets during peak traffic spikes.',
    rawNotes: 'Identified goroutine leak in webhook ingress. Replaced unbounded goroutine spawner with sync.Pool and worker pool with 64 workers.'
  },
  {
    id: 'journal-2',
    date: '2026-09-28',
    category: 'Architecture',
    title: 'Kafka Consumer Group Rebalance Mitigation',
    summary: 'Tuned max.poll.interval.ms and implemented heartbeat background thread to prevent frequent rebalancing storms during slow downstream batch syncs.',
    techStack: ['Apache Kafka', 'Go', 'Distributed Systems'],
    impact: 'Reduced rebalance frequency from 14/day to 0/day, eliminating 18 minutes of daily consumer downtime.',
    rawNotes: 'Investigated consumer lag alerts on orders-processed topic. Processing took 8s during batch writes, triggering Kafka coordinator to rebalance.'
  },
  {
    id: 'journal-3',
    date: '2026-09-22',
    category: 'Feature',
    title: 'Distributed Distributed Idempotency Layer',
    summary: 'Built a 2-phase idempotency filter using Redis SETNX with lease expiration and SHA256 payload hashing for financial transfer APIs.',
    techStack: ['Redis', 'Go', 'Distributed Locking', 'PostgreSQL'],
    impact: 'Completely eliminated duplicate charges across retry storms.',
    rawNotes: 'Added Redis mutex and hash verification before routing transaction to database.'
  }
];

export const ACTIVE_GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Latest Stable — Coding & SWE)', badge: 'Recommended' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (Stable — Multi-step Execution)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Stable — High Speed & Balanced)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Advanced Problem Solving)' }
];

export const DEFAULT_AI_CONFIG = {
  provider: 'gemini', // 'gemini' | 'ollama'
  geminiApiKey: '',
  geminiModel: 'gemini-3.8-flash',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'deepseek-coder:6.7b',
  timeoutSeconds: 30
};

