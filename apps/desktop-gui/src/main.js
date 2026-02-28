import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, dialog, ipcMain } from "electron";
import {
  BranchService,
  DiscoveryService,
  DocumentService,
  mapLocalRepositoryToGitHub,
} from "@projectbranch/core";
import { createGitShellPort, createNodeFileSystemPort } from "@projectbranch/node-adapters";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

const fsPort = createNodeFileSystemPort();
const gitPort = createGitShellPort();

const discoveryService = new DiscoveryService({ fsPort });
const documentService = new DocumentService({ fsPort });
const branchService = new BranchService({ gitPort });

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    title: "ProjectBranch Desktop POC",
    backgroundColor: "#f4f8f3",
    webPreferences: {
      preload: path.join(currentDirPath, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadFile(path.join(currentDirPath, "renderer", "index.html"));
}

ipcMain.handle("folders:pick", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "multiSelections", "createDirectory"],
    title: "Select one or more workspace root folders",
  });

  if (result.canceled) {
    return [];
  }

  return result.filePaths;
});

ipcMain.handle("projects:discover", async (_event, rootPaths) => {
  return discoveryService.discover(rootPaths);
});

ipcMain.handle("docs:read", async (_event, docsPath, fileName = "README.md") => {
  return documentService.read(docsPath, fileName);
});

ipcMain.handle("docs:save", async (_event, docsPath, contents, fileName = "README.md") => {
  return documentService.write(docsPath, contents, fileName);
});

ipcMain.handle("branch:get-context", async (_event, repositoryPath) => {
  return branchService.getContext(repositoryPath);
});

ipcMain.handle("branch:switch", async (_event, repositoryPath, branchName) => {
  return branchService.switch(repositoryPath, branchName);
});

ipcMain.handle("repo:get-mapping", async (_event, repositoryPath) => {
  const remotes = await branchService.getRemotes(repositoryPath);
  return mapLocalRepositoryToGitHub({ remotes });
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
