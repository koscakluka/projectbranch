import fs from "node:fs/promises";
import path from "node:path";

export function createNodeFsTestPort() {
  return {
    async readDirectory(targetPath) {
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      return entries.map((entry) => ({
        name: entry.name,
        path: path.join(targetPath, entry.name),
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
      }));
    },
    async exists(targetPath) {
      try {
        await fs.access(targetPath);
        return true;
      } catch {
        return false;
      }
    },
    async isDirectory(targetPath) {
      try {
        const stat = await fs.stat(targetPath);
        return stat.isDirectory();
      } catch {
        return false;
      }
    },
    async isFile(targetPath) {
      try {
        const stat = await fs.stat(targetPath);
        return stat.isFile();
      } catch {
        return false;
      }
    },
    async readText(targetPath) {
      return fs.readFile(targetPath, "utf8");
    },
    async writeText(targetPath, contents) {
      await fs.writeFile(targetPath, contents, "utf8");
    },
    async ensureDirectory(targetPath) {
      await fs.mkdir(targetPath, { recursive: true });
    },
  };
}
