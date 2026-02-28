import {
  docsSetupLabel,
  mappingLabel,
  projectLabel,
  projectSetupSummary,
  worktreeLabel,
} from "./view-model.js";

const desktopApi = window.desktopApi;

const state = {
  rootPaths: [],
  projectGroups: [],
  selectedProjectId: null,
  selectedWorktreePath: null,
  showMissingDocs: false,
  editorText: "",
  originalText: "",
};

const statusEl = document.getElementById("status");
const projectsEl = document.getElementById("projects");
const editorMetaEl = document.getElementById("editorMeta");
const editorEl = document.getElementById("editor");
const saveDocEl = document.getElementById("saveDoc");
const projectPathEl = document.getElementById("projectPath");
const projectSetupEl = document.getElementById("projectSetup");
const worktreeSetupEl = document.getElementById("worktreeSetup");
const activeWorktreeEl = document.getElementById("activeWorktree");
const worktreeListEl = document.getElementById("worktreeList");
const activeBranchEl = document.getElementById("activeBranch");
const branchListEl = document.getElementById("branchList");
const switchBranchEl = document.getElementById("switchBranch");
const mappingStatusEl = document.getElementById("mappingStatus");
const mappingLinkEl = document.getElementById("mappingLink");
const openSettingsEl = document.getElementById("openSettings");
const refreshProjectEl = document.getElementById("refreshProject");

function hasUnsavedChanges() {
  return state.editorText !== state.originalText;
}

function getSelectedProject() {
  return state.projectGroups.find((project) => project.projectId === state.selectedProjectId) ?? null;
}

function getSelectedWorktree(projectGroup = getSelectedProject()) {
  if (!projectGroup) {
    return null;
  }

  const selected = projectGroup.worktrees.find((worktree) => worktree.repositoryPath === state.selectedWorktreePath);
  if (selected) {
    return selected;
  }

  return projectGroup.worktrees.find((worktree) => worktree.isDefault) ?? projectGroup.worktrees[0] ?? null;
}

