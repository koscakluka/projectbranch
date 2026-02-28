import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { DiscoveryService } from "../src/discovery-service.js";
import { createNodeFsTestPort } from "./helpers/node-fs-test-port.js";

async function setupFixture() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "projectbranch-discovery-"));
  const repoAlpha = path.join(tempRoot, "repo-alpha");
  const grouped = path.join(tempRoot, "grouped");
  const repoNested = path.join(grouped, "repo-nested");
  const repoNoDocs = path.join(tempRoot, "repo-no-docs");

  await fs.mkdir(path.join(repoAlpha, "docs", "project"), { recursive: true });
  await fs.writeFile(path.join(repoAlpha, "docs", "project", "README.md"), "# Alpha\n", "utf8");
  await fs.mkdir(path.join(repoAlpha, ".git"), { recursive: true });

  await fs.mkdir(path.join(repoNested, "docs", "project"), { recursive: true });
  await fs.writeFile(path.join(repoNested, "docs", "project", "README.md"), "# Nested\n", "utf8");
  await fs.writeFile(path.join(repoNested, ".git"), "gitdir: /tmp/fake-worktree\n", "utf8");

  await fs.mkdir(path.join(repoNoDocs, ".git"), { recursive: true });

  return {
    tempRoot,
    cleanup: () => fs.rm(tempRoot, { recursive: true, force: true }),
  };
}

test("discovers docs/project in direct and one nested level", async () => {
  const fixture = await setupFixture();
  const service = new DiscoveryService({
    fsPort: createNodeFsTestPort(),
    nestedDepth: 1,
  });

  try {
    const projects = await service.discover([fixture.tempRoot]);
    assert.equal(projects.length, 2);
    assert.equal(projects.every((project) => project.hasProjectDocs), true);

    const nestedProject = projects.find((project) => project.repositoryPath.endsWith("repo-nested"));
    assert.ok(nestedProject);
    assert.equal(nestedProject.git.hasMetadata, true);
    assert.equal(nestedProject.git.isWorktree, true);
  } finally {
    await fixture.cleanup();
  }
});

test("can include git repositories without docs/project", async () => {
  const fixture = await setupFixture();
  const service = new DiscoveryService({
    fsPort: createNodeFsTestPort(),
    nestedDepth: 1,
    includeWithoutDocs: true,
  });

  try {
    const projects = await service.discover([fixture.tempRoot]);
    assert.equal(projects.length, 3);

    const withoutDocs = projects.find((project) => project.repositoryPath.endsWith("repo-no-docs"));
    assert.ok(withoutDocs);
    assert.equal(withoutDocs.hasProjectDocs, false);
    assert.equal(withoutDocs.hasReadme, false);
  } finally {
    await fixture.cleanup();
  }
});
