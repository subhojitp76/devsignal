import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { fetchTechNews, analyzeMarketReadiness } from '../../services/marketService';
import { 
  Radar, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  Briefcase, 
  Code2, 
  BookOpen, 
  RefreshCw,
  TrendingUp,
  BookmarkPlus,
  Clock
} from 'lucide-react';

export default function MarketRadarTab() {
  const { profile, addJournalEntry, setActiveTab, showToast } = useApp();

  const [activeTopic, setActiveTopic] = useState('trending');
  const [activeSource, setActiveSource] = useState('all'); // 'all' | 'hn' | 'devto'
  const [newsStories, setNewsStories] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  // Market gap analysis based on user's current profile
  const marketAnalysis = analyzeMarketReadiness(profile);

  const loadNews = async (topic = activeTopic, source = activeSource) => {
    setIsLoadingNews(true);
    try {
      const stories = await fetchTechNews(topic, source);
      setNewsStories(stories);
    } catch (e) {
      console.error('Failed to load tech news:', e);
    } finally {
      setIsLoadingNews(false);
    }
  };

  useEffect(() => {
    loadNews(activeTopic, activeSource);
  }, [activeTopic, activeSource]);

  const handleStartProjectInJournal = (proj) => {
    const newEntry = {
      id: `journal-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      category: 'Feature',
      title: `Started Project: ${proj.title}`,
      summary: proj.objective,
      techStack: proj.stack,
      impact: `Targeting: ${proj.keyMetricsToTarget}`,
      rawNotes: `Project Blueprint:\n- Objective: ${proj.objective}\n- Stack: ${proj.stack.join(', ')}\n- Success Metrics: ${proj.keyMetricsToTarget}`
    };
    addJournalEntry(newEntry);
    setActiveTab('devJournal');
    showToast(`Added "${proj.title}" blueprint to your Dev Journal!`, 'success');
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <Radar className="w-7 h-7" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc' }}>
                Tech Market Radar
              </h1>
              <span className="badge badge-cyan">Live Intelligence</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
              Tailored career radar for <strong style={{ color: '#f8fafc' }}>{profile.targetRole || 'Senior Backend Engineer'}</strong> based on your verified skills
            </p>
          </div>
        </div>

        {/* Readiness Metric Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: 'rgba(9, 13, 22, 0.6)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 20px'
        }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Market Match Index
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              {marketAnalysis.readinessScore}%
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp className="w-8 h-8 text-sky-400" />
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* Left Column: Skill Gaps & Hands-on Projects */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Skill Gap & Demand Analysis */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp className="w-5 h-5 text-sky-400" />
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                  Industry Skill Gap Analysis
                </h2>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Target: {profile.targetRole}
              </span>
            </div>

            {/* Missing High-Value Skills */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <AlertTriangle className="w-4 h-4" />
                <span>Recommended Skills to Master Next</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {marketAnalysis.missingSkills.slice(0, 4).map(skill => (
                  <div key={skill.name} style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#fef3c7' }}>{skill.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{skill.reason}</div>
                    </div>
                    <span className="badge badge-amber" style={{ fontSize: '10px' }}>{skill.weight} Demand</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Matched Strong Skills */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified Strengths in Your Profile</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {marketAnalysis.matchedSkills.map(skill => (
                  <span key={skill.name} className="badge badge-emerald" style={{ padding: '4px 10px' }}>
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Recommended Hands-On Portfolio Projects */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Code2 className="w-5 h-5 text-emerald-400" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                Hands-on Projects to Build for Experience
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {marketAnalysis.recommendedProjects.map((proj, idx) => (
                <div key={idx} style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#38bdf8' }}>
                      {proj.title}
                    </h3>
                    <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                      {proj.difficulty}
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {proj.objective}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0' }}>
                    {proj.stack.map(st => (
                      <span key={st} style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(51, 65, 85, 0.4)',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)'
                      }}>
                        {st}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '11px', color: '#34d399' }}>
                      🎯 {proj.keyMetricsToTarget}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartProjectInJournal(proj)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>Start in Dev Journal</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Live Tech News & Job Search Strategist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '0', minHeight: '100%' }}>
          
          {/* Card 3: Targeted Job Search Strategist */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Briefcase className="w-5 h-5 text-sky-400" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                Targeted Job Market Opportunities
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              One-click pre-filtered search queries for roles matching your exact profile ({profile.targetRole || 'Backend Engineer'}):
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {marketAnalysis.jobLinks.map(job => (
                <a
                  key={job.platform}
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'border-color var(--transition-fast)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = job.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-medium)'}
                >
                  <span>{job.platform}</span>
                  <ExternalLink className="w-3.5 h-3.5" style={{ color: job.color }} />
                </a>
              ))}
            </div>
          </div>

          {/* Card 4: Live Tech Feed (Hacker News & Dev.to) */}
          <div className="glass-panel" style={{ padding: '22px', flex: 1, minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame className="w-5 h-5 text-rose-400" />
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                  Live Tech News &amp; Discussions
                </h2>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '1.5px 8px',
                  borderRadius: '12px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
                  Real-Time
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Source Filter (All / HN / Dev.to) */}
                <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'hn', label: 'HN' },
                    { id: 'devto', label: 'Dev.to' }
                  ].map(src => (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => setActiveSource(src.id)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        background: activeSource === src.id ? 'var(--accent-primary)' : 'transparent',
                        color: activeSource === src.id ? '#090d16' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => loadNews(activeTopic, activeSource)}
                  disabled={isLoadingNews}
                  style={{ color: 'var(--text-muted)', padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  title="Refresh live news feed"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingNews ? 'animate-spin text-sky-400' : 'hover:text-sky-400'}`} />
                </button>
              </div>
            </div>

            {/* Topic Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[
                { id: 'trending', label: '🔥 Top Trending' },
                { id: 'backend', label: '⚡ Backend & APIs' },
                { id: 'distributed', label: '🌐 Distributed & DBs' },
                { id: 'cloud', label: '☁️ Cloud & K8s' },
                { id: 'ai', label: '🤖 AI & LLMs' }
              ].map(topic => (
                <button
                  key={topic.id}
                  onClick={() => setActiveTopic(topic.id)}
                  style={{
                    padding: '4px 11px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    background: activeTopic === topic.id ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.6)',
                    color: activeTopic === topic.id ? '#090d16' : 'var(--text-secondary)',
                    border: activeTopic === topic.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {topic.label}
                </button>
              ))}
            </div>

            {/* News Stories List - Expands to fill full card height */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px', 
              overflowY: 'auto', 
              flex: 1, 
              minHeight: '0', 
              paddingRight: '6px',
              scrollbarGutter: 'stable',
              scrollbarWidth: 'thin'
            }}>
              {isLoadingNews ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <RefreshCw className="w-6 h-6 animate-spin" style={{ margin: '0 auto 8px', color: '#38bdf8' }} />
                  Fetching live stories from Hacker News &amp; Dev.to...
                </div>
              ) : newsStories.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '36px 20px',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(15, 23, 42, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--border-subtle)'
                }}>
                  <p>No active stories found for this filter right now.</p>
                  <button
                    type="button"
                    onClick={() => loadNews(activeTopic, activeSource)}
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reload Stories</span>
                  </button>
                </div>
              ) : (
                newsStories.map(story => (
                  <a
                    key={story.id}
                    href={story.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '7px',
                      textDecoration: 'none',
                      transition: 'all var(--transition-fast)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                      e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.background = 'rgba(15, 23, 42, 0.4)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#f8fafc', lineHeight: 1.4 }}>
                        {story.title}
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" style={{ marginTop: '2px' }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {/* Source Badge */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: story.source === 'Hacker News' ? '#fb923c' : '#38bdf8',
                        background: story.source === 'Hacker News' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        border: `1px solid ${story.source === 'Hacker News' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                      }}>
                        {story.source}
                      </span>

                      {/* Relative Timestamp */}
                      {story.timeAgo && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#94a3b8', fontWeight: 500 }}>
                          <Clock className="w-3 h-3 text-slate-400" />
                          {story.timeAgo}
                        </span>
                      )}

                      {/* Upvotes / Points */}
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>▲ {story.points}</span>

                      {/* Comments */}
                      {story.commentsCount !== undefined && (
                        <span>💬 {story.commentsCount} comments</span>
                      )}

                      {/* Author */}
                      {story.author && (
                        <span style={{ color: '#64748b' }}>by {story.author}</span>
                      )}
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
