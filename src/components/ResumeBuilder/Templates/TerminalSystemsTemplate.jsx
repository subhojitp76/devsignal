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

export default function TerminalSystemsTemplate({ resumeData, accentColor, density = 'standard' }) {
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
    fontSize: isCompact ? '8pt' : isRelaxed ? '9pt' : '8.25pt',
    lineHeight: isCompact ? 1.24 : isRelaxed ? 1.4 : 1.28,
    headerMarginBottom: isCompact ? '7px' : isRelaxed ? '14px' : '8.5px',
    headerPaddingBottom: isCompact ? '5px' : isRelaxed ? '12px' : '7px',
    sectionMarginBottom: isCompact ? '5px' : isRelaxed ? '12px' : '7px',
    entryGap: isCompact ? '4.5px' : isRelaxed ? '10px' : '6px',
    projectGap: isCompact ? '3.5px' : isRelaxed ? '9px' : '5px',
    bulletMarginBottom: isCompact ? '1px' : isRelaxed ? '2.5px' : '1.2px',
    bulletLineHeight: isCompact ? 1.2 : isRelaxed ? 1.34 : 1.24
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
  const defaultCertsTitle = hasAchievements ? 'CERTIFICATIONS_&_ACHIEVEMENTS' : 'CERTIFICATIONS';
  const displayCertsTitle = (certificationsTitle?.trim() || defaultCertsTitle).toUpperCase().replace(/\s+/g, '_');

  // --- Section Renderers ---
  const renderSummary = () => {
    if (!summary) return null;
    return (
      <section key="summary" className="resume-section" style={{ marginBottom: s.sectionMarginBottom }}>
        <div style={{ color: accentColor, fontWeight: 700, fontSize: '9pt', marginBottom: '3px' }}>
          # [SYSTEM_PROFILE]
        </div>
        <p style={{ margin: 0, color: '#334155', textAlign: 'justify', lineHeight: 1.35 }}>
          {summary}
        </p>
      </section>
    );
  };

  const renderSkills = () => {
    if (!skillCategories || skillCategories.length === 0) return null;
    return (
      <section key="skills" className="resume-section" style={{ marginBottom: s.sectionMarginBottom }}>
        <div style={{ color: accentColor, fontWeight: 700, fontSize: '9pt', marginBottom: '4px' }}>
          # [TECHNICAL_CAPABILITIES]
        </div>
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          padding: '6px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px'
        }}>
          {skillCategories.map(cat => (
            <div key={cat.id} style={{ display: 'flex' }}>
              <span style={{ fontWeight: 700, width: '150px', flexShrink: 0, color: '#0f172a' }}>
                {cat.category}:
              </span>
              <span style={{ color: '#475569' }}>
                {cat.skills.join(' | ')}
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
        <div style={{ color: accentColor, fontWeight: 700, fontSize: '9pt', marginBottom: '6px' }}>
          # [PRODUCTION_WORK_EXPERIENCE]
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.entryGap }}>
          {experience.map(exp => (
            <div key={exp.id} className="resume-entry">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '9.5pt', color: '#0f172a' }}>
                    {exp.role}
                  </span>
                  <span style={{ color: accentColor, fontWeight: 600, marginLeft: '6px' }}>
                    @{exp.company}
                  </span>
                </div>
                <div style={{ fontSize: '8pt', color: '#64748b' }}>
                  [{exp.startDate} -&gt; {exp.endDate || 'NOW'}]
                </div>
              </div>

              <ul style={{ margin: '3px 0 0 14px', padding: 0, color: '#334155' }}>
                {exp.bullets.map((b, bIdx) => (
                  <li key={bIdx} style={{ marginBottom: s.bulletMarginBottom, lineHeight: s.bulletLineHeight }}>
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
        <div style={{ color: accentColor, fontWeight: 700, fontSize: '9pt', marginBottom: '6px' }}>
          # [OPEN_SOURCE_&amp;_SYSTEMS_PROJECTS]
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.projectGap }}>
          {projects.map(proj => {
            const meta = parseProjectMeta(proj);
            return (
              <div key={proj.id} className="resume-project-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '9pt', color: '#0f172a' }}>
                      &gt; {meta.title}
                    </span>
                    {meta.linkInfo && (
                      <a
                        href={meta.linkInfo.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '7.5pt',
                          color: accentColor,
                          textDecoration: 'none',
                          fontWeight: 600
                        }}
                        title={`Open ${meta.linkInfo.href}`}
                      >
                        [git:{meta.linkInfo.label.toLowerCase()} ↗]
                      </a>
                    )}
                  </div>
                  {meta.date && (
                    <div style={{ fontSize: '7.5pt', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {meta.date}
                    </div>
                  )}
                </div>

                {(meta.techStack || meta.subtitleOrAffiliation) && (
                  <div style={{ fontSize: '7.5pt', color: '#64748b', marginTop: '1px', marginBottom: '1.5px' }}>
                    {meta.subtitleOrAffiliation && (
                      <span style={{ color: '#475569', marginRight: '6px' }}>
                        // {meta.subtitleOrAffiliation}
                      </span>
                    )}
                    {meta.techStack && (
                      <span>[stack: {meta.techStack}]</span>
                    )}
                  </div>
                )}

                <ul style={{ margin: '2px 0 0 14px', padding: 0, color: '#334155' }}>
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
        <div style={{ color: accentColor, fontWeight: 700, fontSize: '8.5pt', marginBottom: '4px' }}>
          # [ACADEMIC_CREDENTIALS]
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '4px' : '6px' }}>
          {education.map(edu => {
            const dateStr = edu.endDate 
              ? `${edu.startDate ? `${edu.startDate} - ` : ''}${edu.endDate}`
              : (edu.startDate || '');
            return (
              <div key={edu.id} style={{ fontSize: '8pt', color: '#334155' }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{edu.degree}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>{edu.institution}</span>
                  {dateStr && <span>[{dateStr}]</span>}
                </div>
                {(() => {
                  const { gradeBadge, honorsBadge } = formatEducationDisplay(edu);
                  const metaLine = [gradeBadge, honorsBadge].filter(Boolean).join(' | ');
                  if (!metaLine) return null;
                  return (
                    <div style={{ color: accentColor, fontSize: '7.5pt', marginTop: '1px' }}>
                      &gt; {metaLine}
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
        <div style={{ color: accentColor, fontWeight: 700, fontSize: '8.5pt', marginBottom: '4px' }}>
          # [{displayCertsTitle}]
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '3px' : '4.5px' }}>
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
              <div key={key} style={{ fontSize: isCompact ? '7.5pt' : '8pt', color: '#334155', display: 'flex', alignItems: 'baseline', gap: '5px', lineHeight: 1.25 }}>
                <span style={{ color: accentColor, fontWeight: 700 }}>&gt;</span>
                <div>
                  {isAchievementSentence ? (
                    <span>{renderFormattedText(title)}</span>
                  ) : (
                    <span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{title}</span>
                      {issuer && <span style={{ color: '#64748b' }}> ({issuer})</span>}
                      {date && <span style={{ color: '#64748b' }}> • {date}</span>}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
            gridTemplateColumns: '1fr 1fr', 
            gap: '14px',
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
      fontFamily: "'Fira Code', 'JetBrains Mono', ui-monospace, monospace",
      color: '#0f172a',
      lineHeight: s.lineHeight,
      fontSize: s.fontSize
    }}>
      {/* Terminal Style Header */}
      <header style={{
        borderBottom: `2px dashed ${accentColor}`,
        paddingBottom: s.headerPaddingBottom,
        marginBottom: s.headerMarginBottom
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '10pt', color: accentColor, fontWeight: 700 }}>
              $ whoami
            </div>
            <h1 style={{
              fontSize: '20pt',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.5px',
              margin: '2px 0'
            }}>
              {personalInfo.fullName || 'Software Engineer'}
            </h1>
            <div style={{ fontSize: '10pt', fontWeight: 600, color: '#334155' }}>
              &gt; {personalInfo.title}
            </div>
          </div>

          <div style={{ fontSize: '8pt', textAlign: 'right', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div>{personalInfo.email}</div>
            <div>{personalInfo.phone}</div>
            <div>{personalInfo.location}</div>
            {(() => {
              const githubInfo = getProfileLinkInfo(personalInfo.github, 'github');
              const linkedinInfo = getProfileLinkInfo(personalInfo.linkedin, 'linkedin');
              const portfolioInfo = getProfileLinkInfo(personalInfo.portfolio, 'portfolio');
              if (!githubInfo && !linkedinInfo && !portfolioInfo) return null;
              return (
                <div style={{ color: accentColor, fontWeight: 600, display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {githubInfo && (
                    <a
                      href={githubInfo.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: accentColor, textDecoration: 'none' }}
                      title={`GitHub: ${githubInfo.handle}`}
                    >
                      gh/{githubInfo.handle}
                    </a>
                  )}
                  {linkedinInfo && (
                    <a
                      href={linkedinInfo.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: accentColor, textDecoration: 'none' }}
                      title={`LinkedIn: ${linkedinInfo.handle}`}
                    >
                      in/{linkedinInfo.handle}
                    </a>
                  )}
                  {portfolioInfo && (
                    <a
                      href={portfolioInfo.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: accentColor, textDecoration: 'none' }}
                      title={`Portfolio: ${portfolioInfo.handle}`}
                    >
                      web/{portfolioInfo.handle}
                    </a>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </header>

      {/* Dynamic Ordered Sections */}
      {renderOrderedSections()}

    </div>
  );
}
