/**
 * Utilities for parsing, formatting, and presenting resume project entries.
 * Ensures project title, repository/live links, dates, affiliations, and tech stacks
 * render with maximum legibility and elegance across all resume templates.
 */

const DATE_REGEX = /^(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})\s*(?:[-–—至to]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}|Present|Current))?/i;

/**
 * Normalizes and formats a project repository or demo URL into a structured link object.
 * @param {string} rawLink 
 * @returns {{ href: string, cleanDisplay: string, label: string, isGithub: boolean } | null}
 */
export function formatProjectLink(rawLink) {
  if (!rawLink) return null;
  const clean = String(rawLink).trim();
  if (!clean) return null;

  const href = clean.startsWith('http://') || clean.startsWith('https://') 
    ? clean 
    : `https://${clean}`;

  const cleanDisplay = clean
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');

  let label = 'Live Repo';
  let isGithub = false;

  if (/github\.com/i.test(cleanDisplay)) {
    label = 'GitHub';
    isGithub = true;
  } else if (/gitlab\.com/i.test(cleanDisplay)) {
    label = 'GitLab';
    isGithub = true;
  } else if (/bitbucket\.org/i.test(cleanDisplay)) {
    label = 'Bitbucket';
    isGithub = true;
  } else if (/demo|live|preview|vercel|netlify|render|pages\.dev|app\b/i.test(cleanDisplay)) {
    label = 'Live Demo';
  } else {
    label = 'Project Link';
  }

  return {
    href,
    cleanDisplay,
    label,
    isGithub
  };
}

/**
 * Extracts and separates metadata from a project item.
 * Decouples date and mentor/supervisor affiliations if bundled into the tech stack field,
 * guaranteeing the title line never collides with or wraps against long technology lists.
 * 
 * @param {object} proj 
 * @returns {{
 *   title: string,
 *   date: string,
 *   linkInfo: ReturnType<typeof formatProjectLink>,
 *   techStack: string,
 *   subtitleOrAffiliation: string,
 *   bullets: string[]
 * }}
 */
export function parseProjectMeta(proj) {
  if (!proj) {
    return {
      title: 'Untitled Project',
      date: '',
      linkInfo: null,
      techStack: '',
      subtitleOrAffiliation: '',
      bullets: []
    };
  }

  const title = (proj.name || 'Untitled Project').trim();
  const explicitDate = proj.date || (proj.startDate && proj.endDate ? `${proj.startDate} – ${proj.endDate}` : proj.startDate || proj.endDate) || '';
  const rawTech = Array.isArray(proj.techStack) ? proj.techStack.join(', ') : (proj.techStack || '');
  const linkInfo = formatProjectLink(proj.link);

  let date = explicitDate.trim();
  let techStack = '';
  let subtitleOrAffiliation = (proj.description || '').trim();

  // If rawTech has parts separated by bullet or pipe: e.g. "Jan 2025 - Feb 2025 • NodeJs... • Platform"
  if (rawTech) {
    const segments = rawTech.split(/\s+[•|·]\s+/).map(s => s.trim()).filter(Boolean);
    const techSegments = [];

    for (const seg of segments) {
      if (!date && DATE_REGEX.test(seg)) {
        date = seg;
      } else if (!subtitleOrAffiliation && /^\(?(?:Prof\.|Dr\.|Mentor|Advisor|Guide|Supervisor|IIT|NIT|University)/i.test(seg)) {
        subtitleOrAffiliation = seg.replace(/^\(|\)$/g, '').trim();
      } else {
        techSegments.push(seg);
      }
    }

    techStack = techSegments.join(' • ');
  }

  return {
    title,
    date,
    linkInfo,
    techStack,
    subtitleOrAffiliation,
    bullets: Array.isArray(proj.bullets) ? proj.bullets : []
  };
}
