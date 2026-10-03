import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateAtsScore, SAMPLE_JOB_DESCRIPTIONS } from '../../utils/atsUtils';
import confetti from 'canvas-confetti';
import {
  Target,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
  BookOpen,
  ArrowUpRight,
  HelpCircle,
  BarChart3,
  Layers
} from 'lucide-react';

export default function AtsScoreModal({ isOpen, onClose }) {
  const {
    resumeData,
    targetJobDescription,
    updateTargetJobDescription,
    atsScoreResult,
    updateAtsScoreResult,
    addSkillToResume,
    showToast,
    saveResumeSnapshot
  } = useApp();

  const [jobDescriptionInput, setJobDescriptionInput] = useState(targetJobDescription || '');
  const [targetTitleInput, setTargetTitleInput] = useState(resumeData?.personalInfo?.title || '');
  const [isAuditing, setIsAuditing] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations'); // 'recommendations' | 'breakdown' | 'checklist' | 'matched'
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [activeSampleId, setActiveSampleId] = useState(null);

  // Sync initial input from context when opened
  useEffect(() => {
    if (isOpen) {
      if (targetJobDescription && !jobDescriptionInput) {
        setJobDescriptionInput(targetJobDescription);
      }
      if (resumeData?.personalInfo?.title && !targetTitleInput) {
        setTargetTitleInput(resumeData.personalInfo.title);
      }
    }
  }, [isOpen, targetJobDescription, resumeData]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Trigger ATS Calculation
  const handleCalculateScore = (customJd = null, customTitle = null) => {
    const jdToUse = customJd !== null ? customJd : jobDescriptionInput;
    const titleToUse = customTitle !== null ? customTitle : targetTitleInput;

    if (!jdToUse.trim()) {
      showToast('Please paste a Job Description to evaluate ATS compatibility.', 'info');
      return;
    }

    setIsAuditing(true);

    // Save target JD to context
    updateTargetJobDescription(jdToUse);

    setTimeout(() => {
      try {
        const result = calculateAtsScore(resumeData, jdToUse, titleToUse);
        updateAtsScoreResult(result);
        setIsAuditing(false);

        if (result.totalScore >= 85) {
          try {
            confetti({
              particleCount: 75,
              spread: 60,
              origin: { y: 0.65 }
            });
          } catch (e) {}
          showToast(`Outstanding! ATS match score: ${result.totalScore}% (${result.tierLabel})`, 'success');
        } else {
          showToast(`ATS analysis complete: ${result.totalScore}% match score`, 'info');
        }
      } catch (err) {
        console.error('ATS Calculation Error:', err);
        setIsAuditing(false);
        showToast('Error calculating ATS match score.', 'error');
      }
    }, 280);
  };

  // Re-run audit automatically when resume changes if a JD is already scored
  const handleAddSkillAndRecompute = (skillCanonical, category) => {
    // 1. Add skill to resume in context
    addSkillToResume(skillCanonical, category);

    // 2. We can recompute with updated resume in next tick
    setTimeout(() => {
      if (jobDescriptionInput.trim()) {
        const updatedResume = {
          ...resumeData,
          skillCategories: resumeData.skillCategories?.map(c => ({ ...c })) || []
        };
        // Re-run
        const newResult = calculateAtsScore(updatedResume, jobDescriptionInput, targetTitleInput);
        updateAtsScoreResult(newResult);
      }
    }, 100);
  };

  const handleCopyBulletTemplate = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    showToast('Bullet template copied to clipboard! Paste into your experience.', 'success');
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleLoadSample = (sample) => {
    setActiveSampleId(sample.id);
    setJobDescriptionInput(sample.text);
    setTargetTitleInput(sample.targetTitle);
    handleCalculateScore(sample.text, sample.targetTitle);
  };

  const handleClear = () => {
    setJobDescriptionInput('');
    setActiveSampleId(null);
    updateTargetJobDescription('');
    updateAtsScoreResult(null);
    showToast('Cleared Job Description and audit results.', 'info');
  };

  if (!isOpen) return null;

  const result = atsScoreResult;

  // Gauge SVG calculations
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const scorePercent = result ? Math.min(100, Math.max(0, result.totalScore)) : 0;
  const strokeDashoffset = circumference - (scorePercent / 100) * circumference;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #090d16 0%, #0d1527 100%)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95), 0 0 35px rgba(56, 189, 248, 0.15)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1240px',
          height: '88vh',
          maxHeight: '920px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.75)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(52, 211, 153, 0.2) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Target className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  ATS Match Calculator & Recruiter Keyword Auditor
                </h2>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  Industry Weighted Algorithm
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Skills & Keywords (45%) • Role Fit (20%) • Quantified STAR Impact (20%) • ATS Format & Compliance (15%)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid var(--border-medium)',
                borderRadius: '8px',
                padding: '7px 10px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px'
              }}
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Studio Content: 2-Column Split */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '460px 1fr',
            flex: 1,
            overflow: 'hidden',
            background: 'rgba(8, 12, 22, 0.6)'
          }}
        >
          {/* Left Column: Job Description & Target Settings */}
          <div
            style={{
              borderRight: '1px solid var(--border-subtle)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'rgba(11, 17, 32, 0.5)',
              overflowY: 'auto'
            }}
          >
            {/* Quick Load Realistic Samples */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick-Load Sample Job Descriptions:</span>
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {SAMPLE_JOB_DESCRIPTIONS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleLoadSample(sample)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: activeSampleId === sample.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.45)',
                      border: activeSampleId === sample.id ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-subtle)',
                      color: activeSampleId === sample.id ? '#38bdf8' : 'var(--text-primary)',
                      fontSize: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{sample.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sample.company}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>

            {/* Target Role Title Input */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Target Job Title (Optional):
              </label>
              <input
                type="text"
                value={targetTitleInput}
                onChange={(e) => setTargetTitleInput(e.target.value)}
                placeholder="e.g. Senior Backend Engineer, Staff Software Engineer"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {/* JD Input Textarea */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Job Description Text:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {jobDescriptionInput.trim() ? `${jobDescriptionInput.trim().split(/\s+/).length} words` : '0 words'}
                  </span>
                  {jobDescriptionInput && (
                    <button
                      type="button"
                      onClick={handleClear}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={jobDescriptionInput}
                onChange={(e) => setJobDescriptionInput(e.target.value)}
                placeholder="Paste the target job description here (responsibilities, required skills, tech stack, qualifications)..."
                style={{
                  width: '100%',
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Calculate Button */}
            <button
              type="button"
              onClick={() => handleCalculateScore()}
              disabled={isAuditing || !jobDescriptionInput.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: '8px',
                background: !jobDescriptionInput.trim()
                  ? 'rgba(30, 41, 59, 0.4)'
                  : 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                color: !jobDescriptionInput.trim() ? 'var(--text-muted)' : '#090d16',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: !jobDescriptionInput.trim() || isAuditing ? 'not-allowed' : 'pointer',
                boxShadow: jobDescriptionInput.trim() ? 'var(--accent-glow)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Auditing Resume Match...</span>
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  <span>Calculate ATS Match Score</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Score Results & 3-Tier Recommendations */}
          <div
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflowY: 'auto'
            }}
          >
            {!result ? (
              /* Empty State */
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--text-muted)'
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'rgba(30, 41, 59, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}
                >
                  <Target className="w-8 h-8 text-sky-400" />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  No ATS Audit Run Yet
                </h3>
                <p style={{ fontSize: '13px', maxWidth: '420px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                  Select one of the quick-load job descriptions on the left or paste your own target JD to evaluate compatibility against recruiter parsing bots.
                </p>
                <button
                  type="button"
                  onClick={() => handleLoadSample(SAMPLE_JOB_DESCRIPTIONS[0])}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38bdf8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Try Demo: Senior Distributed Systems</span>
                </button>
              </div>
            ) : (
              /* Active Results Display */
              <>
                {/* Top Score Banner Card */}
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: `1px solid ${result.tierColor}40`,
                    borderRadius: '12px',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: `0 0 25px ${result.tierColor}15`
                  }}
                >
                  {/* Gauge & Main Score */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ position: 'relative', width: '116px', height: '116px' }}>
                      <svg width="116" height="116" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                        <circle
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="transparent"
                          stroke="rgba(30, 41, 59, 0.8)"
                          strokeWidth="8"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="transparent"
                          stroke={result.tierColor}
                          strokeWidth="8"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                        />
                      </svg>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                          {result.totalScore}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            background: `${result.tierColor}20`,
                            border: `1px solid ${result.tierColor}50`,
                            color: result.tierColor,
                            fontSize: '12px',
                            fontWeight: 700
                          }}
                        >
                          {result.tierLabel}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          • {result.wordCount} words total
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, maxWidth: '440px' }}>
                        {result.totalScore >= 85
                          ? 'Exceptional resume alignment! Your resume has strong technical overlap and quantified impact metrics.'
                          : result.totalScore >= 70
                          ? 'Solid foundation. Adding recruiter-preferred canonical terms and quantifying more bullet points will push you past 85%.'
                          : 'Optimization needed. The ATS detected significant missing keywords and low metric density compared to this job posting.'}
                      </p>
                    </div>
                  </div>

                  {/* Summary Metric Stats */}
                  <div style={{ display: 'flex', gap: '16px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#38bdf8' }}>
                        {result.matchedSkills?.length || 0}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Matched Skills</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#f87171' }}>
                        {result.missingSkills?.length || 0}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Missing Skills</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#34d399' }}>
                        {Math.round(result.metricAudit?.ratio * 100) || 0}%
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Metrics Density</div>
                    </div>
                  </div>
                </div>

                {/* Subscore 4-Pillar Bars */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px'
                  }}
                >
                  {/* Pillar 1: Skills */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Skills Match
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>
                        {result.subscores.skillsMatch}% (45%)
                      </span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${result.subscores.skillsMatch}%`,
                          background: '#38bdf8',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>

                  {/* Pillar 2: Role Fit */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Role & Seniority
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc' }}>
                        {result.subscores.roleAlignment}% (20%)
                      </span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${result.subscores.roleAlignment}%`,
                          background: '#c084fc',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>

                  {/* Pillar 3: Quantified Impact */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        STAR / Metrics
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#34d399' }}>
                        {result.subscores.quantifiedMetrics}% (20%)
                      </span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${result.subscores.quantifiedMetrics}%`,
                          background: '#34d399',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>

                  {/* Pillar 4: ATS Structure */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        ATS Format
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24' }}>
                        {result.subscores.atsFormat}% (15%)
                      </span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${result.subscores.atsFormat}%`,
                          background: '#fbbf24',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('recommendations')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      background: activeTab === 'recommendations' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                      border: activeTab === 'recommendations' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                      color: activeTab === 'recommendations' ? '#38bdf8' : 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>3-Tier Recommendations</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('matched')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      background: activeTab === 'matched' ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                      border: activeTab === 'matched' ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid transparent',
                      color: activeTab === 'matched' ? '#34d399' : 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Matched Keywords ({result.matchedSkills?.length || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('checklist')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      background: activeTab === 'checklist' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                      border: activeTab === 'checklist' ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid transparent',
                      color: activeTab === 'checklist' ? '#fbbf24' : 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ATS Structural Audit</span>
                  </button>
                </div>

                {/* Tab Content 1: 3-Tier Recommendations */}
                {activeTab === 'recommendations' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Tier 1: Safe Synonyms & Exact Recruiter Keywords */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '12px',
                        padding: '18px 20px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span
                          style={{
                            background: 'rgba(56, 189, 248, 0.2)',
                            color: '#38bdf8',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          TIER 1 • SAFE SYNONYMS & EXACT MATCH
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          High Impact • 1-Click Addition
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: '1.4' }}>
                        You have verified experience in related technologies, but Applicant Tracking Systems scan for these specific canonical recruiter terms:
                      </p>

                      {/* Tier 1 Recommendations List */}
                      {(!result.recommendations?.tier1 || result.recommendations.tier1.length === 0) ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No missing synonym gaps found. Your technical terminology matches the target JD nicely!
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                          {(result.recommendations?.tier1 || []).map((rec) => {
                            const skillName = rec.skill || rec.targetKeyword || rec.keyword;
                            const contextDetail = rec.reason || (rec.matchedSynonym ? `Matches: ${rec.matchedSynonym}` : 'Recommended keyword');
                            return (
                              <div
                                key={skillName}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'rgba(30, 41, 59, 0.5)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '8px',
                                  padding: '8px 12px'
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {skillName}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {contextDetail}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAddSkillAndRecompute(skillName, rec.category)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(52, 211, 153, 0.2) 100%)',
                                    border: '1px solid rgba(56, 189, 248, 0.4)',
                                    color: '#38bdf8',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                  title={`Add ${skillName} to your resume skills`}
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Add to Skills</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Tier 2: Contextual Impact & STAR Rewrites */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: '12px',
                        padding: '18px 20px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span
                          style={{
                            background: 'rgba(168, 85, 247, 0.2)',
                            color: '#c084fc',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          TIER 2 • CONTEXTUAL STAR BULLETS
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Medium-High Impact • Experience Alignment
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: '1.4' }}>
                        These high-frequency keywords demand real engineering context rather than isolated skill listing. Copy and customize these proven bullet templates:
                      </p>

                      {(!result.recommendations?.tier2 || result.recommendations.tier2.length === 0) ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No additional contextual templates required for this JD.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {(result.recommendations?.tier2 || []).map((rec, idx) => {
                            const skillName = rec.skill || rec.keyword;
                            const templateText = rec.suggestedBulletTemplate || rec.suggestedBullet || '';
                            return (
                              <div
                                key={skillName + idx}
                                style={{
                                  background: 'rgba(30, 41, 59, 0.5)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '8px',
                                  padding: '12px 14px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#c084fc' }}>
                                    Keyword: {skillName}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyBulletTemplate(templateText, idx)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      background: copiedIndex === idx ? 'rgba(52, 211, 153, 0.2)' : 'rgba(168, 85, 247, 0.15)',
                                      border: copiedIndex === idx ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(168, 85, 247, 0.3)',
                                      color: copiedIndex === idx ? '#34d399' : '#c084fc',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {copiedIndex === idx ? (
                                      <>
                                        <Check className="w-3 h-3" />
                                        <span>Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy Template</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div
                                  style={{
                                    fontSize: '12px',
                                    color: 'var(--text-primary)',
                                    background: 'rgba(15, 23, 42, 0.7)',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    fontFamily: 'monospace'
                                  }}
                                >
                                  {templateText}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Tier 3: True Skill Gaps & Deficits (Objective Engineering Triage) */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(248, 113, 113, 0.3)',
                        borderRadius: '12px',
                        padding: '18px 20px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span
                          style={{
                            background: 'rgba(248, 113, 113, 0.2)',
                            color: '#f87171',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          TIER 3 • TRUE SKILL DEFICITS (OBJECTIVE ANALYSIS)
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Avoid Blind Keyword Stuffing
                        </span>
                      </div>
                      
                      <div
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          marginBottom: '14px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px'
                        }}
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" style={{ marginTop: '2px' }} />
                        <div style={{ fontSize: '12px', color: '#fca5a5', lineHeight: '1.4' }}>
                          <strong>Engineering Integrity Warning:</strong> These skills appear in the JD, but no direct or indirect foundation was found on your resume. Do not blindly keyword stuff—technical screeners will probe deep into real production scenarios. Instead, use these as your roadmap for Dev Journal projects.
                        </div>
                      </div>

                      {(!result.recommendations?.tier3 || result.recommendations.tier3.length === 0) ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Zero hard skill deficits detected! You meet all core technical requirements.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {(result.recommendations?.tier3 || []).map((gap) => {
                            const skillName = gap.skill || gap.keyword;
                            return (
                              <div
                                key={skillName}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  background: 'rgba(248, 113, 113, 0.12)',
                                  border: '1px solid rgba(248, 113, 113, 0.3)',
                                  color: '#fca5a5',
                                  fontSize: '12px'
                                }}
                              >
                                <span style={{ fontWeight: 600 }}>{skillName}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({gap.category})</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* Tab Content 2: Matched Keywords */}
                {activeTab === 'matched' && (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '20px'
                    }}
                  >
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
                      Keywords Successfully Parsed by ATS ({result.matchedSkills?.length || 0}):
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                      These skills exist in both the job description and your resume. The weighted ATS score prioritizes skills verified within Work Experience bullets over simple skills lists.
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(result.matchedSkills || []).map((skill) => {
                        const skillName = skill.canonical || skill.key;
                        const weightPercent = skill.locations?.inExperience > 0 ? 100 : (skill.locations?.inProjects > 0 ? 85 : 50);
                        return (
                          <div
                            key={skillName}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: 'rgba(52, 211, 153, 0.12)',
                              border: '1px solid rgba(52, 211, 153, 0.3)',
                              color: '#34d399',
                              fontSize: '12px'
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span style={{ fontWeight: 600 }}>{skillName}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              ({weightPercent}% context weight)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab Content 3: ATS Structural Audit */}
                {activeTab === 'checklist' && (
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '20px'
                    }}
                  >
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
                      Applicant Tracking System Structural Checklist:
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(result.checklist || []).map((item, idx) => {
                        const checkTitle = item.title || item.label;
                        const checkDesc = item.description || item.detail;
                        return (
                          <div
                            key={checkTitle || idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              background: 'rgba(30, 41, 59, 0.4)',
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {item.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                              )}
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {checkTitle}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {checkDesc}
                                </div>
                              </div>
                            </div>

                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: item.passed ? '#34d399' : '#fbbf24'
                              }}
                            >
                              {item.passed ? 'PASSED' : 'CHECK'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
