import path from "node:path";

/**
 * @typedef {import('./ports.js').FileSystemPort} FileSystemPort
 */

export class DocumentService {
  /**
   * @param {{ fsPort: FileSystemPort, defaultFileName?: string }} params
   */
  constructor({ fsPort, defaultFileName = "README.md" }) {
    this.fsPort = fsPort;
    this.defaultFileName = defaultFileName;
  }

  resolveFilePath(projectDocsPath, fileName = this.defaultFileName) {
    return path.join(projectDocsPath, fileName);
  }

  async read(projectDocsPath, fileName = this.defaultFileName) {
    const targetPath = this.resolveFilePath(projectDocsPath, fileName);
    if (!(await this.fsPort.isFile(targetPath))) {
      throw new Error(`Document does not exist: ${targetPath}`);
    }

    return this.fsPort.readText(targetPath);
  }

  async write(projectDocsPath, contents, fileName = this.defaultFileName) {
    await this.fsPort.ensureDirectory(projectDocsPath);
    const targetPath = this.resolveFilePath(projectDocsPath, fileName);
    await this.fsPort.writeText(targetPath, contents);
    return targetPath;
  }

  async append(projectDocsPath, appendText, fileName = this.defaultFileName) {
    const targetPath = this.resolveFilePath(projectDocsPath, fileName);
    const existingText = (await this.fsPort.isFile(targetPath))
      ? await this.fsPort.readText(targetPath)
      : "";

    const nextText = `${existingText}${appendText}`;
    await this.write(projectDocsPath, nextText, fileName);
    return nextText;
  }
}
