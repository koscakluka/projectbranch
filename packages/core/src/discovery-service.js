import path from "node:path";

/**
 * @typedef {import('./ports.js').FileSystemPort} FileSystemPort
 */

/**
 * @typedef {Object} ProjectDiscoveryResult
 * @property {string} rootPath
 * @property {string} repositoryPath
 * @property {string} docsPath
 * @property {boolean} hasProjectDocs
 * @property {boolean} hasReadme
 * @property {{ hasMetadata: boolean, isWorktree: boolean, metadataPath: string | null, metadataType: 'directory' | 'file' | null }} git
 */

async function detectGitMetadata(fsPort, repositoryPath) {
  const metadataPath = path.join(repositoryPath, ".git");

  if (await fsPort.isDirectory(metadataPath)) {
    return {
      hasMetadata: true,
      isWorktree: false,
      metadataPath,
      metadataType: "directory",
    };
  }

  if (await fsPort.isFile(metadataPath)) {
    const contents = await fsPort.readText(metadataPath);
    return {
      hasMetadata: true,
      isWorktree: /^gitdir:/im.test(contents),
      metadataPath,
      metadataType: "file",
    };
  }

  return {
    hasMetadata: false,
    isWorktree: false,
    metadataPath: null,
    metadataType: null,
  };
}

async function readDirectorySafe(fsPort, targetPath) {
  try {
    return await fsPort.readDirectory(targetPath);
  } catch {
    return [];
  }
}

/**
 * @param {FileSystemPort} fsPort
 * @param {string} rootPath
 * @param {number} nestedDepth
 */
async function collectCandidateRepositories(fsPort, rootPath, nestedDepth) {
  const candidates = [];
  const directEntries = await readDirectorySafe(fsPort, rootPath);
  const directFolders = directEntries.filter((entry) => entry.isDirectory);

  for (const folder of directFolders) {
    candidates.push(folder.path);

    if (nestedDepth > 0) {
      const nestedEntries = await readDirectorySafe(fsPort, folder.path);
      const nestedFolders = nestedEntries.filter((entry) => entry.isDirectory);
      for (const nestedFolder of nestedFolders) {
        candidates.push(nestedFolder.path);
      }
    }
  }

  return [...new Set(candidates)].sort((left, right) => left.localeCompare(right));
}

export class DiscoveryService {
  /**
   * @param {{ fsPort: FileSystemPort, docsRelativePath?: string, nestedDepth?: number, includeWithoutDocs?: boolean }} params
   */
  constructor({ fsPort, docsRelativePath = path.join("docs", "project"), nestedDepth = 1, includeWithoutDocs = false }) {
    this.fsPort = fsPort;
    this.docsRelativePath = docsRelativePath;
    this.nestedDepth = nestedDepth;
    this.includeWithoutDocs = includeWithoutDocs;
  }

  /**
   * @param {string[]} rootPaths
   * @returns {Promise<ProjectDiscoveryResult[]>}
   */
  async discover(rootPaths) {
    const targets = [...new Set(rootPaths.filter(Boolean))];
    const projects = [];

    for (const rootPath of targets) {
      const candidates = await collectCandidateRepositories(this.fsPort, rootPath, this.nestedDepth);

      for (const repositoryPath of candidates) {
        const docsPath = path.join(repositoryPath, this.docsRelativePath);
        const hasProjectDocs = await this.fsPort.isDirectory(docsPath);
        let git = null;

        if (!hasProjectDocs) {
          if (!this.includeWithoutDocs) {
            continue;
          }

          git = await detectGitMetadata(this.fsPort, repositoryPath);
          if (!git.hasMetadata) {
            continue;
          }
        } else {
          git = await detectGitMetadata(this.fsPort, repositoryPath);
        }

        const hasReadme = hasProjectDocs && (await this.fsPort.isFile(path.join(docsPath, "README.md")));

        projects.push({
          rootPath,
          repositoryPath,
          docsPath,
          hasProjectDocs,
          hasReadme,
          git,
        });
      }
    }

    return projects.sort((left, right) => left.repositoryPath.localeCompare(right.repositoryPath));
  }
}
