import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { computeResumeDiff } from '../../utils/diffUtils';
import confetti from 'canvas-confetti';
import {
  History,
  X,
  RotateCcw,
  Sparkles,
  FileUp,
  Bookmark,
  BookOpen,
  Clock,
  Trash2,
  Edit3,
  Check,
  ChevronRight,
  Download,
  Copy,
  Layers,
  ArrowRight,
  Plus,
  Search,
  Eye,
  FileText,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function ResumeHistoryModal({ isOpen, onClose }) {
  const {
    resumeData,
    resumeHistory,
    saveResumeSnapshot,
    restoreResumeSnapshot,
    deleteResumeSnapshot,
    renameResumeSnapshot,
    clearResumeHistory,
    showToast
  } = useApp();

  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null);
  const [activeTab, setActiveTab] = useState('diff'); // 'diff' | 'preview' | 'json'
  const [filterSource, setFilterSource] = useState('all'); // 'all' | 'ai_enhance' | 'pdf_import' | 'manual_snapshot' | 'auto_save'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Inline snapshot creation
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [newSnapshotTitle, setNewSnapshotTitle] = useState('');

  // Inline rename state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Filtered snapshot list
  const filteredSnapshots = useMemo(() => {
    return resumeHistory.filter(s => {
      const matchesFilter = filterSource === 'all' || s.source === filterSource;
      const matchesSearch = !searchQuery.trim() || 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [resumeHistory, filterSource, searchQuery]);

  // Determine currently selected snapshot
  const activeSnapshot = useMemo(() => {
    if (selectedSnapshotId) {
      const found = resumeHistory.find(s => s.id === selectedSnapshotId);
      if (found) return found;
    }
    return filteredSnapshots[0] || resumeHistory[0] || null;
  }, [selectedSnapshotId, filteredSnapshots, resumeHistory]);

  // Compute semantic diff between selected snapshot and current live resume
  const diffResult = useMemo(() => {
    if (!activeSnapshot || !resumeData) return null;
    return computeResumeDiff(activeSnapshot.resumeData, resumeData);
  }, [activeSnapshot, resumeData]);

  if (!isOpen) return null;

  // Helper for source badge styling & icon
  const getSourceMeta = (source) => {
    switch (source) {
      case 'ai_enhance':
        return {
          icon: <Sparkles className="w-3 h-3 text-purple-400" />,
          label: 'AI Enhanced',
          bg: 'rgba(168, 85, 247, 0.15)',
          border: 'rgba(168, 85, 247, 0.35)',
          color: '#c084fc'
        };
      case 'pdf_import':
        return {
          icon: <FileUp className="w-3 h-3 text-sky-400" />,
          label: 'PDF Import',
          bg: 'rgba(56, 189, 248, 0.15)',
          border: 'rgba(56, 189, 248, 0.35)',
          color: '#38bdf8'
        };
      case 'journal_import':
        return {
          icon: <BookOpen className="w-3 h-3 text-teal-400" />,
          label: 'Journal Import',
          bg: 'rgba(45, 212, 191, 0.15)',
          border: 'rgba(45, 212, 191, 0.35)',
          color: '#2dd4bf'
        };
      case 'restoration':
        return {
          icon: <RotateCcw className="w-3 h-3 text-amber-400" />,
          label: 'Restored',
          bg: 'rgba(251, 191, 36, 0.15)',
          border: 'rgba(251, 191, 36, 0.35)',
          color: '#fbbf24'
        };
      case 'auto_save':
        return {
          icon: <Clock className="w-3 h-3 text-slate-400" />,
          label: 'Auto-Save',
          bg: 'rgba(148, 163, 184, 0.15)',
          border: 'rgba(148, 163, 184, 0.3)',
          color: '#94a3b8'
        };
      default:
        return {
          icon: <Bookmark className="w-3 h-3 text-emerald-400" />,
          label: 'Manual Snapshot',
          bg: 'rgba(52, 211, 153, 0.15)',
          border: 'rgba(52, 211, 153, 0.35)',
          color: '#34d399'
        };
    }
  };

  const handleCreateSnapshot = () => {
    const title = newSnapshotTitle.trim() || `Manual Snapshot (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const created = saveResumeSnapshot({
      title,
      description: 'Manually saved version',
      source: 'manual_snapshot',
      customResumeData: resumeData
    });
    setNewSnapshotTitle('');
    setIsCreatingSnapshot(false);
    setSelectedSnapshotId(created.id);
    showToast(`Saved snapshot: "${title}"`, 'success');
  };

  const handleStartRename = (s, e) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditTitle(s.title);
  };

  const handleSaveRename = (s, e) => {
    e.stopPropagation();
    renameResumeSnapshot(s.id, editTitle);
    setEditingId(null);
  };

  const handleRestore = (snapshot) => {
    if (!snapshot) return;
    const ok = window.confirm(`Restore resume to "${snapshot.title}"? Your current resume will be safely backed up automatically before rollback.`);
    if (ok) {
      restoreResumeSnapshot(snapshot.id);
      onClose();
    }
  };

  const handleExportJson = (snapshot) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify(snapshot.resumeData, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${snapshot.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_snapshot.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Version JSON downloaded!', 'success');
  };

  const isLiveCurrent = (snapshot) => {
    if (!snapshot || !resumeData) return false;
    return JSON.stringify(snapshot.resumeData) === JSON.stringify(resumeData);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #0d131f 0%, #080d16 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.15)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1240px',
          height: '88vh',
          maxHeight: '920px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.65)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <History className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Resume Version History & Reflection
                </h2>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  {resumeHistory.length} Saved {resumeHistory.length === 1 ? 'Version' : 'Versions'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Reflect back on past iterations, compare changes side-by-side with your live resume, and restore anytime.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isCreatingSnapshot ? (
              <button
                type="button"
                onClick={() => setIsCreatingSnapshot(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)',
                  border: '1px solid rgba(52, 211, 153, 0.4)',
                  color: '#34d399',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Current Snapshot</span>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Snapshot name (e.g. Pre-Interview Polish)..."
                  value={newSnapshotTitle}
                  onChange={e => setNewSnapshotTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateSnapshot(); }}
                  autoFocus
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid var(--accent-primary)',
                    color: 'white',
                    fontSize: '12px',
                    width: '260px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateSnapshot}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'var(--accent-primary)',
                    color: '#090d16',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingSnapshot(false)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: 'rgba(30, 41, 59, 0.6)',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Two-Column Split Layout */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          
          {/* Left Column: Timeline Version List */}
          <div style={{
            width: '380px',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            flexShrink: 0,
            background: 'rgba(11, 17, 30, 0.7)'
          }}>
            {/* Search & Filter Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <Search className="w-3.5 h-3.5 text-slate-400" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Filter versions by title..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    color: 'white',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '2px' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'ai_enhance', label: 'AI' },
                  { id: 'pdf_import', label: 'PDF' },
                  { id: 'manual_snapshot', label: 'Manual' },
                  { id: 'auto_save', label: 'Auto' }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterSource(f.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: filterSource === f.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      background: filterSource === f.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                      color: filterSource === f.id ? '#38bdf8' : 'var(--text-muted)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Timeline List */}
            <div 
              className="custom-scroll"
              style={{ 
                flex: 1, 
                minHeight: 0, 
                overflowY: 'auto', 
                scrollbarGutter: 'stable', 
                scrollbarWidth: 'thin', 
                scrollbarColor: '#0284c7 rgba(15, 23, 42, 0.85)',
                padding: '12px 14px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '10px' 
              }}
            >
              {filteredSnapshots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                  <p style={{ fontSize: '13px', margin: 0 }}>No snapshot versions found</p>
                  <p style={{ fontSize: '11px', marginTop: '4px' }}>Try clearing the search or save a new snapshot.</p>
                </div>
              ) : (
                filteredSnapshots.map(snapshot => {
                  const meta = getSourceMeta(snapshot.source);
                  const isSelected = activeSnapshot?.id === snapshot.id;
                  const isCurrent = isLiveCurrent(snapshot);

                  return (
                    <div
                      key={snapshot.id}
                      onClick={() => setSelectedSnapshotId(snapshot.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: isSelected 
                          ? '1px solid rgba(56, 189, 248, 0.6)' 
                          : isCurrent 
                            ? '1px solid rgba(52, 211, 153, 0.35)' 
                            : '1px solid var(--border-subtle)',
                        background: isSelected 
                          ? 'rgba(56, 189, 248, 0.1)' 
                          : 'rgba(15, 23, 42, 0.55)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative'
                      }}
                    >
                      {/* Top Meta Line: Badge + Time + Live Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            background: meta.bg,
                            border: `1px solid ${meta.border}`,
                            color: meta.color,
                            fontSize: '10px',
                            fontWeight: 600
                          }}>
                            {meta.icon}
                            <span>{meta.label}</span>
                          </span>

                          {isCurrent && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              background: 'rgba(52, 211, 153, 0.15)',
                              border: '1px solid rgba(52, 211, 153, 0.4)',
                              color: '#34d399',
                              fontSize: '10px',
                              fontWeight: 700
                            }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
                              LIVE
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {snapshot.dateFormatted ? snapshot.dateFormatted.split(',')[0] : 'Saved'}
                        </span>
                      </div>

                      {/* Snapshot Title */}
                      {editingId === snapshot.id ? (
                        <div style={{ display: 'flex', gap: '4px', margin: '4px 0' }} onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(snapshot, e); }}
                            autoFocus
                            style={{
                              flex: 1,
                              padding: '3px 6px',
                              borderRadius: '4px',
                              background: '#090d16',
                              border: '1px solid var(--accent-primary)',
                              color: 'white',
                              fontSize: '12px'
                            }}
                          />
                          <button
                            type="button"
                            onClick={e => handleSaveRename(snapshot, e)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'var(--accent-primary)',
                              color: '#090d16',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <h4 style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isSelected ? '#38bdf8' : 'var(--text-primary)',
                            margin: '2px 0 4px 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {snapshot.title}
                          </h4>
                          <button
                            type="button"
                            onClick={e => handleStartRename(snapshot, e)}
                            title="Rename version"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              opacity: 0.6
                            }}
                          >
                            <Edit3 className="w-3 h-3 hover:text-white" />
                          </button>
                        </div>
                      )}

                      {/* Description / Instruction Snippet */}
                      {snapshot.description && (
                        <p style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          margin: '0 0 6px 0',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {snapshot.description}
                        </p>
                      )}

                      {/* Bottom Stats & Quick Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(148, 163, 184, 0.8)' }}>
                          {snapshot.stats?.experienceCount || snapshot.resumeData?.experience?.length || 0} exp • {snapshot.stats?.bulletCount || 0} bullets • {snapshot.stats?.projectCount || snapshot.resumeData?.projects?.length || 0} projects
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleRestore(snapshot);
                            }}
                            title="Rollback/Restore this version"
                            style={{
                              padding: '3px 6px',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              color: '#38bdf8',
                              fontSize: '10px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Restore</span>
                          </button>

                          {resumeHistory.length > 1 && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                if (window.confirm(`Delete snapshot "${snapshot.title}"?`)) {
                                  deleteResumeSnapshot(snapshot.id);
                                }
                              }}
                              title="Delete snapshot"
                              style={{
                                padding: '3px 5px',
                                borderRadius: '4px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#f87171',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Clear History Action */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                LocalStorage Persistent
              </span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all historical snapshots and reset to current baseline?')) {
                    clearResumeHistory();
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(239, 68, 68, 0.7)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '2px 6px'
                }}
              >
                Clear History
              </button>
            </div>
          </div>

          {/* Right Column: "Reflect Back" Workspace */}
          <div style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#080d16' }}>
            {activeSnapshot ? (
              <>
                {/* Selected Version Action Toolbar */}
                <div style={{
                  padding: '14px 22px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(15, 23, 42, 0.75)',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {activeSnapshot.title}
                        </h3>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          • {activeSnapshot.dateFormatted}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {activeSnapshot.description || 'Saved snapshot'}
                      </span>
                    </div>
                  </div>

                  {/* Mode Tabs & Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* View Switcher Tabs */}
                    <div style={{
                      display: 'flex',
                      background: 'rgba(30, 41, 59, 0.6)',
                      borderRadius: '8px',
                      padding: '3px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <button
                        type="button"
                        onClick={() => setActiveTab('diff')}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: activeTab === 'diff' ? 'var(--accent-primary)' : 'transparent',
                          color: activeTab === 'diff' ? '#090d16' : 'var(--text-secondary)',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <span>🪞 Reflect & Compare</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('preview')}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: activeTab === 'preview' ? 'var(--accent-primary)' : 'transparent',
                          color: activeTab === 'preview' ? '#090d16' : 'var(--text-secondary)',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Snapshot View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('json')}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: activeTab === 'json' ? 'var(--accent-primary)' : 'transparent',
                          color: activeTab === 'json' ? '#090d16' : 'var(--text-secondary)',
                          border: 'none'
                        }}
                      >
                        JSON
                      </button>
                    </div>

                    {/* Download JSON */}
                    <button
                      type="button"
                      onClick={() => handleExportJson(activeSnapshot)}
                      title="Download snapshot JSON"
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: 'rgba(30, 41, 59, 0.7)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Restore Button */}
                    <button
                      type="button"
                      onClick={() => handleRestore(activeSnapshot)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 16px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                        color: '#090d16',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: 'none',
                        boxShadow: '0 0 15px rgba(56, 189, 248, 0.3)'
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore This Version</span>
                    </button>
                  </div>
                </div>

                {/* Tab 1: "Reflect & Compare" (Diff Viewer) */}
                {activeTab === 'diff' && (
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
                      gap: '20px' 
                    }}
                  >
                    
                    {/* Reflection Overview Banner */}
                    <div style={{
                      padding: '14px 18px',
                      borderRadius: '12px',
                      flexShrink: 0,
                      background: diffResult?.isIdentical 
                        ? 'rgba(52, 211, 153, 0.08)' 
                        : 'rgba(56, 189, 248, 0.08)',
                      border: diffResult?.isIdentical 
                        ? '1px solid rgba(52, 211, 153, 0.3)' 
                        : '1px solid rgba(56, 189, 248, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {diffResult?.isIdentical ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-sky-400" />
                        )}
                        <div>
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            {diffResult?.isIdentical 
                              ? 'This historical snapshot is identical to your current live resume.' 
                              : `Reflecting changes: ${diffResult?.totalModifications || 0} modified section(s) detected.`}
                          </h4>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                            Left/Red: In Snapshot Only • Right/Green: In Current Live Resume • Gray: Retained
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {diffResult?.summaryDiff?.hasChanged && (
                          <span style={{ padding: '3px 8px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', fontSize: '11px', fontWeight: 600 }}>
                            Summary Changed
                          </span>
                        )}
                        {diffResult?.skillsDiff?.hasChanged && (
                          <span style={{ padding: '3px 8px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', fontSize: '11px', fontWeight: 600 }}>
                            Skills Adjusted
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Section 1: Summary Diff */}
                    <div style={{
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(15, 23, 42, 0.4)',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      <div style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'rgba(30, 41, 59, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Professional Summary
                        </span>
                        {diffResult?.summaryDiff?.hasChanged ? (
                          <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>
                            Modified ({diffResult.summaryDiff.historicalLength}w ➔ {diffResult.summaryDiff.currentLength}w)
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unchanged</span>
                        )}
                      </div>

                      <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                            Historical Snapshot ({activeSnapshot.title})
                          </div>
                          <div style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: 'rgba(15, 23, 42, 0.7)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.5
                          }}>
                            {activeSnapshot.resumeData?.summary || 'No summary'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
                            Current Live Resume
                          </div>
                          <div style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: diffResult?.summaryDiff?.hasChanged ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.7)',
                            border: diffResult?.summaryDiff?.hasChanged ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--border-subtle)',
                            fontSize: '12px',
                            color: diffResult?.summaryDiff?.hasChanged ? '#f0f9ff' : 'var(--text-secondary)',
                            lineHeight: 1.5
                          }}>
                            {resumeData?.summary || 'No summary'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Work Experience Diff */}
                    <div style={{
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(15, 23, 42, 0.4)',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      <div style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'rgba(30, 41, 59, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Work Experience ({diffResult?.experienceDiffs?.length || 0} Roles)
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Bullet-by-Bullet Evolution
                        </span>
                      </div>

                      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {diffResult?.experienceDiffs?.map((expDiff, idx) => {
                          const roleName = expDiff.currentRole?.role || expDiff.historicalRole?.role || 'Engineer';
                          const company = expDiff.currentRole?.company || expDiff.historicalRole?.company || '';

                          return (
                            <div key={idx} style={{
                              padding: '12px 14px',
                              borderRadius: '8px',
                              background: 'rgba(15, 23, 42, 0.6)',
                              border: expDiff.hasChanged ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--border-subtle)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{roleName}</span>
                                  <span style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>@ {company}</span>
                                </div>
                                {expDiff.hasChanged && (
                                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}>
                                    Bullets Modified
                                  </span>
                                )}
                              </div>

                              {/* Bullets Breakdown */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {/* Modified Bullets Pair */}
                                {expDiff.modified?.map((m, mIdx) => (
                                  <div key={`mod-${mIdx}`} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    background: 'rgba(30, 41, 59, 0.4)',
                                    border: '1px solid rgba(148, 163, 184, 0.2)'
                                  }}>
                                    <div style={{ fontSize: '11px', color: '#fca5a5', lineHeight: 1.4 }}>
                                      <span style={{ fontWeight: 700, color: '#ef4444', marginRight: '4px' }}>[Past]</span>
                                      {m.historical}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#86efac', lineHeight: 1.4 }}>
                                      <span style={{ fontWeight: 700, color: '#22c55e', marginRight: '4px' }}>[Now]</span>
                                      {m.current}
                                    </div>
                                  </div>
                                ))}

                                {/* Historical Only Bullets (Removed in current) */}
                                {expDiff.inHistoricalOnly?.map((hb, hIdx) => (
                                  <div key={`h-only-${hIdx}`} style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    fontSize: '11px',
                                    color: '#fca5a5',
                                    lineHeight: 1.4
                                  }}>
                                    <span style={{ fontWeight: 700, color: '#ef4444', marginRight: '6px' }}>- In Snapshot Only:</span>
                                    {hb}
                                  </div>
                                ))}

                                {/* Current Only Bullets (Added in current) */}
                                {expDiff.inCurrentOnly?.map((cb, cIdx) => (
                                  <div key={`c-only-${cIdx}`} style={{
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    background: 'rgba(52, 211, 153, 0.08)',
                                    border: '1px solid rgba(52, 211, 153, 0.25)',
                                    fontSize: '11px',
                                    color: '#86efac',
                                    lineHeight: 1.4
                                  }}>
                                    <span style={{ fontWeight: 700, color: '#22c55e', marginRight: '6px' }}>+ Added in Live Resume:</span>
                                    {cb}
                                  </div>
                                ))}

                                {/* Retained Unchanged Bullets */}
                                {expDiff.retained?.map((rb, rIdx) => (
                                  <div key={`ret-${rIdx}`} style={{
                                    padding: '5px 10px',
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    lineHeight: 1.4,
                                    borderLeft: '2px solid rgba(148, 163, 184, 0.3)',
                                    paddingLeft: '8px'
                                  }}>
                                    • {rb}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 3: Featured Projects Diff */}
                    {diffResult?.projectDiffs?.length > 0 && (
                      <div style={{
                        borderRadius: '12px',
                        border: '1px solid var(--border-subtle)',
                        background: 'rgba(15, 23, 42, 0.4)',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        <div style={{
                          padding: '10px 16px',
                          borderBottom: '1px solid var(--border-subtle)',
                          background: 'rgba(30, 41, 59, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Featured Projects ({diffResult.projectDiffs.length} Projects)
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Architecture & Tech Stack Evolution
                          </span>
                        </div>

                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {diffResult.projectDiffs.map((projDiff, pIdx) => {
                            const pName = projDiff.currentProject?.name || projDiff.historicalProject?.name || 'Project';
                            const pTech = projDiff.currentProject?.techStack || projDiff.historicalProject?.techStack || '';

                            return (
                              <div key={pIdx} style={{
                                padding: '12px 14px',
                                borderRadius: '8px',
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: projDiff.hasChanged ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--border-subtle)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{pName}</span>
                                    {pTech && (
                                      <span style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                        {pTech}
                                      </span>
                                    )}
                                  </div>
                                  {projDiff.hasChanged && (
                                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}>
                                      Modified
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {projDiff.currentProject?.bullets?.map((b, bIdx) => (
                                    <div key={bIdx} style={{ fontSize: '11.5px', color: 'var(--text-secondary)', paddingLeft: '8px', borderLeft: '2px solid rgba(56, 189, 248, 0.3)' }}>
                                      {b}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Section 4: Technical Skills Diff */}
                    <div style={{
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(15, 23, 42, 0.4)',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      <div style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'rgba(30, 41, 59, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Skills Comparison
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Snapshot: {diffResult?.skillsDiff?.historicalTotal || 0} skills • Live: {diffResult?.skillsDiff?.currentTotal || 0} skills
                        </span>
                      </div>

                      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {diffResult?.skillsDiff?.added?.length > 0 && (
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#34d399', display: 'block', marginBottom: '6px' }}>
                              + Added in Current Resume:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {diffResult.skillsDiff.added.map(s => (
                                <span key={s.name} style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(52, 211, 153, 0.15)',
                                  border: '1px solid rgba(52, 211, 153, 0.35)',
                                  color: '#34d399',
                                  fontSize: '11px',
                                  fontWeight: 600
                                }}>
                                  +{s.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {diffResult?.skillsDiff?.removed?.length > 0 && (
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#f87171', display: 'block', marginBottom: '6px' }}>
                              - Present in Snapshot Only:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {diffResult.skillsDiff.removed.map(s => (
                                <span key={s.name} style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#f87171',
                                  fontSize: '11px'
                                }}>
                                  -{s.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                            Retained / Common Skills:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {diffResult?.skillsDiff?.shared?.map(s => (
                              <span key={s.name} style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'rgba(30, 41, 59, 0.5)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-secondary)',
                                fontSize: '11px'
                              }}>
                                {s.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* Tab 2: "Snapshot Full View" */}
                {activeTab === 'preview' && (
                  <div 
                    className="custom-scroll"
                    style={{ 
                      flex: 1, 
                      minHeight: 0, 
                      overflowY: 'auto', 
                      scrollbarGutter: 'stable',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#0284c7 rgba(15, 23, 42, 0.85)',
                      padding: '24px', 
                      display: 'flex', 
                      justifyContent: 'center' 
                    }}
                  >
                    <div style={{
                      width: '100%',
                      maxWidth: '780px',
                      flexShrink: 0,
                      background: '#ffffff',
                      color: '#0f172a',
                      borderRadius: '8px',
                      padding: '32px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                      fontFamily: 'Inter, -apple-system, sans-serif'
                    }}>
                      {/* Personal Info Header */}
                      <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                          {activeSnapshot.resumeData?.personalInfo?.fullName || 'Full Name'}
                        </h1>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#0284c7', margin: '4px 0 8px 0' }}>
                          {activeSnapshot.resumeData?.personalInfo?.title || 'Engineer'}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#475569' }}>
                          <span>{activeSnapshot.resumeData?.personalInfo?.email}</span>
                          <span>•</span>
                          <span>{activeSnapshot.resumeData?.personalInfo?.phone}</span>
                          <span>•</span>
                          <span>{activeSnapshot.resumeData?.personalInfo?.location}</span>
                        </div>
                      </div>

                      {/* Summary */}
                      {activeSnapshot.resumeData?.summary && (
                        <div style={{ marginBottom: '18px' }}>
                          <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0284c7', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px' }}>
                            Professional Summary
                          </h3>
                          <p style={{ fontSize: '12px', lineHeight: 1.5, color: '#334155', margin: 0 }}>
                            {activeSnapshot.resumeData.summary}
                          </p>
                        </div>
                      )}

                      {/* Experience */}
                      <div style={{ marginBottom: '18px' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0284c7', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
                          Experience
                        </h3>
                        {activeSnapshot.resumeData?.experience?.map((exp, i) => (
                          <div key={i} style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{exp.role}</span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>{exp.startDate} - {exp.endDate}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600, marginBottom: '4px' }}>
                              {exp.company} • {exp.location}
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11.5px', color: '#334155', lineHeight: 1.4 }}>
                              {exp.bullets?.map((b, bi) => (
                                <li key={bi} style={{ marginBottom: '3px' }}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>

                      {/* Projects */}
                      {activeSnapshot.resumeData?.projects?.length > 0 && (
                        <div style={{ marginBottom: '18px' }}>
                          <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0284c7', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px' }}>
                            Projects
                          </h3>
                          {activeSnapshot.resumeData.projects.map((proj, i) => (
                            <div key={i} style={{ marginBottom: '10px' }}>
                              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                                {proj.name} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>({proj.techStack})</span>
                              </div>
                              <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '11.5px', color: '#334155', lineHeight: 1.4 }}>
                                {proj.bullets?.map((b, bi) => (
                                  <li key={bi}>{b}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Skills */}
                      {activeSnapshot.resumeData?.skillCategories?.length > 0 && (
                        <div>
                          <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0284c7', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '6px' }}>
                            Skills
                          </h3>
                          {activeSnapshot.resumeData.skillCategories.map((cat, i) => (
                            <div key={i} style={{ fontSize: '11.5px', marginBottom: '3px', color: '#334155' }}>
                              <strong style={{ color: '#0f172a' }}>{cat.name}:</strong> {cat.skills?.join(', ')}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 3: "Raw JSON" */}
                {activeTab === 'json' && (
                  <div 
                    className="custom-scroll"
                    style={{ 
                      flex: 1, 
                      minHeight: 0, 
                      overflowY: 'auto', 
                      scrollbarGutter: 'stable',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#0284c7 rgba(15, 23, 42, 0.85)',
                      padding: '16px 20px' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(activeSnapshot.resumeData, null, 2));
                          showToast('JSON copied to clipboard!', 'success');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          background: 'rgba(30, 41, 59, 0.7)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </button>
                    </div>
                    <pre style={{
                      background: '#090d16',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '16px',
                      color: '#a5f3fc',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      lineHeight: 1.4,
                      flexShrink: 0
                    }}>
                      {JSON.stringify(activeSnapshot.resumeData, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Select a version on the left to reflect back
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
