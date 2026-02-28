import test from "node:test";
import assert from "node:assert/strict";

import {
  docsSetupLabel,
  mappingLabel,
  projectLabel,
  projectSetupSummary,
  worktreeLabel,
} from "../src/renderer/view-model.js";

test("projectLabel prefers root-relative repository path", () => {
  assert.equal(
    projectLabel({
      rootPath: "/Users/me/efforts",
      projectPath: "/Users/me/efforts/projectbranch",
    }),
    "projectbranch",
  );
});

test("projectLabel prefers provided display name", () => {
  assert.equal(
    projectLabel({
      displayName: "Cloudbis Project X",
      rootPath: "/Users/me/efforts",
      projectPath: "/Users/me/efforts/cloudbis-project-x",
    }),
    "Cloudbis Project X",
  );
});

test("worktreeLabel prefers branch name and marks default", () => {
  const label = worktreeLabel(
    {
      projectPath: "/Users/me/efforts/projectbranch",
    },
    {
      repositoryPath: "/Users/me/efforts/projectbranch-main",
      branchName: "main",
      isDefault: true,
    },
  );

  assert.equal(label, "main (default)");
});

test("docsSetupLabel highlights missing docs setup", () => {
  assert.equal(docsSetupLabel({ hasProjectDocs: false, hasReadme: false }), "Missing docs/project");
  assert.equal(docsSetupLabel({ hasProjectDocs: true, hasReadme: false }), "Missing README.md");
  assert.equal(docsSetupLabel({ hasProjectDocs: true, hasReadme: true }), "Docs ready");
});

test("projectSetupSummary keeps setup messaging concise", () => {
  const mixed = projectSetupSummary({
    worktrees: [
      { hasProjectDocs: true, hasReadme: true },
      { hasProjectDocs: false, hasReadme: false },
      { hasProjectDocs: true, hasReadme: false },
    ],
  });

  const ready = projectSetupSummary({
    worktrees: [
      { hasProjectDocs: true, hasReadme: true },
      { hasProjectDocs: true, hasReadme: true },
    ],
  });

  const missingAll = projectSetupSummary({
    worktrees: [
      { hasProjectDocs: false, hasReadme: false },
      { hasProjectDocs: false, hasReadme: false },
    ],
  });

  assert.equal(mixed, "Some worktrees need docs setup");
  assert.equal(ready, "Docs ready");
  assert.equal(missingAll, "Missing docs/project");
});

test("mappingLabel renders mapped repository details", () => {
  const text = mappingLabel({
    mapping: {
      fullName: "acme/repo-one",
      remoteName: "origin",
    },
    reason: null,
  });

  assert.match(text, /acme\/repo-one/);
  assert.match(text, /origin/);
});
