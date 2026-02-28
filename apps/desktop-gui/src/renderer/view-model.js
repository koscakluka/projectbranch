function normalizePath(targetPath) {
  return (targetPath || "").replace(/\\/g, "/").replace(/\/+$/, "");
}

function relativePathLabel(rootPath, targetPath) {
  const normalizedRoot = normalizePath(rootPath);
  const normalizedTarget = normalizePath(targetPath);

  if (normalizedRoot && normalizedTarget.startsWith(`${normalizedRoot}/`)) {
    return normalizedTarget.slice(normalizedRoot.length + 1);
  }

  return null;
}

export function projectLabel(projectGroup) {
  if (projectGroup.displayName) {
    return projectGroup.displayName;
  }

  const projectPath = normalizePath(projectGroup.projectPath || projectGroup.repositoryPath);
  const rootPath = normalizePath(projectGroup.rootPath);

  const relative = relativePathLabel(rootPath, projectPath);
  if (relative) {
    return relative;
  }

  const segments = projectPath.split("/").filter(Boolean);
  const baseName = segments.at(-1) || projectPath;
  const parentName = segments.at(-2);
  if (parentName) {
    return `${parentName}/${baseName}`;
  }

  return baseName;
}

export function worktreeLabel(projectGroup, worktree) {
  if (worktree.branchName) {
    const suffix = worktree.isDefault ? " (default)" : "";
    return `${worktree.branchName}${suffix}`;
  }

  const relative = relativePathLabel(projectGroup.projectPath, worktree.repositoryPath);
  if (relative) {
    return worktree.isDefault ? `${relative} (default)` : relative;
  }

  const fallback = normalizePath(worktree.repositoryPath);
  return worktree.isDefault ? `${fallback} (default)` : fallback;
}

export function docsSetupLabel(worktree) {
  if (worktree.hasProjectDocs && worktree.hasReadme) {
    return "Docs ready";
  }

  if (worktree.hasProjectDocs) {
    return "Missing README.md";
  }

  return "Missing docs/project";
}

export function projectSetupSummary(projectGroup) {
  const missingDocsCount = projectGroup.worktrees.filter((worktree) => !worktree.hasProjectDocs).length;
  const missingReadmeCount = projectGroup.worktrees.filter((worktree) => worktree.hasProjectDocs && !worktree.hasReadme).length;
  const total = projectGroup.worktrees.length;

  if (missingDocsCount === 0 && missingReadmeCount === 0) {
    return "Docs ready";
  }

  if (missingDocsCount === total) {
    return "Missing docs/project";
  }

  if (missingReadmeCount > 0 && missingDocsCount === 0) {
    return "Missing README.md in some worktrees";
  }

  return "Some worktrees need docs setup";
}

export function mappingLabel(mappingResult) {
  if (mappingResult.mapping) {
    return `Mapped to ${mappingResult.mapping.fullName} via ${mappingResult.mapping.remoteName}`;
  }

  if (mappingResult.reason === "no-github-remote") {
    return "No GitHub remote found for this repository.";
  }

  if (mappingResult.reason === "not-accessible") {
    return "GitHub remote exists but account access is missing.";
  }

  return "No mapping available.";
}
