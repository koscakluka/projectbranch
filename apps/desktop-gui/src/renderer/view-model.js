export function projectLabel(project) {
  const segments = project.repositoryPath.split("/");
  return segments.at(-1) || project.repositoryPath;
}

export function mappingLabel(mappingResult) {
  if (mappingResult.mapping) {
    return `Mapped to ${mappingResult.mapping.fullName} via ${mappingResult.mapping.remoteName}`;
  }

  if (mappingResult.reason === "no-github-remote") {
    return "No GitHub remote found for this repository.";
  }

  if (mappingResult.reason === "not-accessible") {
    return "GitHub remote exists but account access is missing.";
  }

  return "No mapping available.";
}
