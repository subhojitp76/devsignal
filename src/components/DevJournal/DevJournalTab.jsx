import React, { useState, useEffect, useRef } from 'react';
import { useApp, deduplicateProjects, deduplicateJournalEntries } from '../../context/AppContext';
import { WORK_PROMPTS } from '../../constants/promptTemplates';
import { 
  parseJournalDigest, 
  normalizeJournalCategory, 
  generateFollowUpUpdatePrompt, 
  parseMilestoneUpdate 
} from '../../services/parserService';
import { 
  BookOpen, 
  Copy, 
  Check, 
  Sparkles, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  TrendingUp, 
  Send, 
  Filter, 
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Rocket,
  FolderGit2,
  Code2,
  RefreshCw,
  History,
  MessageSquarePlus,
  Clock,
  ArrowRight,
  CornerDownRight,
  Edit3,
  Save,
  X
} from 'lucide-react';

export default function DevJournalTab() {
  const { 
    journalEntries, 
    setJournalEntries,
    addJournalEntry, 
    deleteJournalEntry, 
    updateJournalEntry,
    resumeData,
    updateResumeData,
    aiConfig, 
    showToast,
    setActiveTab
  } = useApp();

  const [pastedDigest, setPastedDigest] = useState('');
  const [projectCustomLink, setProjectCustomLink] = useState('');
  const [syncToResumeProjects, setSyncToResumeProjects] = useState(true);
  const [promptFilter, setPromptFilter] = useState('all'); // 'all' | 'personal' | 'work'
  const [isIngesting, setIsIngesting] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState(null);
  const [expandedPromptId, setExpandedPromptId] = useState(null);
  const [highlightedEntryId, setHighlightedEntryId] = useState(null);
  const hasReconciledRef = useRef(false);

  // Milestone / Follow-up Updates State
  const [activeUpdateEntryId, setActiveUpdateEntryId] = useState(null);
  const [updateInputText, setUpdateInputText] = useState('');
  const [updateNotesForAi, setUpdateNotesForAi] = useState('');
  const [isGeneratingUpdate, setIsGeneratingUpdate] = useState(false);
  const [copiedUpdatePromptId, setCopiedUpdatePromptId] = useState(null);
  const [syncUpdateToResume, setSyncUpdateToResume] = useState(true);
  const [expandedMilestonesMap, setExpandedMilestonesMap] = useState({});

  // Entry Edit State
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    category: 'Personal Project',
    date: '',
    link: '',
    summary: '',
    bullets: [],
    impact: '',
    techStack: '',
    syncToResume: true
  });

  // Manual Form State
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    title: '',
    category: 'Personal Project',
    date: new Date().toISOString().split('T')[0],
    summary: '',
    techStack: '',
    impact: '',
    link: '',
    rawNotes: '',
    alsoPushToResumeProjects: true
  });

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Auto-reconcile any user projects in resumeData.projects that are not yet in journalEntries
  // (Guards against duplicate creation using hasReconciledRef and normalized title/link sets)
  useEffect(() => {
    if (hasReconciledRef.current) return;
    hasReconciledRef.current = true;

    if (!resumeData?.projects || resumeData.projects.length === 0) return;

    setJournalEntries(prevEntries => {
      const existingTitles = new Set(prevEntries.map(e => (e.title || '').trim().toLowerCase()));
      const existingLinks = new Set(prevEntries.filter(e => e.link).map(e => (e.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')));

      // Don't auto-dump default demo baseline template projects (proj-1, proj-2, proj-3)
      const demoProjectIds = new Set(['proj-1', 'proj-2', 'proj-3']);
      const missingProjects = resumeData.projects.filter(p => {
        if (!p || !p.name) return false;
        if (demoProjectIds.has(p.id)) return false;
        const nameKey = (p.name || '').trim().toLowerCase();
        const linkKey = (p.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (existingTitles.has(nameKey)) return false;
        if (linkKey && existingLinks.has(linkKey)) return false;
        return true;
      });

      if (missingProjects.length === 0) {
        return deduplicateJournalEntries(prevEntries);
      }

      console.log(`[DevJournal] Reconciling ${missingProjects.length} user project(s) to timeline:`, missingProjects.map(p => p.name));
      const newEntries = missingProjects.map((p, idx) => ({
        id: `journal-proj-${Date.now()}-${idx}`,
        date: new Date().toISOString().split('T')[0],
        category: 'Personal Project',
        title: p.name,
        summary: (p.bullets && p.bullets[0]) || `Personal project built with ${p.techStack || 'modern engineering tooling'}.`,
        techStack: typeof p.techStack === 'string' ? p.techStack.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(p.techStack) ? p.techStack : ['Engineering']),
        impact: (p.bullets && p.bullets.length > 1) ? p.bullets[1] : 'Featured project in active portfolio',
        link: p.link || '',
        bullets: p.bullets || [],
        rawNotes: `Synced from Resume Featured Projects: ${p.name}`
      }));

      return deduplicateJournalEntries([...newEntries, ...prevEntries]);
    });
  }, []);

  // Manual one-click sync from Resume Projects to Journal (Strictly Deduplicated)
  const handleManualSyncResumeProjects = () => {
    if (!resumeData?.projects || resumeData.projects.length === 0) {
      showToast('No projects found in Resume to sync.', 'info');
      return;
    }

    setJournalEntries(prevEntries => {
      const existingTitles = new Set(prevEntries.map(e => (e.title || '').trim().toLowerCase()));
      const existingLinks = new Set(prevEntries.filter(e => e.link).map(e => (e.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')));

      const missingProjects = resumeData.projects.filter(p => {
        if (!p || !p.name) return false;
        const nameKey = (p.name || '').trim().toLowerCase();
        const linkKey = (p.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (existingTitles.has(nameKey)) return false;
        if (linkKey && existingLinks.has(linkKey)) return false;
        return true;
      });

      if (missingProjects.length === 0) {
        showToast('All projects from your Resume are already present in your Dev Journal timeline!', 'info');
        return deduplicateJournalEntries(prevEntries);
      }

      const newEntries = missingProjects.map((p, idx) => ({
        id: `journal-proj-${Date.now()}-${idx}`,
        date: new Date().toISOString().split('T')[0],
        category: 'Personal Project',
        title: p.name,
        summary: (p.bullets && p.bullets[0]) || `Personal project built with ${p.techStack || 'modern engineering tooling'}.`,
        techStack: typeof p.techStack === 'string' ? p.techStack.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(p.techStack) ? p.techStack : ['Engineering']),
        impact: (p.bullets && p.bullets.length > 1) ? p.bullets[1] : 'Featured project in active portfolio',
        link: p.link || '',
        bullets: p.bullets || [],
        rawNotes: `Manual sync from Resume Featured Projects: ${p.name}`
      }));

      showToast(`Successfully added ${missingProjects.length} project(s) to your Dev Journal timeline!`, 'success');
      return deduplicateJournalEntries([...newEntries, ...prevEntries]);
    });
  };

  // Copy prompt to clipboard
  const handleCopyPrompt = (prompt) => {
    navigator.clipboard.writeText(prompt.promptText);
    setCopiedPromptId(prompt.id);
    showToast(`Copied "${prompt.title}" to clipboard! Paste it into your Claude or Gemini.`, 'success');
    setTimeout(() => setCopiedPromptId(null), 3000);
  };

  // Ingest pasted AI recap (Handles Work Logs and Personal Projects)
  const handleIngestDigest = async () => {
    if (!pastedDigest.trim()) {
      showToast('Please paste the Claude or Gemini text into the box first.', 'error');
      return;
    }

    setIsIngesting(true);
    try {
      const parsedEntry = await parseJournalDigest(pastedDigest, aiConfig);
      
      // Override or set link if user specified in input
      if (projectCustomLink.trim()) {
        parsedEntry.link = projectCustomLink.trim();
      }

      // If user selected personal project prompt or text has project signals, ensure category
      if (promptFilter === 'personal' || /personal project|side[- ]project|open[- ]source|github repo|portfolio project|project (?:name|title)|core objective/i.test(pastedDigest)) {
        parsedEntry.category = 'Personal Project';
      }

      parsedEntry.category = normalizeJournalCategory(parsedEntry.category);

      // 1. ALWAYS add to Dev Journal Timeline!
      addJournalEntry(parsedEntry, { silent: true });

      // 2. Also push to Resume Featured Projects if requested (default true for personal projects)
      const shouldSyncToResume = syncToResumeProjects || parsedEntry.category === 'Personal Project';
      if (shouldSyncToResume) {
        const techStackStr = Array.isArray(parsedEntry.techStack) 
          ? parsedEntry.techStack.join(', ') 
          : (parsedEntry.techStack || 'Engineering');

        const bulletList = (parsedEntry.bullets && parsedEntry.bullets.length > 0)
          ? parsedEntry.bullets
          : [
              parsedEntry.summary,
              parsedEntry.impact ? `Impact: ${parsedEntry.impact}` : null
            ].filter(Boolean);

        const newProject = {
          id: `proj-${Date.now()}`,
          name: parsedEntry.title || 'Personal Project',
          techStack: techStackStr,
          link: parsedEntry.link || '',
          bullets: bulletList
        };

        updateResumeData(prev => {
          const currentProjects = prev.projects || [];
          const normName = (newProject.name || '').trim().toLowerCase();
          const normLink = (newProject.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

          const existingIdx = currentProjects.findIndex(p => {
            const pName = (p.name || '').trim().toLowerCase();
            const pLink = (p.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
            return (normName && pName === normName) || (normLink && pLink && normLink === pLink);
          });

          let updatedProjects;
          if (existingIdx >= 0) {
            updatedProjects = [...currentProjects];
            updatedProjects[existingIdx] = {
              ...updatedProjects[existingIdx],
              ...newProject,
              id: updatedProjects[existingIdx].id
            };
          } else {
            updatedProjects = [...currentProjects, newProject];
          }

          return {
            ...prev,
            projects: deduplicateProjects(updatedProjects)
          };
        });
      }

      setPastedDigest('');
      setProjectCustomLink('');
      setHighlightedEntryId(parsedEntry.id);
      setTimeout(() => setHighlightedEntryId(null), 5000);

      // Auto-adjust category filter if current filter would hide the new entry
      if (selectedCategory !== 'All' && selectedCategory !== parsedEntry.category) {
        setSelectedCategory('All');
      }

      if (shouldSyncToResume) {
        showToast(`Ingested "${parsedEntry.title}" into Dev Journal timeline & added to Resume Projects!`, 'success');
      } else {
        showToast(`Ingested "${parsedEntry.title}" into your Dev Journal timeline!`, 'success');
      }

      // Scroll smoothly down to the timeline card
      setTimeout(() => {
        const cardElem = document.getElementById(`journal-card-${parsedEntry.id}`);
        if (cardElem) {
          cardElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to ingest work digest', 'error');
    } finally {
      setIsIngesting(false);
    }
  };

  // Quick push journal entry into Resume Experience
  const handlePushToResume = (entry) => {
    const bulletText = `${entry.summary} (${entry.impact}) [${Array.isArray(entry.techStack) ? entry.techStack.join(', ') : entry.techStack}]`;
    
    updateResumeData(prev => {
      const updatedExperience = [...prev.experience];
      if (updatedExperience.length > 0) {
        // Append bullet to the most recent experience
        updatedExperience[0] = {
          ...updatedExperience[0],
          bullets: [...updatedExperience[0].bullets, bulletText]
        };
      } else {
        // Create an experience item if none exists
        updatedExperience.push({
          id: `exp-${Date.now()}`,
          role: 'Backend Engineer',
          company: 'Current Company',
          location: 'Remote',
          startDate: entry.date,
          endDate: 'Present',
          current: true,
          bullets: [bulletText]
        });
      }
      return { ...prev, experience: updatedExperience };
    });

    showToast(`Added accomplishment to Resume Experience!`, 'success');
  };

  // Quick push journal entry into Resume Featured Projects
  const handlePushToProjects = (entry) => {
    const techStackStr = Array.isArray(entry.techStack) 
      ? entry.techStack.join(', ') 
      : (entry.techStack || 'Engineering');

    const bulletList = (entry.bullets && entry.bullets.length > 0)
      ? entry.bullets
      : [
          entry.summary,
          entry.impact ? `Impact: ${entry.impact}` : null
        ].filter(Boolean);

    const newProject = {
      id: `proj-${Date.now()}`,
      name: entry.title || 'Personal Project',
      techStack: techStackStr,
      link: entry.link || '',
      bullets: bulletList
    };

    let wasUpdated = false;
    updateResumeData(prev => {
      const currentProjects = prev.projects || [];
      const normName = (newProject.name || '').trim().toLowerCase();
      const normLink = (newProject.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

      const existingIdx = currentProjects.findIndex(p => {
        const pName = (p.name || '').trim().toLowerCase();
        const pLink = (p.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
        return (normName && pName === normName) || (normLink && pLink && normLink === pLink);
      });

      let updatedProjects;
      if (existingIdx >= 0) {
        wasUpdated = true;
        updatedProjects = [...currentProjects];
        updatedProjects[existingIdx] = {
          ...updatedProjects[existingIdx],
          ...newProject,
          id: updatedProjects[existingIdx].id
        };
      } else {
        updatedProjects = [...currentProjects, newProject];
      }

      return {
        ...prev,
        projects: deduplicateProjects(updatedProjects)
      };
    });

    if (wasUpdated) {
      showToast(`Updated "${entry.title}" in Resume Featured Projects!`, 'success');
    } else {
      showToast(`Added "${entry.title}" to Resume Featured Projects!`, 'success');
    }
  };

  // Submit manual entry
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualEntry.title.trim()) return;

    const techArray = manualEntry.techStack.split(',').map(s => s.trim()).filter(Boolean);

    const newEntry = {
      id: `journal-${Date.now()}`,
      date: manualEntry.date || new Date().toISOString().split('T')[0],
      category: manualEntry.category || 'Personal Project',
      title: manualEntry.title.trim(),
      summary: manualEntry.summary.trim(),
      techStack: techArray.length > 0 ? techArray : ['General'],
      impact: manualEntry.impact.trim(),
      link: manualEntry.link ? manualEntry.link.trim() : '',
      bullets: [
        manualEntry.summary.trim(),
        manualEntry.impact.trim() ? `Impact: ${manualEntry.impact.trim()}` : null
      ].filter(Boolean),
      rawNotes: manualEntry.rawNotes.trim()
    };

    addJournalEntry(newEntry);

    if (manualEntry.alsoPushToResumeProjects || manualEntry.category === 'Personal Project') {
      const newProject = {
        id: `proj-${Date.now()}`,
        name: newEntry.title,
        techStack: newEntry.techStack.join(', '),
        link: newEntry.link,
        bullets: newEntry.bullets
      };
      updateResumeData(prev => {
        const currentProjects = prev.projects || [];
        const normName = (newProject.name || '').trim().toLowerCase();
        const normLink = (newProject.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

        const existingIdx = currentProjects.findIndex(p => {
          const pName = (p.name || '').trim().toLowerCase();
          const pLink = (p.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
          return (normName && pName === normName) || (normLink && pLink && normLink === pLink);
        });

        let updatedProjects;
        if (existingIdx >= 0) {
          updatedProjects = [...currentProjects];
          updatedProjects[existingIdx] = {
            ...updatedProjects[existingIdx],
            ...newProject,
            id: updatedProjects[existingIdx].id
          };
        } else {
          updatedProjects = [...currentProjects, newProject];
        }

        return {
          ...prev,
          projects: deduplicateProjects(updatedProjects)
        };
      });
      showToast(`Saved to Dev Journal & synced to Resume Projects!`, 'success');
    } else {
      showToast(`Saved entry to Dev Journal!`, 'success');
    }

    setManualEntry({
      title: '',
      category: 'Personal Project',
      date: new Date().toISOString().split('T')[0],
      summary: '',
      techStack: '',
      impact: '',
      link: '',
      rawNotes: '',
      alsoPushToResumeProjects: true
    });
    setIsManualFormOpen(false);
  };

  // -------------------------------------------------------------
  // Milestone Follow-Up Update Handlers (Context-Aware Prompt)
  // -------------------------------------------------------------
  const handleCopyUpdatePrompt = (entry) => {
    const promptText = generateFollowUpUpdatePrompt(entry);
    navigator.clipboard.writeText(promptText);
    setCopiedUpdatePromptId(entry.id);
    showToast(`Copied update prompt for "${entry.title}"! Paste into Claude/Gemini.`, 'info');
    setTimeout(() => setCopiedUpdatePromptId(null), 3000);
  };

  const handleToggleUpdateWorkspace = (entry) => {
    if (activeUpdateEntryId === entry.id) {
      setActiveUpdateEntryId(null);
    } else {
      setActiveUpdateEntryId(entry.id);
      setUpdateInputText('');
      setUpdateNotesForAi('');
      setTimeout(() => {
        const workspace = document.getElementById(`update-workspace-${entry.id}`);
        if (workspace) {
          workspace.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 80);
    }
  };

  const handleGenerateUpdateWithAi = async (entry) => {
    const rawContext = updateNotesForAi.trim() 
      ? updateNotesForAi.trim() 
      : generateFollowUpUpdatePrompt(entry);

    setIsGeneratingUpdate(true);
    try {
      const mergedEntry = await parseMilestoneUpdate(rawContext, entry, aiConfig);
      applySavedUpdate(entry, mergedEntry);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to generate milestone update with AI', 'error');
    } finally {
      setIsGeneratingUpdate(false);
    }
  };

  const handleApplyUpdateToRecord = async (entry) => {
    if (!updateInputText.trim() && !updateNotesForAi.trim()) {
      showToast('Please paste Claude/Gemini output or enter your latest notes first.', 'error');
      return;
    }

    setIsGeneratingUpdate(true);
    try {
      const textToParse = updateInputText.trim() || updateNotesForAi.trim();
      const mergedEntry = await parseMilestoneUpdate(textToParse, entry, aiConfig);
      applySavedUpdate(entry, mergedEntry);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to apply milestone update', 'error');
    } finally {
      setIsGeneratingUpdate(false);
    }
  };

  const applySavedUpdate = (originalEntry, mergedEntry) => {
    // 1. Update in Dev Journal
    updateJournalEntry(mergedEntry);

    // 2. Optionally sync latest bullets and tech stack to Resume Featured Projects
    if (syncUpdateToResume || normalizeJournalCategory(originalEntry.category) === 'Personal Project') {
      const techStackStr = Array.isArray(mergedEntry.techStack) 
        ? mergedEntry.techStack.join(', ') 
        : (mergedEntry.techStack || 'Engineering');

      const normName = (originalEntry.title || '').trim().toLowerCase();
      const normLink = (originalEntry.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

      updateResumeData(prev => {
        const currentProjects = prev.projects || [];
        const existingIdx = currentProjects.findIndex(p => {
          const pName = (p.name || '').trim().toLowerCase();
          const pLink = (p.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
          return (normName && pName === normName) || (normLink && pLink && normLink === pLink);
        });

        let updatedProjects;
        if (existingIdx >= 0) {
          updatedProjects = [...currentProjects];
          updatedProjects[existingIdx] = {
            ...updatedProjects[existingIdx],
            techStack: techStackStr,
            bullets: mergedEntry.bullets || updatedProjects[existingIdx].bullets,
            link: mergedEntry.link || updatedProjects[existingIdx].link
          };
        } else {
          updatedProjects = [
            ...currentProjects,
            {
              id: `proj-${Date.now()}`,
              name: mergedEntry.title,
              techStack: techStackStr,
              link: mergedEntry.link || '',
              bullets: mergedEntry.bullets || []
            }
          ];
        }

        return {
          ...prev,
          projects: deduplicateProjects(updatedProjects)
        };
      });
    }

    showToast(`Updated "${originalEntry.title}" with latest milestone accomplishments!`, 'success');
    setActiveUpdateEntryId(null);
    setUpdateInputText('');
    setUpdateNotesForAi('');
  };

  const handleLogAsNewChainedCard = async (entry) => {
    if (!updateInputText.trim() && !updateNotesForAi.trim()) {
      showToast('Please paste Claude/Gemini output or enter your latest notes first.', 'error');
      return;
    }

    setIsGeneratingUpdate(true);
    try {
      const textToParse = updateInputText.trim() || updateNotesForAi.trim();
      const parsedUpdate = await parseMilestoneUpdate(textToParse, entry, aiConfig);

      const milestoneNum = (entry.updates?.length || 0) + 2;
      const chainedEntry = {
        id: `journal-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        category: entry.category || 'Personal Project',
        title: `${entry.title} (Milestone ${milestoneNum})`,
        summary: parsedUpdate.summary || `Milestone ${milestoneNum} advancements for ${entry.title}`,
        techStack: parsedUpdate.techStack || entry.techStack,
        impact: parsedUpdate.impact || entry.impact,
        link: entry.link || '',
        bullets: parsedUpdate.bullets || [],
        rawNotes: textToParse
      };

      addJournalEntry(chainedEntry);
      showToast(`Logged Milestone ${milestoneNum} as a new timeline record!`, 'success');
      setActiveUpdateEntryId(null);
      setUpdateInputText('');
      setUpdateNotesForAi('');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to create chained milestone entry', 'error');
    } finally {
      setIsGeneratingUpdate(false);
    }
  };

  // -------------------------------------------------------------
  // Timeline Entry Edit Handlers
  // -------------------------------------------------------------
  const handleStartEdit = (entry) => {
    setEditingEntryId(entry.id);
    setEditFormData({
      title: entry.title || '',
      category: normalizeJournalCategory(entry.category || 'Personal Project'),
      date: entry.date || new Date().toISOString().split('T')[0],
      link: entry.link || '',
      summary: entry.summary || '',
      bullets: Array.isArray(entry.bullets) && entry.bullets.length > 0 
        ? [...entry.bullets] 
        : [entry.summary].filter(Boolean),
      impact: entry.impact || '',
      techStack: Array.isArray(entry.techStack) 
        ? entry.techStack.join(', ') 
        : (entry.techStack || ''),
      syncToResume: true
    });
    if (activeUpdateEntryId === entry.id) {
      setActiveUpdateEntryId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
  };

  const handleAddEditBullet = () => {
    setEditFormData(prev => ({
      ...prev,
      bullets: [...prev.bullets, '']
    }));
  };

  const handleUpdateEditBullet = (idx, val) => {
    setEditFormData(prev => ({
      ...prev,
      bullets: prev.bullets.map((b, i) => i === idx ? val : b)
    }));
  };

  const handleRemoveEditBullet = (idx) => {
    setEditFormData(prev => ({
      ...prev,
      bullets: prev.bullets.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveEdit = (entryId) => {
    if (!editFormData.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    const techArray = editFormData.techStack
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const cleanBullets = (editFormData.bullets || [])
      .map(b => b.trim())
      .filter(Boolean);

    const originalEntry = (journalEntries || []).find(e => e.id === entryId);

    const updatedEntry = {
      ...(originalEntry || {}),
      id: entryId,
      title: editFormData.title.trim(),
      category: editFormData.category,
      date: editFormData.date || new Date().toISOString().split('T')[0],
      link: editFormData.link.trim(),
      summary: editFormData.summary.trim(),
      bullets: cleanBullets.length > 0 ? cleanBullets : [editFormData.summary.trim()].filter(Boolean),
      impact: editFormData.impact.trim(),
      techStack: techArray.length > 0 ? techArray : ['Engineering'],
      lastEditedDate: new Date().toISOString().split('T')[0]
    };

    updateJournalEntry(updatedEntry);

    // Sync to resume if requested
    if (editFormData.syncToResume || normalizeJournalCategory(updatedEntry.category) === 'Personal Project') {
      const origNormName = (originalEntry?.title || '').trim().toLowerCase();
      const origNormLink = (originalEntry?.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
      const newNormName = updatedEntry.title.trim().toLowerCase();
      const newNormLink = updatedEntry.link.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

      updateResumeData(prev => {
        const currentProjects = prev.projects || [];
        const existingIdx = currentProjects.findIndex(p => {
          const pName = (p.name || '').trim().toLowerCase();
          const pLink = (p.link || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
          return (origNormName && pName === origNormName) ||
                 (origNormLink && pLink && origNormLink === pLink) ||
                 (newNormName && pName === newNormName) ||
                 (newNormLink && pLink && newNormLink === pLink);
        });

        const techStackStr = updatedEntry.techStack.join(', ');

        let updatedProjects;
        if (existingIdx >= 0) {
          updatedProjects = [...currentProjects];
          updatedProjects[existingIdx] = {
            ...updatedProjects[existingIdx],
            name: updatedEntry.title,
            techStack: techStackStr,
            link: updatedEntry.link,
            bullets: updatedEntry.bullets
          };
        } else {
          updatedProjects = [
            ...currentProjects,
            {
              id: `proj-${Date.now()}`,
              name: updatedEntry.title,
              techStack: techStackStr,
              link: updatedEntry.link,
              bullets: updatedEntry.bullets
            }
          ];
        }

        return {
          ...prev,
          projects: deduplicateProjects(updatedProjects)
        };
      });
    }

    showToast(`Saved changes to "${updatedEntry.title}"!`, 'success');
    setEditingEntryId(null);
  };


  // Safe Filtered entries
  const filteredEntries = (journalEntries || []).filter(entry => {
    if (!entry) return false;

    const rawCat = (entry.category || 'Feature').trim();
    const cat = normalizeJournalCategory(rawCat).toLowerCase();
    const selCat = (selectedCategory || 'All').trim().toLowerCase();

    let matchesCategory = false;
    if (selCat === 'all') {
      matchesCategory = true;
    } else if (selCat.includes('personal') || selCat.includes('project')) {
      matchesCategory = cat.includes('personal') || cat.includes('project') || rawCat.toLowerCase().includes('project');
    } else {
      matchesCategory = cat === selCat || rawCat.toLowerCase() === selCat;
    }

    const query = (searchQuery || '').trim().toLowerCase();
    if (!query) return matchesCategory;

    const titleStr = (entry.title || '').toLowerCase();
    const summaryStr = (entry.summary || '').toLowerCase();
    const impactStr = (entry.impact || '').toLowerCase();
    const linkStr = (entry.link || '').toLowerCase();
    const techStr = Array.isArray(entry.techStack) 
      ? entry.techStack.join(' ').toLowerCase() 
      : (typeof entry.techStack === 'string' ? entry.techStack.toLowerCase() : '');

    const matchesQuery = 
      titleStr.includes(query) ||
      summaryStr.includes(query) ||
      impactStr.includes(query) ||
      linkStr.includes(query) ||
      techStr.includes(query);

    return matchesCategory && matchesQuery;
  });

  // Guarantee timeline never renders duplicate copies of entries or personal projects
  const displayedEntries = deduplicateJournalEntries(filteredEntries);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'rgba(52, 211, 153, 0.15)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399'
          }}>
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc' }}>
                Dev Journal &amp; Work Logbook
              </h1>
              <span className="badge badge-emerald">Career Memory</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
              Capture daily standups, pull requests, and architectural decisions to feed directly into your resume
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsManualFormOpen(!isManualFormOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>{isManualFormOpen ? 'Hide Manual Form' : 'Add Quick Note'}</span>
        </button>
      </div>

      {/* SECTION 1: Claude / Gemini AI Ingestion & Prompt Hub */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Sparkles className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#f8fafc' }}>
                  Claude &amp; Gemini Work Bridge
                </h2>
                <span className="badge badge-purple" style={{ fontSize: '10px' }}>Personal Projects &amp; Work</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Use Claude or Gemini to format company commits, daily standups, or personal side-projects into professional engineering achievements.
              </p>
            </div>
          </div>

          {/* Quick Filter: All | Personal Projects | Work & Standups */}
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            {[
              { id: 'all', label: 'All Templates (3)' },
              { id: 'personal', label: '🚀 Personal Projects' },
              { id: 'work', label: '💼 Company Work' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPromptFilter(f.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: promptFilter === f.id ? 'var(--accent-primary)' : 'transparent',
                  color: promptFilter === f.id ? '#090d16' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Pre-Engineered Prompt Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '16px', 
          marginBottom: '20px' 
        }}>
          {WORK_PROMPTS
            .filter(p => {
              if (promptFilter === 'personal') return p.id === 'personal_project_deepdive';
              if (promptFilter === 'work') return p.id !== 'personal_project_deepdive';
              return true;
            })
            .map(p => {
              const isPersonal = p.id === 'personal_project_deepdive';
              return (
                <div key={p.id} style={{
                  background: isPersonal ? 'rgba(30, 27, 75, 0.45)' : 'rgba(15, 23, 42, 0.65)',
                  border: isPersonal ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isPersonal ? '0 4px 20px -2px rgba(168, 85, 247, 0.12)' : 'none'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className={isPersonal ? 'badge badge-purple' : 'badge badge-cyan'} style={{ fontSize: '10px' }}>
                        {p.badge}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedPromptId(expandedPromptId === p.id ? null : p.id)}
                        style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}
                      >
                        <span>{expandedPromptId === p.id ? 'Hide Text' : 'View Prompt'}</span>
                        {expandedPromptId === p.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                      {p.title}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {p.subtitle}
                    </p>
                  </div>

                  {expandedPromptId === p.id && (
                    <pre style={{
                      marginTop: '12px',
                      padding: '10px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '140px',
                      overflowY: 'auto'
                    }}>
                      {p.promptText}
                    </pre>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(p)}
                    style={{
                      marginTop: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: copiedPromptId === p.id 
                        ? 'rgba(52, 211, 153, 0.2)' 
                        : isPersonal 
                          ? 'rgba(168, 85, 247, 0.18)' 
                          : 'rgba(56, 189, 248, 0.12)',
                      border: copiedPromptId === p.id 
                        ? '1px solid #34d399' 
                        : isPersonal 
                          ? '1px solid rgba(168, 85, 247, 0.45)' 
                          : '1px solid rgba(56, 189, 248, 0.3)',
                      color: copiedPromptId === p.id 
                        ? '#34d399' 
                        : isPersonal 
                          ? '#c084fc' 
                          : '#38bdf8',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    {copiedPromptId === p.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPromptId === p.id ? 'Copied to Clipboard!' : isPersonal ? 'Copy Personal Project Prompt' : 'Copy Prompt for Claude / Gemini'}</span>
                  </button>
                </div>
              );
            })}
        </div>

        {/* Paste Box & Ingestion Action */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Paste Claude / Gemini Output Below</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                (Auto-extracts title, category, tech stack, bullets, metrics &amp; project links)
              </span>
            </label>

            {/* Sync to Resume Option */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '7px', 
                  cursor: 'pointer', 
                  fontSize: '11.5px', 
                  background: syncToResumeProjects ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.7)', 
                  border: syncToResumeProjects ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid var(--border-subtle)',
                  padding: '5px 11px', 
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={syncToResumeProjects}
                  onChange={e => setSyncToResumeProjects(e.target.checked)}
                  style={{ width: '14px', height: '14px', accentColor: '#38bdf8', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600, color: syncToResumeProjects ? '#38bdf8' : 'var(--text-secondary)' }}>
                  🚀 Also Add to Resume Featured Projects
                </span>
              </label>
            </div>
          </div>

          <textarea
            rows={4}
            value={pastedDigest}
            onChange={e => setPastedDigest(e.target.value)}
            placeholder="Paste the generated response here (e.g. '• Project Name: KubeWatch \n• Tech Stack: Go, React, Redis \n• Live / GitHub URL: https://github.com/user/project \n• What I Built: Designed real-time event pipeline...')"
            style={{ width: '100%', fontSize: '13px', fontFamily: 'var(--font-mono)' }}
          />

          {/* Optional custom/override GitHub / Live Link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="text"
              value={projectCustomLink}
              onChange={e => setProjectCustomLink(e.target.value)}
              placeholder="Project GitHub / Live URL (optional, e.g. github.com/username/project — auto-detected if in text)"
              style={{ flex: 1, fontSize: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {syncToResumeProjects 
                ? '✨ Always saves directly into your Dev Journal timeline below AND appends to Resume Featured Projects' 
                : '📓 Saves directly into your Dev Journal timeline below for your engineering records'}
            </span>

            <button
              type="button"
              onClick={handleIngestDigest}
              disabled={isIngesting || !pastedDigest.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-primary)',
                color: '#090d16',
                fontWeight: 600,
                fontSize: '13px',
                boxShadow: 'var(--accent-glow)',
                cursor: (isIngesting || !pastedDigest.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              <Sparkles className={`w-4 h-4 ${isIngesting ? 'animate-spin' : ''}`} />
              <span>
                {isIngesting ? 'Ingesting Project...' : 
                 syncToResumeProjects ? '✨ Ingest to Journal & Resume' :
                 '✨ Ingest to Dev Journal'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Optional Manual Log Form */}
      {isManualFormOpen && (
        <form onSubmit={handleManualSubmit} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus className="w-4 h-4 text-emerald-400" />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                Add Manual Work or Personal Project Log
              </h3>
            </div>
            <button type="button" onClick={() => setIsManualFormOpen(false)} style={{ color: 'var(--text-muted)' }}>
              &times;
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Task / Project Title
              </label>
              <input
                type="text"
                required
                value={manualEntry.title}
                onChange={e => setManualEntry(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. KubeWatch — Real-Time Kubernetes Cluster Event Streamer"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Category
              </label>
              <select
                value={manualEntry.category}
                onChange={e => setManualEntry(p => ({ ...p, category: e.target.value }))}
                style={{ width: '100%' }}
              >
                <option value="Personal Project">Personal Project</option>
                <option value="Optimization">Optimization</option>
                <option value="Architecture">Architecture</option>
                <option value="Feature">Feature</option>
                <option value="Bug Fix">Bug Fix</option>
                <option value="DevOps">DevOps</option>
                <option value="Learning">Learning</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Date
              </label>
              <input
                type="date"
                value={manualEntry.date}
                onChange={e => setManualEntry(p => ({ ...p, date: e.target.value }))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Project GitHub / Live URL (Optional)
              </label>
              <input
                type="text"
                value={manualEntry.link || ''}
                onChange={e => setManualEntry(p => ({ ...p, link: e.target.value }))}
                placeholder="e.g. github.com/username/project"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '22px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#f8fafc' }}>
                <input
                  type="checkbox"
                  checked={!!manualEntry.alsoPushToResumeProjects}
                  onChange={e => setManualEntry(p => ({ ...p, alsoPushToResumeProjects: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: '#38bdf8' }}
                />
                <span style={{ fontWeight: 500 }}>Also add directly to Resume Featured Projects</span>
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              What I Built / Solved (Engineering Summary)
            </label>
            <textarea
              rows={2}
              required
              value={manualEntry.summary}
              onChange={e => setManualEntry(p => ({ ...p, summary: e.target.value }))}
              placeholder="e.g. Developed an asynchronous event streaming engine in Go that tails Kubernetes audit logs and dispatches alerts via WebSockets."
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Tech Stack Tags (Comma-separated)
              </label>
              <input
                type="text"
                value={manualEntry.techStack}
                onChange={e => setManualEntry(p => ({ ...p, techStack: e.target.value }))}
                placeholder="Go, Kubernetes, WebSockets, Redis, Docker"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Quantifiable Impact / Result
              </label>
              <input
                type="text"
                value={manualEntry.impact}
                onChange={e => setManualEntry(p => ({ ...p, impact: e.target.value }))}
                placeholder="e.g. Benchmarked sub-5ms event dispatch; 120+ GitHub stars"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              alignSelf: 'flex-end',
              padding: '8px 20px',
              borderRadius: 'var(--radius-sm)',
              background: '#34d399',
              color: '#090d16',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            Save Entry
          </button>
        </form>
      )}

      {/* SECTION 3: Dev Journal Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
              Timeline ({displayedEntries.length} Records)
            </span>

            {/* Quick sync button from Resume Projects */}
            <button
              type="button"
              onClick={handleManualSyncResumeProjects}
              title="Sync any personal projects from your Resume Builder into the Dev Journal timeline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                color: '#c084fc',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sync from Resume Projects</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search journal..."
                style={{ paddingLeft: '32px', width: '220px', fontSize: '12px' }}
              />
              <Search className="w-3.5 h-3.5 text-slate-500" style={{ position: 'absolute', left: '10px' }} />
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {['All', 'Personal Project', 'Feature', 'Architecture', 'Optimization', 'Bug Fix'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: 500,
                    background: selectedCategory === cat ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                    border: selectedCategory === cat ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                    color: selectedCategory === cat ? '#38bdf8' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Entries Timeline Cards */}
        {displayedEntries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'rgba(15, 23, 42, 0.4)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)'
          }}>
            <BookOpen className="w-8 h-8" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <p>No journal entries found matching your filters.</p>
          </div>
        ) : (
          displayedEntries.map(entry => {
            const isPersonal = normalizeJournalCategory(entry.category) === 'Personal Project';
            const isHighlighted = highlightedEntryId === entry.id;
            const isEditing = editingEntryId === entry.id;

            // Render Inline Edit Mode
            if (isEditing) {
              return (
                <div
                  key={entry.id}
                  id={`journal-card-${entry.id}`}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    border: '1px solid rgba(56, 189, 248, 0.45)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(56, 189, 248, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)'
                  }}
                >
                  {/* Edit Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#38bdf8'
                      }}>
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                          Edit Timeline Record
                        </h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Modify details, bullets, tech stack, or links for this log
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
                    >
                      &times;
                    </button>
                  </div>

                  {/* Row 1: Title, Category, Date */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Title / Task Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.title}
                        onChange={e => setEditFormData(p => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Distributed Task Queue"
                        style={{ width: '100%', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Category
                      </label>
                      <select
                        value={editFormData.category}
                        onChange={e => setEditFormData(p => ({ ...p, category: e.target.value }))}
                        style={{ width: '100%', fontSize: '12px' }}
                      >
                        <option value="Personal Project">Personal Project</option>
                        <option value="Feature">Feature</option>
                        <option value="Architecture">Architecture</option>
                        <option value="Optimization">Optimization</option>
                        <option value="Bug Fix">Bug Fix</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Date
                      </label>
                      <input
                        type="date"
                        value={editFormData.date}
                        onChange={e => setEditFormData(p => ({ ...p, date: e.target.value }))}
                        style={{ width: '100%', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  {/* Row 2: Link & Impact */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        GitHub / Live URL
                      </label>
                      <input
                        type="text"
                        value={editFormData.link}
                        onChange={e => setEditFormData(p => ({ ...p, link: e.target.value }))}
                        placeholder="github.com/username/project"
                        style={{ width: '100%', fontSize: '12px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Quantifiable Impact / Result
                      </label>
                      <input
                        type="text"
                        value={editFormData.impact}
                        onChange={e => setEditFormData(p => ({ ...p, impact: e.target.value }))}
                        placeholder="e.g. Reduced p99 latency to 4ms; 500+ GitHub stars"
                        style={{ width: '100%', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  {/* Row 3: Summary */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Executive / Engineering Summary
                    </label>
                    <textarea
                      rows={2}
                      value={editFormData.summary}
                      onChange={e => setEditFormData(p => ({ ...p, summary: e.target.value }))}
                      placeholder="Summary of what was built or achieved..."
                      style={{ width: '100%', fontSize: '12.5px' }}
                    />
                  </div>

                  {/* Row 4: Tech Stack Tags */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Tech Stack Tags (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={editFormData.techStack}
                      onChange={e => setEditFormData(p => ({ ...p, techStack: e.target.value }))}
                      placeholder="Go, Redis, Kubernetes, WebSockets, ClickHouse"
                      style={{ width: '100%', fontSize: '12px' }}
                    />
                  </div>

                  {/* Row 5: Bullet Points list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Accomplishment Bullet Points ({editFormData.bullets.length})
                      </label>
                      <button
                        type="button"
                        onClick={handleAddEditBullet}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: '#38bdf8',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Bullet Point</span>
                      </button>
                    </div>

                    {editFormData.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '18px' }}>
                          {bIdx + 1}.
                        </span>
                        <input
                          type="text"
                          value={bullet}
                          onChange={e => handleUpdateEditBullet(bIdx, e.target.value)}
                          placeholder="Action Verb + Technical Implementation + Measurable Result..."
                          style={{ flex: 1, fontSize: '12px' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveEditBullet(bIdx)}
                          style={{
                            color: 'var(--text-muted)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Remove bullet"
                        >
                          <Trash2 className="w-3.5 h-3.5 hover:text-rose-400" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Row 6: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editFormData.syncToResume}
                        onChange={e => setEditFormData(p => ({ ...p, syncToResume: e.target.checked }))}
                        style={{ width: '14px', height: '14px', accentColor: '#38bdf8' }}
                      />
                      <span style={{ fontWeight: 600, color: editFormData.syncToResume ? '#38bdf8' : 'var(--text-secondary)' }}>
                        🚀 Also Sync Edits to Resume Featured Projects
                      </span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveEdit(entry.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 18px',
                          borderRadius: 'var(--radius-sm)',
                          background: '#34d399',
                          color: '#090d16',
                          fontSize: '12px',
                          fontWeight: 600,
                          boxShadow: '0 2px 10px rgba(52, 211, 153, 0.25)',
                          cursor: 'pointer',
                          border: 'none'
                        }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={entry.id}
                id={`journal-card-${entry.id}`}
                className="glass-panel"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.3s ease',
                  borderColor: isHighlighted 
                    ? '#38bdf8' 
                    : isPersonal 
                      ? 'rgba(168, 85, 247, 0.45)' 
                      : 'var(--border-subtle)',
                  boxShadow: isHighlighted 
                    ? '0 0 0 2px #38bdf8, 0 8px 24px rgba(56, 189, 248, 0.25)' 
                    : isPersonal
                      ? '0 4px 16px -2px rgba(168, 85, 247, 0.1)'
                      : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={isPersonal ? 'badge badge-purple' : 'badge badge-emerald'} style={{ fontSize: '11px' }}>
                      {entry.category}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar className="w-3 h-3" />
                      <span>{entry.date}</span>
                    </span>
                    {entry.link && (
                      <a
                        href={entry.link.startsWith('http') ? entry.link : `https://${entry.link}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          color: '#38bdf8',
                          textDecoration: 'none',
                          marginLeft: '4px'
                        }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{entry.link}</span>
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(entry)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(148, 163, 184, 0.12)',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        color: '#cbd5e1',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Edit this record's title, summary, bullets, tech stack, or link"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Prompt for latest updates option */}
                    <button
                      type="button"
                      onClick={() => handleToggleUpdateWorkspace(entry)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: activeUpdateEntryId === entry.id 
                          ? 'rgba(56, 189, 248, 0.25)' 
                          : 'rgba(56, 189, 248, 0.1)',
                        border: activeUpdateEntryId === entry.id 
                          ? '1px solid #38bdf8' 
                          : '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Generate follow-up prompt with previous entry context or log latest updates"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{activeUpdateEntryId === entry.id ? 'Close Update' : 'Prompt for Updates'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePushToResume(entry)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                      title="Synthesize and append this achievement to Resume Experience"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Push to Experience</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePushToProjects(entry)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: isPersonal ? 'rgba(168, 85, 247, 0.2)' : 'rgba(30, 41, 59, 0.8)',
                        border: isPersonal ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid var(--border-medium)',
                        color: isPersonal ? '#c084fc' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 600
                      }}
                      title="Format and add this to Resume Featured Projects"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      <span>Push to Projects</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteJournalEntry(entry.id)}
                      style={{ color: 'var(--text-muted)', padding: '4px' }}
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5 hover:text-rose-400" />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                    {entry.title}
                  </h3>

                  {/* Milestone badge & history toggle */}
                  {entry.updates && entry.updates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedMilestonesMap(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        background: 'rgba(52, 211, 153, 0.12)',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                        color: '#34d399',
                        cursor: 'pointer'
                      }}
                      title="Click to view previous update milestones"
                    >
                      <History className="w-3 h-3" />
                      <span>Milestone {entry.updates.length + 1} (Updated {entry.lastUpdatedDate || entry.date})</span>
                      {expandedMilestonesMap[entry.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '2px 0 0 0' }}>
                  {entry.summary}
                </p>

                {/* Bullets List (if present) */}
                {Array.isArray(entry.bullets) && entry.bullets.length > 0 && (
                  <ul style={{
                    margin: '2px 0 0 0',
                    paddingLeft: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    color: 'var(--text-secondary)',
                    fontSize: '12.5px',
                    lineHeight: 1.4
                  }}>
                    {entry.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} style={{ listStyleType: 'disc' }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}

                {entry.impact && (
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(52, 211, 153, 0.08)',
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                    fontSize: '12px',
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span><strong>Impact:</strong> {entry.impact}</span>
                  </div>
                )}

                {/* Tech Stack Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                  {Array.isArray(entry.techStack) && entry.techStack.map(tech => (
                    <span key={tech} style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)'
                    }}>
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Milestone History Accordion */}
                {expandedMilestonesMap[entry.id] && entry.updates && entry.updates.length > 0 && (
                  <div style={{
                    marginTop: '10px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(52, 211, 153, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <History className="w-3.5 h-3.5" />
                      <span>Milestone Evolution for {entry.title} ({entry.updates.length} previous updates)</span>
                    </span>
                    {entry.updates.map((upd, idx) => (
                      <div key={upd.id || idx} style={{
                        padding: '8px 10px',
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        borderLeft: '2px solid #34d399'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>{upd.milestoneTitle || `Milestone ${upd.milestoneNumber || idx + 2}`}</span>
                          <span>{upd.date}</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>{upd.summary}</p>
                        {upd.bullets && upd.bullets.length > 0 && (
                          <ul style={{ paddingLeft: '16px', margin: 0, color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                            {upd.bullets.map((b, bIdx) => (
                              <li key={bIdx} style={{ marginBottom: '2px' }}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactive Milestone Follow-Up Update Workspace */}
                {activeUpdateEntryId === entry.id && (
                  <div 
                    id={`update-workspace-${entry.id}`}
                    style={{
                      marginTop: '14px',
                      padding: '20px',
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(56, 189, 248, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                    {/* Header banner */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(56, 189, 248, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#38bdf8'
                        }}>
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                            Log Latest Updates After Previous Milestone ({entry.date})
                          </h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Continuously track progress for "{entry.title}" without overwriting earlier achievements
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveUpdateEntryId(null)}
                        style={{ color: 'var(--text-muted)', fontSize: '18px', padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        &times;
                      </button>
                    </div>

                    {/* Section 1: Context-Aware Prompt for Claude / Gemini */}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MessageSquarePlus className="w-4 h-4 text-sky-400" />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                            Claude &amp; Gemini Context-Aware Update Prompt
                          </span>
                          <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                            Includes Previous Entry Context
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyUpdatePrompt(entry)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 12px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            background: copiedUpdatePromptId === entry.id ? 'rgba(52, 211, 153, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                            border: copiedUpdatePromptId === entry.id ? '1px solid #34d399' : '1px solid rgba(56, 189, 248, 0.3)',
                            color: copiedUpdatePromptId === entry.id ? '#34d399' : '#38bdf8',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {copiedUpdatePromptId === entry.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedUpdatePromptId === entry.id ? 'Copied Prompt to Clipboard!' : 'Copy Update Prompt for Claude / Gemini'}</span>
                        </button>
                      </div>

                      <pre style={{
                        margin: 0,
                        padding: '10px 12px',
                        background: 'rgba(15, 23, 42, 0.9)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: '#94a3b8',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '130px',
                        overflowY: 'auto',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        {generateFollowUpUpdatePrompt(entry)}
                      </pre>

                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        💡 <strong>Tip:</strong> Paste this prompt into Claude or Gemini along with your latest commits, PR summaries, or standup notes.
                      </span>
                    </div>

                    {/* Section 2: In-App AI Generation (if configured) or Quick Notes */}
                    {((aiConfig.provider === 'gemini' && aiConfig.geminiApiKey) || aiConfig.provider === 'ollama') && (
                      <div style={{
                        background: 'rgba(56, 189, 248, 0.05)',
                        border: '1px dashed rgba(56, 189, 248, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Generate In-App with AI ({aiConfig.provider === 'gemini' ? 'Gemini' : 'Ollama'})</span>
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Provide rough notes or leave blank to ask AI based on previous achievements
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            value={updateNotesForAi}
                            onChange={e => setUpdateNotesForAi(e.target.value)}
                            placeholder="Quick notes (e.g. 'Added Redis distributed caching, fixed deadlock in worker pool, reduced latency from 120ms to 24ms, 500+ GitHub stars')"
                            style={{ flex: 1, minWidth: '240px', fontSize: '12px' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleGenerateUpdateWithAi(entry)}
                            disabled={isGeneratingUpdate}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 14px',
                              borderRadius: 'var(--radius-sm)',
                              background: '#38bdf8',
                              color: '#090d16',
                              fontWeight: 600,
                              fontSize: '12px',
                              cursor: isGeneratingUpdate ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingUpdate ? 'animate-spin' : ''}`} />
                            <span>{isGeneratingUpdate ? 'Generating...' : '✨ Generate with AI'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Section 3: Paste Response or Write Updates */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Paste Claude / Gemini Response or Enter Detailed Updates:</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                          (Auto-extracts newly introduced technologies, STAR bullets &amp; updated metrics)
                        </span>
                      </label>
                      <textarea
                        rows={4}
                        value={updateInputText}
                        onChange={e => setUpdateInputText(e.target.value)}
                        placeholder={`Paste the AI output or notes here, e.g.:
• Latest Accomplishments (After Previous Entry):
  - Architected distributed memory-mapped ring buffer in Go, processing 220k events/sec with sub-2ms latency
  - Deployed ClickHouse analytical aggregation layer reducing historical metrics query time by 85%
• New Technologies Introduced: ClickHouse, Prometheus, Grafana
• Updated Measurable Impact: Handled 220k events/sec with 99.99% uptime; 500+ GitHub stars`}
                        style={{ width: '100%', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                      />
                    </div>

                    {/* Actions: Resume Sync & Save Options */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={syncUpdateToResume}
                          onChange={e => setSyncUpdateToResume(e.target.checked)}
                          style={{ width: '14px', height: '14px', accentColor: '#38bdf8' }}
                        />
                        <span style={{ fontWeight: 600, color: syncUpdateToResume ? '#38bdf8' : 'var(--text-secondary)' }}>
                          🚀 Also Sync Latest Bullets &amp; Tech Stack to Resume Featured Projects
                        </span>
                      </label>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setActiveUpdateEntryId(null)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={() => handleLogAsNewChainedCard(entry)}
                          disabled={isGeneratingUpdate || (!updateInputText.trim() && !updateNotesForAi.trim())}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 14px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(168, 85, 247, 0.18)',
                            border: '1px solid rgba(168, 85, 247, 0.45)',
                            color: '#c084fc',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: (isGeneratingUpdate || (!updateInputText.trim() && !updateNotesForAi.trim())) ? 'not-allowed' : 'pointer'
                          }}
                          title="Create a separate follow-up card for this milestone on the timeline"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Log as New Chained Card</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyUpdateToRecord(entry)}
                          disabled={isGeneratingUpdate || (!updateInputText.trim() && !updateNotesForAi.trim())}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 16px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--accent-primary)',
                            color: '#090d16',
                            fontSize: '12px',
                            fontWeight: 600,
                            boxShadow: 'var(--accent-glow)',
                            cursor: (isGeneratingUpdate || (!updateInputText.trim() && !updateNotesForAi.trim())) ? 'not-allowed' : 'pointer'
                          }}
                          title="Update this existing record with the latest milestone accomplishments while preserving previous history"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Apply Updates to Record</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
