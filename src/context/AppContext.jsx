import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  DEFAULT_PROFILE, 
  DEFAULT_RESUME, 
  DEFAULT_JOURNAL_ENTRIES, 
  DEFAULT_AI_CONFIG 
} from '../constants/defaultData';
import { RESUME_TEMPLATES } from '../constants/templates';
import { enhanceResumeWithAi } from '../services/parserService';
import { getTabFromUrl, syncUrlWithTab, getRouteForTab, TAB_TITLES, ROUTE_MAP } from '../utils/routeUtils';
import { cleanGradeString } from '../utils/educationUtils';
import { formatProfileHandle } from '../utils/linkUtils';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'devsignal_v1';
const LEGACY_STORAGE_KEY = 'dev_resume_studio_v1';
const HISTORY_STORAGE_KEY = 'devsignal_history_v1';
const LEGACY_HISTORY_KEY = 'dev_resume_history_v1';
const TARGET_JD_STORAGE_KEY = 'devsignal_target_jd_v1';
const ATS_RESULT_STORAGE_KEY = 'devsignal_ats_result_v1';

const loadInitialHistory = (currentResume) => {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY) || localStorage.getItem(LEGACY_HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load resume history from localStorage:', e);
  }
  const baseResume = currentResume || DEFAULT_RESUME;
  return [
    {
      id: `snap-${Date.now()}`,
      timestamp: Date.now(),
      dateFormatted: new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      }),
      title: 'Initial Baseline Resume',
      description: 'Default software engineer baseline data',
      source: 'initial',
      badgeText: 'Initial Baseline',
      badgeColor: 'emerald',
      stats: {
        experienceCount: baseResume?.experience?.length || 2,
        bulletCount: (baseResume?.experience || []).reduce((acc, exp) => acc + (exp.bullets?.length || 0), 0),
        projectCount: baseResume?.projects?.length || 3,
        skillCount: (baseResume?.skillCategories || []).reduce((acc, cat) => acc + (cat.skills?.length || 0), 0)
      },
      resumeData: JSON.parse(JSON.stringify(baseResume)),
      template: 'modern_swe',
      color: '#0284c7'
    }
  ];
};

/**
 * Deduplicates resume projects by normalized name and link
 */
