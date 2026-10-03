import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { enhanceResumeWithAi } from '../../services/parserService';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Loader2, 
  ArrowRight, 
  Layers, 
  Cpu, 
  Settings, 
  Check, 
  RotateCcw, 
  FileText, 
  Briefcase, 
  Code, 
  Bot,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Send
} from 'lucide-react';

export default function AIEnhanceModal({ isOpen, onClose }) {
  const { 
    resumeData, 
    updateResumeData, 
    saveResumeSnapshot,
    aiConfig, 
    setAiConfig, 
    setIsAiConfigOpen, 
    profile, 
    showToast 
  } = useApp();

  const [enhancedData, setEnhancedData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'summary' | 'experience' | 'projects' | 'skills'
  const [scope, setScope] = useState('all'); // 'all' | 'experience' | 'summary' | 'projects'
  const [elapsed, setElapsed] = useState(0);
  const [acceptedSections, setAcceptedSections] = useState({
    summary: true,
    experience: true,
    projects: true,
    skills: true
  });
  const [refinementHistory, setRefinementHistory] = useState([]);
  const [generationStep, setGenerationStep] = useState('');

  const hasAiConfigured = (aiConfig.provider === 'gemini' && aiConfig.geminiApiKey?.trim()) ||
                          (aiConfig.provider === 'ollama' && aiConfig.ollamaBaseUrl);

  // Timer effect during generation
  useEffect(() => {
    let timer;
    if (isGenerating) {
      setElapsed(0);
      timer = setInterval(() => {
        setElapsed(e => e + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isGenerating]);

  // Reset error when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunEnhancement = async (customInstruction = '', targetScope = scope) => {
    setIsGenerating(true);
    setError(null);
    setGenerationStep(
      targetScope === 'experience' ? 'Rewriting work experience bullets with STAR metrics...' :
      targetScope === 'summary' ? 'Synthesizing executive technical summary...' :
      targetScope === 'projects' ? 'Strengthening project architecture & metrics...' :
      'Analyzing resume and applying STAR methodology across all sections...'
    );

    try {
      const enhanced = await enhanceResumeWithAi(resumeData, aiConfig, {
        instruction: customInstruction || instruction,
        scope: targetScope,
        targetRole: profile?.targetRole || resumeData?.personalInfo?.title || ''
      });

      setEnhancedData(enhanced);
      if (customInstruction || instruction) {
        setRefinementHistory(prev => [...prev, customInstruction || instruction]);
        setInstruction('');
      }
      showToast('AI enhancement generated! Review before & after changes below.', 'success');
    } catch (err) {
      console.error('Enhancement generation failed:', err);
      setError(err.message || 'Failed to generate enhancement with AI.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleApplyQuickPrompt = (promptText) => {
    setInstruction(promptText);
    handleRunEnhancement(promptText);
  };

  const handleAcceptChanges = () => {
    if (!enhancedData) return;

    let mergedData = null;

    updateResumeData(prev => {
      const merged = { ...prev };
      if (acceptedSections.summary && enhancedData.summary) {
        merged.summary = enhancedData.summary;
      }
      if (acceptedSections.experience && enhancedData.experience?.length) {
        merged.experience = enhancedData.experience;
      }
      if (acceptedSections.projects && enhancedData.projects?.length) {
        merged.projects = enhancedData.projects;
      }
      if (acceptedSections.skills && enhancedData.skillCategories?.length) {
        merged.skillCategories = enhancedData.skillCategories;
      }
      mergedData = merged;
      return merged;
    });

    if (mergedData) {
      const scopeLabel = scope === 'all' 
        ? 'Full Resume' 
        : scope === 'experience' 
          ? 'Work Experience' 
          : scope === 'summary' 
            ? 'Summary' 
            : 'Projects';

      saveResumeSnapshot({
        title: `AI Enhanced: ${scopeLabel}`,
        description: instruction.trim() 
          ? `Instruction: "${instruction.trim().slice(0, 75)}"` 
          : 'STAR methodology with quantifiable impact metrics',
        source: 'ai_enhance',
        customResumeData: mergedData
      });
    }

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    showToast('Accepted! Resume updated and saved to Version History.', 'success');
    onClose();
  };

  const handleRejectChanges = () => {
    showToast('AI suggestions discarded. Your resume remains unchanged.', 'info');
    onClose();
  };

  const toggleSectionAccept = (sectionKey) => {
    setAcceptedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const handleQuickSwitchToLocalLlm = () => {
    setAiConfig(prev => ({
      ...prev,
      provider: 'ollama',
      ollamaBaseUrl: 'http://localhost:1234',
      ollamaModel: 'google/gemma-4-12b-qat'
    }));
    showToast('Switched to Local LLM (LM Studio)!', 'success');
    setTimeout(() => {
      handleRunEnhancement();
    }, 300);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
      padding: '16px'
    }} className="no-print">
      <div style={{
        width: '100%',
        maxWidth: '1060px',
        height: '92vh',
        maxHeight: '880px',
        background: '#0f172a',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(56, 189, 248, 0.3) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
                  AI Resume Copilot & Enhancer
                </h2>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: aiConfig.provider === 'ollama' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  color: aiConfig.provider === 'ollama' ? '#34d399' : '#38bdf8',
                  border: `1px solid ${aiConfig.provider === 'ollama' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {aiConfig.provider === 'ollama' ? <Cpu className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  <span>{aiConfig.provider === 'ollama' ? `Local: ${aiConfig.ollamaModel || 'google/gemma-4-12b-qat'}` : `Gemini: ${aiConfig.geminiModel || 'gemini-3.8-flash'}`}</span>
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Elevate your bullet points with STAR impact, quantifiable metrics, and FAANG-grade technical framing.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsAiConfigOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '12px'
              }}
              title="Change AI model or API settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>AI Settings</span>
            </button>
            <button
              onClick={onClose}
              style={{ color: 'var(--text-muted)', padding: '6px', borderRadius: 'var(--radius-sm)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Main Area */}
        <div 
          className="custom-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            scrollbarGutter: 'stable',
            scrollbarWidth: 'thin',
            scrollbarColor: '#0284c7 rgba(15, 23, 42, 0.85)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          {/* Unconfigured Alert Banner */}
          {!hasAiConfigured && (
            <div style={{
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div style={{ fontSize: '13px' }}>
                  <strong>AI Provider not configured.</strong> Enter your Gemini API key, or switch to your local LM Studio server (port 1234).
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleQuickSwitchToLocalLlm}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#34d399',
                    color: '#090d16',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  Use Local LM Studio
                </button>
                <button
                  type="button"
                  onClick={() => setIsAiConfigOpen(true)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid var(--border-medium)',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                >
                  Configure Key
                </button>
              </div>
            </div>
          )}

          {/* Interactive Chat & Refinement Box */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(168, 85, 247, 0.08)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot className="w-4 h-4 text-purple-400" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                  {enhancedData ? 'Refine & Direct the AI Output' : 'Enhancement Instructions & Goals'}
                </span>
              </div>
              {refinementHistory.length > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Refined {refinementHistory.length} time{refinementHistory.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Target Scope Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target Scope:</span>
              {[
                { id: 'all', label: 'All Sections (Full Resume)' },
                { id: 'experience', label: 'Work Experience Only (~20s)' },
                { id: 'summary', label: 'Summary Only (~5s)' },
                { id: 'projects', label: 'Projects Only (~20s)' }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScope(s.id)}
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: scope === s.id ? 'rgba(168, 85, 247, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                    color: scope === s.id ? '#c084fc' : 'var(--text-secondary)',
                    border: scope === s.id ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.08)',
                    fontWeight: scope === s.id ? 600 : 400,
                    cursor: 'pointer'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !isGenerating && instruction.trim()) {
                      handleRunEnhancement();
                    }
                  }}
                  placeholder='e.g. "Focus on Go, Kafka, and low-latency microservices", "Make bullets shorter with strong metrics", "Elevate for Senior role"...'
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid var(--border-medium)',
                    color: '#f8fafc',
                    fontSize: '13px'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => handleRunEnhancement()}
                disabled={isGenerating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, #a855f7 0%, #38bdf8 100%)',
                  color: '#090d16',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  opacity: isGenerating ? 0.7 : 1,
                  boxShadow: '0 0 14px rgba(168, 85, 247, 0.3)'
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing ({elapsed}s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{enhancedData ? 'Refine Output' : 'Enhance Resume'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '2px' }}>Quick Prompts:</span>
              {[
                { label: '🚀 More Metrics & Scale (STAR)', prompt: 'Add stronger quantifiable metrics, performance scale numbers, and concrete latency or capacity statistics using STAR format.' },
                { label: '⚡ Punchy & Concise (1-2 lines)', prompt: 'Make all bullet points more concise, punchy, and dense. Keep each bullet strictly within 1-2 lines.' },
                { label: '🏗️ Distributed Systems & Backend', prompt: 'Emphasize distributed systems architecture, concurrency, fault-tolerance, database optimization, and high availability.' },
                { label: '👑 Staff / Senior Framing', prompt: 'Elevate bullet phrasing to Staff / Senior Engineer leadership caliber, highlighting architectural ownership, mentorship, and system design.' },
                { label: '🎯 Tailor for Target Role', prompt: `Sharpen all sections to align specifically with target role: ${profile?.targetRole || 'Senior Backend Engineer'}.` }
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyQuickPrompt(chip.prompt)}
                  disabled={isGenerating}
                  style={{
                    fontSize: '11px',
                    padding: '3px 9px',
                    borderRadius: '12px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#a855f7';
                    e.currentTarget.style.color = '#f8fafc';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading Animation / State */}
          {isGenerating && (
            <div style={{
              padding: '24px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(168, 85, 247, 0.06)',
              border: '1px dashed rgba(168, 85, 247, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              textAlign: 'center',
              flexShrink: 0
            }}>
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                  {generationStep || 'AI Copilot is processing your resume...'} ({elapsed}s)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {aiConfig.provider === 'ollama' 
                    ? `Running on local ${aiConfig.ollamaModel || 'LLM'}. Local models complete in ~20-60s.`
                    : 'Applying STAR structure, action verbs, and quantifiable impact across your experience.'}
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && !isGenerating && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(251, 113, 133, 0.1)',
              border: '1px solid rgba(251, 113, 133, 0.3)',
              color: '#fb7185',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span style={{ flex: 1 }}>{error}</span>
              <button
                type="button"
                onClick={() => handleRunEnhancement()}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(251, 113, 133, 0.2)',
                  color: '#fb7185'
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State before any generation */}
          {!enhancedData && !isGenerating && !error && (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              border: '1px dashed var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              flexShrink: 0
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(168, 85, 247, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles className="w-7 h-7 text-purple-400" />
              </div>
              <div style={{ maxWidth: '480px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                  Ready to Enhance Your Resume with AI
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Click below to generate high-impact STAR bullet points, power verbs, and quantifiable metrics. You will be able to review all changes side-by-side, refine with chat instructions, and accept or reject.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRunEnhancement()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'linear-gradient(135deg, #a855f7 0%, #38bdf8 100%)',
                  color: '#090d16',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)'
                }}
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate AI Enhancement</span>
              </button>
            </div>
          )}

          {/* Diff / Comparison Workspace */}
          {enhancedData && !isGenerating && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
              {/* Section Filters & Granular Accept Toggles */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '10px 14px',
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}>
                {/* View Tabs */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'all', label: 'All Changes' },
                    { id: 'summary', label: 'Summary' },
                    { id: 'experience', label: `Work Experience (${enhancedData.experience?.length || 0})` },
                    { id: 'projects', label: `Projects (${enhancedData.projects?.length || 0})` },
                    { id: 'skills', label: 'Skills' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
                        color: activeTab === tab.id ? '#090d16' : 'var(--text-secondary)',
                        border: 'none'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Section Checkboxes */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Include in Accept:</span>
                  {[
                    { key: 'summary', label: 'Summary' },
                    { key: 'experience', label: 'Experience' },
                    { key: 'projects', label: 'Projects' },
                    { key: 'skills', label: 'Skills' }
                  ].map(sec => (
                    <label key={sec.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: acceptedSections[sec.key] ? '#34d399' : 'var(--text-muted)' }}>
                      <input
                        type="checkbox"
                        checked={acceptedSections[sec.key]}
                        onChange={() => toggleSectionAccept(sec.key)}
                        style={{ accentColor: '#34d399' }}
                      />
                      <span>{sec.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* SECTION: SUMMARY */}
              {(activeTab === 'all' || activeTab === 'summary') && (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText className="w-4 h-4 text-sky-400" />
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Professional Summary</h4>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: 'rgba(52, 211, 153, 0.1)',
                      color: '#34d399'
                    }}>
                      STAR Enhanced
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Before */}
                    <div style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(30, 41, 59, 0.4)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                        CURRENT RESUME
                      </div>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {resumeData.summary || '(No summary set)'}
                      </p>
                    </div>

                    {/* After */}
                    <div style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(52, 211, 153, 0.06)',
                      border: '1px solid rgba(52, 211, 153, 0.3)'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#34d399', marginBottom: '6px' }}>
                        AI ENHANCED (EXECUTIVE TECHNICAL PROFILE)
                      </div>
                      <p style={{ fontSize: '12.5px', color: '#f8fafc', lineHeight: 1.5, fontWeight: 500 }}>
                        {enhancedData.summary || '(No enhanced summary)'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: WORK EXPERIENCE */}
              {(activeTab === 'all' || activeTab === 'experience') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {enhancedData.experience?.map((exp, expIdx) => {
                    const originalExp = resumeData.experience?.[expIdx] || {};
                    return (
                      <div key={exp.id || expIdx} style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Briefcase className="w-4 h-4 text-emerald-400" />
                            <div>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                                {exp.role} @ {exp.company}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                {exp.startDate} - {exp.endDate}
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                            {exp.bullets?.length || 0} bullets enhanced
                          </span>
                        </div>

                        {/* Bullets Comparison Table */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {exp.bullets?.map((enhancedBullet, bIdx) => {
                            const origBullet = originalExp.bullets?.[bIdx];
                            return (
                              <div key={bIdx} style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px',
                                padding: '10px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(30, 41, 59, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                              }}>
                                {/* Original */}
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                                    ORIGINAL BULLET #{bIdx + 1}
                                  </div>
                                  <div>• {origBullet || '(Newly synthesized bullet)'}</div>
                                </div>

                                {/* Enhanced */}
                                <div style={{ fontSize: '12px', color: '#f8fafc', lineHeight: 1.45 }}>
                                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#34d399', marginBottom: '3px' }}>
                                    ✓ ENHANCED (STAR IMPACT)
                                  </div>
                                  <div style={{ color: '#ecfdf5', fontWeight: 500 }}>
                                    • {enhancedBullet}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SECTION: FEATURED PROJECTS */}
              {(activeTab === 'all' || activeTab === 'projects') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {enhancedData.projects?.map((proj, pIdx) => {
                    const originalProj = resumeData.projects?.[pIdx] || {};
                    return (
                      <div key={proj.id || pIdx} style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Code className="w-4 h-4 text-purple-400" />
                            <div>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                                {proj.name}
                              </span>
                              {proj.techStack && (
                                <span style={{ fontSize: '11px', color: '#c084fc', marginLeft: '8px', fontFamily: 'var(--font-mono)' }}>
                                  [{proj.techStack}]
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Project Bullets Comparison */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {proj.bullets?.map((enhancedBullet, bIdx) => {
                            const origBullet = originalProj.bullets?.[bIdx];
                            return (
                              <div key={bIdx} style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px',
                                padding: '10px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(30, 41, 59, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                              }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                                    ORIGINAL
                                  </div>
                                  <div>• {origBullet || '(Newly generated bullet)'}</div>
                                </div>
                                <div style={{ fontSize: '12px', color: '#f8fafc', lineHeight: 1.45 }}>
                                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#c084fc', marginBottom: '3px' }}>
                                    ✓ ENHANCED (ARCHITECTURE & SCALE)
                                  </div>
                                  <div style={{ color: '#faf5ff', fontWeight: 500 }}>
                                    • {enhancedBullet}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SECTION: SKILLS */}
              {(activeTab === 'all' || activeTab === 'skills') && (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Layers className="w-4 h-4 text-amber-400" />
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>Categorized Technical Skills</h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Original Skills */}
                    <div style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(30, 41, 59, 0.4)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                        CURRENT RESUME SKILLS
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {resumeData.skillCategories?.map((cat, idx) => (
                          <div key={idx} style={{ fontSize: '12px' }}>
                            <strong style={{ color: 'var(--text-secondary)' }}>{cat.category}:</strong>{' '}
                            <span style={{ color: 'var(--text-muted)' }}>{cat.skills?.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Enhanced Skills */}
                    <div style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(251, 191, 36, 0.05)',
                      border: '1px solid rgba(251, 191, 36, 0.25)'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#fbbf24', marginBottom: '8px' }}>
                        AI OPTIMIZED CATEGORIES
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {enhancedData.skillCategories?.map((cat, idx) => (
                          <div key={idx} style={{ fontSize: '12px' }}>
                            <strong style={{ color: '#f8fafc' }}>{cat.category}:</strong>{' '}
                            <span style={{ color: '#fde68a' }}>{cat.skills?.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Accept / Reject Controls */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            {enhancedData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check className="w-3.5 h-3.5" />
                  <span>AI Enhancement Proposal Ready for Review</span>
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  🛡️ Saved to Resume History upon accept — you can reflect back or rollback anytime.
                </span>
              </div>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Your current resume remains unchanged until you click Accept.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleRejectChanges}
              style={{
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Reject & Discard
            </button>

            <button
              type="button"
              onClick={handleAcceptChanges}
              disabled={!enhancedData || isGenerating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: 'var(--radius-sm)',
                background: (!enhancedData || isGenerating)
                  ? 'rgba(52, 211, 153, 0.3)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: (!enhancedData || isGenerating) ? 'not-allowed' : 'pointer',
                boxShadow: (!enhancedData || isGenerating) ? 'none' : '0 0 16px rgba(16, 185, 129, 0.35)'
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Accept & Apply to Resume</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
