import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RESUME_TEMPLATES, COLOR_PRESETS } from '../../constants/templates';
import EditorSidebar from './EditorSidebar';
import PreviewCanvas from './PreviewCanvas';
import JournalExtractorModal from './JournalExtractorModal';
import AIEnhanceModal from './AIEnhanceModal';
import ResumeHistoryModal from './ResumeHistoryModal';
import confetti from 'canvas-confetti';
import { 
  FileDown, 
  Code, 
  Sparkles, 
  Layout, 
  Palette, 
  RotateCcw, 
  BookOpen, 
  Check, 
  Printer,
  Loader2,
  History
} from 'lucide-react';

export default function ResumeBuilderTab() {
  const { 
    resumeData, 
    selectedTemplate, 
    setSelectedTemplate, 
    selectedColor, 
    setSelectedColor,
    loadSampleData,
    showToast,
    isEnhancingResume,
    isAiEnhanceOpen,
    setIsAiEnhanceOpen,
    enhanceEntireResume,
    resumeHistory,
    isHistoryOpen,
    setIsHistoryOpen
  } = useApp();

  const [isExtractorOpen, setIsExtractorOpen] = useState(false);

  // Trigger high-fidelity vector PDF print
  const handleExportPdf = () => {
    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    showToast('Opening print dialog. Select "Save as PDF" for vector-clean export!', 'info');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify(resumeData, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${resumeData.personalInfo.fullName.replace(/\s+/g, '_')}_resume.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Resume data exported to JSON!', 'success');
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Engineering Controls Bar */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }} className="no-print">
        
        {/* Left: Template Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <Layout className="w-4 h-4 text-sky-400" />
            <span style={{ fontWeight: 600 }}>Template:</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {RESUME_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: selectedTemplate === t.id ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.6)',
                  color: selectedTemplate === t.id ? '#090d16' : 'var(--text-secondary)',
                  border: selectedTemplate === t.id ? 'none' : '1px solid var(--border-subtle)'
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Accent Color Palette */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <Palette className="w-4 h-4 text-emerald-400" />
            <span style={{ fontWeight: 600 }}>Accent:</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {COLOR_PRESETS.map(c => (
              <button
                key={c.value}
                onClick={() => setSelectedColor(c.value)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: c.value,
                  border: selectedColor === c.value ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                  boxShadow: selectedColor === c.value ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                  cursor: 'pointer'
                }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsAiEnhanceOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(56, 189, 248, 0.2) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              color: '#c084fc',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(168, 85, 247, 0.15)'
            }}
            title="Use AI Copilot to elevate bullet points with STAR methodology, chat refinement, and before/after comparison"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Enhance Resume</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExtractorOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(52, 211, 153, 0.12)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              color: '#34d399',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Import from Journal</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.1)'
            }}
            title="Reflect back on resume version history, compare changes side-by-side, or restore previous versions"
          >
            <History className="w-3.5 h-3.5 text-sky-400" />
            <span>History ({resumeHistory.length})</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            style={{
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 500
            }}
            title="Download resume data as JSON"
          >
            JSON
          </button>

          <button
            type="button"
            onClick={loadSampleData}
            style={{
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-muted)',
              fontSize: '12px'
            }}
            title="Reset to default Software Engineer demo data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              color: '#090d16',
              fontWeight: 700,
              fontSize: '13px',
              boxShadow: 'var(--accent-glow)'
            }}
          >
            <Printer className="w-4 h-4" />
            <span>Export to PDF</span>
          </button>
        </div>
      </div>

      {/* Split-Screen Studio Layout */}
      <div style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'stretch',
        height: 'calc(100vh - var(--header-height) - 110px)',
        minHeight: '620px'
      }}>
        {/* Left Column: Form Editor Sidebar */}
        <EditorSidebar onOpenJournalExtractor={() => setIsExtractorOpen(true)} />

        {/* Right Column: Live A4 Printable Preview Canvas */}
        <PreviewCanvas />
      </div>

      {/* Journal Extractor Modal */}
      <JournalExtractorModal
        isOpen={isExtractorOpen}
        onClose={() => setIsExtractorOpen(false)}
      />

      {/* AI Resume Copilot & Enhancer Modal */}
      <AIEnhanceModal
        isOpen={isAiEnhanceOpen}
        onClose={() => setIsAiEnhanceOpen(false)}
      />

      {/* Resume Version History & Reflection Modal */}
      <ResumeHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

    </div>
  );
}
