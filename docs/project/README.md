# ProjectBranch

## Project Overview

ProjectBranch creates a simple, friendly workspace for teams to find, read, and
edit project documentation stored in local folders and GitHub repositories.

It is designed to support both technical and non-technical contributors by
combining a clean text-editing experience with a straightforward interface for
collaboration.

## Core Goals

- Let users read and update project documentation from one place.
- Enable pull-request based workflows for all project changes.
- Give agents direct access to documentation, future ideas, workflows, and user stories.
- Keep the experience easy for people who do not write code regularly.

## Platform and Access Requirements

- The app should run as a desktop experience.
- In the desktop version, users should be able to choose one or more folders to
  search for project documentation.
- Default desktop search should look for `docs/project` inside direct
  subfolders of each user-provided root folder.
- The desktop search should also check one additional nested level to support
  Git worktree-style layouts.
- Worktree detection should be based on Git metadata (presence of `.git`
  directory or `.git` file), not folder naming conventions.
- Detected worktrees should be treated as branch-linked working directories of
  the same local repository, not as independent projects.
- The web version should support logging in with GitHub.
- The desktop version should also support logging in with GitHub.
- After GitHub login, users should be able to directly access repositories they
  own or can access, then view and manage project documentation in those repos.
- In the desktop app, local repositories should be matched with their GitHub
  repositories when Git metadata and remotes indicate a valid GitHub mapping.
- In GitHub-connected views, users should be able to see repository branches,
  including the active branch, and switch between branches.
- Branch switching should work especially for GitHub-backed repositories so
  users can move between branches while reviewing or editing docs.

## Why This Matters

Teams need a single workflow where planning, documentation, and execution stay
connected. By managing project knowledge in version-controlled docs, this
project helps everyone collaborate with clear history, review, and shared context.
