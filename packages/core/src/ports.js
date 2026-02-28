/**
 * @typedef {Object} DirectoryEntry
 * @property {string} name
 * @property {string} path
 * @property {boolean} isDirectory
 * @property {boolean} isFile
 */

/**
 * @typedef {Object} FileSystemPort
 * @property {(dirPath: string) => Promise<DirectoryEntry[]>} readDirectory
 * @property {(targetPath: string) => Promise<boolean>} exists
 * @property {(targetPath: string) => Promise<boolean>} isDirectory
 * @property {(targetPath: string) => Promise<boolean>} isFile
 * @property {(targetPath: string) => Promise<string>} readText
 * @property {(targetPath: string, contents: string) => Promise<void>} writeText
 * @property {(targetPath: string) => Promise<void>} ensureDirectory
 */

/**
 * @typedef {Object} GitBranch
 * @property {string} name
 * @property {boolean} isCurrent
 */

/**
 * @typedef {Object} GitRemote
 * @property {string} name
 * @property {string} url
 */

/**
 * @typedef {Object} GitPort
 * @property {(repoPath: string) => Promise<string>} getCurrentBranch
 * @property {(repoPath: string) => Promise<GitBranch[]>} listBranches
 * @property {(repoPath: string, branchName: string) => Promise<void>} switchBranch
 * @property {(repoPath: string) => Promise<GitRemote[]>} getRemotes
 * @property {(repoPath: string) => Promise<string>} getCommonDirectory
 * @property {(repoPath: string) => Promise<boolean>} isBareRepository
 */

/**
 * @typedef {Object} AccessibleRepository
 * @property {string} fullName
 */

/**
 * @typedef {Object} GitHubPort
 * @property {() => Promise<void>} login
 * @property {() => Promise<AccessibleRepository[]>} listAccessibleRepositories
 */

export {};
