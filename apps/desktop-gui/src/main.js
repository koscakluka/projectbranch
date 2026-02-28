import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import {
  BranchService,
  DiscoveryService,
  DocumentService,
  ProjectCatalogService,
  mapLocalRepositoryToGitHub,
} from "@projectbranch/core";
import { createGitShellPort, createNodeFileSystemPort } from "@projectbranch/node-adapters";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

const fsPort = createNodeFileSystemPort();
const gitPort = createGitShellPort();

const discoveryService = new DiscoveryService({
  fsPort,
  includeWithoutDocs: true,
});
const projectCatalogService = new ProjectCatalogService({
  discoveryService,
  gitPort,
  fsPort,
});
const documentService = new DocumentService({ fsPort });
const branchService = new BranchService({ gitPort });

let mainWindow = null;
let settingsWindow = null;
let rootPaths = [];

function uniquePaths(paths) {
  return [...new Set((paths || []).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function broadcastRootPaths() {
  const payload = [...rootPaths];
  for (const windowRef of [mainWindow, settingsWindow]) {
    if (windowRef && !windowRef.isDestroyed()) {
      windowRef.webContents.send("roots:changed", payload);
    }
  }
}

function addRootPaths(paths) {
  rootPaths = uniquePaths([...rootPaths, ...(paths || [])]);
  broadcastRootPaths();
  return rootPaths;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
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

  mainWindow.loadFile(path.join(currentDirPath, "renderer", "index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    width: 980,
    height: 640,
    minWidth: 840,
    minHeight: 560,
    title: "ProjectBranch Settings",
    backgroundColor: "#11151a",
    parent: mainWindow ?? undefined,
    webPreferences: {
      preload: path.join(currentDirPath, "settings-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  settingsWindow.loadFile(path.join(currentDirPath, "settings", "index.html"));
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

ipcMain.handle("settings:open", () => {
  createSettingsWindow();
  return true;
});

ipcMain.handle("roots:get", () => {
  return [...rootPaths];
});

ipcMain.handle("roots:add", async (event) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);

  const result = await dialog.showOpenDialog(senderWindow ?? mainWindow ?? undefined, {
    properties: ["openDirectory", "multiSelections", "createDirectory"],
    title: "Add workspace root folders",
  });

  if (result.canceled) {
    return [...rootPaths];
  }

  return addRootPaths(result.filePaths);
});

ipcMain.handle("projects:discover", async (_event, requestedRootPaths = []) => {
  const targets = uniquePaths(requestedRootPaths.length > 0 ? requestedRootPaths : rootPaths);
  if (targets.length === 0) {
    return [];
  }

  return projectCatalogService.discoverGrouped(targets);
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

ipcMain.handle("external:open", async (_event, url) => {
  if (typeof url !== "string" || !(url.startsWith("https://") || url.startsWith("http://"))) {
    throw new Error("Invalid external URL");
  }

  await shell.openExternal(url);
  return true;
});

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
