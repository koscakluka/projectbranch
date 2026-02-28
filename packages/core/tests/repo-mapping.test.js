import test from "node:test";
import assert from "node:assert/strict";

import { mapLocalRepositoryToGitHub, parseGitHubRemote } from "../src/repo-mapping.js";

test("parses common GitHub remote URL formats", () => {
  const httpsRemote = parseGitHubRemote("https://github.com/acme/planning.git");
  const sshRemote = parseGitHubRemote("git@github.com:acme/planning.git");

  assert.deepEqual(httpsRemote, { owner: "acme", repo: "planning", slug: "acme/planning" });
  assert.deepEqual(sshRemote, { owner: "acme", repo: "planning", slug: "acme/planning" });
});

test("maps local repo when remote is accessible", () => {
  const result = mapLocalRepositoryToGitHub({
    remotes: [
      { name: "origin", url: "git@github.com:acme/planning.git" },
      { name: "upstream", url: "https://github.com/org/base.git" },
    ],
    accessibleRepositories: [{ fullName: "acme/planning" }],
  });

  assert.equal(result.reason, null);
  assert.equal(result.mapping.fullName, "acme/planning");
});

test("returns not-accessible when remote cannot be reached by account", () => {
  const result = mapLocalRepositoryToGitHub({
    remotes: [{ name: "origin", url: "git@github.com:acme/private-repo.git" }],
    accessibleRepositories: [{ fullName: "acme/public-repo" }],
  });

  assert.equal(result.mapping, null);
  assert.equal(result.reason, "not-accessible");
});
