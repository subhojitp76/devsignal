import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateLlmCompletion } from '../../services/llmService';
import { X, Sparkles, BookOpen, Check, Layers, ArrowRight } from 'lucide-react';

export default function JournalExtractorModal({ isOpen, onClose }) {
  const { 
    journalEntries, 
    resumeData, 
    updateResumeData, 
    saveResumeSnapshot,
    aiConfig, 
    showToast 
  } = useApp();

  const [selectedIds, setSelectedIds] = useState([]);
  const [targetSection, setTargetSection] = useState('experience'); // 'experience' | 'project'
  const [selectedExperienceId, setSelectedExperienceId] = useState(resumeData.experience?.[0]?.id || '');
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  if (!isOpen) return null;

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSynthesize = async () => {
    if (selectedIds.length === 0) {
      showToast('Please select at least one Dev Journal entry.', 'error');
      return;
    }

    const selectedEntries = journalEntries.filter(e => selectedIds.includes(e.id));
    setIsSynthesizing(true);

    try {
      const entriesText = selectedEntries.map(e => 
        `Title: ${e.title}\nCategory: ${e.category}\nSummary: ${e.summary}\nTech Stack: ${e.techStack.join(', ')}\nImpact: ${e.impact}\nRaw: ${e.rawNotes}`
      ).join('\n---\n');

      const prompt = `Synthesize these engineering journal notes into 2-3 high-impact, STAR-method (Situation, Task, Action, Result) resume bullet points.
Start with strong engineering action verbs (e.g. "Architected", "Engineered", "Optimized", "Refactored"). Include technical metrics and tech stack tags where available.

JOURNAL NOTES:
${entriesText}

Output ONLY the bullet points, one per line starting with a bullet (-) character. No markdown fences or conversational preambles.`;

      let generatedBullets = [];
      const hasAi = (aiConfig.provider === 'gemini' && aiConfig.geminiApiKey) || aiConfig.provider === 'ollama';

      if (hasAi) {
        const text = await generateLlmCompletion({
          prompt,
          systemInstruction: 'You are a staff engineer crafting senior resume bullets with strong metrics.',
          aiConfig
        });
        generatedBullets = text.split('\n')
          .map(b => b.replace(/^[-*•\d.]\s*/, '').trim())
          .filter(b => b.length > 20);
      }

      // Fallback if AI not connected or returned empty
      if (generatedBullets.length === 0) {
        generatedBullets = selectedEntries.map(e => 
          `${e.summary} utilizing ${e.techStack.join(', ')}, achieving ${e.impact || 'production stability'}.`
        );
      }

      // Apply to Resume
      if (targetSection === 'experience') {
        let updated = null;
        updateResumeData(prev => {
          const expList = prev.experience.map(exp => {
            if (exp.id === selectedExperienceId || (!selectedExperienceId && exp === prev.experience[0])) {
              return {
                ...exp,
                bullets: [...exp.bullets, ...generatedBullets]
              };
            }
            return exp;
          });
          updated = { ...prev, experience: expList };
          return updated;
        });

        if (updated) {
          saveResumeSnapshot({
            title: `Journal Synthesis (${generatedBullets.length} Bullets)`,
            description: `Synthesized ${selectedEntries.length} Dev Journal notes into work experience`,
            source: 'journal_import',
            customResumeData: updated
          });
        }

        showToast(`Appended ${generatedBullets.length} bullets to selected work experience!`, 'success');
      } else {
        // Create as a project (with duplicate check / upsert)
        const firstEntry = selectedEntries[0];
        const newProject = {
          id: `proj-${Date.now()}`,
          name: firstEntry.title,
          techStack: selectedEntries.flatMap(e => e.techStack).slice(0, 5).join(', '),
          link: firstEntry.link || '',
          bullets: generatedBullets
        };

        let updated = null;
        let isExisting = false;
        updateResumeData(prev => {
          const currentProjects = prev.projects || [];
          const normName = (newProject.name || '').trim().toLowerCase();
          const existingIdx = currentProjects.findIndex(p => (p.name || '').trim().toLowerCase() === normName);

          let updatedProjects;
          if (existingIdx >= 0) {
            isExisting = true;
            updatedProjects = [...currentProjects];
            updatedProjects[existingIdx] = {
              ...updatedProjects[existingIdx],
              ...newProject,
              id: updatedProjects[existingIdx].id
            };
          } else {
            updatedProjects = [newProject, ...currentProjects];
          }

          updated = {
            ...prev,
            projects: updatedProjects
          };
          return updated;
        });

        if (updated) {
          saveResumeSnapshot({
            title: `Journal Project: "${newProject.name}"`,
            description: `Generated project from Dev Journal notes`,
            source: 'journal_import',
            customResumeData: updated
          });
        }

        if (isExisting) {
          showToast(`Updated existing project "${newProject.name}" in resume!`, 'success');
        } else {
          showToast(`Created new project "${newProject.name}" in resume!`, 'success');
        }
      }

      onClose();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to synthesize journal entries', 'error');
    } finally {
      setIsSynthesizing(false);
    }
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
        maxWidth: '680px',
        maxHeight: '85vh',
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
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles className="w-5 h-5 text-sky-400" />
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#f8fafc' }}>
              Synthesize Dev Journal to Resume
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
              1. Select Journal Entries to Synthesize ({selectedIds.length} Selected)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
              {journalEntries.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
                  No journal entries available. Add entries in Tab 2 (Dev Journal) first.
                </div>
              ) : (
                journalEntries.map(e => {
                  const isSelected = selectedIds.includes(e.id);
                  return (
                    <div
                      key={e.id}
                      onClick={() => toggleSelect(e.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(30, 41, 59, 0.5)',
                        border: isSelected ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                      }}
                    >
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: isSelected ? 'none' : '1px solid var(--border-medium)',
                        background: isSelected ? '#38bdf8' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '2px',
                        flexShrink: 0
                      }}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 font-bold" />}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>{e.title}</span>
                          <span className="badge badge-emerald" style={{ fontSize: '10px' }}>{e.category}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                          {e.summary}
                        </p>
                        {e.impact && (
                          <div style={{ fontSize: '11px', color: '#34d399', marginTop: '4px' }}>
                            🎯 {e.impact}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Target Placement */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              2. Choose Where to Insert in Resume
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setTargetSection('experience')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: targetSection === 'experience' ? '2px solid #38bdf8' : '1px solid var(--border-medium)',
                  background: targetSection === 'experience' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(30, 41, 59, 0.4)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#f8fafc',
                  textAlign: 'left'
                }}
              >
                Into Work Experience
              </button>

              <button
                type="button"
                onClick={() => setTargetSection('project')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: targetSection === 'project' ? '2px solid #38bdf8' : '1px solid var(--border-medium)',
                  background: targetSection === 'project' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(30, 41, 59, 0.4)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#f8fafc',
                  textAlign: 'left'
                }}
              >
                As New Featured Project
              </button>
            </div>

            {targetSection === 'experience' && resumeData.experience.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Target Role / Company
                </label>
                <select
                  value={selectedExperienceId}
                  onChange={e => setSelectedExperienceId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {resumeData.experience.map(exp => (
                    <option key={exp.id} value={exp.id}>
                      {exp.role} @ {exp.company} ({exp.startDate} – {exp.endDate || 'Present'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            AI will translate notes into STAR-format resume bullets.
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '7px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSynthesize}
              disabled={isSynthesizing || selectedIds.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-primary)',
                color: '#090d16',
                fontWeight: 600,
                fontSize: '13px',
                boxShadow: 'var(--accent-glow)'
              }}
            >
              <Sparkles className={`w-4 h-4 ${isSynthesizing ? 'animate-spin' : ''}`} />
              <span>{isSynthesizing ? 'Synthesizing...' : 'Synthesize to Resume'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
