/**
 * @typedef {import('./ports.js').GitPort} GitPort
 */

export class BranchService {
  /**
   * @param {{ gitPort: GitPort }} params
   */
  constructor({ gitPort }) {
    this.gitPort = gitPort;
  }

  async getContext(repositoryPath) {
    const [activeBranch, branches] = await Promise.all([
      this.gitPort.getCurrentBranch(repositoryPath),
      this.gitPort.listBranches(repositoryPath),
    ]);

    return {
      activeBranch,
      branches: branches.map((branch) => ({
        ...branch,
        isCurrent: branch.name === activeBranch,
      })),
    };
  }

  async switch(repositoryPath, branchName) {
    await this.gitPort.switchBranch(repositoryPath, branchName);
    return this.getContext(repositoryPath);
  }

  async getRemotes(repositoryPath) {
    return this.gitPort.getRemotes(repositoryPath);
  }
}
