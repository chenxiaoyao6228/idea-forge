import useWorkspaceStore from "@/stores/workspace-store";

/**
 * Custom hook to easily access workspace type throughout the application
 * @returns Object with workspace type information and boolean flags
 */
export function useWorkspaceType() {
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const isPersonalWorkspace = currentWorkspace?.type === "PERSONAL";
  const isTeamWorkspace = currentWorkspace?.type === "TEAM";

  return {
    isPersonalWorkspace,
    isTeamWorkspace,
    currentWorkspace,
    workspaceType: currentWorkspace?.type,
  };
}
