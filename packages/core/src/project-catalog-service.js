import path from "node:path";

function normalizeIdentityPath(identityPath, fallbackPath) {
  const candidate = (identityPath || "").trim();
  if (!candidate) {
    return fallbackPath;
  }

  const withoutTrailingSlash = candidate.replace(/[\\/]+$/, "");
  const baseName = path.basename(withoutTrailingSlash);

  if (baseName === ".git" || baseName === ".bare" || baseName.startsWith(".")) {
    const parent = path.dirname(withoutTrailingSlash);
    return parent && parent !== "." ? parent : fallbackPath;
  }

  if (/[\\/]\.git$/.test(withoutTrailingSlash)) {
    return withoutTrailingSlash.replace(/[\\/]\.git$/, "");
  }

  if (/[\\/]\.bare$/.test(withoutTrailingSlash)) {
    return withoutTrailingSlash.replace(/[\\/]\.bare$/, "");
  }

  return withoutTrailingSlash;
}

function normalizeDisplayName(candidate) {
  if (!candidate) {
    return null;
  }

  const compact = String(candidate).trim().replace(/\s+/g, " ");
  if (!compact) {
    return null;
  }

  return compact;
}

function displayNameFromPath(projectPath) {
  const normalized = (projectPath || "").replace(/[\\/]+$/, "");
  const baseName = path.basename(normalized);
  return normalizeDisplayName(baseName || normalized);
}

