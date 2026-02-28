export function createMockGitHubPort(accessibleRepositories) {
  let loggedIn = false;

  return {
    async login() {
      loggedIn = true;
    },
    async listAccessibleRepositories() {
      if (!loggedIn) {
        throw new Error("GitHub login required before listing repositories");
      }

      return accessibleRepositories;
    },
  };
}
