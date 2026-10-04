import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  fetchTechNews, 
  analyzeMarketReadiness, 
  ENGINEERING_TRACKS, 
  detectEngineeringTrack 
} from '../../services/marketService';
import { generateCustomProjectBlueprint } from '../../services/llmService';
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
  Clock,
  Target,
  Layers,
  Zap,
  Check,
  X,
  Crosshair,
  Wand2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function MarketRadarTab() {
  const { 
    profile, 
    addJournalEntry, 
    setActiveTab, 
    showToast,
    targetJobDescription,
    atsScoreResult,
    resumeData,
    aiConfig,
    addSkillToResume
  } = useApp();

  const [activeTopic, setActiveTopic] = useState('trending');
  const [activeSource, setActiveSource] = useState('all'); // 'all' | 'hn' | 'devto'
  const [newsStories, setNewsStories] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  // Multi-Track & Target Overlay State
  const [selectedTrackId, setSelectedTrackId] = useState(() => detectEngineeringTrack(profile.targetRole || ''));
  const [useAtsOverlay, setUseAtsOverlay] = useState(true);

  // AI Custom Blueprint Modal State
  const [isGeneratingAiBlueprint, setIsGeneratingAiBlueprint] = useState(false);
  const [generatingSkillName, setGeneratingSkillName] = useState(null);
  const [customBlueprintModal, setCustomBlueprintModal] = useState(null);

  // Market gap analysis based on user's current profile, track, and active ATS overlay
  const marketAnalysis = analyzeMarketReadiness(profile, {
    activeTrackId: selectedTrackId,
    targetJobDescription: useAtsOverlay ? targetJobDescription : null,
    atsScoreResult: useAtsOverlay ? atsScoreResult : null,
    resumeData
  });

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

  // Dispatch a portfolio project as an active milestone in Dev Journal
  const handleStartProjectInJournal = (proj) => {
    const bridgedGaps = proj.bridgedGaps || proj.targetSkills || [];
    const newEntry = {
      id: `journal-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      category: 'Personal Project',
      title: `Project Milestone: ${proj.title}`,
      summary: proj.objective,
      techStack: proj.stack,
      impact: `Targeting: ${proj.keyMetricsToTarget}`,
      rawNotes: `Project Blueprint:\n- Objective: ${proj.objective}\n- Stack: ${proj.stack.join(', ')}\n- Success Metrics: ${proj.keyMetricsToTarget}\n\nMilestones & Deliverables:\n${(proj.starterMilestones || []).map((m, i) => `${i + 1}. ${m}`).join('\n')}`,
      isMilestone: true,
      milestoneStatus: 'in_progress',
      targetSkillGaps: bridgedGaps,
      targetMetrics: proj.keyMetricsToTarget,
      bullets: [
        proj.objective,
        `Engineered ${proj.title} using ${proj.stack.slice(0, 3).join(', ')}, achieving ${proj.keyMetricsToTarget}.`
      ]
    };

    addJournalEntry(newEntry);
    setActiveTab('devJournal');
    showToast(`Added "${proj.title}" as an active milestone in your Dev Journal!`, 'success');
  };

  // Generate a tailored AI project blueprint for a specific missing skill
  const handleGenerateAiBlueprintForSkill = async (skillName) => {
    setIsGeneratingAiBlueprint(true);
    setGeneratingSkillName(skillName);
    try {
      const blueprint = await generateCustomProjectBlueprint({
        skillGap: skillName,
        targetRole: marketAnalysis.targetJobTitle || profile.targetRole || 'Senior Software Engineer',
        currentSkills: (profile.coreSkills || []),
        aiConfig
      });
      setCustomBlueprintModal(blueprint);
    } catch (err) {
      console.error('Failed to generate AI blueprint:', err);
      showToast('Could not generate AI blueprint. Please try again.', 'error');
    } finally {
      setIsGeneratingAiBlueprint(false);
      setGeneratingSkillName(null);
    }
  };

  const hasAtsTarget = Boolean(targetJobDescription && atsScoreResult);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)',
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
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.15)'
          }}>
            <Radar className="w-7 h-7" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Tech Market Radar
              </h1>
              <span className="badge badge-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Crosshair className="w-3 h-3" />
                Live Career Signals
              </span>
              {hasAtsTarget && useAtsOverlay && (
                <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Target className="w-3 h-3 text-purple-400" />
                  Target Job Overlay
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px', margin: '4px 0 0 0' }}>
              Benchmarking <strong style={{ color: '#f8fafc' }}>{marketAnalysis.targetJobTitle || profile.targetRole}</strong> against live tech demand and active hiring thresholds
            </p>
          </div>
        </div>

        {/* Readiness Index Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: 'rgba(9, 13, 22, 0.7)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
        }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Market Match Index
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: marketAnalysis.readinessScore >= 80 ? '#34d399' : '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              {marketAnalysis.readinessScore}%
            </div>
          </div>
          <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp className={`w-8 h-8 ${marketAnalysis.readinessScore >= 80 ? 'text-emerald-400' : 'text-sky-400'}`} />
          </div>
        </div>
      </div>

      {/* Engineering Track Switcher & Active ATS Overlay Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '14px 18px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Track Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Track:</span>
          </span>
          {ENGINEERING_TRACKS.map(track => {
            const isSelected = selectedTrackId === track.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => setSelectedTrackId(track.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                  color: isSelected ? '#38bdf8' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {track.label}
              </button>
            );
          })}
        </div>

        {/* ATS Target Job Overlay Toggle */}
        {hasAtsTarget ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setUseAtsOverlay(!useAtsOverlay)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '8px',
                background: useAtsOverlay ? 'rgba(168, 85, 247, 0.15)' : 'rgba(30, 41, 59, 0.4)',
                border: useAtsOverlay ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid var(--border-subtle)',
                color: useAtsOverlay ? '#c084fc' : 'var(--text-muted)',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Toggle target job deficit overlay from ATS Calculator"
            >
              <Target className="w-3.5 h-3.5" />
              <span>
                {useAtsOverlay ? 'Target JD Overlay: Active' : 'Target JD Overlay: Off'}
              </span>
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              ({atsScoreResult.totalScore}% ATS Match)
            </span>
          </div>
        ) : (
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target className="w-3.5 h-3.5 text-slate-500" />
            <span>Paste a Job Description in ATS Scorer to overlay specific hiring gaps</span>
          </div>
        )}
      </div>

      {/* Main Grid: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* Left Column: Skill Gaps & Hands-on Projects */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Skill Gap & Demand Analysis */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp className="w-5 h-5 text-sky-400" />
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                  Skill Gap &amp; Market Alignment
                </h2>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {marketAnalysis.trackConfig.label} Track
              </span>
            </div>

            {/* Missing High-Value Skills */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <AlertTriangle className="w-4 h-4" />
                <span>Critical Skills to Bridge</span>
                {marketAnalysis.missingSkills.length > 0 && (
                  <span className="badge badge-amber" style={{ fontSize: '10px', marginLeft: '4px' }}>
                    {marketAnalysis.missingSkills.length} identified
                  </span>
                )}
              </div>

              {marketAnalysis.missingSkills.length === 0 ? (
                <div style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(52, 211, 153, 0.08)',
                  border: '1px solid rgba(52, 211, 153, 0.25)',
                  color: '#34d399',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Outstanding! All benchmark skills for this track are verified in your profile.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {marketAnalysis.missingSkills.slice(0, 5).map(skill => (
                    <div key={skill.name} style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(251, 191, 36, 0.06)',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#fef3c7' }}>{skill.name}</span>
                          <span className={skill.weight === 'Critical' ? 'badge badge-purple' : 'badge badge-amber'} style={{ fontSize: '9.5px', padding: '1px 6px' }}>
                            {skill.weight}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{skill.reason}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => addSkillToResume(skill.name, skill.category || 'Technical Skills')}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            color: '#38bdf8',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          title="Already have experience with this? Add it directly to your resume skills"
                        >
                          + Add
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerateAiBlueprintForSkill(skill.name)}
                          disabled={isGeneratingAiBlueprint && generatingSkillName === skill.name}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'rgba(168, 85, 247, 0.15)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            color: '#c084fc',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Generate a custom AI engineering blueprint to bridge this gap"
                        >
                          {isGeneratingAiBlueprint && generatingSkillName === skill.name ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Wand2 className="w-3 h-3" />
                          )}
                          <span>AI Blueprint</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Matched Strong Skills */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified Strengths in Your Profile</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {marketAnalysis.matchedSkills.map(skill => (
                  <span key={skill.name} className="badge badge-emerald" style={{ padding: '4px 10px', fontSize: '11px' }}>
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Recommended Hands-On Portfolio Projects (Targeted to Gaps) */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code2 className="w-5 h-5 text-emerald-400" />
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                  Gap-Closing Portfolio Projects
                </h2>
              </div>
              <span style={{ fontSize: '11.5px', color: '#38bdf8' }}>
                1-Click Dev Journal Milestones
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {marketAnalysis.recommendedProjects.map((proj) => (
                <div key={proj.id || proj.title} style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'border-color 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: '#38bdf8', margin: 0 }}>
                        {proj.title}
                      </h3>
                      {proj.bridgedGaps && proj.bridgedGaps.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                          <span style={{ fontSize: '10.5px', color: '#c084fc', fontWeight: 600 }}>
                            🎯 Bridges Gaps:
                          </span>
                          <span style={{ fontSize: '10.5px', color: '#e9d5ff' }}>
                            {proj.bridgedGaps.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                      {proj.difficulty}
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '2px 0 0 0' }}>
                    {proj.objective}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0' }}>
                    {proj.stack.map(st => (
                      <span key={st} style={{
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: 'rgba(51, 65, 85, 0.45)',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)'
                      }}>
                        {st}
                      </span>
                    ))}
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginTop: '4px', 
                    paddingTop: '8px', 
                    borderTop: '1px solid var(--border-subtle)' 
                  }}>
                    <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 500 }}>
                      ⚡ {proj.keyMetricsToTarget}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartProjectInJournal(proj)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        color: '#38bdf8',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Add blueprint as a tracking milestone into your Dev Journal"
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
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                Targeted Job Market Opportunities
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', margin: '0 0 14px 0' }}>
              One-click pre-filtered queries for verified openings matching <strong style={{ color: '#f8fafc' }}>{marketAnalysis.targetJobTitle || profile.targetRole}</strong>:
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
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
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

            {/* News Stories List */}
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
                    Retry Feeds
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
                      background: 'rgba(15, 23, 42, 0.55)',
                      border: '1px solid var(--border-subtle)',
                      textDecoration: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'border-color 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: story.sourceColor, textTransform: 'uppercase' }}>
                        {story.source}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        {story.timeAgo}
                      </span>
                    </div>

                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#f8fafc', lineHeight: 1.35 }}>
                      {story.title}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <span>▲ {story.points} points</span>
                      <span>💬 {story.commentsCount} comments</span>
                      <span style={{ marginLeft: 'auto', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        Read <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* AI Custom Project Blueprint Modal */}
      {customBlueprintModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#090d16',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '26px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 0 40px rgba(168, 85, 247, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(168, 85, 247, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#c084fc'
                }}>
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    AI-Synthesized Project Blueprint
                  </h3>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {customBlueprintModal.modelUsed || 'DevSignal Neural Engine'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomBlueprintModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8' }}>
                  {customBlueprintModal.title}
                </div>
                <span className="badge badge-purple" style={{ fontSize: '10.5px' }}>
                  {customBlueprintModal.difficulty}
                </span>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                {customBlueprintModal.objective}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {(customBlueprintModal.stack || []).map(st => (
                  <span key={st} style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(51, 65, 85, 0.5)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: '#e2e8f0'
                  }}>
                    {st}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 600 }}>
                🎯 Target Metrics: {customBlueprintModal.keyMetricsToTarget}
              </div>

              {customBlueprintModal.starterMilestones && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Execution Milestones:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {customBlueprintModal.starterMilestones.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {customBlueprintModal.interviewTalkingPoints && (
                <div style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  fontSize: '11.5px',
                  color: '#93c5fd'
                }}>
                  <strong>Interview Talking Point:</strong> {customBlueprintModal.interviewTalkingPoints}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCustomBlueprintModal(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  handleStartProjectInJournal(customBlueprintModal);
                  setCustomBlueprintModal(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                  color: '#090d16',
                  fontWeight: 700,
                  fontSize: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(56, 189, 248, 0.3)'
                }}
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>Start Milestone in Dev Journal</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
