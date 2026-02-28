import { mappingLabel, projectLabel } from "./view-model.js";

const desktopApi = window.desktopApi;

const state = {
  rootPaths: [],
  projects: [],
  selectedProject: null,
  editorText: "",
  originalText: "",
};

const statusEl = document.getElementById("status");
const rootsSummaryEl = document.getElementById("rootsSummary");
const projectsEl = document.getElementById("projects");
const editorMetaEl = document.getElementById("editorMeta");
const editorEl = document.getElementById("editor");
const saveDocEl = document.getElementById("saveDoc");
const activeBranchEl = document.getElementById("activeBranch");
const branchListEl = document.getElementById("branchList");
const switchBranchEl = document.getElementById("switchBranch");
const mappingStatusEl = document.getElementById("mappingStatus");
const pickFoldersEl = document.getElementById("pickFolders");
const discoverProjectsEl = document.getElementById("discoverProjects");
const refreshProjectEl = document.getElementById("refreshProject");

function hasUnsavedChanges() {
  return state.editorText !== state.originalText;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function renderRootsSummary() {
  if (state.rootPaths.length === 0) {
    rootsSummaryEl.textContent = "No root folders selected yet.";
    return;
  }

  rootsSummaryEl.textContent = `Selected root folders: ${state.rootPaths.join(" | ")}`;
}

function renderProjects() {
  projectsEl.innerHTML = "";

  if (state.projects.length === 0) {
    const empty = document.createElement("li");
    empty.className = "project-item";
    empty.textContent = "No docs projects discovered yet.";
    projectsEl.append(empty);
    return;
  }

  for (const project of state.projects) {
    const item = document.createElement("li");
    item.className = "project-item";
    if (state.selectedProject?.repositoryPath === project.repositoryPath) {
      item.classList.add("active");
    }

    const title = document.createElement("div");
    title.className = "project-title";
    title.textContent = projectLabel(project);
    item.append(title);

    const repoMeta = document.createElement("div");
    repoMeta.className = "project-meta";
    repoMeta.textContent = project.repositoryPath;
    item.append(repoMeta);

    const docsMeta = document.createElement("div");
    docsMeta.className = "project-meta";
    docsMeta.textContent = project.docsPath;
    item.append(docsMeta);

    const gitChip = document.createElement("span");
    gitChip.className = `chip${project.git.isWorktree ? " warn" : ""}`;
    gitChip.textContent = project.git.isWorktree ? "Worktree metadata" : "Repository metadata";
    item.append(gitChip);

    item.addEventListener("click", () => loadProject(project));
    projectsEl.append(item);
  }
}

function setEditorState(enabled) {
  editorEl.disabled = !enabled;
  saveDocEl.disabled = !enabled;
}

function setControlsEnabled(enabled) {
  pickFoldersEl.disabled = !enabled;
  discoverProjectsEl.disabled = !enabled;
  refreshProjectEl.disabled = !enabled;
}

function resetRightRail() {
  activeBranchEl.textContent = "No repository selected.";
  branchListEl.innerHTML = "";
  branchListEl.disabled = true;
  switchBranchEl.disabled = true;
  mappingStatusEl.textContent = "No repository selected.";
}

function renderBranchContext(branchContext) {
  activeBranchEl.textContent = `Active branch: ${branchContext.activeBranch || "(none)"}`;

  branchListEl.innerHTML = "";
  for (const branch of branchContext.branches) {
    const option = document.createElement("option");
    option.value = branch.name;
    option.textContent = branch.isCurrent ? `${branch.name} (current)` : branch.name;
    if (branch.isCurrent) {
      option.selected = true;
    }
    branchListEl.append(option);
  }

  branchListEl.disabled = branchContext.branches.length === 0;
  switchBranchEl.disabled = branchContext.branches.length === 0;
}

async function refreshProjectData(project, keepStatusMessage = false) {
  const [docText, branchContext, mappingResult] = await Promise.all([
    desktopApi.readDocument(project.docsPath, "README.md"),
    desktopApi.getBranchContext(project.repositoryPath),
    desktopApi.getRepoMapping(project.repositoryPath),
  ]);

  state.editorText = docText;
  state.originalText = docText;
  editorEl.value = docText;
  editorMetaEl.textContent = `Editing ${project.docsPath}/README.md`;
  setEditorState(true);

  renderBranchContext(branchContext);
  mappingStatusEl.textContent = mappingLabel(mappingResult);

  if (!keepStatusMessage) {
    setStatus(`Loaded ${projectLabel(project)}.`);
  }
}

async function loadProject(project) {
  if (state.selectedProject && hasUnsavedChanges()) {
    const proceed = window.confirm("You have unsaved changes. Switch projects and discard edits?");
    if (!proceed) {
      return;
    }
  }

  state.selectedProject = project;
  renderProjects();
  setStatus(`Loading ${projectLabel(project)}...`);

  try {
    await refreshProjectData(project);
  } catch (error) {
    setStatus(`Failed to load project: ${error.message}`, true);
  }
}

pickFoldersEl.addEventListener("click", async () => {
  try {
    const folders = await desktopApi.pickFolders();
    if (folders.length === 0) {
      setStatus("Folder selection canceled.");
      return;
    }

    const uniqueRoots = new Set([...state.rootPaths, ...folders]);
    state.rootPaths = [...uniqueRoots];
    renderRootsSummary();
    setStatus(`Added ${folders.length} folder(s). Discover docs projects when ready.`);
  } catch (error) {
    setStatus(`Failed to pick folders: ${error.message}`, true);
  }
});

discoverProjectsEl.addEventListener("click", async () => {
  if (state.rootPaths.length === 0) {
    setStatus("Pick at least one root folder first.", true);
    return;
  }

  try {
    setStatus("Discovering docs projects...");
    state.projects = await desktopApi.discoverProjects(state.rootPaths);

    if (state.projects.length === 0) {
      state.selectedProject = null;
      setEditorState(false);
      editorEl.value = "";
      editorMetaEl.textContent = "No docs projects found in selected roots.";
      resetRightRail();
      renderProjects();
      setStatus("Discovery complete: no matching docs/project folders found.");
      return;
    }

    const stillSelected = state.selectedProject
      ? state.projects.find((project) => project.repositoryPath === state.selectedProject.repositoryPath)
      : null;
    state.selectedProject = stillSelected ?? state.projects[0];

    renderProjects();
    await refreshProjectData(state.selectedProject, true);
    setStatus(`Discovery complete: found ${state.projects.length} project(s).`);
  } catch (error) {
    setStatus(`Discovery failed: ${error.message}`, true);
  }
});

refreshProjectEl.addEventListener("click", async () => {
  if (!state.selectedProject) {
    setStatus("Select a discovered project first.", true);
    return;
  }

  if (hasUnsavedChanges()) {
    const proceed = window.confirm("Refreshing discards unsaved edits. Continue?");
    if (!proceed) {
      return;
    }
  }

  try {
    setStatus(`Refreshing ${projectLabel(state.selectedProject)}...`);
    await refreshProjectData(state.selectedProject);
  } catch (error) {
    setStatus(`Refresh failed: ${error.message}`, true);
  }
});

editorEl.addEventListener("input", () => {
  state.editorText = editorEl.value;
  const marker = hasUnsavedChanges() ? " (unsaved changes)" : "";
  editorMetaEl.textContent = state.selectedProject
    ? `Editing ${state.selectedProject.docsPath}/README.md${marker}`
    : "Pick a project to load docs.";
});

saveDocEl.addEventListener("click", async () => {
  if (!state.selectedProject) {
    return;
  }

  try {
    setStatus("Saving README.md...");
    await desktopApi.saveDocument(state.selectedProject.docsPath, state.editorText, "README.md");
    state.originalText = state.editorText;
    editorMetaEl.textContent = `Editing ${state.selectedProject.docsPath}/README.md`;
    setStatus("README.md saved.");
  } catch (error) {
    setStatus(`Save failed: ${error.message}`, true);
  }
});

switchBranchEl.addEventListener("click", async () => {
  if (!state.selectedProject || !branchListEl.value) {
    return;
  }

  if (hasUnsavedChanges()) {
    const proceed = window.confirm("Switching branches with unsaved changes may overwrite your editor state. Continue?");
    if (!proceed) {
      return;
    }
  }

  try {
    setStatus(`Switching to ${branchListEl.value}...`);
    await desktopApi.switchBranch(state.selectedProject.repositoryPath, branchListEl.value);
    await refreshProjectData(state.selectedProject, true);
    setStatus(`Switched to ${branchListEl.value}.`);
  } catch (error) {
    setStatus(`Branch switch failed: ${error.message}`, true);
  }
});

setEditorState(false);
renderRootsSummary();
renderProjects();
resetRightRail();

if (!desktopApi) {
  setControlsEnabled(false);
  setStatus("Desktop bridge failed to load. Restart the app after pulling latest changes.", true);
}
