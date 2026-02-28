const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  pickFolders: () => ipcRenderer.invoke("folders:pick"),
  discoverProjects: (rootPaths) => ipcRenderer.invoke("projects:discover", rootPaths),
  readDocument: (docsPath, fileName) => ipcRenderer.invoke("docs:read", docsPath, fileName),
  saveDocument: (docsPath, contents, fileName) => ipcRenderer.invoke("docs:save", docsPath, contents, fileName),
  getBranchContext: (repositoryPath) => ipcRenderer.invoke("branch:get-context", repositoryPath),
  switchBranch: (repositoryPath, branchName) => ipcRenderer.invoke("branch:switch", repositoryPath, branchName),
  getRepoMapping: (repositoryPath) => ipcRenderer.invoke("repo:get-mapping", repositoryPath),
});
