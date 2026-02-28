const { contextBridge, ipcRenderer } = require("electron");

function onRootPathsChanged(callback) {
  const handler = (_event, rootPaths) => {
    callback(rootPaths);
  };

  ipcRenderer.on("roots:changed", handler);
  return () => {
    ipcRenderer.removeListener("roots:changed", handler);
  };
}

contextBridge.exposeInMainWorld("desktopApi", {
  openSettingsWindow: () => ipcRenderer.invoke("settings:open"),
  getRootPaths: () => ipcRenderer.invoke("roots:get"),
  onRootPathsChanged,
  discoverProjects: (rootPaths) => ipcRenderer.invoke("projects:discover", rootPaths),
  readDocument: (docsPath, fileName) => ipcRenderer.invoke("docs:read", docsPath, fileName),
  saveDocument: (docsPath, contents, fileName) => ipcRenderer.invoke("docs:save", docsPath, contents, fileName),
  getBranchContext: (repositoryPath) => ipcRenderer.invoke("branch:get-context", repositoryPath),
  switchBranch: (repositoryPath, branchName) => ipcRenderer.invoke("branch:switch", repositoryPath, branchName),
  getRepoMapping: (repositoryPath) => ipcRenderer.invoke("repo:get-mapping", repositoryPath),
});
