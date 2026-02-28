const settingsApi = window.settingsApi;

const addRootsEl = document.getElementById("addRoots");
const closeSettingsEl = document.getElementById("closeSettings");
const statusEl = document.getElementById("status");
const rootsListEl = document.getElementById("rootsList");

function setStatus(message, tone = "") {
  statusEl.textContent = message;
  statusEl.className = `status${tone ? ` ${tone}` : ""}`;
}

function renderRootPaths(rootPaths) {
  rootsListEl.innerHTML = "";

  if (!rootPaths || rootPaths.length === 0) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = "No workspace folders configured yet.";
    rootsListEl.append(item);
    return;
  }

  for (const rootPath of rootPaths) {
    const item = document.createElement("li");
    item.className = "root-item";
    item.textContent = rootPath;
    rootsListEl.append(item);
  }
}

async function loadRootPaths() {
  if (!settingsApi) {
    setStatus("Settings bridge failed to load.", "error");
    addRootsEl.disabled = true;
    return;
  }

  const rootPaths = await settingsApi.getRootPaths();
  renderRootPaths(rootPaths);
}

addRootsEl.addEventListener("click", async () => {
  try {
    setStatus("Opening folder picker...");
    const nextRootPaths = await settingsApi.addRootFolders();
    renderRootPaths(nextRootPaths);
    setStatus("Workspace folders updated.", "success");
  } catch (error) {
    setStatus(`Failed to add folders: ${error.message}`, "error");
  }
});

closeSettingsEl.addEventListener("click", () => {
  window.close();
});

if (settingsApi) {
  settingsApi.onRootPathsChanged((rootPaths) => {
    renderRootPaths(rootPaths);
    setStatus("Workspace folders synchronized.", "success");
  });
}

await loadRootPaths();
