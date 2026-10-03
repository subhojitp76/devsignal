import React from 'react';
import { useApp } from '../../context/AppContext';
import { TAB_ROUTES } from '../../utils/routeUtils';
import { 
  Radar, 
  BookOpen, 
  FileText, 
  User, 
  Cpu, 
  Download, 
  Upload, 
  Sparkles,
  Terminal
} from 'lucide-react';

export default function Navbar() {
  const { 
    activeTab, 
    setActiveTab, 
    setIsProfileOpen, 
    setIsAiConfigOpen, 
    aiConfig, 
    profile,
    exportFullBackup,
    importFullBackup
  } = useApp();

  const handleNavClick = (tabKey) => (e) => {
    // Allow new tab or special modifier clicks (Ctrl, Cmd, Shift, Alt, middle-click)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    setActiveTab(tabKey);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      importFullBackup(event.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header style={{
      height: 'var(--header-height)',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px'
    }} className="no-print">
      {/* Brand Title */}
      <a
        href={TAB_ROUTES.marketRadar}
        onClick={handleNavClick('marketRadar')}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', cursor: 'pointer' }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)'
        }}>
          <Terminal className="w-5 h-5" style={{ color: '#090d16' }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.3px', color: '#f8fafc', display: 'flex', alignItems: 'center' }}>
              DEV<span style={{ color: '#38bdf8' }}>SIGNAL</span>
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '10px' }}>SWE ED.</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Tech Radar &bull; Work Journal &bull; ATS Resume
          </p>
        </div>
      </a>

      {/* Primary Navigation Tabs */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-full)',
        padding: '4px'
      }}>
        <a
          href={TAB_ROUTES.marketRadar}
          onClick={handleNavClick('marketRadar')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            background: activeTab === 'marketRadar' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'marketRadar' ? '#090d16' : 'var(--text-secondary)'
          }}
          title="Tech Market Radar (/radar)"
        >
          <Radar className="w-4 h-4" />
          <span>1. Tech Market Radar</span>
        </a>

        <a
          href={TAB_ROUTES.devJournal}
          onClick={handleNavClick('devJournal')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            background: activeTab === 'devJournal' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'devJournal' ? '#090d16' : 'var(--text-secondary)'
          }}
          title="Dev Journal (/journal)"
        >
          <BookOpen className="w-4 h-4" />
          <span>2. Dev Journal</span>
        </a>

        <a
          href={TAB_ROUTES.resumeBuilder}
          onClick={handleNavClick('resumeBuilder')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            background: activeTab === 'resumeBuilder' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'resumeBuilder' ? '#090d16' : 'var(--text-secondary)'
          }}
          title="Resume Builder Studio (/resume)"
        >
          <FileText className="w-4 h-4" />
          <span>3. Resume Builder</span>
        </a>
      </nav>

      {/* Right Actions: Profile, AI Settings, Backup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Profile Trigger */}
        <button
          onClick={() => setIsProfileOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'background var(--transition-fast)'
          }}
          title="Verify or update Profile and upload existing resume"
        >
          <User className="w-4 h-4 text-sky-400" />
          <span>{profile.fullName?.split(' ')[0] || 'Profile'}</span>
        </button>

        {/* AI Config Trigger */}
        <button
          onClick={() => setIsAiConfigOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: 'var(--radius-sm)',
            background: aiConfig.provider === 'ollama' ? 'rgba(52, 211, 153, 0.12)' : 'rgba(56, 189, 248, 0.12)',
            border: aiConfig.provider === 'ollama' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
            color: aiConfig.provider === 'ollama' ? '#34d399' : '#38bdf8',
            fontSize: '12px',
            fontWeight: 500
          }}
          title="Configure Gemini API or Local Ollama LLM"
        >
          <Cpu className="w-4 h-4" />
          <span>{aiConfig.provider === 'ollama' ? 'Ollama' : 'Gemini'}</span>
        </button>

        {/* Backup / Export state */}
        <button
          onClick={exportFullBackup}
          style={{
            padding: '7px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)'
          }}
          title="Download JSON Backup"
        >
          <Download className="w-4 h-4" />
        </button>

        <label
          style={{
            padding: '7px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
          title="Restore from JSON Backup"
        >
          <Upload className="w-4 h-4" />
          <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>
    </header>
  );
}