function currentReadmePath(worktree) {
  return `${worktree.docsPath}/README.md`;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function setEditorState(enabled) {
  editorEl.disabled = !enabled;
  saveDocEl.disabled = !enabled;
}

function setControlsEnabled(enabled) {
  openSettingsEl.disabled = !enabled;
  refreshProjectEl.disabled = !enabled;
}

function clearEditor(metaText, allowEditing = false) {
  state.editorText = "";
  state.originalText = "";
  editorEl.value = "";
  editorMetaEl.textContent = metaText;
  setEditorState(allowEditing);
}

function setChip(element, text, warn = false) {
  element.textContent = text;
  element.classList.toggle("warn", warn);
}

function renderProjectDetails(projectGroup, selectedWorktree) {
  if (!projectGroup || !selectedWorktree) {
    projectPathEl.textContent = "No project selected.";
    setChip(projectSetupEl, "No setup available", false);
    setChip(worktreeSetupEl, "No worktree selected", false);
    return;
  }

  projectPathEl.textContent = projectGroup.projectPath;
  setChip(projectSetupEl, projectSetupSummary(projectGroup), !projectGroup.hasProjectDocs || !projectGroup.hasReadme);

  const setupText = `${worktreeLabel(projectGroup, selectedWorktree)} - ${docsSetupLabel(selectedWorktree)}`;
  setChip(worktreeSetupEl, setupText, !selectedWorktree.hasProjectDocs || !selectedWorktree.hasReadme);
}

function createSectionLabel(text) {
  const section = document.createElement("li");
  section.className = "project-section";
  section.textContent = text;
  return section;
}

function createMissingDocsToggle(missingCount) {
  const item = document.createElement("li");
  item.className = "project-section";

  const button = document.createElement("button");
  button.className = "ghost";
  button.type = "button";
  button.textContent = state.showMissingDocs
    ? `Hide missing docs/project (${missingCount})`
    : `Show missing docs/project (${missingCount})`;
  button.addEventListener("click", () => {
    state.showMissingDocs = !state.showMissingDocs;
    renderProjects();
  });

  item.append(button);
  return item;
}

function createProjectItem(projectGroup) {
  const item = document.createElement("li");
  item.className = "project-item";
  if (projectGroup.projectId === state.selectedProjectId) {
    item.classList.add("active");
  }

  const title = document.createElement("div");
  title.className = "project-title";
  title.textContent = projectLabel(projectGroup);
  item.append(title);

  item.addEventListener("click", () => loadProject(projectGroup));
  return item;
}

function renderProjects() {
  projectsEl.innerHTML = "";

  if (state.projectGroups.length === 0) {
    const empty = document.createElement("li");
    empty.className = "project-item";
    empty.textContent = "No repositories discovered yet.";
    projectsEl.append(empty);
    return;
  }

  const withDocs = state.projectGroups.filter((project) => project.hasProjectDocs);
  const withoutDocs = state.projectGroups.filter((project) => !project.hasProjectDocs);

  for (const project of withDocs) {
    projectsEl.append(createProjectItem(project));
  }

  if (withoutDocs.length > 0) {
    projectsEl.append(createMissingDocsToggle(withoutDocs.length));

    if (state.showMissingDocs) {
      projectsEl.append(createSectionLabel("Missing docs/project"));
      for (const project of withoutDocs) {
        projectsEl.append(createProjectItem(project));
      }
    }
  }
}

function resetWorktreeContext() {
  activeWorktreeEl.textContent = "No project selected.";
  worktreeListEl.innerHTML = "";
  worktreeListEl.disabled = true;
}

function resetRepositoryContext() {
  activeBranchEl.textContent = "No repository selected.";
  branchListEl.innerHTML = "";
  branchListEl.disabled = true;
  switchBranchEl.disabled = true;
  mappingStatusEl.textContent = "No repository selected.";
  mappingLinkEl.hidden = true;
  mappingLinkEl.href = "#";
}

function renderWorktreeContext(projectGroup, selectedWorktreePath) {
  const selectedWorktree = projectGroup.worktrees.find((worktree) => worktree.repositoryPath === selectedWorktreePath);
  if (!selectedWorktree) {
    resetWorktreeContext();
    return;
  }

  activeWorktreeEl.textContent = `Active worktree: ${worktreeLabel(projectGroup, selectedWorktree)}`;
  worktreeListEl.innerHTML = "";

  for (const worktree of projectGroup.worktrees) {
    const option = document.createElement("option");
    option.value = worktree.repositoryPath;
    option.textContent = `${worktreeLabel(projectGroup, worktree)} - ${docsSetupLabel(worktree)}`;
    option.selected = worktree.repositoryPath === selectedWorktree.repositoryPath;
    worktreeListEl.append(option);
  }

  worktreeListEl.disabled = projectGroup.worktrees.length <= 1;
}

function renderBranchContext(branchContext) {
  activeBranchEl.textContent = `Active branch: ${branchContext.activeBranch || "(none)"}`;

  branchListEl.innerHTML = "";
  for (const branch of branchContext.branches) {
    const option = document.createElement("option");
    option.value = branch.name;
    option.textContent = branch.isCurrent ? `${branch.name} (current)` : branch.name;
    option.selected = branch.isCurrent;
    branchListEl.append(option);
  }

  branchListEl.disabled = branchContext.branches.length === 0;
  switchBranchEl.disabled = branchContext.branches.length === 0;
}

async function refreshRepositoryContext(worktree) {
  try {
    const branchContext = await desktopApi.getBranchContext(worktree.repositoryPath);
    renderBranchContext(branchContext);
    worktree.branchName = branchContext.activeBranch || worktree.branchName;
  } catch (error) {
    activeBranchEl.textContent = `Branch context unavailable: ${error.message}`;
    branchListEl.innerHTML = "";
    branchListEl.disabled = true;
    switchBranchEl.disabled = true;
  }

  try {
    const mappingResult = await desktopApi.getRepoMapping(worktree.repositoryPath);
    if (mappingResult?.mapping?.fullName) {
      mappingStatusEl.textContent = "Connected repository";
      mappingLinkEl.href = `https://github.com/${mappingResult.mapping.fullName}`;
      mappingLinkEl.hidden = false;
    } else {
      mappingStatusEl.textContent = mappingLabel(mappingResult);
      mappingLinkEl.hidden = true;
      mappingLinkEl.href = "#";
    }
  } catch (error) {
    mappingStatusEl.textContent = `Mapping unavailable: ${error.message}`;
    mappingLinkEl.hidden = true;
    mappingLinkEl.href = "#";
  }
}

async function refreshSelectedWorktree(keepStatusMessage = false) {
  const selectedProject = getSelectedProject();
  const selectedWorktree = getSelectedWorktree(selectedProject);

  if (!selectedProject || !selectedWorktree) {
    clearEditor("Pick a project to load docs/project/README.md.", false);
    renderProjectDetails(null, null);
    resetWorktreeContext();
    resetRepositoryContext();
    return;
  }

  state.selectedWorktreePath = selectedWorktree.repositoryPath;
  renderWorktreeContext(selectedProject, selectedWorktree.repositoryPath);
  renderProjectDetails(selectedProject, selectedWorktree);

  if (!selectedWorktree.hasProjectDocs) {
    clearEditor("This worktree is missing docs/project. Add content and Save to create README.md.", true);
  } else if (!selectedWorktree.hasReadme) {
    clearEditor("This worktree is missing docs/project/README.md. Add content and Save to create it.", true);
  } else {
    const docText = await desktopApi.readDocument(selectedWorktree.docsPath, "README.md");
    state.editorText = docText;
    state.originalText = docText;
    editorEl.value = docText;
    editorMetaEl.textContent = `Editing ${currentReadmePath(selectedWorktree)}`;
    setEditorState(true);
  }

  await refreshRepositoryContext(selectedWorktree);

  if (!keepStatusMessage) {
    setStatus("");
  }
}

async function loadProject(projectGroup) {
  if (state.selectedProjectId && hasUnsavedChanges()) {
    const proceed = window.confirm("You have unsaved changes. Switch projects and discard edits?");
    if (!proceed) {
      return;
    }
  }

  state.selectedProjectId = projectGroup.projectId;
  const preserved = projectGroup.worktrees.find((worktree) => worktree.repositoryPath === state.selectedWorktreePath);
  state.selectedWorktreePath = preserved?.repositoryPath ?? projectGroup.defaultWorktreePath;

  renderProjects();

  try {
    await refreshSelectedWorktree();
  } catch (error) {
    clearEditor("Unable to load README.md for the selected worktree.", false);
    renderProjectDetails(projectGroup, null);
    resetRepositoryContext();
    setStatus(`Failed to load project: ${error.message}`, true);
  }
}

async function switchWorktree(nextWorktreePath) {
  const selectedProject = getSelectedProject();
  if (!selectedProject || !nextWorktreePath) {
    return;
  }

  const currentWorktree = getSelectedWorktree(selectedProject);
  if (currentWorktree?.repositoryPath === nextWorktreePath) {
    return;
  }

  if (hasUnsavedChanges()) {
    const proceed = window.confirm("Switching worktrees discards unsaved editor changes. Continue?");
    if (!proceed) {
      worktreeListEl.value = currentWorktree?.repositoryPath ?? "";
      return;
    }
  }

  state.selectedWorktreePath = nextWorktreePath;
  try {
    await refreshSelectedWorktree(true);
    renderProjects();
    setStatus("");
  } catch (error) {
    setStatus(`Worktree switch failed: ${error.message}`, true);
  }
}

async function discoverProjects() {
  if (state.rootPaths.length === 0) {
    state.projectGroups = [];
    state.selectedProjectId = null;
    state.selectedWorktreePath = null;
    renderProjects();
    clearEditor("No workspace roots configured. Open settings to add at least one project root.", false);
    renderProjectDetails(null, null);
    resetWorktreeContext();
    resetRepositoryContext();
    setStatus("No project roots yet. Open settings to add one.", true);
    return;
  }

  try {
    state.projectGroups = await desktopApi.discoverProjects(state.rootPaths);
    state.showMissingDocs = false;

    if (state.projectGroups.length === 0) {
      state.selectedProjectId = null;
      state.selectedWorktreePath = null;
      clearEditor("No repositories found in selected roots.", false);
      renderProjectDetails(null, null);
      resetWorktreeContext();
      resetRepositoryContext();
      renderProjects();
      setStatus("No projects found in current roots.");
      return;
    }

    const selectedProject = state.projectGroups.find((project) => project.projectId === state.selectedProjectId);
    const docsProjects = state.projectGroups.filter((project) => project.hasProjectDocs);
    const nextProject = selectedProject?.hasProjectDocs ? selectedProject : docsProjects[0] ?? null;

    if (!nextProject) {
      state.selectedProjectId = null;
      state.selectedWorktreePath = null;
      renderProjects();
      clearEditor("No docs/project repository selected. Expand missing docs/project to pick one.", false);
      renderProjectDetails(null, null);
      resetWorktreeContext();
      resetRepositoryContext();
      setStatus("Projects found, but docs/project is missing. Expand the hidden section to choose one.");
      return;
    }

    state.selectedProjectId = nextProject.projectId;
    const selectedWorktree = nextProject.worktrees.find((worktree) => worktree.repositoryPath === state.selectedWorktreePath);
    state.selectedWorktreePath = selectedWorktree?.repositoryPath ?? nextProject.defaultWorktreePath;

    renderProjects();
    await refreshSelectedWorktree(true);

    setStatus("");
  } catch (error) {
    setStatus(`Discovery failed: ${error.message}`, true);
  }
}

openSettingsEl.addEventListener("click", async () => {
  try {
    await desktopApi.openSettingsWindow();
  } catch (error) {
    setStatus(`Failed to open settings: ${error.message}`, true);
  }
});

refreshProjectEl.addEventListener("click", async () => {
  if (hasUnsavedChanges()) {
    const proceed = window.confirm("Refreshing discovery may reload content and discard unsaved edits. Continue?");
    if (!proceed) {
      return;
    }
  }

  try {
    await discoverProjects();
  } catch (error) {
    setStatus(`Refresh failed: ${error.message}`, true);
  }
});

worktreeListEl.addEventListener("change", async () => {
  await switchWorktree(worktreeListEl.value);
});

editorEl.addEventListener("input", () => {
  state.editorText = editorEl.value;
  const selectedWorktree = getSelectedWorktree();
  const marker = hasUnsavedChanges() ? " (unsaved changes)" : "";
  editorMetaEl.textContent = selectedWorktree
    ? `Editing ${currentReadmePath(selectedWorktree)}${marker}`
    : "Pick a project to load docs.";
});

saveDocEl.addEventListener("click", async () => {
  const selectedProject = getSelectedProject();
  const selectedWorktree = getSelectedWorktree(selectedProject);
  if (!selectedProject || !selectedWorktree) {
    return;
  }

  try {
    await desktopApi.saveDocument(selectedWorktree.docsPath, state.editorText, "README.md");
    state.originalText = state.editorText;
    selectedWorktree.hasProjectDocs = true;
    selectedWorktree.hasReadme = true;

    selectedProject.hasProjectDocs = selectedProject.worktrees.some((worktree) => worktree.hasProjectDocs);
    selectedProject.hasReadme = selectedProject.worktrees.some((worktree) => worktree.hasReadme);

    editorMetaEl.textContent = `Editing ${currentReadmePath(selectedWorktree)}`;
    renderProjectDetails(selectedProject, selectedWorktree);
    renderProjects();
    setStatus("Saved.");
  } catch (error) {
    setStatus(`Save failed: ${error.message}`, true);
  }
});

switchBranchEl.addEventListener("click", async () => {
  const selectedProject = getSelectedProject();
  const selectedWorktree = getSelectedWorktree(selectedProject);
  if (!selectedWorktree || !branchListEl.value) {
    return;
  }

  if (hasUnsavedChanges()) {
    const proceed = window.confirm("Switching branches with unsaved changes may overwrite editor content. Continue?");
    if (!proceed) {
      return;
    }
  }

  try {
    await desktopApi.switchBranch(selectedWorktree.repositoryPath, branchListEl.value);
    await refreshSelectedWorktree(true);
    renderProjects();
    setStatus("");
  } catch (error) {
    setStatus(`Branch switch failed: ${error.message}`, true);
  }
});

async function initializeRootPaths() {
  try {
    state.rootPaths = await desktopApi.getRootPaths();
    await discoverProjects();
  } catch (error) {
    setStatus(`Failed to load workspace roots: ${error.message}`, true);
  }
}

if (desktopApi) {
  desktopApi.onRootPathsChanged(async (rootPaths) => {
    state.rootPaths = rootPaths;
    await discoverProjects();
  });

  void initializeRootPaths();
}

clearEditor("Pick a project to load docs/project/README.md.", false);
renderProjects();
renderProjectDetails(null, null);
resetWorktreeContext();
resetRepositoryContext();

if (!desktopApi) {
  setControlsEnabled(false);
  setStatus("Desktop bridge failed to load. Restart the app after pulling latest changes.", true);
}
