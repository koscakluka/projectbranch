import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  BranchService,
  DiscoveryService,
  DocumentService,
  GitHubSessionService,
  mapLocalRepositoryToGitHub,
} from "@projectbranch/core";
import { createGitShellPort, createNodeFileSystemPort } from "@projectbranch/node-adapters";
import { createMockGitHubPort } from "./mock-github-port.js";

const execFileAsync = promisify(execFile);

async function run(command, args, cwd) {
  await execFileAsync(command, args, { cwd });
}

async function initializeGitRepository(repositoryPath, remoteUrl) {
  await run("git", ["init", "-b", "main"], repositoryPath);
  await run("git", ["config", "user.email", "poc@example.com"], repositoryPath);
  await run("git", ["config", "user.name", "POC Runner"], repositoryPath);
  await run("git", ["add", "."], repositoryPath);
  await run("git", ["commit", "-m", "Initial docs"], repositoryPath);
  await run("git", ["checkout", "-b", "planning"], repositoryPath);
  await run("git", ["checkout", "main"], repositoryPath);
  await run("git", ["remote", "add", "origin", remoteUrl], repositoryPath);
}

async function createFixture() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "projectbranch-poc-"));
  const workspaceRoot = path.join(tempRoot, "workspace");

  const repoAlpha = path.join(workspaceRoot, "repo-alpha");
  const repoNoDocs = path.join(workspaceRoot, "repo-no-docs");
  const groupedRoot = path.join(workspaceRoot, "grouped");
  const repoWorktreeLike = path.join(groupedRoot, "repo-worktree");

  await fs.mkdir(path.join(repoAlpha, "docs", "project"), { recursive: true });
  await fs.writeFile(path.join(repoAlpha, "docs", "project", "README.md"), "# Alpha Plan\n", "utf8");

  await fs.mkdir(repoNoDocs, { recursive: true });

  await fs.mkdir(path.join(repoWorktreeLike, "docs", "project"), { recursive: true });
  await fs.writeFile(path.join(repoWorktreeLike, "docs", "project", "README.md"), "# Worktree Plan\n", "utf8");
  await fs.writeFile(path.join(repoWorktreeLike, ".git"), "gitdir: /tmp/worktree/.git\n", "utf8");

  await initializeGitRepository(repoAlpha, "https://github.com/acme/repo-alpha.git");

  return {
    tempRoot,
    workspaceRoot,
    repoAlpha,
    repoWorktreeLike,
    cleanup: () => fs.rm(tempRoot, { recursive: true, force: true }),
  };
}

function statusLine(label, passed, detail) {
  const state = passed ? "PASS" : "FAIL";
  return `[${state}] ${label}: ${detail}`;
}

export async function runPoc() {
  const fixture = await createFixture();

  const fsPort = createNodeFileSystemPort();
  const gitPort = createGitShellPort();

  const discoveryService = new DiscoveryService({ fsPort });
  const documentService = new DocumentService({ fsPort });
  const branchService = new BranchService({ gitPort });
  const gitHubSession = new GitHubSessionService({
    gitHubPort: createMockGitHubPort([{ fullName: "acme/repo-alpha" }]),
  });

  const lines = [];
  let success = true;

  try {
    const discovered = await discoveryService.discover([fixture.workspaceRoot]);

    const hasRepoAlpha = discovered.some((project) => project.repositoryPath === fixture.repoAlpha);
    const hasWorktreeLike = discovered.some(
      (project) => project.repositoryPath === fixture.repoWorktreeLike && project.git.isWorktree,
    );

    lines.push(
      statusLine(
        "Phase 1 discovery",
        hasRepoAlpha && hasWorktreeLike,
        `found ${discovered.length} docs project(s) with worktree metadata support`,
      ),
    );
    success = success && hasRepoAlpha && hasWorktreeLike;

    const alphaProject = discovered.find((project) => project.repositoryPath === fixture.repoAlpha);
    const before = await documentService.read(alphaProject.docsPath);
    await documentService.append(alphaProject.docsPath, "- Added by POC run\n");
    const after = await documentService.read(alphaProject.docsPath);
    const phase2Passed = before !== after && after.includes("Added by POC run");

    lines.push(statusLine("Phase 2 docs workflow", phase2Passed, "read/edit/save completed"));
    success = success && phase2Passed;

    const accessibleRepos = await gitHubSession.loginAndListRepositories();
    const remotes = await branchService.getRemotes(fixture.repoAlpha);
    const mapping = mapLocalRepositoryToGitHub({
      remotes,
      accessibleRepositories: accessibleRepos,
    });
    const phase3Passed = mapping.mapping?.fullName === "acme/repo-alpha";

    lines.push(statusLine("Phase 3 GitHub mapping", phase3Passed, mapping.mapping?.fullName ?? mapping.reason));
    success = success && phase3Passed;

    const beforeSwitch = await branchService.getContext(fixture.repoAlpha);
    await branchService.switch(fixture.repoAlpha, "planning");
    const afterSwitch = await branchService.getContext(fixture.repoAlpha);
    await branchService.switch(fixture.repoAlpha, "main");

    const phase4Passed = beforeSwitch.activeBranch === "main" && afterSwitch.activeBranch === "planning";
    lines.push(statusLine("Phase 4 branch switching", phase4Passed, `${beforeSwitch.activeBranch} -> ${afterSwitch.activeBranch}`));
    success = success && phase4Passed;

    lines.push(statusLine("Phase 5 end-to-end", success, "all phase checks completed in one run"));
  } finally {
    await fixture.cleanup();
  }

  return {
    success,
    lines,
  };
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentPath = fileURLToPath(import.meta.url);

if (entryPath && currentPath === entryPath) {
  const result = await runPoc();
  for (const line of result.lines) {
    process.stdout.write(`${line}\n`);
  }

  if (!result.success) {
    process.exitCode = 1;
  }
}
