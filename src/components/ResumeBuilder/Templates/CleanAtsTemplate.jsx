import React from 'react';
import { parseProjectMeta } from '../../../utils/projectUtils';
import { formatEducationDisplay } from '../../../utils/educationUtils';
import { getProfileLinkInfo } from '../../../utils/linkUtils';
import { DEFAULT_SECTION_ORDER } from '../../../constants/defaultData';

// Safe inline formatter for markdown bold (**text**)
function renderFormattedText(text) {
  if (!text) return null;
  if (typeof text !== 'string') return text;
  if (!text.includes('**')) return text;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function CleanAtsTemplate({ resumeData, accentColor, density = 'standard' }) {
  const { 
    personalInfo = {}, 
    summary, 
    experience = [], 
    projects = [], 
    skillCategories = [], 
    education = [], 
    certifications = [],
    bottomLayout = 'grid',
    certificationsTitle,
    sectionOrder
  } = resumeData;

  const isCompact = density === 'compact';
  const isRelaxed = density === 'relaxed';

  const s = {
    fontSize: isCompact ? '8.6pt' : isRelaxed ? '9.6pt' : '8.95pt',
    lineHeight: isCompact ? 1.25 : isRelaxed ? 1.42 : 1.29,
    headerMarginBottom: isCompact ? '7px' : isRelaxed ? '14px' : '8.5px',
    headerPaddingBottom: isCompact ? '5px' : isRelaxed ? '10px' : '6px',
    sectionMarginBottom: isCompact ? '5px' : isRelaxed ? '12px' : '7px',
    entryGap: isCompact ? '4.5px' : isRelaxed ? '10px' : '6px',
    projectGap: isCompact ? '3.5px' : isRelaxed ? '9px' : '5px',
    bulletMarginBottom: isCompact ? '1px' : isRelaxed ? '2.5px' : '1.2px',
    bulletLineHeight: isCompact ? 1.22 : isRelaxed ? 1.34 : 1.25
  };

  const effectiveSectionOrder = (sectionOrder && sectionOrder.length > 0)
    ? sectionOrder
    : DEFAULT_SECTION_ORDER;

  const hasEducation = education && education.length > 0;
  const hasCertifications = certifications && certifications.length > 0;
  const isStacked = bottomLayout === 'stacked';

  const hasAchievements = hasCertifications && certifications.some(c => {
    const text = typeof c === 'string' ? c : (c.title || '');
    return /rank|gate|award|honored|publish|paper|patent|olympiad|scholar|competition|hackathon/i.test(text);
  });
  const defaultCertsTitle = hasAchievements ? 'CERTIFICATIONS & ACHIEVEMENTS' : 'CERTIFICATIONS';
  const displayCertsTitle = (certificationsTitle?.trim() || defaultCertsTitle).toUpperCase();

  // --- Section Renderers ---
  const renderSummary = () => {
    if (!summary) return null;
    return (
      <section key="summary" className="resume-section" style={{ marginBottom: s.sectionMarginBottom }}>
        <h2 style={{
          fontSize: '10pt',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#111827',
          borderBottom: '1px solid #d1d5db',
          paddingBottom: '2px',
          marginBottom: '4px'
        }}>
          PROFESSIONAL SUMMARY
        </h2>
        <p style={{ margin: 0, color: '#1f2937', textAlign: 'justify' }}>
          {summary}
        </p>
      </section>
    );
  };

  const renderSkills = () => {
    if (!skillCategories || skillCategories.length === 0) return null;
    return (
      <section key="skills" className="resume-section" style={{ marginBottom: s.sectionMarginBottom }}>
        <h2 style={{
          fontSize: '10pt',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#111827',
          borderBottom: '1px solid #d1d5db',
          paddingBottom: '2px',
          marginBottom: '4px'
        }}>
          TECHNICAL SKILLS
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {skillCategories.map(cat => (
            <div key={cat.id} style={{ fontSize: '9pt' }}>
              <span style={{ fontWeight: 700 }}>{cat.category}: </span>
              <span style={{ color: '#1f2937' }}>{cat.skills.join(', ')}</span>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderExperience = () => {
    if (!experience || experience.length === 0) return null;
    return (
      <section key="experience" className="resume-section" style={{ marginBottom: s.sectionMarginBottom }}>
        <h2 style={{
          fontSize: '10pt',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#111827',
          borderBottom: '1px solid #d1d5db',
          paddingBottom: '2px',
          marginBottom: '6px'
        }}>
          PROFESSIONAL EXPERIENCE
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.entryGap }}>
          {experience.map(exp => (
            <div key={exp.id} className="resume-entry">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '9.5pt' }}>{exp.company}</span>
                  <span style={{ margin: '0 4px' }}>—</span>
                  <span style={{ fontStyle: 'italic', fontWeight: 600 }}>{exp.role}</span>
                </div>
                <div style={{ fontSize: '8.5pt', fontWeight: 600, color: '#4b5563' }}>
                  {exp.startDate} – {exp.endDate || 'Present'} {exp.location ? `| ${exp.location}` : ''}
                </div>
              </div>

              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                {exp.bullets.map((b, bIdx) => (
                  <li key={bIdx} style={{ marginBottom: s.bulletMarginBottom, color: '#1f2937', lineHeight: s.bulletLineHeight }}>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderProjects = () => {
    if (!projects || projects.length === 0) return null;
    return (
      <section key="projects" className="resume-section" style={{ marginBottom: s.sectionMarginBottom }}>
        <h2 style={{
          fontSize: '10pt',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#111827',
          borderBottom: '1px solid #d1d5db',
          paddingBottom: '2px',
          marginBottom: '6px'
        }}>
          KEY TECHNICAL PROJECTS
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.projectGap }}>
          {projects.map(proj => {
            const meta = parseProjectMeta(proj);
            return (
              <div key={proj.id} className="resume-project-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '9.5pt' }}>
                      {meta.title}
                    </span>
                    {meta.linkInfo && (
                      <a
                        href={meta.linkInfo.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '8pt',
                          fontWeight: 600,
                          color: '#2563eb',
                          textDecoration: 'none'
                        }}
                        title={`Open ${meta.linkInfo.href}`}
                      >
                        <span>[{meta.linkInfo.label} ↗]</span>
                      </a>
                    )}
                  </div>
                  {meta.date && (
                    <div style={{ fontSize: '8.5pt', fontStyle: 'italic', color: '#4b5563', whiteSpace: 'nowrap' }}>
                      {meta.date}
                    </div>
                  )}
                </div>

                {(meta.techStack || meta.subtitleOrAffiliation) && (
                  <div style={{ fontSize: '8.5pt', color: '#4b5563', marginTop: '1px', marginBottom: '1.5px' }}>
                    {meta.subtitleOrAffiliation && (
                      <span style={{ fontStyle: 'italic', marginRight: '6px' }}>
                        {meta.subtitleOrAffiliation} {meta.techStack && '•'}
                      </span>
                    )}
                    {meta.techStack && (
                      <span>
                        <strong style={{ fontWeight: 600, color: '#1f2937' }}>Technologies: </strong>
                        <span style={{ fontStyle: 'italic' }}>{meta.techStack}</span>
                      </span>
                    )}
                  </div>
                )}

                <ul style={{ margin: '3px 0 0 16px', padding: 0 }}>
                  {meta.bullets.map((b, bIdx) => (
                    <li key={bIdx} style={{ marginBottom: s.bulletMarginBottom, color: '#1f2937', lineHeight: s.bulletLineHeight }}>
                      {renderFormattedText(b)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderEducation = (isGrid = false) => {
    if (!hasEducation) return null;
    return (
      <section key="education" className="resume-section" style={{ marginBottom: isGrid ? 0 : s.sectionMarginBottom }}>
        <h2 style={{
          fontSize: '10pt',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#111827',
          borderBottom: '1px solid #d1d5db',
          paddingBottom: '2px',
          marginBottom: '6px'
        }}>
          EDUCATION
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '4px' : '6px' }}>
          {education.map(edu => {
            const dateStr = edu.endDate 
              ? `${edu.startDate ? `${edu.startDate} – ` : ''}${edu.endDate}`
              : (edu.startDate || '');

            return (
              <div key={edu.id} style={{ fontSize: isCompact ? '8.5pt' : '9pt' }}>
                <div style={{ fontWeight: 700, color: '#111827' }}>{edu.degree}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563', fontSize: isCompact ? '8pt' : '8.5pt' }}>
                  <span>{edu.institution}</span>
                  {dateStr && <span>{dateStr}</span>}
                </div>
                {(() => {
                  const { gradeBadge, honorsBadge } = formatEducationDisplay(edu);
                  const metaLine = [gradeBadge, honorsBadge].filter(Boolean).join(' • ');
                  if (!metaLine) return null;
                  return (
                    <div style={{ fontSize: '8pt', color: '#374151', fontWeight: 500, marginTop: '1.5px' }}>
                      {metaLine}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderCertifications = (isGrid = false) => {
    if (!hasCertifications) return null;
    return (
      <section key="certifications" className="resume-section" style={{ marginBottom: isGrid ? 0 : s.sectionMarginBottom }}>
        <h2 style={{
          fontSize: '10pt',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#111827',
          borderBottom: '1px solid #d1d5db',
          paddingBottom: '2px',
          marginBottom: '6px'
        }}>
          {displayCertsTitle}
        </h2>
        <ul style={{ margin: 0, paddingLeft: '16px', listStyleType: 'disc' }}>
          {certifications.map(c => {
            const title = typeof c === 'string' ? c : (c.title || '');
            const issuer = typeof c === 'string' ? '' : (c.issuer || '');
            const date = typeof c === 'string' ? '' : (c.date || '');
            const key = typeof c === 'object' && c.id ? c.id : title;

            const isAchievementSentence = !issuer && (
              title.length > 40 || 
              /^(achieved|published|honored|awarded|secured|cleared|ranked|won|developed|presented|authored)/i.test(title)
            );

            return (
              <li key={key} style={{ 
                fontSize: isCompact ? '8.2pt' : '8.8pt', 
                marginBottom: isCompact ? '3px' : '4.5px', 
                lineHeight: 1.28,
                color: '#1f2937'
              }}>
                {isAchievementSentence ? (
                  <span>{renderFormattedText(title)}</span>
                ) : (
                  <span>
                    <strong style={{ fontWeight: 700 }}>{title}</strong>
                    {issuer && <span> — {issuer}</span>}
                    {date && <span style={{ color: '#4b5563' }}> ({date})</span>}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  // --- Dynamic Section Ordering Loop ---
  const renderOrderedSections = () => {
    const renderedSections = [];
    const handled = new Set();

    const eduIdx = effectiveSectionOrder.indexOf('education');
    const certIdx = effectiveSectionOrder.indexOf('certifications');
    const areAdjacent = hasEducation && hasCertifications && Math.abs(eduIdx - certIdx) === 1;

    for (let i = 0; i < effectiveSectionOrder.length; i++) {
      const sec = effectiveSectionOrder[i];
      if (handled.has(sec)) continue;

      if (areAdjacent && !isStacked && (sec === 'education' || sec === 'certifications')) {
        const firstIsEdu = eduIdx < certIdx;
        renderedSections.push(
          <div key="edu-certs-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: '1.1fr 1fr', 
            gap: '16px',
            marginBottom: s.sectionMarginBottom
          }}>
            {firstIsEdu ? renderEducation(true) : renderCertifications(true)}
            {firstIsEdu ? renderCertifications(true) : renderEducation(true)}
          </div>
        );
        handled.add('education');
        handled.add('certifications');
      } else {
        if (sec === 'summary') {
          const el = renderSummary();
          if (el) renderedSections.push(el);
        } else if (sec === 'skills') {
          const el = renderSkills();
          if (el) renderedSections.push(el);
        } else if (sec === 'experience') {
          const el = renderExperience();
          if (el) renderedSections.push(el);
        } else if (sec === 'projects') {
          const el = renderProjects();
          if (el) renderedSections.push(el);
        } else if (sec === 'education') {
          const el = renderEducation(false);
          if (el) renderedSections.push(el);
        } else if (sec === 'certifications') {
          const el = renderCertifications(false);
          if (el) renderedSections.push(el);
        }
        handled.add(sec);
      }
    }

    return renderedSections;
  };

  return (
    <div style={{
      fontFamily: 'Inter, Arial, sans-serif',
      color: '#111827',
      lineHeight: s.lineHeight,
      fontSize: s.fontSize
    }}>
      {/* Centered ATS Header */}
      <header style={{ textAlign: 'center', marginBottom: s.headerMarginBottom, borderBottom: '1px solid #111827', paddingBottom: s.headerPaddingBottom }}>
        <h1 style={{
          fontSize: '20pt',
          fontWeight: 800,
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#111827'
        }}>
          {personalInfo.fullName}
        </h1>
        <div style={{ fontSize: '10.5pt', fontWeight: 600, color: '#374151', margin: '2px 0 4px 0' }}>
          {personalInfo.title}
        </div>
        {(() => {
          const githubInfo = getProfileLinkInfo(personalInfo.github, 'github');
          const linkedinInfo = getProfileLinkInfo(personalInfo.linkedin, 'linkedin');
          const portfolioInfo = getProfileLinkInfo(personalInfo.portfolio, 'portfolio');

          return (
            <div style={{ fontSize: '8.5pt', color: '#4b5563', display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              {personalInfo.location && <span>{personalInfo.location}</span>}
              {personalInfo.phone && <span>• {personalInfo.phone}</span>}
              {personalInfo.email && (
                <span>
                  • <a href={`mailto:${personalInfo.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{personalInfo.email}</a>
                </span>
              )}
              {githubInfo && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  • <a
                      href={githubInfo.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      title={`GitHub: ${githubInfo.handle}`}
                    >
                      <svg width="10.5" height="10.5" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.85, flexShrink: 0 }}>
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                      </svg>
                      <span>{githubInfo.handle}</span>
                    </a>
                </span>
              )}
              {linkedinInfo && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  • <a
                      href={linkedinInfo.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      title={`LinkedIn: ${linkedinInfo.handle}`}
                    >
                      <svg width="10.5" height="10.5" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.85, flexShrink: 0 }}>
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      <span>{linkedinInfo.handle}</span>
                    </a>
                </span>
              )}
              {portfolioInfo && (
                <span>
                  • <a href={portfolioInfo.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{portfolioInfo.handle}</a>
                </span>
              )}
            </div>
          );
        })()}
      </header>

      {/* Dynamic Ordered Sections */}
      {renderOrderedSections()}

    </div>
  );
}