function parseReadmeTitle(contents) {
  if (!contents) {
    return null;
  }

  const normalized = contents.replace(/\r\n/g, "\n");
  const titleMatch = normalized.match(/^#\s+(.+?)\s*$/m);
  if (!titleMatch) {
    return null;
  }

  return normalizeDisplayName(titleMatch[1].replace(/\s+#*\s*$/, ""));
}

function parsePackageName(contents) {
  if (!contents) {
    return null;
  }

  try {
    const parsed = JSON.parse(contents);
    return normalizeDisplayName(parsed?.name);
  } catch {
    return null;
  }
}

function parseRemoteName(remoteUrl) {
  if (!remoteUrl) {
    return null;
  }

  const match = remoteUrl.match(/([^/:]+?)(?:\.git)?$/i);
  if (!match) {
    return null;
  }

  return normalizeDisplayName(match[1]);
}

function defaultWorktreeScore(worktree) {
  if (worktree.hasReadme && worktree.branchName === "main") {
    return 0;
  }

  if (worktree.hasReadme) {
    return 1;
  }

  if (worktree.hasProjectDocs && worktree.branchName === "main") {
    return 2;
  }

  if (worktree.hasProjectDocs) {
    return 3;
  }

  if (worktree.branchName === "main") {
    return 4;
  }

  if (!worktree.git?.isWorktree) {
    return 5;
  }

  if (worktree.branchName === "master") {
    return 6;
  }

  return 7;
}

function pickDefaultWorktree(worktrees) {
  return [...worktrees].sort((left, right) => {
    const scoreDiff = defaultWorktreeScore(left) - defaultWorktreeScore(right);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return left.repositoryPath.localeCompare(right.repositoryPath);
  })[0];
}

async function withFallback(fetcher, fallbackValue) {
  try {
    return await fetcher();
  } catch {
    return fallbackValue;
  }
}

async function withNullFallback(fetcher) {
  return withFallback(fetcher, null);
}

/**
 * @typedef {import('./discovery-service.js').DiscoveryService} DiscoveryService
 * @typedef {import('./ports.js').GitPort} GitPort
 */

export class ProjectCatalogService {
  /**
   * @param {{ discoveryService: DiscoveryService, gitPort: GitPort, fsPort?: import('./ports.js').FileSystemPort }} params
   */
  constructor({ discoveryService, gitPort, fsPort = null }) {
    this.discoveryService = discoveryService;
    this.gitPort = gitPort;
    this.fsPort = fsPort;
  }

  async resolveDisplayName(defaultWorktree, projectPath) {
    if (this.fsPort && defaultWorktree?.hasReadme) {
      const readmeTitle = await withNullFallback(async () => {
        const readmePath = path.join(defaultWorktree.docsPath, "README.md");
        if (!(await this.fsPort.isFile(readmePath))) {
          return null;
        }

        const contents = await this.fsPort.readText(readmePath);
        return parseReadmeTitle(contents);
      });

      if (readmeTitle) {
        return readmeTitle;
      }
    }

    if (this.fsPort) {
      const packageName = await withNullFallback(async () => {
        const packageJsonPath = path.join(defaultWorktree.repositoryPath, "package.json");
        if (!(await this.fsPort.isFile(packageJsonPath))) {
          return null;
        }

        const contents = await this.fsPort.readText(packageJsonPath);
        return parsePackageName(contents);
      });

      if (packageName) {
        return packageName;
      }
    }

    const remoteName = await withNullFallback(async () => {
      const remotes = await this.gitPort.getRemotes(defaultWorktree.repositoryPath);
      if (!Array.isArray(remotes) || remotes.length === 0) {
        return null;
      }

      const preferredRemote = remotes.find((remote) => remote.name === "origin") ?? remotes[0];
      return parseRemoteName(preferredRemote?.url);
    });

    if (remoteName) {
      return remoteName;
    }

    return displayNameFromPath(projectPath || defaultWorktree.repositoryPath);
  }

  /**
   * @param {string[]} rootPaths
   */
  async discoverGrouped(rootPaths) {
    const discovered = await this.discoveryService.discover(rootPaths);

    const enriched = await Promise.all(
      discovered.map(async (entry) => {
        const [branchName, commonDirectory, isBareRepository] = await Promise.all([
          withFallback(() => this.gitPort.getCurrentBranch(entry.repositoryPath), null),
          withFallback(() => this.gitPort.getCommonDirectory(entry.repositoryPath), entry.repositoryPath),
          typeof this.gitPort.isBareRepository === "function"
            ? withFallback(() => this.gitPort.isBareRepository(entry.repositoryPath), false)
            : false,
        ]);

        const repositoryIdentity = commonDirectory || entry.repositoryPath;

        return {
          ...entry,
          branchName,
          repositoryIdentity,
          isBareRepository,
        };
      }),
    );

    const grouped = new Map();

    for (const worktree of enriched) {
      if (worktree.isBareRepository) {
        continue;
      }

      const key = worktree.repositoryIdentity;
      const bucket = grouped.get(key) ?? [];
      bucket.push(worktree);
      grouped.set(key, bucket);
    }

    const projectGroups = await Promise.all(
      [...grouped.entries()].map(async ([repositoryIdentity, worktrees]) => {
        const sortedWorktrees = [...worktrees].sort((left, right) => left.repositoryPath.localeCompare(right.repositoryPath));
        const defaultWorktree = pickDefaultWorktree(sortedWorktrees);
        const projectPath = normalizeIdentityPath(repositoryIdentity, defaultWorktree.repositoryPath);
        const displayName = await this.resolveDisplayName(defaultWorktree, projectPath);

        return {
          projectId: repositoryIdentity,
          displayName,
          projectPath,
          rootPath: defaultWorktree.rootPath,
          defaultWorktreePath: defaultWorktree.repositoryPath,
          hasProjectDocs: sortedWorktrees.some((worktree) => worktree.hasProjectDocs),
          hasReadme: sortedWorktrees.some((worktree) => worktree.hasReadme),
          worktreeCount: sortedWorktrees.length,
          worktrees: sortedWorktrees.map((worktree) => ({
            ...worktree,
            isDefault: worktree.repositoryPath === defaultWorktree.repositoryPath,
          })),
        };
      }),
    );

    return projectGroups.sort((left, right) => {
        if (left.hasProjectDocs !== right.hasProjectDocs) {
          return left.hasProjectDocs ? -1 : 1;
        }

        const pathDiff = left.projectPath.localeCompare(right.projectPath);
        if (pathDiff !== 0) {
          return pathDiff;
        }

        return left.projectId.localeCompare(right.projectId);
      });
  }
}
