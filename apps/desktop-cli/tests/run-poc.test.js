import test from "node:test";
import assert from "node:assert/strict";

import { runPoc } from "../src/run-poc.mjs";

test("runs end-to-end POC checks successfully", async () => {
  const result = await runPoc();

  assert.equal(result.success, true);
  assert.equal(result.lines.length, 5);
  assert.ok(result.lines.every((line) => line.startsWith("[PASS]")));
});
