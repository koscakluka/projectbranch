import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createNodeFileSystemPort } from "../src/fs-port.js";

test("reads and writes text through node fs adapter", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "projectbranch-fs-port-"));
  const targetDir = path.join(tempRoot, "docs", "project");
  const targetFile = path.join(targetDir, "README.md");
  const fsPort = createNodeFileSystemPort();

  try {
    await fsPort.ensureDirectory(targetDir);
    await fsPort.writeText(targetFile, "# Adapter Test\n");
    const contents = await fsPort.readText(targetFile);
    assert.equal(contents, "# Adapter Test\n");

    const entries = await fsPort.readDirectory(targetDir);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].name, "README.md");
    assert.equal(await fsPort.isFile(targetFile), true);
    assert.equal(await fsPort.isDirectory(targetDir), true);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
