import test from "node:test";
import assert from "node:assert/strict";

import { ProjectCatalogService } from "../src/project-catalog-service.js";

function createFsPort({ files = {} } = {}) {
  const store = new Map(Object.entries(files));

  return {
    async readDirectory() {
      return [];
    },
    async exists(targetPath) {
      return store.has(targetPath);
    },
    async isDirectory() {
      return false;
    },
    async isFile(targetPath) {
      return store.has(targetPath);
    },
    async readText(targetPath) {
      if (!store.has(targetPath)) {
        throw new Error("missing file");
      }

      return store.get(targetPath);
    },
    async writeText() {},
    async ensureDirectory() {},
  };
}

function createDiscoveryResult(overrides) {
  return {
    rootPath: "/Users/me/efforts",
    repositoryPath: "/Users/me/efforts/repo/main",
    docsPath: "/Users/me/efforts/repo/main/docs/project",
    hasProjectDocs: true,
    hasReadme: true,
    git: {
      hasMetadata: true,
      isWorktree: false,
      metadataPath: "/Users/me/efforts/repo/main/.git",
      metadataType: "directory",
    },
    ...overrides,
  };
}

test("groups multiple worktrees into one project and defaults to worktree with README", async () => {
  const worktrees = [
    createDiscoveryResult({
      repositoryPath: "/Users/me/efforts/repo/feature-worktree",
      docsPath: "/Users/me/efforts/repo/feature-worktree/docs/project",
      hasProjectDocs: true,
      hasReadme: true,
      git: {
        hasMetadata: true,
        isWorktree: true,
        metadataPath: "/Users/me/efforts/repo/feature-worktree/.git",
        metadataType: "file",
      },
    }),
    createDiscoveryResult({
      repositoryPath: "/Users/me/efforts/repo/main",
      docsPath: "/Users/me/efforts/repo/main/docs/project",
      hasProjectDocs: false,
      hasReadme: false,
    }),
  ];

  const discoveryService = {
    async discover() {
      return worktrees;
    },
  };

  const gitPort = {
    async getCurrentBranch(repositoryPath) {
      if (repositoryPath.endsWith("feature-worktree")) {
        return "feature/docs-cleanup";
      }

      return "main";
    },
    async listBranches() {
      return [];
    },
    async switchBranch() {},
    async getRemotes() {
      return [];
    },
    async getCommonDirectory() {
      return "/Users/me/efforts/repo/.git";
    },
    async isBareRepository() {
      return false;
    },
  };

  const service = new ProjectCatalogService({ discoveryService, gitPort });
  const grouped = await service.discoverGrouped(["/Users/me/efforts"]);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].projectPath, "/Users/me/efforts/repo");
  assert.equal(grouped[0].defaultWorktreePath, "/Users/me/efforts/repo/feature-worktree");
  assert.equal(grouped[0].worktrees.length, 2);
  assert.equal(grouped[0].worktrees.filter((worktree) => worktree.isDefault).length, 1);
});

test("filters out bare repositories from grouped results", async () => {
  const discoveryService = {
    async discover() {
      return [
        createDiscoveryResult({
          repositoryPath: "/tmp/bare-repo",
          docsPath: "/tmp/bare-repo/docs/project",
          hasProjectDocs: false,
          hasReadme: false,
        }),
      ];
    },
  };

  const gitPort = {
    async getCurrentBranch() {
      return "main";
    },
    async listBranches() {
      return [];
    },
    async switchBranch() {},
    async getRemotes() {
      return [];
    },
    async getCommonDirectory() {
      return "/tmp/bare-repo/.git";
    },
    async isBareRepository() {
      return true;
    },
  };

  const service = new ProjectCatalogService({ discoveryService, gitPort });
  const grouped = await service.discoverGrouped(["/tmp"]);

  assert.equal(grouped.length, 0);
});

test("falls back to repository path identity when git identity lookup fails", async () => {
  const discoveryService = {
    async discover() {
      return [
        createDiscoveryResult({
          repositoryPath: "/tmp/a",
          docsPath: "/tmp/a/docs/project",
        }),
      ];
    },
  };

  const gitPort = {
    async getCurrentBranch() {
      return "main";
    },
    async listBranches() {
      return [];
    },
    async switchBranch() {},
    async getRemotes() {
      return [];
    },
    async getCommonDirectory() {
      throw new Error("not available");
    },
    async isBareRepository() {
      return false;
    },
  };

  const service = new ProjectCatalogService({ discoveryService, gitPort });
  const grouped = await service.discoverGrouped(["/tmp"]);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].projectId, "/tmp/a");
  assert.equal(grouped[0].projectPath, "/tmp/a");
});

test("prefers README title for display name and strips .bare path suffix", async () => {
  const repositoryPath = "/Users/me/efforts/cloudbis-project-x/main";
  const docsPath = `${repositoryPath}/docs/project`;
  const readmePath = `${docsPath}/README.md`;

  const discoveryService = {
    async discover() {
      return [
        createDiscoveryResult({
          repositoryPath,
          docsPath,
          hasProjectDocs: true,
          hasReadme: true,
        }),
      ];
    },
  };

  const gitPort = {
    async getCurrentBranch() {
      return "main";
    },
    async listBranches() {
      return [];
    },
    async switchBranch() {},
    async getRemotes() {
      return [{ name: "origin", url: "git@github.com:acme/cloudbis-project-x.git" }];
    },
    async getCommonDirectory() {
      return "/Users/me/efforts/cloudbis-project-x/.bare";
    },
    async isBareRepository() {
      return false;
    },
  };

  const fsPort = createFsPort({
    files: {
      [readmePath]: "# Cloudbis Project X\n",
    },
  });

  const service = new ProjectCatalogService({ discoveryService, gitPort, fsPort });
  const grouped = await service.discoverGrouped(["/Users/me/efforts"]);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].displayName, "Cloudbis Project X");
  assert.equal(grouped[0].projectPath, "/Users/me/efforts/cloudbis-project-x");
});
