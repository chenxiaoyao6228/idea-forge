import { Workspace, WorkspaceAccessLevel } from "@idea/contracts";

export function presentWorkspace(workspace: Workspace, accessLevel?: WorkspaceAccessLevel) {
  return {
    ...workspace,
    ...(accessLevel ? { accessLevel } : {}),
  };
}
