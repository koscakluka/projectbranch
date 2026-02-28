import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { createGitShellPort } from "@projectbranch/node-adapters";

const execFileAsync = promisify(execFile);

async function run(command, args, cwd) {
  await execFileAsync(command, args, { cwd });
}

async function createRepository() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "projectbranch-git-port-"));
  await run("git", ["init", "-b", "main"], tempRoot);
  await run("git", ["config", "user.email", "tests@example.com"], tempRoot);
  await run("git", ["config", "user.name", "Tests"], tempRoot);
  await fs.writeFile(path.join(tempRoot, "README.md"), "# Test\n", "utf8");
  await run("git", ["add", "."], tempRoot);
  await run("git", ["commit", "-m", "Initial commit"], tempRoot);
  await run("git", ["checkout", "-b", "planning"], tempRoot);
  await run("git", ["checkout", "main"], tempRoot);
  await run("git", ["remote", "add", "origin", "git@github.com:acme/projectbranch.git"], tempRoot);
  return tempRoot;
}

test("lists and switches branches using git shell adapter", async () => {
  const repoPath = await createRepository();
  const gitPort = createGitShellPort();

  try {
    const current = await gitPort.getCurrentBranch(repoPath);
    assert.equal(current, "main");

    const branches = await gitPort.listBranches(repoPath);
    assert.ok(branches.some((branch) => branch.name === "planning"));

    await gitPort.switchBranch(repoPath, "planning");
    const switched = await gitPort.getCurrentBranch(repoPath);
    assert.equal(switched, "planning");

    const remotes = await gitPort.getRemotes(repoPath);
    assert.deepEqual(remotes, [{ name: "origin", url: "git@github.com:acme/projectbranch.git" }]);
  } finally {
    await fs.rm(repoPath, { recursive: true, force: true });
  }
});
