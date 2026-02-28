import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { DocumentService } from "../src/document-service.js";
import { createNodeFsTestPort } from "./helpers/node-fs-test-port.js";

test("writes, reads, and appends document content", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "projectbranch-docs-"));
  const docsPath = path.join(tempRoot, "repo", "docs", "project");
  const service = new DocumentService({ fsPort: createNodeFsTestPort() });

  try {
    await service.write(docsPath, "# Plan\n");
    await service.append(docsPath, "- Item 1\n");

    const content = await service.read(docsPath);
    assert.match(content, /# Plan/);
    assert.match(content, /- Item 1/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
