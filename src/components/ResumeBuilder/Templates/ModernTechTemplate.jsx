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
      return <strong key={i} style={{ fontWeight: 600, color: '#0f172a' }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function ModernTechTemplate({ resumeData, accentColor, density = 'standard' }) {
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
    fontSize: isCompact ? '8.4pt' : isRelaxed ? '9.6pt' : '8.9pt',
    lineHeight: isCompact ? 1.22 : isRelaxed ? 1.42 : 1.28,
    headerMarginBottom: isCompact ? '5px' : isRelaxed ? '14px' : '8px',
    headerPaddingBottom: isCompact ? '4px' : isRelaxed ? '10px' : '6px',
    nameSize: isCompact ? '17.5pt' : isRelaxed ? '22pt' : '19.5pt',
    titleSize: isCompact ? '9.2pt' : isRelaxed ? '11pt' : '10pt',
    sectionMarginBottom: isCompact ? '4.5px' : isRelaxed ? '12px' : '6.5px',
    sectionHeaderMarginBottom: isCompact ? '1.5px' : isRelaxed ? '5px' : '2.5px',
    sectionTitleSize: isCompact ? '8.6pt' : isRelaxed ? '10pt' : '9.2pt',
    experienceGap: isCompact ? '4px' : isRelaxed ? '10px' : '5.5px',
    projectGap: isCompact ? '3px' : isRelaxed ? '9px' : '4.5px',
    bulletMarginBottom: isCompact ? '0.8px' : isRelaxed ? '2.5px' : '1.2px',
    bulletLineHeight: isCompact ? 1.2 : isRelaxed ? 1.34 : 1.24,
    skillsGap: isCompact ? '1px' : isRelaxed ? '3.5px' : '1.8px',
    eduGap: isCompact ? '4.5px' : isRelaxed ? '9px' : '6.5px',
    certGap: isCompact ? '3px' : isRelaxed ? '7px' : '4.5px',
    certLineHeight: isCompact ? 1.22 : isRelaxed ? 1.36 : 1.28
  };

  const effectiveSectionOrder = (sectionOrder && sectionOrder.length > 0)
    ? sectionOrder
    : DEFAULT_SECTION_ORDER;

  const hasEducation = education && education.length > 0;
  const hasCertifications = certifications && certifications.length > 0;
  const isStacked = bottomLayout === 'stacked';

  // Auto-detect if items contain achievements, research papers, awards, or exam ranks
  const hasAchievements = hasCertifications && certifications.some(c => {
    const text = typeof c === 'string' ? c : (c.title || '');
    return /rank|gate|award|honored|publish|paper|patent|olympiad|scholar|competition|hackathon/i.test(text);
  });
  const defaultCertsTitle = hasAchievements ? 'Certifications & Achievements' : 'Certifications';
  const displayCertsTitle = certificationsTitle?.trim() || defaultCertsTitle;

  // --- Section Renderers ---
  const renderSummary = () => {
    if (!summary) return null;
    return (
      <section key="summary" className="resume-section" style={{ marginBottom: s.sectionMarginBottom }}>
        <h2 style={{
          fontSize: s.sectionTitleSize,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: accentColor,
          marginBottom: '3px'
        }}>
          Professional Summary
        </h2>
        <p style={{ margin: 0, color: '#334155', textAlign: 'justify' }}>
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
          fontSize: s.sectionTitleSize,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: accentColor,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '2px',
          marginBottom: s.sectionHeaderMarginBottom
        }}>
          Technical Expertise
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.skillsGap }}>
          {skillCategories.map(cat => (
            <div key={cat.id} style={{ display: 'flex', fontSize: isCompact ? '8.5pt' : '9pt' }}>
              <span style={{ fontWeight: 700, color: '#0f172a', width: isCompact ? '140px' : '160px', flexShrink: 0 }}>
                {cat.category}:
              </span>
              <span style={{ color: '#334155' }}>
                {cat.skills.join(' • ')}
              </span>
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
          fontSize: s.sectionTitleSize,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: accentColor,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '2px',
          marginBottom: s.sectionHeaderMarginBottom
        }}>
          Work Experience
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.experienceGap }}>
          {experience.map(exp => (
            <div key={exp.id} className="resume-entry">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1px' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: isCompact ? '9.5pt' : '10pt', color: '#0f172a' }}>
                    {exp.role}
                  </span>
                  <span style={{ color: '#64748b', margin: '0 5px' }}>|</span>
                  <span style={{ fontWeight: 600, color: accentColor }}>
                    {exp.company}
                  </span>
                </div>
                <div style={{ fontSize: isCompact ? '8pt' : '8.5pt', fontWeight: 600, color: '#64748b' }}>
                  {exp.startDate} – {exp.endDate || 'Present'} {exp.location ? `• ${exp.location}` : ''}
                </div>
              </div>

              <ul style={{ margin: isCompact ? '2px 0 0 14px' : '4px 0 0 16px', padding: 0, color: '#334155' }}>
                {exp.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} style={{ marginBottom: s.bulletMarginBottom, lineHeight: s.bulletLineHeight }}>
                    {bullet}
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
          fontSize: s.sectionTitleSize,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: accentColor,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '2px',
          marginBottom: s.sectionHeaderMarginBottom
        }}>
          Featured Engineering Projects
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.projectGap }}>
          {projects.map(proj => {
            const meta = parseProjectMeta(proj);
            return (
              <div key={proj.id} className="resume-project-item">
                {/* Line 1: Project Title, Clickable Repo/Demo Link, and Right-Aligned Date */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                  rowGap: '2px',
                  columnGap: '8px'
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'baseline',
                    flexWrap: 'wrap',
                    gap: '6px',
                    maxWidth: meta.date ? '78%' : '100%'
                  }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: isCompact ? '9.2pt' : '9.6pt',
                      color: '#0f172a',
                      lineHeight: 1.25
                    }}>
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
                          fontSize: isCompact ? '7.5pt' : '8pt',
                          fontWeight: 600,
                          color: accentColor,
                          textDecoration: 'none',
                          lineHeight: 1.2,
                          padding: '0.5px 5px',
                          borderRadius: '3px',
                          background: `${accentColor}12`,
                          border: `1px solid ${accentColor}30`,
                          transition: 'all 0.15s ease'
                        }}
                        title={`Open ${meta.linkInfo.href}`}
                      >
                        <span style={{ opacity: 0.85 }}>[{meta.linkInfo.label} ↗]</span>
                      </a>
                    )}
                  </div>

                  {meta.date && (
                    <div style={{
                      fontSize: isCompact ? '7.8pt' : '8.2pt',
                      fontWeight: 600,
                      color: '#64748b',
                      whiteSpace: 'nowrap',
                      marginLeft: 'auto'
                    }}>
                      {meta.date}
                    </div>
                  )}
                </div>

                {/* Line 2: Optional Subtitle/Affiliation and Tech Stack Tags */}
                {(meta.techStack || meta.subtitleOrAffiliation) && (
                  <div style={{
                    fontSize: isCompact ? '8pt' : '8.5pt',
                    marginTop: '1.5px',
                    marginBottom: '2px',
                    display: 'flex',
                    alignItems: 'baseline',
                    flexWrap: 'wrap',
                    gap: '4px 6px',
                    lineHeight: 1.3
                  }}>
                    {meta.subtitleOrAffiliation && (
                      <span style={{
                        fontWeight: 600,
                        color: '#475569',
                        fontStyle: 'italic'
                      }}>
                        {meta.subtitleOrAffiliation}
                        {meta.techStack && <span style={{ marginLeft: '4px', fontStyle: 'normal', color: '#94a3b8' }}>•</span>}
                      </span>
                    )}

                    {meta.techStack && (
                      <span style={{ display: 'inline-flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '3px' }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>Technologies:</span>
                        <span style={{ color: '#475569', fontStyle: 'italic' }}>{meta.techStack}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Line 3+: Metric-driven bullet points */}
                <ul style={{
                  margin: isCompact ? '2px 0 0 14px' : '3px 0 0 16px',
                  padding: 0,
                  color: '#334155'
                }}>
                  {meta.bullets.map((b, bIdx) => (
                    <li key={bIdx} style={{ marginBottom: s.bulletMarginBottom, lineHeight: s.bulletLineHeight }}>
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
          fontSize: s.sectionTitleSize,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: accentColor,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '2px',
          marginBottom: s.sectionHeaderMarginBottom
        }}>
          Education
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.eduGap }}>
          {education.map(edu => {
            const dateStr = edu.endDate 
              ? `${edu.startDate ? `${edu.startDate} – ` : ''}${edu.endDate}`
              : (edu.startDate || '');

            return (
              <div key={edu.id} style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Degree Title */}
                <div style={{ 
                  fontWeight: 700, 
                  fontSize: isCompact ? '8.8pt' : '9.2pt', 
                  color: '#0f172a',
                  lineHeight: 1.25
                }}>
                  {edu.degree}
                </div>

                {/* Institution & Dates */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                  fontSize: isCompact ? '8pt' : '8.5pt', 
                  color: '#475569',
                  marginTop: '1.5px'
                }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>
                    {edu.institution}
                  </span>
                  {dateStr && (
                    <span style={{ fontSize: isCompact ? '7.5pt' : '8pt', color: '#64748b', fontWeight: 500 }}>
                      {dateStr}
                    </span>
                  )}
                </div>

                {/* Honors / GPA Badge */}
                {(() => {
                  const { gradeBadge, honorsBadge } = formatEducationDisplay(edu);
                  if (!gradeBadge && !honorsBadge) return null;
                  return (
                    <div style={{ marginTop: '2.5px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {gradeBadge && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          fontSize: '7.5pt',
                          fontWeight: 600,
                          color: accentColor,
                          backgroundColor: `${accentColor}12`,
                          border: `1px solid ${accentColor}30`,
                          borderRadius: '3px',
                          padding: '0.5px 6px',
                          lineHeight: '1.25'
                        }}>
                          {gradeBadge}
                        </span>
                      )}
                      {honorsBadge && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          fontSize: '7.5pt',
                          fontWeight: 600,
                          color: (honorsBadge.toLowerCase().includes('cgpa') || honorsBadge.toLowerCase().includes('gpa')) ? accentColor : '#475569',
                          backgroundColor: (honorsBadge.toLowerCase().includes('cgpa') || honorsBadge.toLowerCase().includes('gpa')) ? `${accentColor}12` : '#f1f5f9',
                          border: `1px solid ${(honorsBadge.toLowerCase().includes('cgpa') || honorsBadge.toLowerCase().includes('gpa')) ? `${accentColor}30` : '#e2e8f0'}`,
                          borderRadius: '3px',
                          padding: '0.5px 6px',
                          lineHeight: '1.25'
                        }}>
                          {honorsBadge}
                        </span>
                      )}
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
          fontSize: s.sectionTitleSize,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: accentColor,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '2px',
          marginBottom: s.sectionHeaderMarginBottom
        }}>
          {displayCertsTitle}
        </h2>
        <ul style={{ 
          margin: 0, 
          paddingLeft: '14px', 
          listStyleType: 'disc', 
          color: accentColor 
        }}>
          {certifications.map(cert => {
            const title = typeof cert === 'string' ? cert : (cert.title || '');
            const issuer = typeof cert === 'string' ? '' : (cert.issuer || '');
            const date = typeof cert === 'string' ? '' : (cert.date || '');
            const key = typeof cert === 'object' && cert.id ? cert.id : title;

            const isAchievementSentence = !issuer && (
              title.length > 40 || 
              /^(achieved|published|honored|awarded|secured|cleared|ranked|won|developed|presented|authored)/i.test(title)
            );

            return (
              <li key={key} style={{ 
                marginBottom: s.certGap, 
                lineHeight: s.certLineHeight,
                fontSize: isCompact ? '8pt' : '8.5pt',
                paddingLeft: '2px'
              }}>
                {isAchievementSentence ? (
                  <span style={{ color: '#334155' }}>
                    {renderFormattedText(title)}
                  </span>
                ) : (
                  <span style={{ color: '#334155' }}>
                    <strong style={{ fontWeight: 600, color: '#0f172a' }}>{title}</strong>
                    {issuer && <span style={{ color: '#475569' }}> — {issuer}</span>}
                    {date && <span style={{ color: '#64748b', fontSize: '7.8pt' }}> ({date})</span>}
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
            gap: isCompact ? '14px' : '20px',
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
      fontFamily: 'Inter, -apple-system, sans-serif',
      color: '#1e293b',
      lineHeight: s.lineHeight,
      fontSize: s.fontSize
    }}>
      {/* Header */}
      <header style={{
        borderBottom: `2.5px solid ${accentColor}`,
        paddingBottom: s.headerPaddingBottom,
        marginBottom: s.headerMarginBottom
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h1 style={{
              fontSize: s.nameSize,
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.5px',
              margin: 0
            }}>
              {personalInfo.fullName || 'Your Name'}
            </h1>
            <div style={{
              fontSize: s.titleSize,
              fontWeight: 600,
              color: accentColor,
              marginTop: '2px'
            }}>
              {personalInfo.title || 'Senior Software Engineer'}
            </div>
          </div>

          {/* Contact Details */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isCompact ? '1px' : '3px',
            fontSize: isCompact ? '8pt' : '8.5pt',
            color: '#475569',
            textAlign: 'right'
          }}>
            {personalInfo.email && (
              <div>
                <a href={`mailto:${personalInfo.email}`} style={{ color: 'inherit' }}>{personalInfo.email}</a>
              </div>
            )}
            {personalInfo.phone && <div>{personalInfo.phone}</div>}
            {personalInfo.location && <div>{personalInfo.location}</div>}
            {(() => {
              const githubInfo = getProfileLinkInfo(personalInfo.github, 'github');
              const linkedinInfo = getProfileLinkInfo(personalInfo.linkedin, 'linkedin');
              const portfolioInfo = getProfileLinkInfo(personalInfo.portfolio, 'portfolio');
              if (!githubInfo && !linkedinInfo && !portfolioInfo) return null;
              return (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                  {githubInfo && (
                    <a
                      href={githubInfo.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: accentColor,
                        fontWeight: 500,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3.5px'
                      }}
                      title={`GitHub: ${githubInfo.handle}`}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.85, flexShrink: 0 }}>
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                      </svg>
                      <span>{githubInfo.handle}</span>
                    </a>
                  )}
                  {linkedinInfo && (
                    <a
                      href={linkedinInfo.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: accentColor,
                        fontWeight: 500,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3.5px'
                      }}
                      title={`LinkedIn: ${linkedinInfo.handle}`}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.85, flexShrink: 0 }}>
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      <span>{linkedinInfo.handle}</span>
                    </a>
                  )}
                  {portfolioInfo && (
                    <a
                      href={portfolioInfo.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: accentColor,
                        fontWeight: 500,
                        textDecoration: 'none'
                      }}
                      title={`Portfolio: ${portfolioInfo.handle}`}
                    >
                      <span>{portfolioInfo.handle}</span>
                    </a>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </header>

      {/* Dynamic Ordered Resume Sections */}
      {renderOrderedSections()}

    </div>
  );
}
