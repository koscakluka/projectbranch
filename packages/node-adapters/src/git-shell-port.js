import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function runGit(repositoryPath, args) {
  const { stdout } = await execFileAsync("git", ["-C", repositoryPath, ...args]);
  return stdout.trim();
}

export function createGitShellPort() {
  return {
    async getCurrentBranch(repositoryPath) {
      return runGit(repositoryPath, ["branch", "--show-current"]);
    },

    async listBranches(repositoryPath) {
      const output = await runGit(repositoryPath, ["branch", "--format", "%(refname:short)|%(HEAD)"]);
      if (!output) {
        return [];
      }

      return output
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [name, headFlag] = line.split("|");
          return {
            name,
            isCurrent: headFlag?.trim() === "*",
          };
        });
    },

    async switchBranch(repositoryPath, branchName) {
      await runGit(repositoryPath, ["checkout", branchName]);
    },

    async getRemotes(repositoryPath) {
      const output = await runGit(repositoryPath, ["remote", "-v"]);
      if (!output) {
        return [];
      }

      const seenNames = new Set();
      const remotes = [];

      for (const line of output.split("\n")) {
        const [name, url, kind] = line.trim().split(/\s+/);
        if (!name || !url || !kind?.includes("(fetch)")) {
          continue;
        }

        if (seenNames.has(name)) {
          continue;
        }

        seenNames.add(name);
        remotes.push({ name, url });
      }

      return remotes;
    },
  };
}