export function deduplicateProjects(projects = []) {
  if (!Array.isArray(projects)) return [];
  const seen = new Set();
  const deduped = [];
  for (const proj of projects) {
    if (!proj) continue;
    const nameKey = (proj.name || '').trim().toLowerCase();
    const linkKey = (proj.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    const key = nameKey || linkKey;
    if (!key) continue;

    if (!seen.has(key)) {
      seen.add(key);
      if (linkKey) seen.add(linkKey);
      deduped.push(proj);
    }
  }
  return deduped;
}

/**
 * Deduplicates journal entries by id, normalized title, and link
 */
export function deduplicateJournalEntries(entries = []) {
  if (!Array.isArray(entries)) return [];
  const seenIds = new Set();
  const seenTitles = new Set();
  const deduped = [];
  for (const entry of entries) {
    if (!entry) continue;
    const idKey = entry.id;
    const titleKey = (entry.title || '').trim().toLowerCase();
    const linkKey = (entry.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    if (idKey && seenIds.has(idKey)) continue;
    if (titleKey && seenTitles.has(titleKey)) continue;
    if (linkKey && seenTitles.has(linkKey)) continue;

    if (idKey) seenIds.add(idKey);
    if (titleKey) seenTitles.add(titleKey);
    if (linkKey) seenTitles.add(linkKey);
    deduped.push(entry);
  }
  return deduped;
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Load initial state from LocalStorage or defaults
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const aiConfig = parsed.aiConfig || DEFAULT_AI_CONFIG;
        if (!aiConfig.geminiModel || aiConfig.geminiModel === 'gemini-2.0-flash' || aiConfig.geminiModel === 'gemini-2.5-flash') {
          aiConfig.geminiModel = 'gemini-3.8-flash';
        }

        const rawResume = parsed.resumeData || DEFAULT_RESUME;
        if (rawResume && Array.isArray(rawResume.projects)) {
          rawResume.projects = deduplicateProjects(rawResume.projects);
        }

        if (rawResume && Array.isArray(rawResume.education)) {
          rawResume.education = rawResume.education.map(edu => {
            const rawGpa = (edu.gpa || '').trim();
            const rawHighlights = (edu.highlights || '').trim();
            let cleanedGpa = cleanGradeString(rawGpa);
            let cleanedHighlights = rawHighlights;

            if (cleanedGpa && cleanedHighlights) {
              const normGpa = cleanedGpa.toLowerCase().replace(/[:\s\-–—]/g, '');
              const normHigh = cleanedHighlights.toLowerCase().replace(/[:\s\-–—]/g, '');
              if (normGpa === normHigh) {
                cleanedHighlights = '';
              }
            } else if (!cleanedGpa && cleanedHighlights && /(?:CGPA|GPA)[:\s]*[0-9.]+/i.test(cleanedHighlights)) {
              cleanedGpa = cleanGradeString(cleanedHighlights);
              cleanedHighlights = '';
            }

            return {
              ...edu,
              gpa: cleanedGpa,
              highlights: cleanedHighlights
            };
          });
        }

        if (rawResume && rawResume.personalInfo) {
          if (rawResume.personalInfo.github) {
            rawResume.personalInfo.github = formatProfileHandle(rawResume.personalInfo.github, 'github');
          }
          if (rawResume.personalInfo.linkedin) {
            rawResume.personalInfo.linkedin = formatProfileHandle(rawResume.personalInfo.linkedin, 'linkedin');
          }
          if (rawResume.personalInfo.portfolio) {
            rawResume.personalInfo.portfolio = formatProfileHandle(rawResume.personalInfo.portfolio, 'portfolio');
          }
        }

        const rawJournal = parsed.journalEntries || DEFAULT_JOURNAL_ENTRIES;

        return {
          profile: parsed.profile || DEFAULT_PROFILE,
          resumeData: rawResume,
          journalEntries: deduplicateJournalEntries(rawJournal),
          aiConfig,
          selectedTemplate: parsed.selectedTemplate || 'modern_swe',
          selectedColor: parsed.selectedColor || '#0284c7',
          resumeDensity: parsed.resumeDensity || 'standard'
        };
      }
    } catch (e) {
      console.warn('Failed to parse saved state from LocalStorage:', e);
    }
    return {
      profile: DEFAULT_PROFILE,
      resumeData: {
        ...DEFAULT_RESUME,
        projects: deduplicateProjects(DEFAULT_RESUME.projects)
      },
      journalEntries: deduplicateJournalEntries(DEFAULT_JOURNAL_ENTRIES),
      aiConfig: DEFAULT_AI_CONFIG,
      selectedTemplate: 'modern_swe',
      selectedColor: '#0284c7',
      resumeDensity: 'standard'
    };
  };

  const initialState = loadSavedState();

  // Navigation & Modals
  const [activeTab, setActiveTabState] = useState(() => getTabFromUrl());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAiConfigOpen, setIsAiConfigOpen] = useState(false);
  const [isAiEnhanceOpen, setIsAiEnhanceOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);

  // URL synchronization & navigation handlers
  const setActiveTab = useCallback((tab, pushToHistory = true) => {
    setActiveTabState(prev => {
      if (prev !== tab) {
        if (pushToHistory) {
          syncUrlWithTab(tab, false);
        } else if (TAB_TITLES[tab]) {
          document.title = TAB_TITLES[tab];
        }
        return tab;
      }
      // If already active, ensure canonical URL is shown without duplicating history
      syncUrlWithTab(tab, true);
      return prev;
    });
  }, []);

  const navigateToRoute = useCallback((route) => {
    const cleanRoute = (route || '').toLowerCase().replace(/\/$/, '') || '/';
    const targetTab = ROUTE_MAP[cleanRoute] || 'marketRadar';
    setActiveTab(targetTab, true);
  }, [setActiveTab]);

  // Synchronize browser history (popstate) and hash changes
  useEffect(() => {
    const handleLocationChange = () => {
      const tabFromUrl = getTabFromUrl();
      setActiveTabState(prev => {
        if (prev !== tabFromUrl) {
          if (TAB_TITLES[tabFromUrl]) {
            document.title = TAB_TITLES[tabFromUrl];
          }
          return tabFromUrl;
        }
        return prev;
      });
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    // Initial mount sync: ensure canonical URL and title
    const initialTab = getTabFromUrl();
    const currentPath = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    if (currentPath === '/' || currentPath !== getRouteForTab(initialTab)) {
      syncUrlWithTab(initialTab, true);
    } else if (TAB_TITLES[initialTab]) {
      document.title = TAB_TITLES[initialTab];
    }

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Application Data
  const [profile, setProfile] = useState(initialState.profile);
  const [resumeData, setResumeData] = useState(initialState.resumeData);
  const [resumeHistory, setResumeHistory] = useState(() => loadInitialHistory(initialState.resumeData));
  const [journalEntries, setJournalEntries] = useState(initialState.journalEntries);
  const [aiConfig, setAiConfig] = useState(initialState.aiConfig);
  const [selectedTemplate, setSelectedTemplate] = useState(initialState.selectedTemplate);
  const [selectedColor, setSelectedColor] = useState(initialState.selectedColor);
  const [resumeDensity, setResumeDensity] = useState(initialState.resumeDensity || 'standard');
  const [isEnhancingResume, setIsEnhancingResume] = useState(false);

  // ATS Target Job Description & Cached Score Result
  const [targetJobDescription, setTargetJobDescription] = useState(() => {
    try {
      return localStorage.getItem(TARGET_JD_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [atsScoreResult, setAtsScoreResult] = useState(() => {
    try {
      const saved = localStorage.getItem(ATS_RESULT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const updateTargetJobDescription = (jd) => {
    setTargetJobDescription(jd);
    try {
      localStorage.setItem(TARGET_JD_STORAGE_KEY, jd);
    } catch (e) {
      console.warn('Failed to save target JD:', e);
    }
  };

  const updateAtsScoreResult = (result) => {
    setAtsScoreResult(result);
    try {
      if (result) {
        localStorage.setItem(ATS_RESULT_STORAGE_KEY, JSON.stringify(result));
      } else {
        localStorage.removeItem(ATS_RESULT_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save ATS result:', e);
    }
  };

  // 1-Click addition of a missing skill/keyword to the active resume
  const addSkillToResume = (skillName, categoryName = 'Technical Skills') => {
    if (!skillName || !skillName.trim()) return;
    const cleanSkill = skillName.trim();
    
    setResumeData(prev => {
      const categories = Array.isArray(prev.skillCategories) ? [...prev.skillCategories] : [];
      let targetCatIndex = categories.findIndex(c => 
        c.category && c.category.toLowerCase().includes(categoryName.toLowerCase().split(' ')[0])
      );

      if (targetCatIndex === -1 && categories.length > 0) {
        targetCatIndex = 0;
      }

      if (targetCatIndex >= 0) {
        const cat = categories[targetCatIndex];
        const existingSkills = Array.isArray(cat.skills) ? cat.skills : [];
        if (!existingSkills.some(s => s.toLowerCase() === cleanSkill.toLowerCase())) {
          categories[targetCatIndex] = {
            ...cat,
            skills: [...existingSkills, cleanSkill]
          };
        }
      } else {
        categories.push({
          id: `skills-${Date.now()}`,
          category: categoryName,
          skills: [cleanSkill]
        });
      }

      return {
        ...prev,
        skillCategories: categories
      };
    });

    showToast(`Added "${cleanSkill}" to your resume skills!`, 'success');
  };

  // Global Toast Notification
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Sync to LocalStorage on changes
  useEffect(() => {
    try {
      const toSave = {
        profile,
        resumeData,
        journalEntries,
        aiConfig,
        selectedTemplate,
        selectedColor,
        resumeDensity
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [profile, resumeData, journalEntries, aiConfig, selectedTemplate, selectedColor, resumeDensity]);

  // Actions
  const updateProfile = (newProfile) => {
    setProfile(newProfile);
    // Optionally keep resume personalInfo in sync
    setResumeData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        fullName: newProfile.fullName,
        title: newProfile.currentTitle,
        email: newProfile.email,
        phone: newProfile.phone,
        location: newProfile.location,
        github: newProfile.github.replace(/^https?:\/\//, ''),
        linkedin: newProfile.linkedin.replace(/^https?:\/\//, ''),
        portfolio: newProfile.portfolio.replace(/^https?:\/\//, '')
      }
    }));
    showToast('Profile updated & synced to resume!', 'success');
  };

  const updateResumeData = (updater) => {
    setResumeData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next && Array.isArray(next.projects)) {
        return {
          ...next,
          projects: deduplicateProjects(next.projects)
        };
      }
      return next;
    });
  };

  const addJournalEntry = (entry, options = {}) => {
    setJournalEntries(prev => {
      const normTitle = (entry.title || '').trim().toLowerCase();
      const normLink = (entry.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

      const existingIndex = prev.findIndex(e => {
        if (e.id === entry.id) return true;
        const eTitle = (e.title || '').trim().toLowerCase();
        const eLink = (e.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (normTitle && eTitle === normTitle) return true;
        if (normLink && eLink && eLink === normLink) return true;
        return false;
      });

      if (existingIndex >= 0) {
        // Update existing entry instead of creating a duplicate
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...entry, id: updated[existingIndex].id };
        return deduplicateJournalEntries(updated);
      }
      return deduplicateJournalEntries([entry, ...prev]);
    });
    if (!options.silent) {
      showToast('Added entry to Dev Journal!', 'success');
    }
  };

  const deleteJournalEntry = (id) => {
    setJournalEntries(prev => prev.filter(e => e.id !== id));
    showToast('Journal entry deleted', 'info');
  };

  const updateJournalEntry = (updated) => {
    setJournalEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    showToast('Journal entry updated', 'success');
  };

  // Resume History Snapshot Operations
  const saveResumeSnapshot = ({
    title = 'Resume Snapshot',
    description = '',
    source = 'manual_snapshot',
    customResumeData = null
  } = {}) => {
    const targetResume = customResumeData || resumeData;
    const now = Date.now();

    const bulletCount = (targetResume?.experience || []).reduce((acc, exp) => acc + (exp.bullets?.length || 0), 0);
    const projectCount = targetResume?.projects?.length || 0;
    const skillCount = (targetResume?.skillCategories || []).reduce((acc, cat) => acc + (cat.skills?.length || 0), 0);

    let badgeText = 'Manual Snapshot';
    let badgeColor = 'emerald';
    if (source === 'ai_enhance') {
      badgeText = 'AI Enhanced';
      badgeColor = 'purple';
    } else if (source === 'pdf_import') {
      badgeText = 'PDF Import';
      badgeColor = 'blue';
    } else if (source === 'journal_import') {
      badgeText = 'Journal Import';
      badgeColor = 'teal';
    } else if (source === 'restoration') {
      badgeText = 'Restored';
      badgeColor = 'amber';
    } else if (source === 'auto_save') {
      badgeText = 'Auto-Save';
      badgeColor = 'slate';
    } else if (source === 'demo_data') {
      badgeText = 'Demo Profile';
      badgeColor = 'emerald';
    }

    const newSnapshot = {
      id: `snap-${now}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: now,
      dateFormatted: new Date(now).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      title,
      description,
      source,
      badgeText,
      badgeColor,
      stats: {
        experienceCount: targetResume?.experience?.length || 0,
        bulletCount,
        projectCount,
        skillCount
      },
      resumeData: JSON.parse(JSON.stringify(targetResume)),
      template: selectedTemplate,
      color: selectedColor
    };

    setResumeHistory(prev => {
      // Avoid duplicate consecutive snapshots if resume content is 100% identical and not a manual snapshot
      if (prev.length > 0 && source !== 'manual_snapshot') {
        const latest = prev[0];
        if (JSON.stringify(latest.resumeData) === JSON.stringify(newSnapshot.resumeData)) {
          return prev;
        }
      }
      const updated = [newSnapshot, ...prev].slice(0, 35);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save history to localStorage:', e);
      }
      return updated;
    });

    return newSnapshot;
  };

  const restoreResumeSnapshot = (snapshotId) => {
    const snapshot = resumeHistory.find(s => s.id === snapshotId);
    if (!snapshot) {
      showToast('Snapshot not found in history', 'error');
      return false;
    }

    // Auto-save current state before restoring so user never loses current work
    saveResumeSnapshot({
      title: `Pre-Rollback State`,
      description: `Auto-saved before restoring "${snapshot.title}"`,
      source: 'auto_save',
      customResumeData: resumeData
    });

    setResumeData(JSON.parse(JSON.stringify(snapshot.resumeData)));
    if (snapshot.template) setSelectedTemplate(snapshot.template);
    if (snapshot.color) setSelectedColor(snapshot.color);

    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    showToast(`Restored version: "${snapshot.title}"`, 'success');
    return true;
  };

  const deleteResumeSnapshot = (snapshotId) => {
    setResumeHistory(prev => {
      const updated = prev.filter(s => s.id !== snapshotId);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showToast('Snapshot removed from history', 'info');
  };

  const renameResumeSnapshot = (snapshotId, newTitle) => {
    if (!newTitle || !newTitle.trim()) return;
    setResumeHistory(prev => {
      const updated = prev.map(s => s.id === snapshotId ? { ...s, title: newTitle.trim() } : s);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showToast('Version renamed successfully', 'success');
  };

  const clearResumeHistory = () => {
    const baseline = loadInitialHistory(resumeData);
    setResumeHistory(baseline);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(baseline));
    } catch (e) {}
    showToast('Resume history cleared. Reset to baseline snapshot.', 'info');
  };

  const loadSampleData = () => {
    setProfile(DEFAULT_PROFILE);
    setResumeData(DEFAULT_RESUME);
    setJournalEntries(DEFAULT_JOURNAL_ENTRIES);
    setSelectedTemplate('modern_swe');
    setSelectedColor('#0284c7');
    saveResumeSnapshot({
      title: 'Loaded Demo SWE Profile',
      description: 'Default senior backend engineer sample data',
      source: 'demo_data',
      customResumeData: DEFAULT_RESUME
    });
    showToast('Loaded demo SWE profile and resume data!', 'success');
  };

  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_HISTORY_KEY);
    setProfile(DEFAULT_PROFILE);
    setResumeData(DEFAULT_RESUME);
    setJournalEntries(DEFAULT_JOURNAL_ENTRIES);
    const baseline = loadInitialHistory(DEFAULT_RESUME);
    setResumeHistory(baseline);
    showToast('Reset all data to defaults', 'info');
  };

  const exportFullBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify({ profile, resumeData, resumeHistory, journalEntries, aiConfig }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `devsignal_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup downloaded successfully as JSON!', 'success');
  };

  const importFullBackup = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.profile) setProfile(parsed.profile);
      if (parsed.resumeData) setResumeData(parsed.resumeData);
      if (parsed.resumeHistory && Array.isArray(parsed.resumeHistory)) {
        setResumeHistory(parsed.resumeHistory);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(parsed.resumeHistory));
      }
      if (parsed.journalEntries) setJournalEntries(parsed.journalEntries);
      if (parsed.aiConfig) setAiConfig(parsed.aiConfig);
      showToast('Backup restored successfully!', 'success');
    } catch (e) {
      showToast('Failed to import backup: invalid JSON format.', 'error');
    }
  };

  const enhanceEntireResume = () => {
    setIsAiEnhanceOpen(true);
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentRoute: getRouteForTab(activeTab),
        navigateToRoute,
        isProfileOpen,
        setIsProfileOpen,
        isAiConfigOpen,
        setIsAiConfigOpen,
        profile,
        updateProfile,
        resumeData,
        updateResumeData,
        resumeHistory,
        saveResumeSnapshot,
        restoreResumeSnapshot,
        deleteResumeSnapshot,
        renameResumeSnapshot,
        clearResumeHistory,
        isHistoryOpen,
        setIsHistoryOpen,
        journalEntries,
        setJournalEntries,
        addJournalEntry,
        deleteJournalEntry,
        updateJournalEntry,
        aiConfig,
        setAiConfig,
        selectedTemplate,
        setSelectedTemplate,
        selectedColor,
        setSelectedColor,
        resumeDensity,
        setResumeDensity,
        isEnhancingResume,
        isAiEnhanceOpen,
        setIsAiEnhanceOpen,
        enhanceEntireResume,
        toast,
        showToast,
        loadSampleData,
        resetAllData,
        exportFullBackup,
        importFullBackup,
        // ATS Matcher State & Actions
        isAtsModalOpen,
        setIsAtsModalOpen,
        targetJobDescription,
        updateTargetJobDescription,
        atsScoreResult,
        updateAtsScoreResult,
        addSkillToResume
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
