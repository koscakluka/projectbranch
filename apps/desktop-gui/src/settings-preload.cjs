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

contextBridge.exposeInMainWorld("settingsApi", {
  getRootPaths: () => ipcRenderer.invoke("roots:get"),
  addRootFolders: () => ipcRenderer.invoke("roots:add"),
  onRootPathsChanged,
});
