import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { generateLlmChatCompletion, buildResumeChatSystemPrompt } from '../../services/llmService';
import {
  Bot,
  User,
  Send,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  Copy,
  Check,
  Settings,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';

const CHAT_STORAGE_KEY = 'devsignal_resume_chat_history_v1';

export default function ResumeChatbotDrawer({ isOpen, onClose }) {
  const {
    resumeData,
    updateResumeData,
    profile,
    aiConfig,
    setIsAiConfigOpen,
    saveResumeSnapshot,
    showToast,
    atsScoreResult,
    targetJobDescription
  } = useApp();

  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [appliedSummaryId, setAppliedSummaryId] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const hasAiConfigured = (aiConfig.provider === 'gemini' && aiConfig.geminiApiKey?.trim()) ||
                          (aiConfig.provider === 'ollama' && aiConfig.ollamaBaseUrl);

  const candidateName = resumeData?.personalInfo?.fullName || profile?.fullName || 'there';
  const candidateTitle = resumeData?.personalInfo?.title || profile?.targetRole || 'Software Engineer';

  // Initial welcome message
  const getInitialMessage = () => ({
    id: 'msg-welcome',
    role: 'assistant',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    content: `Hello ${candidateName}! 👋 I'm your **DevSignal AI Resume Advisor**.\n\nI have loaded your active resume for **${candidateTitle}** with **${resumeData?.experience?.length || 0} work experiences** and **${resumeData?.projects?.length || 0} featured projects**.\n\nHow can I help you improve your resume today? You can choose one of the quick suggestions below or ask me any question directly!`
  });

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved chat history:', e);
    }
    return [getInitialMessage()];
  });

  // Save conversation to local storage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus textarea when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearHistory = () => {
    if (window.confirm('Clear your resume chat conversation and start fresh?')) {
      const welcome = getInitialMessage();
      setMessages([welcome]);
      try {
        localStorage.removeItem(CHAT_STORAGE_KEY);
      } catch (e) {}
      showToast('Chat history cleared', 'info');
    }
  };

  const handleCopyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Copied to clipboard!', 'success');
  };

  // Extract suggested summary from text if present
  const extractSuggestedSummary = (content) => {
    if (!content) return null;
    const match = content.match(/SUGGESTED SUMMARY:\s*["“]?([^"”\n]+(?:\n[^"”\n]+)*)["”]?/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  };

  const handleApplySummary = (messageId, summaryText) => {
    if (!summaryText) return;
    updateResumeData(prev => ({
      ...prev,
      summary: summaryText
    }));

    if (saveResumeSnapshot) {
      saveResumeSnapshot('Applied AI Chat Summary', 'Updated via AI Resume Advisor Chat', 'chat');
    }

    setAppliedSummaryId(messageId);
    showToast('Executive Summary applied directly to your resume!', 'success');
  };

  const handleSendMessage = async (textToSend = inputValue) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    if (!hasAiConfigured) {
      setIsAiConfigOpen(true);
      showToast('Please configure Gemini API Key or Local LLM to chat.', 'warning');
      return;
    }

    const userMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const systemInstruction = buildResumeChatSystemPrompt({
        resumeData,
        profile,
        atsScoreResult,
        targetJobDescription
      });

      const assistantReply = await generateLlmChatCompletion({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        systemInstruction,
        aiConfig
      });

      const assistantMessage = {
        id: `msg-assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedSummary: extractSuggestedSummary(assistantReply)
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat generation failed:', err);
      const errorMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Error generating response**: ${err.message || 'An unexpected error occurred.'}\n\nPlease verify your AI settings or check that your local model server is reachable.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Quick Starter Prompts
  const starterPrompts = [
    {
      label: '🎯 3 Biggest Areas to Improve',
      prompt: 'Critique my resume candidly. What are the 3 biggest weaknesses, missing metrics, or passive descriptions that I should fix first?'
    },
    {
      label: '⚡ Rewrite Latest Experience (STAR)',
      prompt: 'Please review the bullet points in my most recent work experience and rewrite them following Google’s XYZ formula (Accomplished [X] measured by [Y] by doing [Z]).'
    },
    {
      label: '💼 Position for Senior / Staff',
      prompt: 'How can I elevate my resume to clearly signal Senior or Staff Software Engineer scope, architectural leadership, and cross-functional impact?'
    },
    {
      label: '📝 Draft Punchy Executive Summary',
      prompt: 'Based on my experience and projects, draft a compelling, modern 2-sentence executive summary. Please format with "SUGGESTED SUMMARY: " so I can apply it.'
    },
    {
      label: '🔍 ATS & Missing Keywords',
      prompt: 'Analyze my current skills and bullet points. What crucial industry keywords, distributed systems patterns, or cloud architecture terms are missing?'
    }
  ];

  // Simple Markdown text renderer for bolding, bullet points, headers, and code
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', lineHeight: 1.6 }}>
        {lines.map((line, idx) => {
          // Empty line
          if (!line.trim()) {
            return <div key={idx} style={{ height: '4px' }} />;
          }

          // Header line
          if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
            const cleanHeader = line.replace(/^#+\s*/, '');
            return (
              <div key={idx} style={{ fontWeight: 700, color: '#38bdf8', fontSize: '14px', marginTop: '6px' }}>
                {cleanHeader}
              </div>
            );
          }

          // Bullet points
          if (line.trim().startsWith('* ') || line.trim().startsWith('- ') || /^\d+\.\s/.test(line.trim())) {
            const cleanBullet = line.replace(/^\s*(?:[*\-]|(?:\d+\.))\s*/, '');
            return (
              <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', paddingLeft: '4px' }}>
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>•</span>
                <span>{renderInlineFormatting(cleanBullet)}</span>
              </div>
            );
          }

          // Standard paragraph
          return (
            <p key={idx} style={{ margin: 0 }}>
              {renderInlineFormatting(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderInlineFormatting = (str) => {
    // Process bold text **text** and `code`
    const parts = [];
    let remaining = str;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Find bold or code
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      const codeMatch = remaining.match(/`([^`]+)`/);

      let firstMatch = null;
      let matchType = null;

      if (boldMatch && codeMatch) {
        if (boldMatch.index < codeMatch.index) {
          firstMatch = boldMatch;
          matchType = 'bold';
        } else {
          firstMatch = codeMatch;
          matchType = 'code';
        }
      } else if (boldMatch) {
        firstMatch = boldMatch;
        matchType = 'bold';
      } else if (codeMatch) {
        firstMatch = codeMatch;
        matchType = 'code';
      }

      if (firstMatch) {
        if (firstMatch.index > 0) {
          parts.push(remaining.slice(0, firstMatch.index));
        }
        if (matchType === 'bold') {
          parts.push(
            <strong key={`b-${keyIdx++}`} style={{ color: '#f8fafc', fontWeight: 600 }}>
              {firstMatch[1]}
            </strong>
          );
        } else {
          parts.push(
            <code
              key={`c-${keyIdx++}`}
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                padding: '1px 5px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px'
              }}
            >
              {firstMatch[1]}
            </code>
          );
        }
        remaining = remaining.slice(firstMatch.index + firstMatch[0].length);
      } else {
        parts.push(remaining);
        break;
      }
    }

    return parts;
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '24px',
        width: isExpanded ? '640px' : '440px',
        maxWidth: 'calc(100vw - 32px)',
        height: isExpanded ? 'calc(90vh - 40px)' : '640px',
        maxHeight: 'calc(100vh - 40px)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(11, 17, 32, 0.96)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(56, 189, 248, 0.2)',
        overflow: 'hidden',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), height 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      className="no-print"
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.9) 100%)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#090d16',
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.4)'
            }}
          >
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>AI Resume Advisor</span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: hasAiConfigured ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                  color: hasAiConfigured ? '#34d399' : '#fbbf24',
                  border: `1px solid ${hasAiConfigured ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                  fontWeight: 600
                }}
              >
                {hasAiConfigured
                  ? (aiConfig.provider === 'gemini' ? (aiConfig.geminiModel || 'Gemini 3.8 Flash') : 'Local LLM')
                  : 'AI Not Configured'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Discuss changes, STAR bullet rewrites, and ATS improvements
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setIsAiConfigOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Configure Gemini API or Local LLM"
          >
            <Settings className="w-4 h-4 hover:text-sky-400" />
          </button>

          <button
            type="button"
            onClick={handleClearHistory}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Clear Chat Conversation"
          >
            <Trash2 className="w-4 h-4 hover:text-rose-400" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
            title={isExpanded ? 'Collapse width' : 'Expand width'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 hover:text-sky-400" />
            ) : (
              <Maximize2 className="w-4 h-4 hover:text-sky-400" />
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Close Chat"
          >
            <X className="w-4 h-4 hover:text-white" />
          </button>
        </div>
      </div>

      {/* AI Not Configured Alert Banner */}
      {!hasAiConfigured && (
        <div
          style={{
            padding: '8px 14px',
            background: 'rgba(251, 191, 36, 0.1)',
            borderBottom: '1px solid rgba(251, 191, 36, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '12px',
            color: '#fbbf24'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Add your Gemini API Key or Local LLM to start chatting.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAiConfigOpen(true)}
            style={{
              padding: '3px 8px',
              background: '#fbbf24',
              color: '#090d16',
              fontWeight: 700,
              fontSize: '11px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Configure AI
          </button>
        </div>
      )}

      {/* Messages Conversation Stream */}
      <div
        className="custom-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const suggestedSummary = msg.suggestedSummary || extractSuggestedSummary(msg.content);

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: '4px',
                width: '100%'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  maxWidth: isUser ? '85%' : '95%',
                  flexDirection: isUser ? 'row-reverse' : 'row'
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: isUser
                      ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)'
                      : 'rgba(30, 41, 59, 0.9)',
                    border: isUser ? 'none' : '1px solid rgba(56, 189, 248, 0.3)',
                    color: isUser ? '#090d16' : '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div
                  style={{
                    background: isUser
                      ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                      : 'rgba(21, 30, 48, 0.85)',
                    border: isUser
                      ? '1px solid rgba(56, 189, 248, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    color: isUser ? '#ffffff' : 'var(--text-primary)',
                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    lineHeight: 1.55,
                    boxShadow: isUser
                      ? '0 4px 12px rgba(2, 132, 199, 0.25)'
                      : '0 4px 12px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  {isUser ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  ) : (
                    renderFormattedText(msg.content)
                  )}

                  {/* One-Click Apply Summary Action */}
                  {!isUser && suggestedSummary && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#38bdf8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Suggested Executive Summary:</span>
                      </div>
                      <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#e2e8f0' }}>
                        "{suggestedSummary}"
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplySummary(msg.id, suggestedSummary)}
                        style={{
                          alignSelf: 'flex-start',
                          marginTop: '4px',
                          padding: '5px 12px',
                          borderRadius: '4px',
                          background: appliedSummaryId === msg.id
                            ? 'rgba(52, 211, 153, 0.2)'
                            : 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                          color: appliedSummaryId === msg.id ? '#34d399' : '#090d16',
                          border: appliedSummaryId === msg.id ? '1px solid #34d399' : 'none',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        {appliedSummaryId === msg.id ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Applied to Resume!</span>
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-3 h-3" />
                            <span>Apply as Resume Summary</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamp & Copy Action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 4px',
                  fontSize: '10px',
                  color: 'var(--text-muted)'
                }}
              >
                <span>{msg.timestamp}</span>
                {!isUser && (
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(msg.id, msg.content)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedId === msg.id ? '#34d399' : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Copy message"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading / Thinking Indicator */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div
              style={{
                padding: '8px 14px',
                borderRadius: '12px',
                background: 'rgba(21, 30, 48, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#38bdf8'
              }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing resume & formulating suggestions...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Starter Prompts Horizontal Scroll / Wrap */}
      {messages.length <= 3 && !isLoading && (
        <div
          style={{
            padding: '8px 14px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px'
          }}
        >
          {starterPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(p.prompt)}
              style={{
                padding: '5px 10px',
                borderRadius: '14px',
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: '#cbd5e1',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
                e.currentTarget.style.color = '#38bdf8';
                e.currentTarget.style.borderColor = '#38bdf8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
                e.currentTarget.style.color = '#cbd5e1';
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)';
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Form Bar */}
      <div
        style={{
          padding: '12px 14px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your resume, bullet rewrites, or ATS optimization..."
            rows={2}
            style={{
              flex: 1,
              resize: 'none',
              background: 'rgba(2, 6, 23, 0.75)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              lineHeight: 1.4,
              outline: 'none',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--border-focus)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            style={{
              height: '42px',
              padding: '0 14px',
              borderRadius: 'var(--radius-sm)',
              background: inputValue.trim() && !isLoading
                ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)'
                : 'rgba(30, 41, 59, 0.6)',
              color: inputValue.trim() && !isLoading ? '#090d16' : 'var(--text-muted)',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
              boxShadow: inputValue.trim() && !isLoading ? '0 0 10px rgba(56, 189, 248, 0.3)' : 'none'
            }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: 'var(--text-muted)',
            padding: '0 2px'
          }}
        >
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>Context: Live Resume Synced</span>
        </div>
      </div>
    </div>
  );
}