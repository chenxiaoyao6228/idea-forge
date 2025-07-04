import { Workspace } from "@idea/contracts";

export function presentWorkspace(workspace: Workspace) {
  return {
    ...workspace,
  };
}
