import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateAtsScore, SAMPLE_JOB_DESCRIPTIONS, generateHeuristicAiAnalysis } from '../../utils/atsUtils';
import { analyzeResumeWithLlm } from '../../services/llmService';
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
  Layers,
  Bot,
  Settings
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
    aiConfig,
    setIsAiConfigOpen,
    openLearnModal
  } = useApp();

  const [jobDescriptionInput, setJobDescriptionInput] = useState(targetJobDescription || '');
  const [targetTitleInput, setTargetTitleInput] = useState(resumeData?.personalInfo?.title || '');
  const [isAuditing, setIsAuditing] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations'); // 'recommendations' | 'ai_insights' | 'matched' | 'checklist'
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(-1);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // AI-powered deep review state
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState(null);

  // Sync state if modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      if (targetJobDescription) {
        setJobDescriptionInput(targetJobDescription);
      }
      if (resumeData?.personalInfo?.title) {
        setTargetTitleInput(resumeData.personalInfo.title);
      }
      // If no score calculated yet but we have a JD, calculate it
      if (!atsScoreResult && (targetJobDescription || resumeData?.personalInfo?.title)) {
        handleRunAudit();
      }
    }
  }, [isOpen]);

  const handleSelectSample = (sample, index) => {
    setSelectedSampleIndex(index);
    setJobDescriptionInput(sample.description);
    setTargetTitleInput(sample.title);
  };

  const handleRunAudit = () => {
    if (!jobDescriptionInput.trim() && !targetTitleInput.trim()) {
      showToast('Please provide a target job title or paste a job description.', 'warning');
      return;
    }

    setIsAuditing(true);
    setAiError(null);

    // Persist target job description
    const jdToUse = jobDescriptionInput.trim();
    const titleToUse = targetTitleInput.trim();
    updateTargetJobDescription(jdToUse);

    setTimeout(() => {
      try {
        const result = calculateAtsScore(resumeData, jdToUse, titleToUse);
        updateAtsScoreResult(result);

        // Pre-generate heuristic analysis so AI tab has immediate insights
        const heuristicAi = generateHeuristicAiAnalysis(resumeData, jdToUse, titleToUse);
        setAiAnalysis(heuristicAi);

        setIsAuditing(false);

        if (result.totalScore >= 85) {
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

  const handleDeepAiAudit = async () => {
    const isGemini = aiConfig.provider === 'gemini' && aiConfig.geminiApiKey?.trim();
    const isOllama = aiConfig.provider === 'ollama' && aiConfig.ollamaBaseUrl;

    if (!isGemini && !isOllama) {
      showToast('AI Provider is not configured. Click Settings to add an API key.', 'warning');
      setIsAiConfigOpen(true);
      return;
    }

    setIsAiRunning(true);
    setAiError(null);

    try {
      const result = await analyzeResumeWithLlm(
        resumeData,
        jobDescriptionInput,
        targetTitleInput,
        aiConfig
      );
      setAiAnalysis(result);
      setActiveTab('ai_insights');
      showToast('Deep ATS AI Review finished!', 'success');
    } catch (err) {
      console.error('Deep AI audit error:', err);
      setAiError(err.message || 'Failed to complete AI deep analysis. Check provider settings.');
      showToast('AI deep audit encountered an error.', 'error');
    } finally {
      setIsAiRunning(false);
    }
  };

  const handleCopyBullet = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleAddSkill = (skillName) => {
    addSkillToResume(skillName);
    showToast(`Added "${skillName}" to your Skills section!`, 'success');
    // Re-audit with updated skills
    setTimeout(() => {
      const jdToUse = jobDescriptionInput.trim();
      const titleToUse = targetTitleInput.trim();
      if (jdToUse || titleToUse) {
        const result = calculateAtsScore(
          {
            ...resumeData,
            skills: [...(resumeData.skills || []), skillName]
          },
          jdToUse,
          titleToUse
        );
        updateAtsScoreResult(result);
      }
    }, 150);
  };

  // Filter missing skills by category
  const filteredMissingSkills = useMemo(() => {
    if (!atsScoreResult?.keywordMatch?.missingDetailed) return [];
    if (selectedCategoryFilter === 'all') {
      return atsScoreResult.keywordMatch.missingDetailed;
    }
    return atsScoreResult.keywordMatch.missingDetailed.filter(
      item => item.category === selectedCategoryFilter
    );
  }, [atsScoreResult, selectedCategoryFilter]);

  if (!isOpen) return null;

  const score = atsScoreResult?.totalScore ?? 0;
  const tierColor = atsScoreResult?.tierColor || 'slate';

  const getColorClasses = (color) => {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
          text: 'text-emerald-700 dark:text-emerald-400',
          border: 'border-emerald-500/30',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
          bar: 'bg-emerald-500'
        };
      case 'teal':
        return {
          bg: 'bg-teal-500/10 dark:bg-teal-500/20',
          text: 'text-teal-700 dark:text-teal-400',
          border: 'border-teal-500/30',
          badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
          bar: 'bg-teal-500'
        };
      case 'amber':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/20',
          text: 'text-amber-700 dark:text-amber-400',
          border: 'border-amber-500/30',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
          bar: 'bg-amber-500'
        };
      case 'rose':
      default:
        return {
          bg: 'bg-rose-500/10 dark:bg-rose-500/20',
          text: 'text-rose-700 dark:text-rose-400',
          border: 'border-rose-500/30',
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
          bar: 'bg-rose-500'
        };
    }
  };

  const themeColors = getColorClasses(tierColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-5xl my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  ATS Score & Match Optimizer
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                  Target Role Audit
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Align your resume with actual Applicant Tracking System algorithms before recruiters review it.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAiConfigOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
              title="Configure AI Provider (Gemini / Ollama)"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>AI Settings</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* JOB DESCRIPTION INPUT / TARGET ROLE SELECTOR */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Target Job Description & Role Title
                </h3>
              </div>
              
              {/* Sample JDs quick-fill */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Load Preset:
                </span>
                {SAMPLE_JOB_DESCRIPTIONS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSample(sample, idx)}
                    className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all whitespace-nowrap ${
                      selectedSampleIndex === idx
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Target Job Title
                </label>
                <input
                  type="text"
                  value={targetTitleInput}
                  onChange={(e) => setTargetTitleInput(e.target.value)}
                  placeholder="e.g. Senior Full Stack Engineer"
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Job Description / Role Requirements (paste text or keywords)
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={jobDescriptionInput}
                    onChange={(e) => setJobDescriptionInput(e.target.value)}
                    placeholder="Paste the job description, key responsibilities, or desired qualifications here..."
                    className="w-full text-xs p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                  />
                  {jobDescriptionInput && (
                    <button
                      onClick={() => setJobDescriptionInput('')}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Clear job description"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Runs 100% locally by default. Zero private data transmitted without AI consent.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunAudit}
                  disabled={isAuditing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
                  <span>{isAuditing ? 'Auditing Resume...' : 'Analyze ATS Score'}</span>
                </button>

                <button
                  onClick={handleDeepAiAudit}
                  disabled={isAiRunning}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-violet-600/20 transition-all disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAiRunning ? 'animate-spin' : ''}`} />
                  <span>{isAiRunning ? 'AI Analyzing...' : 'Deep AI Review'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* MAIN RESULTS & SCORE DASHBOARD */}
          {atsScoreResult ? (
            <div className="space-y-6">
              {/* TOP SCORE OVERVIEW BANNER */}
              <div className={`p-5 rounded-2xl border ${themeColors.border} ${themeColors.bg} transition-all`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  {/* Big Circular Score */}
                  <div className="flex items-center gap-5">
                    <div className="relative flex items-center justify-center">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="38"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-slate-200 dark:text-slate-800"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="38"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 38}
                          strokeDashoffset={2 * Math.PI * 38 * (1 - score / 100)}
                          strokeLinecap="round"
                          className={`${themeColors.text} transition-all duration-1000 ease-out`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {score}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          ATS Match
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${themeColors.badge}`}>
                          {atsScoreResult.tierLabel}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {atsScoreResult.keywordMatch.matchedCount} of {atsScoreResult.keywordMatch.totalTargetKeywords} Target Keywords Matched
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                        {atsScoreResult.summary}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                        Targeting:{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {targetTitleInput || 'General Technical Role'}
                        </span>
                        . Scores 80%+ generally pass automated resume filtering with high confidence.
                      </p>
                    </div>
                  </div>

                  {/* 4 Pillar Breakdown Bars */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-3 md:min-w-[340px]">
                    {/* Keyword Match */}
                    <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500 font-medium">Keywords</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {atsScoreResult.pillars.keywordMatch.score}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${atsScoreResult.pillars.keywordMatch.score}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Weight: {atsScoreResult.pillars.keywordMatch.weight}%
                      </span>
                    </div>

                    {/* Section Structure */}
                    <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500 font-medium">Sections</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {atsScoreResult.pillars.sectionStructure.score}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{ width: `${atsScoreResult.pillars.sectionStructure.score}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Weight: {atsScoreResult.pillars.sectionStructure.weight}%
                      </span>
                    </div>

                    {/* Content Metrics */}
                    <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500 font-medium">Action & Metrics</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {atsScoreResult.pillars.contentMetrics.score}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${atsScoreResult.pillars.contentMetrics.score}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Weight: {atsScoreResult.pillars.contentMetrics.weight}%
                      </span>
                    </div>

                    {/* ATS Friendliness */}
                    <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500 font-medium">Formatting</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {atsScoreResult.pillars.atsFriendliness.score}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${atsScoreResult.pillars.atsFriendliness.score}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Weight: {atsScoreResult.pillars.atsFriendliness.weight}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TAB NAVIGATION */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === 'recommendations'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Missing Keywords & Recommendations ({atsScoreResult.recommendations.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('ai_insights')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === 'ai_insights'
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI Recruiter Insights</span>
                  {aiAnalysis?.strengths && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('matched')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === 'matched'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Matched Skills ({atsScoreResult.keywordMatch.matched.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('checklist')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === 'checklist'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>ATS Audit Checklist ({atsScoreResult.checklist.length})</span>
                </button>
              </div>

              {/* TAB 1: RECOMMENDATIONS & MISSING KEYWORDS */}
              {activeTab === 'recommendations' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Actionable Recommendations List */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Priority Action Items to Boost Your Score
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {atsScoreResult.recommendations.map((rec, index) => {
                        const isHigh = rec.priority === 'high';
                        const isMedium = rec.priority === 'medium';
                        return (
                          <div
                            key={index}
                            className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                              isHigh
                                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                : isMedium
                                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="mt-0.5">
                              {isHigh ? (
                                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              ) : isMedium ? (
                                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  isHigh
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                                    : isMedium
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                                }`}>
                                  {rec.priority} priority
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {rec.category}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                {rec.message}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Missing Keywords Breakdown with One-Click Add */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          Missing High-Value Keywords from Job Description
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          These terms were found in the job requirements but not identified in your resume. Click to add them directly into your skills.
                        </p>
                      </div>

                      {/* Filter by Category */}
                      <div className="flex items-center gap-1">
                        {['all', 'frontend', 'backend', 'cloud', 'database', 'tools'].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategoryFilter(cat)}
                            className={`text-[10px] font-semibold px-2 py-1 rounded-md uppercase transition-colors ${
                              selectedCategoryFilter === cat
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredMissingSkills.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {filteredMissingSkills.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all group"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate capitalize">
                                  {item.skill}
                                </span>
                                {item.frequency > 1 && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                                    {item.frequency}x
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                                {item.category}
                              </span>
                            </div>

                            <button
                              onClick={() => handleAddSkill(item.skill)}
                              className="flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-900/40 dark:hover:bg-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-semibold transition-all shadow-sm"
                              title="Add to Skills section"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500">
                        No missing keywords found for the selected filter! Your resume covers these role requirements.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: AI RECRUITER INSIGHTS */}
              {activeTab === 'ai_insights' && (
                <div className="space-y-6 animate-fadeIn">
                  {aiError && (
                    <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                          AI Analysis Notice
                        </h4>
                        <p className="text-xs text-rose-700 dark:text-rose-400">
                          {aiError}
                        </p>
                      </div>
                    </div>
                  )}

                  {aiAnalysis ? (
                    <div className="space-y-6">
                      {/* Executive Summary */}
                      {aiAnalysis.executiveSummary && (
                        <div className="p-4 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-indigo-500/10 border border-violet-500/20 rounded-xl space-y-1.5">
                          <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 text-xs font-bold uppercase tracking-wider">
                            <Bot className="w-4 h-4" />
                            <span>Recruiter Executive Summary</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                            {aiAnalysis.executiveSummary}
                          </p>
                        </div>
                      )}

                      {/* 2-Column Strengths vs Gaps */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strengths */}
                        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl space-y-3">
                          <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 uppercase tracking-wider">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            Identified Resume Strengths
                          </h4>
                          <ul className="space-y-2">
                            {aiAnalysis.strengths?.map((str, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Gaps */}
                        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-3">
                          <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            Gaps & Vulnerabilities
                          </h4>
                          <ul className="space-y-2">
                            {aiAnalysis.gaps?.map((gap, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                <span className="text-amber-500 font-bold">•</span>
                                <span>{gap}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Tailored Bullet Suggestions with One-Click Copy */}
                      {aiAnalysis.tailoredBulletSuggestions?.length > 0 && (
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                              Tailored High-Impact Resume Bullets
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Optimized with the Google X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]".
                            </p>
                          </div>

                          <div className="space-y-2.5">
                            {aiAnalysis.tailoredBulletSuggestions.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-start justify-between gap-3 group hover:border-violet-400 dark:hover:border-violet-500/60 transition-all shadow-sm"
                              >
                                <div className="space-y-1">
                                  {item.role && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 uppercase tracking-wider">
                                      {item.role}
                                    </span>
                                  )}
                                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono">
                                    "{item.bullet || item}"
                                  </p>
                                </div>

                                <button
                                  onClick={() => handleCopyBullet(item.bullet || item, idx)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-violet-600 text-slate-700 hover:text-white dark:bg-slate-700 dark:hover:bg-violet-600 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
                                  title="Copy bullet"
                                >
                                  {copiedIndex === idx ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Run Deep AI Recruiter Review
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        Execute a comprehensive analysis powered by your configured LLM (Gemini or local Ollama) to extract personalized strengths, weaknesses, and Google X-Y-Z formula bullets.
                      </p>
                      <button
                        onClick={handleDeepAiAudit}
                        disabled={isAiRunning}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg shadow-md shadow-violet-600/30 transition-all"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Start Deep AI Review</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MATCHED SKILLS */}
              {activeTab === 'matched' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Skills Successfully Matched in Your Resume ({atsScoreResult.keywordMatch.matched.length})
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        These keywords from the job description are correctly detected by ATS parsers.
                      </p>
                    </div>

                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                      {Math.round((atsScoreResult.keywordMatch.matched.length / Math.max(1, atsScoreResult.keywordMatch.totalTargetKeywords)) * 100)}% Coverage
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {atsScoreResult.keywordMatch.matched.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs font-medium text-emerald-800 dark:text-emerald-300 capitalize"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: ATS AUDIT CHECKLIST */}
              {activeTab === 'checklist' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Automated ATS Compatibility Checklist
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Standard industry criteria enforced by major ATS engines (Workday, Greenhouse, Lever, Taleo).
                    </p>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/60">
                    {atsScoreResult.checklist.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 flex items-start justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {item.passed ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                <X className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                              {item.label}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {item.detail}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${
                            item.passed
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}
                        >
                          {item.passed ? 'PASSED' : 'ACTION NEEDED'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Target className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ready to audit your resume for ATS algorithms
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Paste your target job description or click one of the preset roles above, then hit <strong>"Analyze ATS Score"</strong>.
                </p>
              </div>
              <button
                onClick={handleRunAudit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Run First ATS Audit</span>
              </button>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <button
            onClick={() => openLearnModal('ats')}
            className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>How ATS Algorithms Work (Workday, Greenhouse, Lever)</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
