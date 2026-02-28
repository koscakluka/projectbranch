/**
 * @typedef {import('./ports.js').GitHubPort} GitHubPort
 */

export class GitHubSessionService {
  /**
   * @param {{ gitHubPort: GitHubPort }} params
   */
  constructor({ gitHubPort }) {
    this.gitHubPort = gitHubPort;
  }

  async loginAndListRepositories() {
    await this.gitHubPort.login();
    return this.gitHubPort.listAccessibleRepositories();
  }
}
