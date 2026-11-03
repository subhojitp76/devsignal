import React from 'react';
import { parseProjectMeta } from '../../../utils/projectUtils';
import { formatEducationDisplay } from '../../../utils/educationUtils';
import { getProfileLinkInfo } from '../../../utils/linkUtils';
import { DEFAULT_SECTION_ORDER } from '../../../constants/defaultData';

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
    fontSize: isCompact ? '8.4pt' : isRelaxed ? '9.6pt' : '8.9pt',
    lineHeight: isCompact ? 1.24 : isRelaxed ? 1.44 : 1.3,
    headerMarginBottom: isCompact ? '6px' : isRelaxed ? '16px' : '9px',
    headerPaddingBottom: isCompact ? '4px' : isRelaxed ? '10px' : '6px',
    nameSize: isCompact ? '17.5pt' : isRelaxed ? '22pt' : '19.5pt',
    titleSize: isCompact ? '8.8pt' : isRelaxed ? '10.5pt' : '9.5pt',
    sectionMarginBottom: isCompact ? '4.5px' : isRelaxed ? '12px' : '6.5px',
    sectionHeaderMarginBottom: isCompact ? '2px' : isRelaxed ? '5px' : '3px',
    sectionTitleSize: isCompact ? '8.6pt' : isRelaxed ? '10pt' : '9.2pt',
    experienceGap: isCompact ? '4px' : isRelaxed ? '10px' : '5.5px',
    projectGap: isCompact ? '3px' : isRelaxed ? '9px' : '4.5px',
    bulletMarginBottom: isCompact ? '1px' : isRelaxed ? '2.5px' : '1.2px',
    bulletLineHeight: isCompact ? 1.2 : isRelaxed ? 1.34 : 1.24,
    skillsGap: isCompact ? '1px' : isRelaxed ? '3.5px' : '1.8px',
    eduGap: isCompact ? '4px' : isRelaxed ? '9px' : '6.5px',
    certGap: isCompact ? '3px' : isRelaxed ? '7px' : '4.5px',
    certLineHeight: isCompact ? 1.22 : isRelaxed ? 1.36 : 1.28
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
  const defaultCertsTitle = hasAchievements ? 'CERTIFICATIONS_AND_ACHIEVEMENTS' : 'CERTIFICATIONS';
  const displayCertsTitle = certificationsTitle?.trim() 
    ? certificationsTitle.trim().toUpperCase().replace(/[\s&]+/g, '_')
    : defaultCertsTitle;

  // --- Section Renderers ---
  const renderSummary = () => {
    if (!summary) return null;
    return (
      <section key="summary" className="resume-section" style={{ marginBottom: s.sectionMarginBottom }}>
        <div style={{
          fontSize: s.sectionTitleSize,
          fontWeight: 700,
          color: accentColor,
          marginBottom: s.sectionHeaderMarginBottom,
          borderBottom: `1px solid ${accentColor}40`,
          paddingBottom: '2px',
          letterSpacing: '0.4px'
        }}>
          # [SYSTEM_PROFILE]
        </div>
        <div style={{ color: '#334155', textAlign: 'justify', lineHeight: s.lineHeight }}>
          {summary}
        </div>
      </section>
    );
  };

  const renderSkills = () => {
    if (!skillCategories || skillCategories.length === 0) return null;
    return (
      <section key="skills" className="resume-section" style={{ marginBottom: s.sectionMarginBottom }}>
        <div style={{
          fontSize: s.sectionTitleSize,
          fontWeight: 700,
          color: accentColor,
          marginBottom: s.sectionHeaderMarginBottom,
          borderBottom: `1px solid ${accentColor}40`,
          paddingBottom: '2px',
          letterSpacing: '0.4px'
        }}>
          # [TECHNICAL_CAPABILITIES]
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.skillsGap }}>
          {skillCategories.map(cat => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontWeight: 700, color: '#0f172a', minWidth: isCompact ? '120px' : '135px', flexShrink: 0 }}>
                $ {cat.category}:
              </span>
              <span style={{ color: '#334155' }}>
                {Array.isArray(cat.skills) ? cat.skills.join(', ') : cat.skills}
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
        <div style={{
          fontSize: s.sectionTitleSize,
          fontWeight: 700,
          color: accentColor,
          marginBottom: s.sectionHeaderMarginBottom,
          borderBottom: `1px solid ${accentColor}40`,
          paddingBottom: '2px',
          letterSpacing: '0.4px'
        }}>
          # [PRODUCTION_EXPERIENCE]
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.experienceGap }}>
          {experience.map(exp => (
            <div key={exp.id} className="resume-entry">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '9pt', color: '#0f172a' }}>
                    &gt; {exp.role}
                  </span>
                  <span style={{ color: accentColor, fontWeight: 600 }}>
                    @{exp.company}
                  </span>
                </div>
                <div style={{ fontSize: '7.8pt', color: '#64748b', fontWeight: 500 }}>
                  [{exp.startDate} - {exp.current ? 'PRESENT' : exp.endDate}] {exp.location && `// ${exp.location}`}
                </div>
              </div>

              {exp.bullets && exp.bullets.length > 0 && (
                <ul style={{ margin: '2px 0 0 0', paddingLeft: '14px', color: '#334155' }}>
                  {exp.bullets.map((bullet, idx) => (
                    <li key={idx} style={{ marginBottom: s.bulletMarginBottom, lineHeight: s.bulletLineHeight }}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
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
        <div style={{
          fontSize: s.sectionTitleSize,
          fontWeight: 700,
          color: accentColor,
          marginBottom: s.sectionHeaderMarginBottom,
          borderBottom: `1px solid ${accentColor}40`,
          paddingBottom: '2px',
          letterSpacing: '0.4px'
        }}>
          # [FEATURED_PROJECTS]
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
                    <div style={{ fontSize: '7.8pt', color: '#64748b', fontWeight: 500 }}>
                      [{meta.date}]
                    </div>
                  )}
                </div>

                {meta.techStack && (
                  <div style={{ fontSize: '7.5pt', color: '#64748b', margin: '0.5px 0 1px 0' }}>
                    $ stack: [{meta.techStack}]
                  </div>
                )}

                {meta.bullets && meta.bullets.length > 0 && (
                  <ul style={{ margin: '1.5px 0 0 0', paddingLeft: '14px', color: '#334155' }}>
                    {meta.bullets.map((bullet, idx) => (
                      <li key={idx} style={{ marginBottom: s.bulletMarginBottom, lineHeight: s.bulletLineHeight }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderEducation = () => {
    if (!hasEducation) return null;
    return (
      <section key="education" className="resume-section" style={{ marginBottom: s.sectionMarginBottom }}>
        <div style={{
          fontSize: s.sectionTitleSize,
          fontWeight: 700,
          color: accentColor,
          marginBottom: s.sectionHeaderMarginBottom,
          borderBottom: `1px solid ${accentColor}40`,
          paddingBottom: '2px',
          letterSpacing: '0.4px'
        }}>
          # [ACADEMIC_CREDENTIALS]
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.eduGap }}>
          {education.map(edu => {
            const formatted = formatEducationDisplay(edu);
            return (
              <div key={edu.id} className="resume-entry">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '8.8pt', color: '#0f172a' }}>
                      &gt; {formatted.degreeLine}
                    </span>
                    <span style={{ color: accentColor, fontWeight: 600 }}>
                      @{formatted.institutionLine}
                    </span>
                  </div>
                  <div style={{ fontSize: '7.8pt', color: '#64748b' }}>
                    {formatted.rightMetaLine}
                  </div>
                </div>
                {formatted.highlightsLine && (
                  <div style={{ fontSize: '7.8pt', color: '#64748b', marginTop: '1px' }}>
                    {formatted.highlightsLine}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderCertifications = () => {
    if (!hasCertifications) return null;
    return (
      <section key="certifications" className="resume-section" style={{ marginBottom: s.sectionMarginBottom }}>
        <div style={{
          fontSize: s.sectionTitleSize,
          fontWeight: 700,
          color: accentColor,
          marginBottom: s.sectionHeaderMarginBottom,
          borderBottom: `1px solid ${accentColor}40`,
          paddingBottom: '2px',
          letterSpacing: '0.4px'
        }}>
          # [{displayCertsTitle}]
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: s.certGap }}>
          {certifications.map(cert => {
            if (typeof cert === 'string') {
              return (
                <div key={cert} style={{ display: 'flex', alignItems: 'baseline', gap: '6px', color: '#334155' }}>
                  <span style={{ color: accentColor }}>&gt;</span>
                  <span>{cert}</span>
                </div>
              );
            }
            return (
              <div key={cert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ color: accentColor }}>&gt;</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{cert.title}</span>
                  {cert.issuer && <span style={{ color: '#64748b' }}>// {cert.issuer}</span>}
                </div>
                {cert.date && <div style={{ fontSize: '7.8pt', color: '#64748b' }}>[{cert.date}]</div>}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderBottomLayout = () => {
    if (!hasEducation && !hasCertifications) return null;

    if (isStacked || !hasEducation || !hasCertifications) {
      return (
        <React.Fragment key="bottom_combined">
          {hasEducation && renderEducation()}
          {hasCertifications && renderCertifications()}
        </React.Fragment>
      );
    }

    return (
      <div 
        key="bottom_combined"
        className="resume-section resume-bottom-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: isCompact ? '12px' : '16px',
          marginBottom: s.sectionMarginBottom,
          pageBreakInside: 'avoid',
          breakInside: 'avoid'
        }}
      >
        <div>{renderEducation()}</div>
        <div>{renderCertifications()}</div>
      </div>
    );
  };

  const renderOrderedSections = () => {
    let bottomRendered = false;

    return effectiveSectionOrder.map(secKey => {
      switch (secKey) {
        case 'summary':
          return renderSummary();
        case 'skills':
          return renderSkills();
        case 'experience':
          return renderExperience();
        case 'projects':
          return renderProjects();
        case 'education':
        case 'certifications':
          if (!bottomRendered) {
            bottomRendered = true;
            return renderBottomLayout();
          }
          return null;
        default:
          return null;
      }
    });
  };

  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      color: '#1e293b'
    }}>
      {/* CLI Prompt Header */}
      <header style={{
        marginBottom: s.headerMarginBottom,
        paddingBottom: s.headerPaddingBottom,
        borderBottom: `2px solid ${accentColor}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ color: accentColor, fontWeight: 700, fontSize: '13pt' }}>$</span>
              <h1 style={{
                fontSize: s.nameSize,
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.4px',
                lineHeight: 1.15
              }}>
                {personalInfo.fullName || 'ENGINEER_NAME'}
              </h1>
            </div>
            <div style={{
              fontSize: s.titleSize,
              fontWeight: 600,
              color: accentColor,
              marginTop: '1px'
            }}>
              role: &quot;{personalInfo.title || 'Systems Engineer'}&quot;
            </div>
          </div>

          <div style={{ fontSize: '8pt', textAlign: 'right', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {personalInfo.email && (
              <div>
                <a href={`mailto:${personalInfo.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {personalInfo.email}
                </a>
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
