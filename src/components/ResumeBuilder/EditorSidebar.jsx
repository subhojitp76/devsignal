import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateLlmCompletion } from '../../services/llmService';
import { 
  User, 
  FileText, 
  Briefcase, 
  Code, 
  GraduationCap, 
  Award, 
  Plus, 
  Trash2, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  ChevronRight,
  BookOpen,
  ArrowUpDown,
  RotateCcw,
  FolderGit2
} from 'lucide-react';
import { DEFAULT_SECTION_ORDER, SECTION_ORDER_PRESETS } from '../../constants/defaultData';
import { formatProfileHandle } from '../../utils/linkUtils';

const SECTION_INFO = {
  summary: { label: 'Professional Summary', icon: FileText, color: 'text-amber-400' },
  skills: { label: 'Technical Skills Matrix', icon: Code, color: 'text-emerald-400' },
  experience: { label: 'Work Experience', icon: Briefcase, color: 'text-sky-400' },
  projects: { label: 'Featured Projects', icon: FolderGit2, color: 'text-purple-400' },
  education: { label: 'Education', icon: GraduationCap, color: 'text-indigo-400' },
  certifications: { label: 'Certifications & Achievements', icon: Award, color: 'text-amber-400' }
};

export default function EditorSidebar({ onOpenJournalExtractor }) {
  const { resumeData, updateResumeData, aiConfig, showToast } = useApp();

  // Accordion active sections
  const [openSections, setOpenSections] = useState({
    sectionOrder: false,
    personal: true,
    summary: false,
    experience: true,
    projects: false,
    skills: false,
    education: false,
    certifications: false
  });

  const [polishingField, setPolishingField] = useState(null);

  const toggleSection = (sec) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Generic updater for personal info
  const handlePersonalChange = (field, val) => {
    updateResumeData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: val }
    }));
  };

  // AI Polish for Summary
  const handlePolishSummary = async () => {
    if (!resumeData.summary) return;
    setPolishingField('summary');
    try {
      const prompt = `Polish and strengthen this software engineer resume summary. Make it punchy, technical, and metrics-driven while preserving factual accuracy:
"${resumeData.summary}"

Output ONLY the revised 2-3 sentence summary without quotes or filler.`;

      const polished = await generateLlmCompletion({
        prompt,
        systemInstruction: 'You are a senior tech recruiter and engineering leader.',
        aiConfig
      });

      updateResumeData(prev => ({ ...prev, summary: polished.trim().replace(/^["']|["']$/g, '') }));
      showToast('Summary polished with AI!', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to polish summary', 'error');
    } finally {
      setPolishingField(null);
    }
  };

  // AI Polish for an individual bullet point
  const handlePolishBullet = async (expId, bulletIndex, currentText) => {
    if (!currentText) return;
    const key = `${expId}-${bulletIndex}`;
    setPolishingField(key);

    try {
      const prompt = `Improve this software engineer resume bullet point using the STAR method (Action Verb + Technical Implementation + Quantifiable Result / Metric):
Current: "${currentText}"

Output ONLY the single revised bullet point without bullet symbol or quotation marks.`;

      const polished = await generateLlmCompletion({
        prompt,
        systemInstruction: 'You write world-class software engineering resume bullets.',
        aiConfig
      });

      updateResumeData(prev => ({
        ...prev,
        experience: prev.experience.map(exp => {
          if (exp.id === expId) {
            const newBullets = [...exp.bullets];
            newBullets[bulletIndex] = polished.trim().replace(/^[-*•]\s*/, '').replace(/^["']|["']$/g, '');
            return { ...exp, bullets: newBullets };
          }
          return exp;
        })
      }));

      showToast('Bullet point enhanced with STAR format!', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to polish bullet', 'error');
    } finally {
      setPolishingField(null);
    }
  };

  // Experience Handlers
  const addExperience = () => {
    const newExp = {
      id: `exp-${Date.now()}`,
      role: 'Backend Engineer',
      company: 'Tech Enterprise',
      location: 'Remote',
      startDate: '2023',
      endDate: 'Present',
      current: true,
      bullets: ['Engineered scalable microservices handling concurrent requests with low latency.']
    };
    updateResumeData(prev => ({ ...prev, experience: [newExp, ...prev.experience] }));
  };

  const removeExperience = (id) => {
    updateResumeData(prev => ({ ...prev, experience: prev.experience.filter(e => e.id !== id) }));
  };

  const updateExperienceField = (id, field, val) => {
    updateResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(e => e.id === id ? { ...e, [field]: val } : e)
    }));
  };

  const addExperienceBullet = (expId) => {
    updateResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(e => e.id === expId ? { ...e, bullets: [...e.bullets, ''] } : e)
    }));
  };

  const updateExperienceBullet = (expId, bIdx, val) => {
    updateResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(e => {
        if (e.id === expId) {
          const bullets = [...e.bullets];
          bullets[bIdx] = val;
          return { ...e, bullets };
        }
        return e;
      })
    }));
  };

  const removeExperienceBullet = (expId, bIdx) => {
    updateResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(e => {
        if (e.id === expId) {
          return { ...e, bullets: e.bullets.filter((_, idx) => idx !== bIdx) };
        }
        return e;
      })
    }));
  };

  // Projects Handlers
  const addProject = () => {
    updateResumeData(prev => {
      const currentList = prev.projects || [];
      const num = currentList.length + 1;
      const newProj = {
        id: `proj-${Date.now()}`,
        name: `Project ${num}`,
        techStack: 'Tech Stack / Tools',
        link: '',
        bullets: ['Engineered scalable solution delivering measurable performance improvements.']
      };
      return { ...prev, projects: [newProj, ...currentList] };
    });
  };

  const removeProject = (id) => {
    updateResumeData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
  };

  const updateProjectField = (id, field, val) => {
    updateResumeData(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, [field]: val } : p)
    }));
  };

  // Education Handlers
  const addEducation = () => {
    const newEdu = {
      id: `edu-${Date.now()}`,
      degree: 'B.S. in Computer Science',
      institution: 'University Name',
      location: 'City, State',
      startDate: '2018',
      endDate: '2022',
      gpa: '',
      highlights: ''
    };
    updateResumeData(prev => ({
      ...prev,
      education: [...(prev.education || []), newEdu]
    }));
  };

  const removeEducation = (id) => {
    updateResumeData(prev => ({
      ...prev,
      education: (prev.education || []).filter(e => e.id !== id)
    }));
  };

  const updateEducationField = (id, field, val) => {
    updateResumeData(prev => ({
      ...prev,
      education: (prev.education || []).map(e => e.id === id ? { ...e, [field]: val } : e)
    }));
  };

  // Certifications Handlers
  const addCertification = () => {
    const newCert = {
      id: `cert-${Date.now()}`,
      title: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2023'
    };
    updateResumeData(prev => ({
      ...prev,
      certifications: [...(prev.certifications || []), newCert]
    }));
  };

  const removeCertification = (id) => {
    updateResumeData(prev => ({
      ...prev,
      certifications: (prev.certifications || []).filter(c => c.id !== id)
    }));
  };

  const updateCertificationField = (id, field, val) => {
    updateResumeData(prev => ({
      ...prev,
      certifications: (prev.certifications || []).map(c => c.id === id ? { ...c, [field]: val } : c)
    }));
  };

  // Current Section Order & Ranking Helper
  const currentSectionOrder = (resumeData.sectionOrder && resumeData.sectionOrder.length > 0)
    ? resumeData.sectionOrder
    : DEFAULT_SECTION_ORDER;

  const getSectionRank = (secKey) => {
    const idx = currentSectionOrder.indexOf(secKey);
    return idx >= 0 ? idx + 1 : null;
  };

  // Section Level Reordering
  const moveSection = (index, direction) => {
    const order = [...currentSectionOrder];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= order.length) return;
    const temp = order[index];
    order[index] = order[targetIdx];
    order[targetIdx] = temp;
    updateResumeData(prev => ({ ...prev, sectionOrder: order }));
    showToast(`Moved ${SECTION_INFO[temp]?.label || temp} ${direction}`, 'info');
  };

  const applyPresetOrder = (preset) => {
    updateResumeData(prev => ({ ...prev, sectionOrder: [...preset.order] }));
    showToast(`Applied preset: ${preset.label}`, 'success');
  };

  const resetSectionOrder = () => {
    updateResumeData(prev => ({ ...prev, sectionOrder: [...DEFAULT_SECTION_ORDER] }));
    showToast('Reset to standard SWE layout', 'info');
  };

  // Item Level Reordering: Experience
  const moveExperience = (index, direction) => {
    const list = [...(resumeData.experience || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    updateResumeData(prev => ({ ...prev, experience: list }));
    showToast(`Moved role "${temp.role || temp.company}" ${direction}`, 'info');
  };

  const moveExperienceBullet = (expId, bIdx, direction) => {
    updateResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => {
        if (exp.id === expId) {
          const bullets = [...exp.bullets];
          const target = direction === 'up' ? bIdx - 1 : bIdx + 1;
          if (target < 0 || target >= bullets.length) return exp;
          const temp = bullets[bIdx];
          bullets[bIdx] = bullets[target];
          bullets[target] = temp;
          return { ...exp, bullets };
        }
        return exp;
      })
    }));
  };

  // Item Level Reordering: Projects
  const moveProject = (index, direction) => {
    const list = [...(resumeData.projects || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    updateResumeData(prev => ({ ...prev, projects: list }));
    showToast(`Moved project "${temp.name || 'Project'}" ${direction}`, 'info');
  };

  // Item Level Reordering: Skills
  const moveSkillCategory = (index, direction) => {
    const list = [...(resumeData.skillCategories || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    updateResumeData(prev => ({ ...prev, skillCategories: list }));
    showToast(`Moved category "${temp.category}" ${direction}`, 'info');
  };

  // Item Level Reordering: Education
  const moveEducation = (index, direction) => {
    const list = [...(resumeData.education || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    updateResumeData(prev => ({ ...prev, education: list }));
    showToast(`Moved education entry ${direction}`, 'info');
  };

  // Item Level Reordering: Certifications
  const moveCertification = (index, direction) => {
    const list = [...(resumeData.certifications || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    updateResumeData(prev => ({ ...prev, certifications: list }));
    showToast(`Moved certification ${direction}`, 'info');
  };

  const expandAll = () => {
    setOpenSections({
      sectionOrder: true,
      personal: true,
      summary: true,
      experience: true,
      projects: true,
      skills: true,
      education: true,
      certifications: true
    });
  };

  const collapseAll = () => {
    setOpenSections({
      sectionOrder: false,
      personal: false,
      summary: false,
      experience: false,
      projects: false,
      skills: false,
      education: false,
      certifications: false
    });
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '480px',
      flex: '1 1 440px',
      height: '100%',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      paddingRight: '8px'
    }} className="no-print">
      
      {/* Action Banner: Journal Bridge */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(52, 211, 153, 0.15) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen className="w-4 h-4 text-sky-400" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
            Have work in your Dev Journal?
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenJournalExtractor}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-primary)',
            color: '#090d16',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}
        >
          Import to Resume
        </button>
      </div>

      {/* Quick Section Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 4px',
        flexShrink: 0
      }}>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>
          Resume Sections
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={expandAll}
            style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}
          >
            Expand All
          </button>
          <span style={{ color: 'var(--border-medium)', fontSize: '10px' }}>•</span>
          <button
            type="button"
            onClick={collapseAll}
            style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Accordion 1: Personal Info */}
      <div className="glass-panel" style={{ overflow: 'hidden', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => toggleSection('personal')}
          style={{
            width: '100%',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
            fontSize: '13px',
            fontWeight: 600,
            color: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User className="w-4 h-4 text-sky-400" />
            <span>Personal Information</span>
          </div>
          {openSections.personal ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {openSections.personal && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Full Name</label>
              <input
                type="text"
                value={resumeData.personalInfo.fullName}
                onChange={e => handlePersonalChange('fullName', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Professional Title</label>
              <input
                type="text"
                value={resumeData.personalInfo.title}
                onChange={e => handlePersonalChange('title', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Email</label>
                <input
                  type="email"
                  value={resumeData.personalInfo.email}
                  onChange={e => handlePersonalChange('email', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Phone</label>
                <input
                  type="text"
                  value={resumeData.personalInfo.phone}
                  onChange={e => handlePersonalChange('phone', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Location</label>
                <input
                  type="text"
                  value={resumeData.personalInfo.location}
                  onChange={e => handlePersonalChange('location', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>GitHub</label>
                <input
                  type="text"
                  value={resumeData.personalInfo.github || ''}
                  onChange={e => handlePersonalChange('github', e.target.value)}
                  onBlur={e => {
                    const clean = formatProfileHandle(e.target.value, 'github');
                    if (clean !== e.target.value) handlePersonalChange('github', clean);
                  }}
                  placeholder="e.g. subhojitp76"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>LinkedIn</label>
                <input
                  type="text"
                  value={resumeData.personalInfo.linkedin || ''}
                  onChange={e => handlePersonalChange('linkedin', e.target.value)}
                  onBlur={e => {
                    const clean = formatProfileHandle(e.target.value, 'linkedin');
                    if (clean !== e.target.value) handlePersonalChange('linkedin', clean);
                  }}
                  placeholder="e.g. subhojitp76"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Portfolio</label>
                <input
                  type="text"
                  value={resumeData.personalInfo.portfolio || ''}
                  onChange={e => handlePersonalChange('portfolio', e.target.value)}
                  onBlur={e => {
                    const clean = formatProfileHandle(e.target.value, 'portfolio');
                    if (clean !== e.target.value) handlePersonalChange('portfolio', clean);
                  }}
                  placeholder="e.g. subhadeep.engineer"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section Order & Presets Accordion */}
      <div className="glass-panel" style={{
        overflow: 'hidden',
        flexShrink: 0,
        border: '1px solid rgba(56, 189, 248, 0.3)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.45) 100%)'
      }}>
        <button
          type="button"
          onClick={() => toggleSection('sectionOrder')}
          style={{
            width: '100%',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.7)',
            fontSize: '13px',
            fontWeight: 700,
            color: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowUpDown className="w-4 h-4 text-sky-400" />
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Section Order & Presets</span>
              <span style={{
                fontSize: '9.5px',
                fontWeight: 700,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '1px 6px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.4px'
              }}>
                Reorderable
              </span>
            </span>
          </div>
          {openSections.sectionOrder ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {openSections.sectionOrder && (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Quick presets */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Quick Hierarchy Presets:
                </span>
                <button
                  type="button"
                  onClick={resetSectionOrder}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10.5px',
                    color: '#94a3b8',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  title="Reset to default standard SWE order"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {SECTION_ORDER_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPresetOrder(preset)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      color: '#f1f5f9',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={preset.subtitle}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reorderable Section List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Active Layout Order (Top to Bottom):
              </span>
              {currentSectionOrder.map((secKey, idx) => {
                const info = SECTION_INFO[secKey] || { label: secKey, icon: FileText, color: 'text-sky-400' };
                const IconComponent = info.icon;
                return (
                  <div
                    key={secKey}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        fontSize: '10.5px',
                        fontWeight: 700
                      }}>
                        #{idx + 1}
                      </span>
                      <IconComponent className={`w-4 h-4 ${info.color}`} />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                        {info.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <button
                        type="button"
                        onClick={() => moveSection(idx, 'up')}
                        disabled={idx === 0}
                        title={`Move ${info.label} up`}
                        style={{
                          padding: '4px 6px',
                          borderRadius: '4px',
                          background: idx === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                          color: idx === 0 ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                          border: 'none',
                          cursor: idx === 0 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(idx, 'down')}
                        disabled={idx === currentSectionOrder.length - 1}
                        title={`Move ${info.label} down`}
                        style={{
                          padding: '4px 6px',
                          borderRadius: '4px',
                          background: idx === currentSectionOrder.length - 1 ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                          color: idx === currentSectionOrder.length - 1 ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                          border: 'none',
                          cursor: idx === currentSectionOrder.length - 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Summary */}
      <div className="glass-panel" style={{ overflow: 'hidden', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => toggleSection('summary')}
          style={{
            width: '100%',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
            fontSize: '13px',
            fontWeight: 600,
            color: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Professional Summary</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-muted)'
            }} title={`Position #${getSectionRank('summary')} in Resume Layout`}>
              #{getSectionRank('summary')}
            </span>
            {openSections.summary ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {openSections.summary && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Section Position Quick Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Position on Resume: <strong style={{ color: '#38bdf8' }}>#{getSectionRank('summary')} of {currentSectionOrder.length}</strong>
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => moveSection(currentSectionOrder.indexOf('summary'), 'up')}
                  disabled={currentSectionOrder.indexOf('summary') === 0}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: currentSectionOrder.indexOf('summary') === 0 ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    border: '1px solid var(--border-subtle)',
                    cursor: currentSectionOrder.indexOf('summary') === 0 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Summary section up"
                >
                  ▲ Move Up
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(currentSectionOrder.indexOf('summary'), 'down')}
                  disabled={currentSectionOrder.indexOf('summary') === currentSectionOrder.length - 1}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: currentSectionOrder.indexOf('summary') === currentSectionOrder.length - 1 ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    border: '1px solid var(--border-subtle)',
                    cursor: currentSectionOrder.indexOf('summary') === currentSectionOrder.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Summary section down"
                >
                  ▼ Move Down
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              value={resumeData.summary}
              onChange={e => updateResumeData(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Concise overview of your technical expertise..."
              style={{ width: '100%', fontSize: '12px', lineHeight: 1.4 }}
            />
            <button
              type="button"
              onClick={handlePolishSummary}
              disabled={polishingField === 'summary'}
              style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              <Sparkles className={`w-3.5 h-3.5 ${polishingField === 'summary' ? 'animate-spin' : ''}`} />
              <span>{polishingField === 'summary' ? 'Polishing...' : '⚡ AI Polish Summary'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Accordion 3: Work Experience */}
      <div className="glass-panel" style={{ overflow: 'hidden', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => toggleSection('experience')}
          style={{
            width: '100%',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
            fontSize: '13px',
            fontWeight: 600,
            color: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase className="w-4 h-4 text-sky-400" />
            <span>Work Experience ({resumeData.experience.length})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-muted)'
            }} title={`Position #${getSectionRank('experience')} in Resume Layout`}>
              #{getSectionRank('experience')}
            </span>
            {openSections.experience ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {openSections.experience && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Section Position Quick Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Position on Resume: <strong style={{ color: '#38bdf8' }}>#{getSectionRank('experience')} of {currentSectionOrder.length}</strong>
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => moveSection(currentSectionOrder.indexOf('experience'), 'up')}
                  disabled={currentSectionOrder.indexOf('experience') === 0}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: currentSectionOrder.indexOf('experience') === 0 ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    border: '1px solid var(--border-subtle)',
                    cursor: currentSectionOrder.indexOf('experience') === 0 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Work Experience section up"
                >
                  ▲ Move Up
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(currentSectionOrder.indexOf('experience'), 'down')}
                  disabled={currentSectionOrder.indexOf('experience') === currentSectionOrder.length - 1}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: currentSectionOrder.indexOf('experience') === currentSectionOrder.length - 1 ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    border: '1px solid var(--border-subtle)',
                    cursor: currentSectionOrder.indexOf('experience') === currentSectionOrder.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Work Experience section down"
                >
                  ▼ Move Down
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={addExperience}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px dashed var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Role</span>
            </button>

            {resumeData.experience.map((exp, expIdx) => (
              <div key={exp.id} style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>
                      #{expIdx + 1}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                      {exp.role || 'New Role'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => moveExperience(expIdx, 'up')}
                      disabled={expIdx === 0}
                      title="Move role up"
                      style={{
                        padding: '4px',
                        color: expIdx === 0 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: expIdx === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronUp className="w-3.5 h-3.5 hover:text-sky-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveExperience(expIdx, 'down')}
                      disabled={expIdx === resumeData.experience.length - 1}
                      title="Move role down"
                      style={{
                        padding: '4px',
                        color: expIdx === resumeData.experience.length - 1 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: expIdx === resumeData.experience.length - 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronDown className="w-3.5 h-3.5 hover:text-sky-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExperience(exp.id)}
                      style={{ color: 'var(--text-muted)', padding: '4px', marginLeft: '2px' }}
                      title="Delete role"
                    >
                      <Trash2 className="w-3.5 h-3.5 hover:text-rose-400" />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Role Title</label>
                    <input
                      type="text"
                      value={exp.role}
                      onChange={e => updateExperienceField(exp.id, 'role', e.target.value)}
                      style={{ width: '100%', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Company</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={e => updateExperienceField(exp.id, 'company', e.target.value)}
                      style={{ width: '100%', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Start Date</label>
                    <input
                      type="text"
                      value={exp.startDate}
                      onChange={e => updateExperienceField(exp.id, 'startDate', e.target.value)}
                      style={{ width: '100%', fontSize: '11px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>End Date</label>
                    <input
                      type="text"
                      value={exp.endDate}
                      onChange={e => updateExperienceField(exp.id, 'endDate', e.target.value)}
                      placeholder="Present"
                      style={{ width: '100%', fontSize: '11px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Location</label>
                    <input
                      type="text"
                      value={exp.location}
                      onChange={e => updateExperienceField(exp.id, 'location', e.target.value)}
                      style={{ width: '100%', fontSize: '11px' }}
                    />
                  </div>
                </div>

                {/* Bullets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Achievement Bullets
                  </label>
                  {exp.bullets.map((b, bIdx) => {
                    const polishKey = `${exp.id}-${bIdx}`;
                    return (
                      <div key={bIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <button
                            type="button"
                            onClick={() => moveExperienceBullet(exp.id, bIdx, 'up')}
                            disabled={bIdx === 0}
                            style={{
                              padding: '2px',
                              color: bIdx === 0 ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-muted)',
                              background: 'transparent',
                              border: 'none',
                              cursor: bIdx === 0 ? 'not-allowed' : 'pointer'
                            }}
                            title="Move bullet up"
                          >
                            <ChevronUp className="w-3 h-3 hover:text-sky-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveExperienceBullet(exp.id, bIdx, 'down')}
                            disabled={bIdx === exp.bullets.length - 1}
                            style={{
                              padding: '2px',
                              color: bIdx === exp.bullets.length - 1 ? 'rgba(255, 255, 255, 0.15)' : 'var(--text-muted)',
                              background: 'transparent',
                              border: 'none',
                              cursor: bIdx === exp.bullets.length - 1 ? 'not-allowed' : 'pointer'
                            }}
                            title="Move bullet down"
                          >
                            <ChevronDown className="w-3 h-3 hover:text-sky-400" />
                          </button>
                        </div>

                        <textarea
                          rows={2}
                          value={b}
                          onChange={e => updateExperienceBullet(exp.id, bIdx, e.target.value)}
                          placeholder="Action verb + what you built + measurable impact..."
                          style={{ flex: 1, fontSize: '11px', lineHeight: 1.3 }}
                        />
                        <button
                          type="button"
                          onClick={() => handlePolishBullet(exp.id, bIdx, b)}
                          disabled={polishingField === polishKey}
                          style={{
                            padding: '6px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.2)'
                          }}
                          title="Improve with STAR framework"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${polishingField === polishKey ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExperienceBullet(exp.id, bIdx)}
                          style={{ color: 'var(--text-muted)', padding: '4px' }}
                          title="Remove bullet"
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => addExperienceBullet(exp.id)}
                    style={{ fontSize: '11px', color: '#38bdf8', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Bullet Point</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accordion 4: Projects */}
      <div className="glass-panel" style={{ overflow: 'hidden', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => toggleSection('projects')}
          style={{
            width: '100%',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
            fontSize: '13px',
            fontWeight: 600,
            color: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code className="w-4 h-4 text-purple-400" />
            <span>Key Projects ({resumeData.projects.length})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-muted)'
            }} title={`Position #${getSectionRank('projects')} in Resume Layout`}>
              #{getSectionRank('projects')}
            </span>
            {openSections.projects ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {openSections.projects && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Section Position Quick Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Position on Resume: <strong style={{ color: '#38bdf8' }}>#{getSectionRank('projects')} of {currentSectionOrder.length}</strong>
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => moveSection(currentSectionOrder.indexOf('projects'), 'up')}
                  disabled={currentSectionOrder.indexOf('projects') === 0}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: currentSectionOrder.indexOf('projects') === 0 ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    border: '1px solid var(--border-subtle)',
                    cursor: currentSectionOrder.indexOf('projects') === 0 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Projects section up"
                >
                  ▲ Move Up
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(currentSectionOrder.indexOf('projects'), 'down')}
                  disabled={currentSectionOrder.indexOf('projects') === currentSectionOrder.length - 1}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: currentSectionOrder.indexOf('projects') === currentSectionOrder.length - 1 ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    border: '1px solid var(--border-subtle)',
                    cursor: currentSectionOrder.indexOf('projects') === currentSectionOrder.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Projects section down"
                >
                  ▼ Move Down
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={addProject}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px dashed var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <Plus className="w-3.5 h-3.5 text-purple-400" />
              <span>Add Project</span>
            </button>

            {resumeData.projects.map((proj, projIdx) => (
              <div key={proj.id} style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>
                      #{projIdx + 1}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                      {proj.name || 'New Project'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => moveProject(projIdx, 'up')}
                      disabled={projIdx === 0}
                      title="Move project up"
                      style={{
                        padding: '4px',
                        color: projIdx === 0 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: projIdx === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronUp className="w-3.5 h-3.5 hover:text-purple-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveProject(projIdx, 'down')}
                      disabled={projIdx === resumeData.projects.length - 1}
                      title="Move project down"
                      style={{
                        padding: '4px',
                        color: projIdx === resumeData.projects.length - 1 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: projIdx === resumeData.projects.length - 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronDown className="w-3.5 h-3.5 hover:text-purple-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProject(proj.id)}
                      style={{ color: 'var(--text-muted)', padding: '4px', marginLeft: '2px' }}
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5 hover:text-rose-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Project Name</label>
                  <input
                    type="text"
                    value={proj.name}
                    onChange={e => updateProjectField(proj.id, 'name', e.target.value)}
                    style={{ width: '100%', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Repository / Demo Link</label>
                    <input
                      type="text"
                      value={proj.link || ''}
                      onChange={e => updateProjectField(proj.id, 'link', e.target.value)}
                      placeholder="github.com/username/project"
                      style={{ width: '100%', fontSize: '11px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Date / Period (Optional)</label>
                    <input
                      type="text"
                      value={proj.date || ''}
                      onChange={e => updateProjectField(proj.id, 'date', e.target.value)}
                      placeholder="e.g. Jan 2025 - Present"
                      style={{ width: '100%', fontSize: '11px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Tech Stack / Tools</label>
                  <input
                    type="text"
                    value={proj.techStack || ''}
                    onChange={e => updateProjectField(proj.id, 'techStack', e.target.value)}
                    placeholder="Go, Raft, gRPC, Redis, Docker"
                    style={{ width: '100%', fontSize: '11px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    Description / Bullets
                  </label>
                  <textarea
                    rows={2}
                    value={proj.bullets.join('\n')}
                    onChange={e => updateProjectField(proj.id, 'bullets', e.target.value.split('\n'))}
                    placeholder="Describe implementation and performance achievements..."
                    style={{ width: '100%', fontSize: '11px', lineHeight: 1.3 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accordion 5: Skills */}
      <div className="glass-panel" style={{ overflow: 'hidden', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => toggleSection('skills')}
          style={{
            width: '100%',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
            fontSize: '13px',
            fontWeight: 600,
            color: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code className="w-4 h-4 text-emerald-400" />
            <span>Technical Skills Categories</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-muted)'
            }} title={`Position #${getSectionRank('skills')} in Resume Layout`}>
              #{getSectionRank('skills')}
            </span>
            {openSections.skills ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {openSections.skills && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Section Position Quick Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Position on Resume: <strong style={{ color: '#38bdf8' }}>#{getSectionRank('skills')} of {currentSectionOrder.length}</strong>
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => moveSection(currentSectionOrder.indexOf('skills'), 'up')}
                  disabled={currentSectionOrder.indexOf('skills') === 0}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: currentSectionOrder.indexOf('skills') === 0 ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    border: '1px solid var(--border-subtle)',
                    cursor: currentSectionOrder.indexOf('skills') === 0 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Skills section up"
                >
                  ▲ Move Up
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(currentSectionOrder.indexOf('skills'), 'down')}
                  disabled={currentSectionOrder.indexOf('skills') === currentSectionOrder.length - 1}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: currentSectionOrder.indexOf('skills') === currentSectionOrder.length - 1 ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    border: '1px solid var(--border-subtle)',
                    cursor: currentSectionOrder.indexOf('skills') === currentSectionOrder.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Skills section down"
                >
                  ▼ Move Down
                </button>
              </div>
            </div>

            {resumeData.skillCategories.map((cat, catIdx) => (
              <div key={cat.id} style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '1px 5px',
                      borderRadius: '3px'
                    }}>
                      #{catIdx + 1}
                    </span>
                    <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#f8fafc' }}>
                      {cat.category}
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <button
                      type="button"
                      onClick={() => moveSkillCategory(catIdx, 'up')}
                      disabled={catIdx === 0}
                      title="Move skill category up"
                      style={{
                        padding: '3px 5px',
                        color: catIdx === 0 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: catIdx === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronUp className="w-3.5 h-3.5 hover:text-emerald-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSkillCategory(catIdx, 'down')}
                      disabled={catIdx === resumeData.skillCategories.length - 1}
                      title="Move skill category down"
                      style={{
                        padding: '3px 5px',
                        color: catIdx === resumeData.skillCategories.length - 1 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: catIdx === resumeData.skillCategories.length - 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronDown className="w-3.5 h-3.5 hover:text-emerald-400" />
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={cat.skills.join(', ')}
                  onChange={e => {
                    const newSkills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    updateResumeData(prev => ({
                      ...prev,
                      skillCategories: prev.skillCategories.map(c => c.id === cat.id ? { ...c, skills: newSkills } : c)
                    }));
                  }}
                  style={{ width: '100%', fontSize: '12px' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accordion 6: Education */}
      <div className="glass-panel" style={{ overflow: 'hidden', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => toggleSection('education')}
          style={{
            width: '100%',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
            fontSize: '13px',
            fontWeight: 600,
            color: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GraduationCap className="w-4 h-4 text-sky-400" />
            <span>Education ({(resumeData.education || []).length})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-muted)'
            }} title={`Position #${getSectionRank('education')} in Resume Layout`}>
              #{getSectionRank('education')}
            </span>
            {openSections.education ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {openSections.education && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Section Position Quick Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Position on Resume: <strong style={{ color: '#38bdf8' }}>#{getSectionRank('education')} of {currentSectionOrder.length}</strong>
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => moveSection(currentSectionOrder.indexOf('education'), 'up')}
                  disabled={currentSectionOrder.indexOf('education') === 0}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: currentSectionOrder.indexOf('education') === 0 ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    border: '1px solid var(--border-subtle)',
                    cursor: currentSectionOrder.indexOf('education') === 0 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Education section up"
                >
                  ▲ Move Up
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(currentSectionOrder.indexOf('education'), 'down')}
                  disabled={currentSectionOrder.indexOf('education') === currentSectionOrder.length - 1}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: currentSectionOrder.indexOf('education') === currentSectionOrder.length - 1 ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    border: '1px solid var(--border-subtle)',
                    cursor: currentSectionOrder.indexOf('education') === currentSectionOrder.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Education section down"
                >
                  ▼ Move Down
                </button>
              </div>
            </div>

            {/* Bottom Layout Selector */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '8px 10px', 
              background: 'rgba(15, 23, 42, 0.4)', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid var(--border-subtle)' 
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bottom Sections Layout:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => updateResumeData(prev => ({ ...prev, bottomLayout: 'grid' }))}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    background: (resumeData.bottomLayout || 'grid') === 'grid' ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.6)',
                    color: (resumeData.bottomLayout || 'grid') === 'grid' ? '#090d16' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  2-Col Grid
                </button>
                <button
                  type="button"
                  onClick={() => updateResumeData(prev => ({ ...prev, bottomLayout: 'stacked' }))}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    background: (resumeData.bottomLayout || 'grid') === 'stacked' ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.6)',
                    color: (resumeData.bottomLayout || 'grid') === 'stacked' ? '#090d16' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Stacked
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={addEducation}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px dashed var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Add Education</span>
            </button>

            {(resumeData.education || []).map((edu, eduIdx) => (
              <div key={edu.id} style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>
                      #{eduIdx + 1}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                      {edu.degree || 'Degree'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => moveEducation(eduIdx, 'up')}
                      disabled={eduIdx === 0}
                      title="Move education up"
                      style={{
                        padding: '4px',
                        color: eduIdx === 0 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: eduIdx === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronUp className="w-3.5 h-3.5 hover:text-sky-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveEducation(eduIdx, 'down')}
                      disabled={eduIdx === (resumeData.education || []).length - 1}
                      title="Move education down"
                      style={{
                        padding: '4px',
                        color: eduIdx === (resumeData.education || []).length - 1 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: eduIdx === (resumeData.education || []).length - 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronDown className="w-3.5 h-3.5 hover:text-sky-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEducation(edu.id)}
                      style={{ color: 'var(--text-muted)', padding: '4px', marginLeft: '2px' }}
                      title="Delete education"
                    >
                      <Trash2 className="w-3.5 h-3.5 hover:text-rose-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Degree / Program</label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={e => updateEducationField(edu.id, 'degree', e.target.value)}
                    style={{ width: '100%', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Institution / University</label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={e => updateEducationField(edu.id, 'institution', e.target.value)}
                      style={{ width: '100%', fontSize: '11px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Location</label>
                    <input
                      type="text"
                      value={edu.location}
                      onChange={e => updateEducationField(edu.id, 'location', e.target.value)}
                      style={{ width: '100%', fontSize: '11px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Start Date</label>
                    <input
                      type="text"
                      value={edu.startDate}
                      onChange={e => updateEducationField(edu.id, 'startDate', e.target.value)}
                      style={{ width: '100%', fontSize: '11px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>End Date</label>
                    <input
                      type="text"
                      value={edu.endDate}
                      onChange={e => updateEducationField(edu.id, 'endDate', e.target.value)}
                      style={{ width: '100%', fontSize: '11px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>GPA / CGPA</label>
                    <input
                      type="text"
                      value={edu.gpa || ''}
                      onChange={e => updateEducationField(edu.id, 'gpa', e.target.value)}
                      placeholder="E.g., CGPA: 8.29 or 3.8 / 4.0"
                      style={{ width: '100%', fontSize: '11px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Honors / Coursework (Optional)</label>
                    <input
                      type="text"
                      value={edu.highlights || ''}
                      onChange={e => updateEducationField(edu.id, 'highlights', e.target.value)}
                      placeholder="E.g., Magna Cum Laude"
                      style={{ width: '100%', fontSize: '11px' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accordion 7: Certifications */}
      <div className="glass-panel" style={{ overflow: 'hidden', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => toggleSection('certifications')}
          style={{
            width: '100%',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
            fontSize: '13px',
            fontWeight: 600,
            color: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award className="w-4 h-4 text-amber-400" />
            <span>Certifications & Achievements ({(resumeData.certifications || []).length})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-muted)'
            }} title={`Position #${getSectionRank('certifications')} in Resume Layout`}>
              #{getSectionRank('certifications')}
            </span>
            {openSections.certifications ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {openSections.certifications && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Section Position Quick Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Position on Resume: <strong style={{ color: '#38bdf8' }}>#{getSectionRank('certifications')} of {currentSectionOrder.length}</strong>
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => moveSection(currentSectionOrder.indexOf('certifications'), 'up')}
                  disabled={currentSectionOrder.indexOf('certifications') === 0}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: currentSectionOrder.indexOf('certifications') === 0 ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    border: '1px solid var(--border-subtle)',
                    cursor: currentSectionOrder.indexOf('certifications') === 0 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Certifications section up"
                >
                  ▲ Move Up
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(currentSectionOrder.indexOf('certifications'), 'down')}
                  disabled={currentSectionOrder.indexOf('certifications') === currentSectionOrder.length - 1}
                  style={{
                    padding: '2px 7px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    color: currentSectionOrder.indexOf('certifications') === currentSectionOrder.length - 1 ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    border: '1px solid var(--border-subtle)',
                    cursor: currentSectionOrder.indexOf('certifications') === currentSectionOrder.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Move Certifications section down"
                >
                  ▼ Move Down
                </button>
              </div>
            </div>

            {/* Section Title Customization */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                Section Title (Optional override)
              </label>
              <input
                type="text"
                value={resumeData.certificationsTitle || ''}
                onChange={e => updateResumeData(prev => ({ ...prev, certificationsTitle: e.target.value }))}
                placeholder="Auto (Certifications & Achievements)"
                style={{ width: '100%', fontSize: '11px' }}
              />
            </div>

            <button
              type="button"
              onClick={addCertification}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px dashed var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Certification or Achievement</span>
            </button>

            {(resumeData.certifications || []).map((cert, certIdx) => (
              <div key={cert.id} style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>
                      #{certIdx + 1}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                      {cert.title || 'Certification Title'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => moveCertification(certIdx, 'up')}
                      disabled={certIdx === 0}
                      title="Move certification up"
                      style={{
                        padding: '4px',
                        color: certIdx === 0 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: certIdx === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronUp className="w-3.5 h-3.5 hover:text-amber-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCertification(certIdx, 'down')}
                      disabled={certIdx === (resumeData.certifications || []).length - 1}
                      title="Move certification down"
                      style={{
                        padding: '4px',
                        color: certIdx === (resumeData.certifications || []).length - 1 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: certIdx === (resumeData.certifications || []).length - 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ChevronDown className="w-3.5 h-3.5 hover:text-amber-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCertification(cert.id)}
                      style={{ color: 'var(--text-muted)', padding: '4px', marginLeft: '2px' }}
                      title="Delete certification"
                    >
                      <Trash2 className="w-3.5 h-3.5 hover:text-rose-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Certification Name or Achievement Sentence</label>
                  <input
                    type="text"
                    value={cert.title}
                    onChange={e => updateCertificationField(cert.id, 'title', e.target.value)}
                    placeholder="e.g., AWS Solutions Architect OR Achieved Rank 494 in GATE 2022"
                    style={{ width: '100%', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Issuing Organization (optional)</label>
                    <input
                      type="text"
                      value={cert.issuer}
                      onChange={e => updateCertificationField(cert.id, 'issuer', e.target.value)}
                      placeholder="e.g., Amazon, Samsung, IIT"
                      style={{ width: '100%', fontSize: '11px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Year / Date (optional)</label>
                    <input
                      type="text"
                      value={cert.date}
                      onChange={e => updateCertificationField(cert.id, 'date', e.target.value)}
                      placeholder="2023"
                      style={{ width: '100%', fontSize: '11px' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
