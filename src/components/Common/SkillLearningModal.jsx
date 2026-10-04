import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { generateLearningPrompts, runInAppLearningSession, getOfflineSocraticBrief } from '../../services/learningService';
import {
  X,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  Bot,
  Settings,
  Send,
  HelpCircle,
  AlertTriangle,
  Layers,
  Code2,
  Zap,
  ArrowRight
} from 'lucide-react';

export default function SkillLearningModal() {
  const {
    learningModalSkill,
    closeLearnModal,
    profile,
    resumeData,
    aiConfig,
    setIsAiConfigOpen,
    showToast
  } = useApp();

  const [activeMode, setActiveMode] = useState('socratic'); // 'socratic' | 'lab' | 'failureModes'
  const [modelTarget, setModelTarget] = useState('cloud'); // 'cloud' | 'local'
  const [copied, setCopied] = useState(false);
  const [inAppResponse, setInAppResponse] = useState(null);
  const [isRunningInApp, setIsRunningInApp] = useState(false);
  const [userFollowUp, setUserFollowUp] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  // Extract skills from resume for dynamic injection
  const currentSkills = useMemo(() => {
    const skills = [];
    if (resumeData?.skillCategories) {
      resumeData.skillCategories.forEach(cat => {
        if (Array.isArray(cat.skills)) {
          skills.push(...cat.skills);
        }
      });
    }
    return skills.length > 0 ? skills : ['Go', 'Docker', 'PostgreSQL', 'Microservices', 'Distributed Systems'];
  }, [resumeData]);

  const targetRole = profile?.targetRole || resumeData?.personalInfo?.title || 'Senior Software Engineer';

  // Generate learning prompts for the active skill
  const learningData = useMemo(() => {
    if (!learningModalSkill?.skillName) return null;
    return generateLearningPrompts({
      skillName: learningModalSkill.skillName,
      targetRole,
      currentSkills,
      category: learningModalSkill.category
    });
  }, [learningModalSkill, targetRole, currentSkills]);

  // Reset local state when opened with a new skill
  useEffect(() => {
    if (learningModalSkill) {
      setInAppResponse(null);
      setChatHistory([]);
      setUserFollowUp('');
      setCopied(false);
      setActiveMode('socratic');
    }
  }, [learningModalSkill]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && learningModalSkill) {
        closeLearnModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [learningModalSkill, closeLearnModal]);

  if (!learningModalSkill || !learningData) return null;

  const currentModeData = learningData.modes[activeMode];
  const activePromptText = currentModeData?.prompts[modelTarget] || '';

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(activePromptText);
      setCopied(true);
      showToast(`Copied ${currentModeData.name} prompt for ${modelTarget === 'cloud' ? 'ChatGPT / Claude' : 'Local LLM'}!`, 'success');
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      showToast('Failed to copy to clipboard.', 'error');
    }
  };

  const handleRunInAppSession = async () => {
    setIsRunningInApp(true);
    setInAppResponse(null);

    const hasApiKey = (aiConfig.provider === 'gemini' && aiConfig.geminiApiKey?.trim()) ||
                      (aiConfig.provider === 'ollama');

    if (!hasApiKey) {
      // Fallback to offline brief immediately
      setTimeout(() => {
        const offline = getOfflineSocraticBrief(learningModalSkill.skillName, activeMode);
        setInAppResponse({
          text: activeMode === 'socratic'
            ? `**[DevSignal Offline Socratic Brief]**\n\n**Interviewer Scenario:**\n${offline.question}\n\n**Key Areas to Address in Your Answer:**\n${offline.tips.map(t => `• ${t}`).join('\n')}`
            : activeMode === 'lab'
            ? `**[DevSignal Offline POC Blueprint]**\n\n**Architecture Concept:**\n${offline.concept}\n\n**Implementation Roadmap:**\n${offline.recommendedSteps.join('\n')}`
            : `**[DevSignal Scale & Failure Brief]**\n\n**Top Failure Modes:**\n${offline.failureModes.map(f => `• ${f}`).join('\n')}\n\n**Industry Alternatives:**\n${offline.alternatives.map(a => `• ${a}`).join('\n')}`,
          source: 'DevSignal Offline Knowledge Engine'
        });
        setIsRunningInApp(false);
        showToast('Generated offline brief. Configure Gemini or Local LLM in AI Settings for live chat.', 'info');
      }, 350);
      return;
    }

    try {
      const result = await runInAppLearningSession({
        prompt: activePromptText,
        systemInstruction: 'You are a Principal Software Engineer and Bar Raiser mentor conducting a technical deep-dive session. Be concise, direct, and rigorous.',
        aiConfig
      });
      setInAppResponse(result);
      setChatHistory([
        { role: 'assistant', text: result.text }
      ]);
      showToast(`AI Socratic session started with ${result.source}!`, 'success');
    } catch (err) {
      // Offline fallback on failure
      const offline = getOfflineSocraticBrief(learningModalSkill.skillName, activeMode);
      setInAppResponse({
        text: `**Note: Live AI request timed out or was unconfigured.**\n\n**[Offline Socratic Starter Question]**\n${offline.question || offline.concept}`,
        source: 'Offline Fallback'
      });
      showToast(`AI request failed: ${err.message}. Showing offline brief.`, 'warning');
    } finally {
      setIsRunningInApp(false);
    }
  };

  const handleSendFollowUp = async (e) => {
    e.preventDefault();
    if (!userFollowUp.trim() || isRunningInApp) return;

    const answer = userFollowUp.trim();
    setUserFollowUp('');
    const newHistory = [...chatHistory, { role: 'user', text: answer }];
    setChatHistory(newHistory);
    setIsRunningInApp(true);

    const followUpPrompt = `I am a candidate responding to your interview / tutorial scenario on "${learningModalSkill.skillName}".
My answer / proposed architecture:
"""
${answer}
"""

Please critique my response as a Principal Software Engineer:
1. What did I get right?
2. What failure modes, scale bottlenecks, or trade-offs did I miss?
3. Rate my response (Junior / Mid / Senior / Staff).
4. Ask me the next follow-up scenario or edge case.`;

    try {
      const result = await runInAppLearningSession({
        prompt: followUpPrompt,
        aiConfig
      });
      setChatHistory([...newHistory, { role: 'assistant', text: result.text }]);
    } catch (err) {
      setChatHistory([
        ...newHistory,
        {
          role: 'assistant',
          text: `*(Error: Unable to reach AI provider: ${err.message}. You can copy the prompt above directly into ChatGPT or Claude for live evaluation.)*`
        }
      ]);
    } finally {
      setIsRunningInApp(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={closeLearnModal}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #090d16 0%, #0d1527 100%)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95), 0 0 35px rgba(56, 189, 248, 0.15)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1050px',
          height: '86vh',
          maxHeight: '880px',
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
            background: 'rgba(15, 23, 42, 0.8)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(56, 189, 248, 0.2) 100%)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  AI Socratic Tutor: <span style={{ color: '#38bdf8' }}>{learningData.skillName}</span>
                </h2>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  {learningData.category}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#c084fc',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  Target: {targetRole}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Interactive Socratic mentoring and battle-tested prompts for Claude, ChatGPT & Local LLMs
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsAiConfigOpen(true)}
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid var(--border-medium)',
                borderRadius: '8px',
                padding: '7px 11px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px'
              }}
              title="Configure Gemini API or Local LLM"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>AI Settings</span>
            </button>

            <button
              type="button"
              onClick={closeLearnModal}
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid var(--border-medium)',
                borderRadius: '8px',
                padding: '7px 11px',
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

        {/* Modal Body Container */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Main Content Area */}
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveMode('socratic')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: activeMode === 'socratic' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(30, 41, 59, 0.5)',
                    border: activeMode === 'socratic' ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                    color: activeMode === 'socratic' ? '#38bdf8' : 'var(--text-secondary)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Bot className="w-4 h-4" />
                  <span>Mode A: Socratic Interviewer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('lab')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: activeMode === 'lab' ? 'rgba(52, 211, 153, 0.18)' : 'rgba(30, 41, 59, 0.5)',
                    border: activeMode === 'lab' ? '1px solid #34d399' : '1px solid var(--border-subtle)',
                    color: activeMode === 'lab' ? '#34d399' : 'var(--text-secondary)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Code2 className="w-4 h-4" />
                  <span>Mode B: Hands-On POC Lab</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode('failureModes')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: activeMode === 'failureModes' ? 'rgba(248, 113, 113, 0.18)' : 'rgba(30, 41, 59, 0.5)',
                    border: activeMode === 'failureModes' ? '1px solid #f87171' : '1px solid var(--border-subtle)',
                    color: activeMode === 'failureModes' ? '#f87171' : 'var(--text-secondary)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Zap className="w-4 h-4" />
                  <span>Mode C: Scale & Failure Modes</span>
                </button>
              </div>

              {/* Target Format Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setModelTarget('cloud')}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: modelTarget === 'cloud' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: modelTarget === 'cloud' ? '#38bdf8' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  ChatGPT / Claude
                </button>
                <button
                  type="button"
                  onClick={() => setModelTarget('local')}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: modelTarget === 'local' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                    color: modelTarget === 'local' ? '#c084fc' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Local LLM / Ollama
                </button>
              </div>
            </div>

            {/* Mode Description & Strategy Banner */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {currentModeData.name}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      fontWeight: 600
                    }}
                  >
                    {currentModeData.badge}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {currentModeData.tagline}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    background: copied
                      ? 'rgba(52, 211, 153, 0.2)'
                      : 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                    border: copied ? '1px solid #34d399' : '1px solid rgba(56, 189, 248, 0.4)',
                    color: copied ? '#34d399' : '#38bdf8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Copy this tailored prompt to your clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied Prompt!' : 'Copy Prompt'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunInAppSession}
                  disabled={isRunningInApp}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isRunningInApp ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)'
                  }}
                  title="Run directly with configured Gemini or Local LLM"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isRunningInApp ? 'animate-spin' : ''}`} />
                  <span>{isRunningInApp ? 'Running...' : 'Run with DevSignal AI'}</span>
                </button>
              </div>
            </div>

            {/* Prompt Viewport Box */}
            <div
              style={{
                position: 'relative',
                background: 'rgba(10, 15, 29, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '10px',
                padding: '16px',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '12px',
                color: '#cbd5e1',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                maxHeight: inAppResponse ? '180px' : '280px',
                overflowY: 'auto'
              }}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  float: 'right',
                  fontSize: '10.5px',
                  color: 'var(--text-muted)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '8px'
                }}
              >
                Format: {modelTarget === 'cloud' ? 'ChatGPT / Claude' : 'Local Ollama'}
              </div>
              {activePromptText}
            </div>

            {/* In-App AI Session / Response Area */}
            {(inAppResponse || isRunningInApp) && (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#c084fc' }}>
                      DevSignal Socratic Session
                    </span>
                    {inAppResponse?.source && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          padding: '1px 7px',
                          borderRadius: '4px',
                          background: 'rgba(168, 85, 247, 0.15)',
                          color: '#e9d5ff',
                          fontFamily: 'monospace'
                        }}
                      >
                        Engine: {inAppResponse.source}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setInAppResponse(null);
                      setChatHistory([]);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Reset Session
                  </button>
                </div>

                {/* Conversation History */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '260px', overflowY: 'auto' }}>
                  {isRunningInApp && !inAppResponse && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                      <span>Generating Socratic mentorship scenario...</span>
                    </div>
                  )}

                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: msg.role === 'user' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(30, 41, 59, 0.5)',
                        border: msg.role === 'user' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--border-subtle)',
                        fontSize: '12.5px',
                        color: msg.role === 'user' ? '#38bdf8' : 'var(--text-primary)',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                        {msg.role === 'user' ? 'Your Answer / Design' : 'Principal Engineer Mentor'}
                      </div>
                      {msg.text}
                    </div>
                  ))}

                  {/* Initial Response if no multi-turn chat yet */}
                  {chatHistory.length === 0 && inAppResponse && (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '12.5px',
                        color: 'var(--text-primary)',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {inAppResponse.text}
                    </div>
                  )}
                </div>

                {/* Interactive Answer / Follow-up Input */}
                <form onSubmit={handleSendFollowUp} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="text"
                    value={userFollowUp}
                    onChange={(e) => setUserFollowUp(e.target.value)}
                    placeholder="Type your architectural answer, trade-offs, or approach to receive critique..."
                    disabled={isRunningInApp}
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isRunningInApp || !userFollowUp.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      background: !userFollowUp.trim() ? 'rgba(30, 41, 59, 0.5)' : '#38bdf8',
                      color: !userFollowUp.trim() ? 'var(--text-muted)' : '#0f172a',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: !userFollowUp.trim() || isRunningInApp ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit</span>
                  </button>
                </form>
              </div>
            )}

            {/* Quick Socratic Highlights / Starter Question Preview */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '14px 16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#34d399' }}>
                  {activeMode === 'socratic'
                    ? 'Sample Interview Drill'
                    : activeMode === 'lab'
                    ? 'Recommended POC Architecture'
                    : 'Critical Scale Failure Highlights'}
                </span>
              </div>

              {activeMode === 'socratic' && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5', fontStyle: 'italic' }}>
                  "{currentModeData.starterQuestion}"
                </p>
              )}

              {activeMode === 'lab' && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                  {currentModeData.pocConcept}
                </p>
              )}

              {activeMode === 'failureModes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(currentModeData.highlights || []).slice(0, 3).map((f, i) => (
                    <div key={i} style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#f87171' }}>•</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer Bar */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: 'var(--text-muted)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Tip: Paste the copied prompt into Claude 3.7 / ChatGPT o3-mini for a 30-minute interactive mock interview session.
            </span>
          </div>

          <button
            type="button"
            onClick={closeLearnModal}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '11.5px'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
