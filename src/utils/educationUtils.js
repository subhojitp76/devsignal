/**
 * Education Formatting & Normalization Utilities
 * Ensures either GPA or CGPA is cleanly displayed, preventing duplicate prefixes
 * like "GPA: CGPA: 8.29" and eliminating duplicate badges for the same score.
 */

export function cleanGradeString(rawGrade) {
  if (!rawGrade) return '';
  let str = String(rawGrade).trim();

  // 1. Remove redundant stacked prefixes like "GPA: CGPA:", "GPA: GPA:", "CGPA: GPA:", etc.
  str = str.replace(/^(?:GPA|CGPA|Score|Percentage)\s*[:\-]\s*(?:GPA|CGPA|Score|Percentage)\s*[:\-]?\s*/i, (match) => {
    if (/CGPA/i.test(match)) return 'CGPA: ';
    if (/Percentage/i.test(match)) return 'Percentage: ';
    return 'GPA: ';
  });

  // 2. Normalize single prefix with clean punctuation
  if (/^CGPA\s*[:\-]?\s*/i.test(str)) {
    return str.replace(/^CGPA\s*[:\-]?\s*/i, 'CGPA: ');
  }
  if (/^GPA\s*[:\-]?\s*/i.test(str)) {
    return str.replace(/^GPA\s*[:\-]?\s*/i, 'GPA: ');
  }
  if (/^Percentage\s*[:\-]?\s*/i.test(str)) {
    return str.replace(/^Percentage\s*[:\-]?\s*/i, 'Percentage: ');
  }
  if (/^Score\s*[:\-]?\s*/i.test(str)) {
    return str.replace(/^Score\s*[:\-]?\s*/i, 'Score: ');
  }

  // 3. For raw numbers without prefix (e.g., "8.29", "8.29/10", "3.8/4.0")
  const numMatch = str.match(/^([0-9.]+)(?:\s*\/\s*([0-9.]+))?/);
  if (numMatch) {
    const val = parseFloat(numMatch[1]);
    const max = numMatch[2] ? parseFloat(numMatch[2]) : null;
    // Scales out of 10 or scores > 4.0 are standard CGPA
    if (max === 10 || (!max && val > 4.0)) {
      return `CGPA: ${str}`;
    }
    return `GPA: ${str}`;
  }

  return str;
}

/**
 * Returns clean { gradeBadge, honorsBadge } for an education item.
 * Guarantees zero duplicate badges if highlights and gpa contain the same score.
 */
export function formatEducationDisplay(edu) {
  if (!edu) return { gradeBadge: null, honorsBadge: null };

  const rawGpa = (edu.gpa || '').trim();
  const rawHighlights = (edu.highlights || '').trim();

  let gradeBadge = null;
  let honorsBadge = null;

  // 1. Determine Grade Badge
  if (rawGpa) {
    gradeBadge = cleanGradeString(rawGpa);
  } else if (rawHighlights && /(?:CGPA|GPA|Percentage|Score)[:\s]*[0-9.]+/i.test(rawHighlights)) {
    const match = rawHighlights.match(/(?:CGPA|GPA|Percentage|Score)[:\s]*[0-9.]+(?:\s*\/\s*[0-9.]+)?%?/i);
    if (match) {
      gradeBadge = cleanGradeString(match[0]);
    }
  }

  // 2. Determine Honors / Highlights Badge (deduplicating against grade)
  if (rawHighlights) {
    let cleanedHighlights = rawHighlights;

    if (gradeBadge) {
      const scoreMatch = gradeBadge.match(/[0-9.]+/);
      const score = scoreMatch ? scoreMatch[0] : null;

      const normalizedHighlights = rawHighlights.toLowerCase().replace(/[:\s\-–—]/g, '');
      const normalizedGrade = gradeBadge.toLowerCase().replace(/[:\s\-–—]/g, '');

      // Check if highlights is an exact copy of the grade or score
      if (normalizedHighlights === normalizedGrade || (score && normalizedHighlights === score)) {
        cleanedHighlights = '';
      } else if (score && /(?:CGPA|GPA|Percentage|Score)[:\s]*[0-9.]+/i.test(cleanedHighlights)) {
        // Highlights contains grade along with honors (e.g. "CGPA: 8.29 | Magna Cum Laude")
        cleanedHighlights = cleanedHighlights
          .replace(/(?:CGPA|GPA|Percentage|Score)[:\s]*[0-9.]+(?:\s*\/\s*[0-9.]+)?%?/gi, '')
          .replace(/^[|•–—,\s]+|[|•–—,\s]+$/g, '')
          .trim();
      }
    }

    if (cleanedHighlights) {
      honorsBadge = cleanedHighlights;
    }
  }

  return { gradeBadge, honorsBadge };
}
