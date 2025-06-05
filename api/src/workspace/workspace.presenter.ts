import { Workspace } from "@prisma/client";
import { WorkspaceSchema } from "contracts";

export function presentWorkspace(workspace: Workspace) {
  return WorkspaceSchema.parse({
    ...workspace,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  });
}

export function presentWorkspaces(workspaces: Workspace[]) {
  return workspaces.map(presentWorkspace);
}
