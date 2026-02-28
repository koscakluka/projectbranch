import test from "node:test";
import assert from "node:assert/strict";

import { BranchService } from "../src/branch-service.js";

test("switches branch and returns updated context", async () => {
  const state = { current: "main" };

  const gitPort = {
    async getCurrentBranch() {
      return state.current;
    },
    async listBranches() {
      return [
        { name: "main", isCurrent: state.current === "main" },
        { name: "planning", isCurrent: state.current === "planning" },
      ];
    },
    async switchBranch(_repoPath, branchName) {
      state.current = branchName;
    },
    async getRemotes() {
      return [];
    },
  };

  const service = new BranchService({ gitPort });
  const switched = await service.switch("/fake/repo", "planning");
  assert.equal(switched.activeBranch, "planning");
  assert.equal(switched.branches.find((branch) => branch.name === "planning").isCurrent, true);
});
