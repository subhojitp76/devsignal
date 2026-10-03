/**
 * Resume Semantic Diff Utility
 * Computes deep differences between a historical resume snapshot and current resumeData
 * for the "Reflect Back" comparison view.
 */

export function computeResumeDiff(historicalResume, currentResume) {
  if (!historicalResume || !currentResume) {
    return null;
  }

  const hist = historicalResume;
  const curr = currentResume;

  // 1. Summary Diff
  const summaryDiff = {
    hasChanged: (hist.summary || '').trim() !== (curr.summary || '').trim(),
    historical: hist.summary || '',
    current: curr.summary || '',
    historicalLength: (hist.summary || '').trim().split(/\s+/).filter(Boolean).length,
    currentLength: (curr.summary || '').trim().split(/\s+/).filter(Boolean).length
  };

  // 2. Experience Diff
  const histExp = hist.experience || [];
  const currExp = curr.experience || [];

  const experienceDiffs = [];
  const processedCurrIds = new Set();

  histExp.forEach((hRole, index) => {
    // Try to match by ID or company + role
    const matchedCurr = currExp.find(c => 
      c.id === hRole.id || 
      (c.company && hRole.company && c.company.toLowerCase() === hRole.company.toLowerCase() && c.role && hRole.role && c.role.toLowerCase() === hRole.role.toLowerCase())
    ) || currExp[index];

    if (matchedCurr) {
      processedCurrIds.add(matchedCurr.id);
      
      const hBullets = hRole.bullets || [];
      const cBullets = matchedCurr.bullets || [];

      // Categorize bullets
      const retained = [];
      const modified = [];
      const inHistoricalOnly = [];
      const inCurrentOnly = [];

      // Check each historical bullet
      hBullets.forEach(hb => {
        const exactMatch = cBullets.find(cb => cb.trim() === hb.trim());
        if (exactMatch) {
          retained.push(hb);
        } else {
          // Check for similar bullet (partial match or high overlap)
          const hbWords = new Set(hb.toLowerCase().split(/\W+/).filter(w => w.length > 3));
          const potentialMod = cBullets.find(cb => {
            const cbWords = new Set(cb.toLowerCase().split(/\W+/).filter(w => w.length > 3));
            let common = 0;
            hbWords.forEach(w => { if (cbWords.has(w)) common++; });
            const overlapRatio = common / Math.max(hbWords.size, 1);
            return overlapRatio >= 0.4 && !retained.includes(cb);
          });

          if (potentialMod) {
            modified.push({ historical: hb, current: potentialMod });
          } else {
            inHistoricalOnly.push(hb);
          }
        }
      });

      // Find bullets in current only (not retained and not marked as modified current target)
      cBullets.forEach(cb => {
        const isRetained = retained.some(rb => rb.trim() === cb.trim());
        const isModTarget = modified.some(m => m.current.trim() === cb.trim());
        if (!isRetained && !isModTarget) {
          inCurrentOnly.push(cb);
        }
      });

      const roleChanged = hRole.role !== matchedCurr.role || 
                          hRole.company !== matchedCurr.company || 
                          hRole.startDate !== matchedCurr.startDate || 
                          hRole.endDate !== matchedCurr.endDate ||
                          inHistoricalOnly.length > 0 ||
                          inCurrentOnly.length > 0 ||
                          modified.length > 0;

      experienceDiffs.push({
        type: 'matched',
        historicalRole: hRole,
        currentRole: matchedCurr,
        hasChanged: roleChanged,
        retained,
        modified,
        inHistoricalOnly,
        inCurrentOnly
      });
    } else {
      // Role existed in historical but deleted in current
      experienceDiffs.push({
        type: 'removed_in_current',
        historicalRole: hRole,
        hasChanged: true,
        inHistoricalOnly: hRole.bullets || []
      });
    }
  });

  // Check for newly added roles in current
  currExp.forEach(cRole => {
    if (!processedCurrIds.has(cRole.id)) {
      experienceDiffs.push({
        type: 'added_in_current',
        currentRole: cRole,
        hasChanged: true,
        inCurrentOnly: cRole.bullets || []
      });
    }
  });

  // 3. Projects Diff
  const histProj = hist.projects || [];
  const currProj = curr.projects || [];
  const projectDiffs = [];
  const processedProjIds = new Set();

  histProj.forEach((hp, idx) => {
    const matchedCurr = currProj.find(cp => 
      cp.id === hp.id || 
      (cp.name && hp.name && cp.name.toLowerCase() === hp.name.toLowerCase())
    ) || currProj[idx];

    if (matchedCurr) {
      processedProjIds.add(matchedCurr.id);
      const hBullets = hp.bullets || [];
      const cBullets = matchedCurr.bullets || [];

      projectDiffs.push({
        type: 'matched',
        historicalProject: hp,
        currentProject: matchedCurr,
        hasChanged: hp.name !== matchedCurr.name || 
                    hp.techStack !== matchedCurr.techStack || 
                    JSON.stringify(hBullets) !== JSON.stringify(cBullets),
        hBullets,
        cBullets
      });
    } else {
      projectDiffs.push({
        type: 'removed_in_current',
        historicalProject: hp,
        hasChanged: true
      });
    }
  });

  currProj.forEach(cp => {
    if (!processedProjIds.has(cp.id)) {
      projectDiffs.push({
        type: 'added_in_current',
        currentProject: cp,
        hasChanged: true
      });
    }
  });

  // 4. Skills Diff
  const getSkillsList = (resume) => {
    const list = [];
    (resume.skillCategories || []).forEach(cat => {
      (cat.skills || []).forEach(s => {
        if (s && s.trim()) list.push({ name: s.trim(), category: cat.name || 'General' });
      });
    });
    return list;
  };

  const hSkills = getSkillsList(hist);
  const cSkills = getSkillsList(curr);

  const hSkillNames = new Set(hSkills.map(s => s.name.toLowerCase()));
  const cSkillNames = new Set(cSkills.map(s => s.name.toLowerCase()));

  const skillsAddedInCurrent = cSkills.filter(s => !hSkillNames.has(s.name.toLowerCase()));
  const skillsRemovedInCurrent = hSkills.filter(s => !cSkillNames.has(s.name.toLowerCase()));
  const skillsShared = cSkills.filter(s => hSkillNames.has(s.name.toLowerCase()));

  const skillsDiff = {
    hasChanged: skillsAddedInCurrent.length > 0 || skillsRemovedInCurrent.length > 0,
    added: skillsAddedInCurrent,
    removed: skillsRemovedInCurrent,
    shared: skillsShared,
    historicalTotal: hSkills.length,
    currentTotal: cSkills.length
  };

  // Overall Statistics
  const totalModifications = 
    (summaryDiff.hasChanged ? 1 : 0) +
    experienceDiffs.filter(e => e.hasChanged).length +
    projectDiffs.filter(p => p.hasChanged).length +
    (skillsDiff.hasChanged ? 1 : 0);

  return {
    summaryDiff,
    experienceDiffs,
    projectDiffs,
    skillsDiff,
    totalModifications,
    isIdentical: totalModifications === 0
  };
}
