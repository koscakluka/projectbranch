import test from "node:test";
import assert from "node:assert/strict";

import { mappingLabel, projectLabel } from "../src/renderer/view-model.js";

test("projectLabel uses last repository path segment", () => {
  assert.equal(projectLabel({ repositoryPath: "/tmp/work/repo-one" }), "repo-one");
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
