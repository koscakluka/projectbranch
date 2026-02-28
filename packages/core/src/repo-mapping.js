const GITHUB_HOST = "github.com";

function trimGitSuffix(repoPath) {
  return repoPath.replace(/\.git$/i, "").replace(/\/$/, "");
}

/**
 * @param {string} remoteUrl
 * @returns {{ owner: string, repo: string, slug: string } | null}
 */
export function parseGitHubRemote(remoteUrl) {
  if (!remoteUrl) {
    return null;
  }

  let pathname = null;

  if (remoteUrl.startsWith(`git@${GITHUB_HOST}:`)) {
    pathname = remoteUrl.slice(`git@${GITHUB_HOST}:`.length);
  } else if (remoteUrl.startsWith(`https://${GITHUB_HOST}/`) || remoteUrl.startsWith(`http://${GITHUB_HOST}/`)) {
    pathname = new URL(remoteUrl).pathname.slice(1);
  } else if (remoteUrl.startsWith(`ssh://git@${GITHUB_HOST}/`)) {
    pathname = remoteUrl.slice(`ssh://git@${GITHUB_HOST}/`.length);
  } else {
    return null;
  }

  const normalized = trimGitSuffix(pathname);
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const owner = parts[0];
  const repo = parts[1];
  return { owner, repo, slug: `${owner}/${repo}` };
}

/**
 * @param {{ remotes: Array<{ name: string, url: string }>, accessibleRepositories?: Array<{ fullName: string }> }} params
 */
export function mapLocalRepositoryToGitHub({ remotes, accessibleRepositories = [] }) {
  const githubRemotes = remotes
    .map((remote) => ({
      ...remote,
      parsed: parseGitHubRemote(remote.url),
    }))
    .filter((remote) => remote.parsed !== null);

  if (githubRemotes.length === 0) {
    return {
      mapping: null,
      reason: "no-github-remote",
    };
  }

  const selectedRemote = githubRemotes.find((remote) => remote.name === "origin") ?? githubRemotes[0];

  if (accessibleRepositories.length > 0) {
    const accessible = new Set(accessibleRepositories.map((repo) => repo.fullName));
    if (!accessible.has(selectedRemote.parsed.slug)) {
      return {
        mapping: null,
        reason: "not-accessible",
      };
    }
  }

  return {
    mapping: {
      remoteName: selectedRemote.name,
      owner: selectedRemote.parsed.owner,
      repo: selectedRemote.parsed.repo,
      fullName: selectedRemote.parsed.slug,
    },
    reason: null,
  };
}
