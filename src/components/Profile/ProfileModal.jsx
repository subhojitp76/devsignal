import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { extractTextFromPdf } from '../../services/pdfParser';
import { parseResumeContent, enhanceResumeWithAi } from '../../services/parserService';
import { 
  X, 
  Upload, 
  FileText, 
  User, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  AlertCircle,
  Briefcase,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function ProfileModal() {
  const { 
    isProfileOpen, 
    setIsProfileOpen, 
    profile, 
    updateProfile, 
    updateResumeData,
    saveResumeSnapshot,
    aiConfig,
    showToast 
  } = useApp();

  const [draftProfile, setDraftProfile] = useState({ ...profile });
  const [skillInput, setSkillInput] = useState('');
  const [rawTextPaste, setRawTextPaste] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState('');
  const [autoEnhanceWithAi, setAutoEnhanceWithAi] = useState(true);

  if (!isProfileOpen) return null;

  // Handle PDF or TXT file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseStatus(`Reading file "${file.name}"...`);

    try {
      let extractedText = '';
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setParseStatus('Extracting selectable text from PDF...');
        extractedText = await extractTextFromPdf(file);
      } else {
        extractedText = await file.text();
      }

      setParseStatus('Analyzing structure and extracting profile & resume fields...');
      let parsedData = await parseResumeContent(extractedText, aiConfig);

      if (autoEnhanceWithAi) {
        setParseStatus('AI Enhancer: Upgrading bullets with STAR methodology, action verbs & metrics...');
        try {
          parsedData = await enhanceResumeWithAi(parsedData, aiConfig);
        } catch (enhErr) {
          console.warn('AI enhancement step fallback:', enhErr);
        }
      }

      // Seed Profile with clean parsed data
      const parsedSkills = (parsedData.skillCategories || []).flatMap(c => c?.skills || []);
      const newProf = {
        ...draftProfile,
        fullName: parsedData.personalInfo?.fullName || draftProfile.fullName,
        currentTitle: parsedData.personalInfo?.title || draftProfile.currentTitle,
        targetRole: parsedData.personalInfo?.title || draftProfile.targetRole,
        email: parsedData.personalInfo?.email || draftProfile.email,
        phone: parsedData.personalInfo?.phone || draftProfile.phone,
        location: parsedData.personalInfo?.location || draftProfile.location,
        github: parsedData.personalInfo?.github || draftProfile.github,
        linkedin: parsedData.personalInfo?.linkedin || draftProfile.linkedin,
        portfolio: parsedData.personalInfo?.portfolio || draftProfile.portfolio,
        summary: parsedData.summary || draftProfile.summary,
        coreSkills: parsedSkills.length > 0 ? parsedSkills : (draftProfile.coreSkills || [])
      };

      setDraftProfile(newProf);
      updateProfile(newProf);
      updateResumeData(parsedData);

      saveResumeSnapshot({
        title: `Imported from ${file.name}`,
        description: `Parsed structure from uploaded PDF (${(file.size / 1024).toFixed(1)} KB)`,
        source: 'pdf_import',
        customResumeData: parsedData
      });

      showToast(autoEnhanceWithAi ? 'Resume parsed & AI-enhanced with STAR bullets successfully!' : 'Resume parsed! Profile and Resume Builder seeded successfully.', 'success');
      setParseStatus('');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to parse resume file', 'error');
      setParseStatus('');
    } finally {
      setIsParsing(false);
      e.target.value = '';
    }
  };

  // Handle pasted text parse
  const handlePasteParse = async () => {
    if (!rawTextPaste.trim()) return;

    setIsParsing(true);
    setParseStatus('Parsing pasted text...');

    try {
      let parsedData = await parseResumeContent(rawTextPaste, aiConfig);

      if (autoEnhanceWithAi) {
        setParseStatus('AI Enhancer: Upgrading bullets with STAR methodology, action verbs & metrics...');
        try {
          parsedData = await enhanceResumeWithAi(parsedData, aiConfig);
        } catch (enhErr) {
          console.warn('AI enhancement step fallback:', enhErr);
        }
      }

      const parsedSkills = (parsedData.skillCategories || []).flatMap(c => c?.skills || []);
      const newProf = {
        ...draftProfile,
        fullName: parsedData.personalInfo?.fullName || draftProfile.fullName,
        currentTitle: parsedData.personalInfo?.title || draftProfile.currentTitle,
        targetRole: parsedData.personalInfo?.title || draftProfile.targetRole,
        email: parsedData.personalInfo?.email || draftProfile.email,
        phone: parsedData.personalInfo?.phone || draftProfile.phone,
        location: parsedData.personalInfo?.location || draftProfile.location,
        github: parsedData.personalInfo?.github || draftProfile.github,
        linkedin: parsedData.personalInfo?.linkedin || draftProfile.linkedin,
        portfolio: parsedData.personalInfo?.portfolio || draftProfile.portfolio,
        summary: parsedData.summary || draftProfile.summary,
        coreSkills: parsedSkills.length > 0 ? parsedSkills : (draftProfile.coreSkills || [])
      };

      setDraftProfile(newProf);
      updateProfile(newProf);
      updateResumeData(parsedData);

      saveResumeSnapshot({
        title: 'Imported from Pasted Text',
        description: 'Parsed structure from pasted resume content',
        source: 'pdf_import',
        customResumeData: parsedData
      });

      showToast(autoEnhanceWithAi ? 'Resume text parsed & AI-enhanced with STAR bullets successfully!' : 'Resume parsed and applied successfully!', 'success');
      setShowPasteArea(false);
      setRawTextPaste('');
    } catch (err) {
      showToast(err.message || 'Failed to parse pasted resume', 'error');
    } finally {
      setIsParsing(false);
      setParseStatus('');
    }
  };

  const handleAddSkill = () => {
    if (!skillInput.trim()) return;
    if (!draftProfile.coreSkills.includes(skillInput.trim())) {
      setDraftProfile(p => ({
        ...p,
        coreSkills: [...p.coreSkills, skillInput.trim()]
      }));
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setDraftProfile(p => ({
      ...p,
      coreSkills: p.coreSkills.filter(s => s !== skillToRemove)
    }));
  };

  const handleSave = () => {
    updateProfile(draftProfile);
    setIsProfileOpen(false);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }} className="no-print">
      <div style={{
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        background: '#0f172a',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User className="w-5 h-5 text-sky-400" />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
                Developer Profile &amp; Resume Ingestion
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Upload your current resume or verify and update your base developer information
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsProfileOpen(false)}
            style={{ color: 'var(--text-muted)', padding: '4px' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section 1: Resume Upload / Ingestion */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px dashed var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}>
                <Upload className="w-5 h-5" />
              </div>
              
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                  Upload Existing Resume to Kickstart
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Drop your current PDF or text resume to extract skills, experience, and projects.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-primary)',
                  color: '#090d16',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  <FileText className="w-4 h-4" />
                  <span>Select Resume PDF / Text</span>
                  <input 
                    type="file" 
                    accept=".pdf,.txt,.docx" 
                    onChange={handleFileUpload} 
                    disabled={isParsing}
                    style={{ display: 'none' }} 
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowPasteArea(!showPasteArea)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(51, 65, 85, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    color: 'var(--text-primary)'
                  }}
                >
                  {showPasteArea ? 'Hide Text Area' : 'Or Paste Raw Text'}
                </button>
              </div>

              {/* AI Auto-Enhance Checkbox */}
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '10px',
                fontSize: '12px',
                color: '#cbd5e1',
                cursor: 'pointer',
                userSelect: 'none',
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)'
              }}>
                <input
                  type="checkbox"
                  checked={autoEnhanceWithAi}
                  onChange={e => setAutoEnhanceWithAi(e.target.checked)}
                  style={{ accentColor: '#c084fc', cursor: 'pointer' }}
                />
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Auto-enhance with AI (STAR bullet methodology, action verbs & quantifiable metrics)</span>
              </label>

              {isParsing && (
                <div style={{ marginTop: '10px', fontSize: '13px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>{parseStatus}</span>
                </div>
              )}

              {showPasteArea && !isParsing && (
                <div style={{ width: '100%', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    rows={6}
                    value={rawTextPaste}
                    onChange={e => setRawTextPaste(e.target.value)}
                    placeholder="Paste your raw resume text or LinkedIn profile text here..."
                    style={{ width: '100%', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                  />
                  <button
                    type="button"
                    onClick={handlePasteParse}
                    style={{
                      alignSelf: 'flex-end',
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#38bdf8',
                      color: '#090d16',
                      fontWeight: 600,
                      fontSize: '12px'
                    }}
                  >
                    Parse Pasted Text
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Verified Profile Details Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Base Profile Verification &amp; Settings
            </h3>

            {/* Row 1: Name & Current Role */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={draftProfile.fullName}
                  onChange={e => setDraftProfile(p => ({ ...p, fullName: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Current Role / Title
                </label>
                <input
                  type="text"
                  value={draftProfile.currentTitle}
                  onChange={e => setDraftProfile(p => ({ ...p, currentTitle: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Row 2: Target Role & Experience */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Target Role (Guides Market Radar &amp; Resume)
                </label>
                <input
                  type="text"
                  value={draftProfile.targetRole}
                  onChange={e => setDraftProfile(p => ({ ...p, targetRole: e.target.value }))}
                  placeholder="e.g. Senior Backend Engineer (Distributed Systems)"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Experience
                </label>
                <input
                  type="text"
                  value={draftProfile.yearsOfExperience}
                  onChange={e => setDraftProfile(p => ({ ...p, yearsOfExperience: e.target.value }))}
                  placeholder="e.g. 5+ years"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Row 3: Contacts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={draftProfile.email}
                  onChange={e => setDraftProfile(p => ({ ...p, email: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Phone
                </label>
                <input
                  type="text"
                  value={draftProfile.phone}
                  onChange={e => setDraftProfile(p => ({ ...p, phone: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Location
                </label>
                <input
                  type="text"
                  value={draftProfile.location}
                  onChange={e => setDraftProfile(p => ({ ...p, location: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Row 4: Links */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  GitHub
                </label>
                <input
                  type="text"
                  value={draftProfile.github}
                  onChange={e => setDraftProfile(p => ({ ...p, github: e.target.value }))}
                  placeholder="github.com/..."
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  LinkedIn
                </label>
                <input
                  type="text"
                  value={draftProfile.linkedin}
                  onChange={e => setDraftProfile(p => ({ ...p, linkedin: e.target.value }))}
                  placeholder="linkedin.com/in/..."
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Portfolio / Website
                </label>
                <input
                  type="text"
                  value={draftProfile.portfolio}
                  onChange={e => setDraftProfile(p => ({ ...p, portfolio: e.target.value }))}
                  placeholder="yoursite.dev"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Summary */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Professional Summary / Bio
              </label>
              <textarea
                rows={3}
                value={draftProfile.summary}
                onChange={e => setDraftProfile(p => ({ ...p, summary: e.target.value }))}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>

            {/* Core Skills Pill Editor */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Master Technical Skills &amp; Stack
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="Add skill (e.g. Go, Kafka, Redis, eBPF) and press Enter"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Skills Tags List */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {draftProfile.coreSkills.map(skill => (
                  <span
                    key={skill}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid var(--border-medium)',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      color: '#f8fafc'
                    }}
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      style={{ color: 'var(--text-muted)' }}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Changes will update your Profile and sync with the Resume Builder.
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(false)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                color: 'var(--text-muted)'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-primary)',
                color: '#090d16',
                fontSize: '13px',
                fontWeight: 600,
                boxShadow: 'var(--accent-glow)'
              }}
            >
              <Check className="w-4 h-4" />
              <span>Save &amp; Sync Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
