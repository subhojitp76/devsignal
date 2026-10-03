/**
 * Route & Tab Navigation Utilities
 * Provides deterministic URL mapping, History API synchronization, and hash fallback.
 */

export const TAB_ROUTES = {
  marketRadar: '/radar',
  devJournal: '/journal',
  resumeBuilder: '/resume'
};

export const TAB_TITLES = {
  marketRadar: 'Tech Market Radar | DevSignal',
  devJournal: 'Dev Journal & Work Log | DevSignal',
  resumeBuilder: 'Resume Builder Studio | DevSignal'
};

export const ROUTE_MAP = {
  '/': 'marketRadar',
  '/radar': 'marketRadar',
  '/market-radar': 'marketRadar',
  '/market': 'marketRadar',
  '/tech-radar': 'marketRadar',
  '/journal': 'devJournal',
  '/dev-journal': 'devJournal',
  '/devjournal': 'devJournal',
  '/work-log': 'devJournal',
  '/resume': 'resumeBuilder',
  '/resume-builder': 'resumeBuilder',
  '/resumebuilder': 'resumeBuilder',
  '/builder': 'resumeBuilder',
  '/editor': 'resumeBuilder'
};

/**
 * Determines active tab key from current browser location (hash or pathname).
 */
export function getTabFromUrl() {
  if (typeof window === 'undefined') return 'marketRadar';

  // 1. Check hash route first if present (e.g. #/journal or #resume)
  const rawHash = window.location.hash || '';
  const hashClean = rawHash.replace(/^#\/?/, '').trim().toLowerCase();
  if (hashClean) {
    const formatted = '/' + hashClean;
    if (ROUTE_MAP[formatted]) {
      return ROUTE_MAP[formatted];
    }
  }

  // 2. Check pathname route
  const pathname = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
  if (ROUTE_MAP[pathname]) {
    return ROUTE_MAP[pathname];
  }

  return 'marketRadar';
}

/**
 * Returns canonical route for a given tab.
 */
export function getRouteForTab(tab) {
  return TAB_ROUTES[tab] || '/radar';
}

/**
 * Synchronizes browser URL and document title with the given tab.
 * 
 * @param {string} tab - The tab identifier ('marketRadar' | 'devJournal' | 'resumeBuilder')
 * @param {boolean} replace - Whether to replace the current history entry instead of pushing
 */
export function syncUrlWithTab(tab, replace = false) {
  if (typeof window === 'undefined') return;

  const targetPath = getRouteForTab(tab);
  const currentPath = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
  const currentHash = window.location.hash;

  // Update document title
  if (TAB_TITLES[tab]) {
    document.title = TAB_TITLES[tab];
  }

  // If already at target path without an overriding hash, do not duplicate history entry
  if (currentPath === targetPath && !currentHash) {
    return;
  }

  try {
    if (replace) {
      window.history.replaceState({ tab }, '', targetPath);
    } else {
      window.history.pushState({ tab }, '', targetPath);
    }
  } catch (e) {
    console.warn('[RouteUtils] Failed to update browser history:', e);
  }
}
