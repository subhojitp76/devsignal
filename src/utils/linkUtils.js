/**
 * Profile & Social Link Normalization Utilities
 * Extracts short, clean handles for GitHub, LinkedIn, and personal portfolio links
 * (e.g., "github.com/subhojitp76" -> "subhojitp76") while generating valid clickable URLs.
 */

/**
 * Normalizes a raw URL or username into a clean, short display handle.
 * 
 * Examples:
 * - "github.com/subhojitp76" -> "subhojitp76"
 * - "https://github.com/subhojitp76/" -> "subhojitp76"
 * - "@subhojitp76" -> "subhojitp76"
 * - "linkedin.com/in/subhojitp76" -> "subhojitp76"
 * - "https://www.linkedin.com/in/subhojitp76/" -> "subhojitp76"
 * - "https://subhadeep.engineer/" -> "subhadeep.engineer"
 */
export function formatProfileHandle(rawInput, platform) {
  if (!rawInput) return '';
  let str = String(rawInput).trim();

  // Strip query parameters and hash fragments
  str = str.split(/[?#]/)[0].trim();

  // Strip protocol and www
  str = str.replace(/^https?:\/\//i, '').replace(/^www\./i, '');

  if (platform === 'github') {
    // Strip github.com/ and leading @
    str = str.replace(/^github\.com\//i, '').replace(/^@/, '');
  } else if (platform === 'linkedin') {
    // Strip linkedin.com/in/ or linkedin.com/ or in/
    str = str
      .replace(/^linkedin\.com\/in\//i, '')
      .replace(/^linkedin\.com\//i, '')
      .replace(/^in\//i, '');
  }

  // Strip trailing slashes
  str = str.replace(/\/+$/, '').trim();

  return str;
}

/**
 * Returns a valid, absolute clickable URL for a profile link.
 */
export function formatProfileUrl(rawInput, platform) {
  if (!rawInput) return '';
  const handle = formatProfileHandle(rawInput, platform);
  if (!handle) return '';

  if (platform === 'github') {
    return `https://github.com/${handle}`;
  }

  if (platform === 'linkedin') {
    return `https://linkedin.com/in/${handle}`;
  }

  if (platform === 'portfolio') {
    const raw = String(rawInput).trim();
    if (/^https?:\/\//i.test(raw)) {
      return raw.replace(/\/+$/, '');
    }
    return `https://${handle}`;
  }

  return rawInput;
}

/**
 * Returns { handle, url } bundle for clean rendering in templates.
 * Returns null if input is empty or invalid.
 */
export function getProfileLinkInfo(rawInput, platform) {
  if (!rawInput || !String(rawInput).trim()) return null;
  const handle = formatProfileHandle(rawInput, platform);
  const url = formatProfileUrl(rawInput, platform);
  if (!handle) return null;
  return { handle, url };
}
