export function getRequestItemId(request?: any, model?: string): string {
  const { params = {}, body = {}, query = {} } = (request ?? {}) as any;

  // For Workspace model, prefer workspaceId param (used in nested routes like /workspaces/:workspaceId/ai-config)
  if (model === "Workspace" && params.workspaceId) {
    return params.workspaceId;
  }

  const id = params.id ?? body.id ?? query.id;

  return id;
}
